import { Router, type IRouter } from "express";
import { desc, eq, sql } from "drizzle-orm";
import { db, ingredientPriceHistoryTable, ingredientsTable, recipeLinesTable, type IngredientRecord } from "@workspace/db";
import { appendMenuSnapshot, ensureMenuSnapshot } from "../lib/menu-history";
import { dimensions } from "../lib/recipe-cost";
import {
  CreateIngredientBody,
  CreateIngredientResponse,
  DeleteIngredientParams,
  ListIngredientsResponse,
  UpdateIngredientBody,
  UpdateIngredientParams,
  UpdateIngredientResponse,
  type IngredientInput,
} from "@workspace/api-zod";

const router: IRouter = Router();

function inputError(field: PropertyKey | undefined): string {
  switch (field) {
    case "name":
      return "Enter an ingredient name (up to 160 characters).";
    case "purchaseQuantity":
      return "Purchase quantity must be a number greater than zero.";
    case "purchaseUnit":
      return "Choose a valid purchase unit.";
    case "purchasePrice":
      return "Purchase price must be a non-negative dollar amount.";
    case "supplier":
      return "Supplier must be no longer than 160 characters.";
    default:
      return "Check the ingredient details and try again.";
  }
}

function normalizeInput(
  data: IngredientInput,
):
  | { error: string; value?: never }
  | {
      error?: never;
      value: {
        name: string;
        purchaseQuantity: number;
        purchaseUnit: IngredientInput["purchaseUnit"];
        purchasePriceCents: number;
        supplier: string | null;
      };
    } {
  const name = data.name.trim();
  const supplier = data.supplier?.trim() || null;
  if (!name || name.length > 160) {
    return { error: "Enter an ingredient name (up to 160 characters)." };
  }
  if (supplier && supplier.length > 160) {
    return { error: "Supplier must be no longer than 160 characters." };
  }
  if (
    !Number.isFinite(data.purchaseQuantity) ||
    data.purchaseQuantity <= 0
  ) {
    return { error: "Purchase quantity must be a number greater than zero." };
  }
  const cents = Math.round(data.purchasePrice * 100);
  if (
    !Number.isFinite(data.purchasePrice) ||
    data.purchasePrice < 0 ||
    !Number.isSafeInteger(cents) ||
    cents > 2_147_483_647 ||
    Math.abs(data.purchasePrice * 100 - cents) > 0.000001
  ) {
    return {
      error: "Purchase price must be a non-negative dollar amount with at most two decimal places.",
    };
  }
  if (!Number.isFinite((cents / 100) / data.purchaseQuantity)) {
    return { error: "Purchase quantity is too small for this price." };
  }

  return {
    value: {
      name,
      purchaseQuantity: data.purchaseQuantity,
      purchaseUnit: data.purchaseUnit,
      purchasePriceCents: cents,
      supplier,
    },
  };
}

function presentIngredient(row: IngredientRecord) {
  return {
    id: row.id,
    name: row.name,
    purchaseQuantity: row.purchaseQuantity,
    purchaseUnit: row.purchaseUnit,
    purchasePrice: row.purchasePriceCents / 100,
    costPerUnit: (row.purchasePriceCents / 100) / row.purchaseQuantity,
    supplier: row.supplier,
    lastUpdated: row.lastUpdated,
  };
}

router.get("/ingredients", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(ingredientsTable)
    .orderBy(desc(ingredientsTable.id));
  res.json(ListIngredientsResponse.parse(rows.map(presentIngredient)));
});

router.post("/ingredients", async (req, res): Promise<void> => {
  const parsed = CreateIngredientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: inputError(parsed.error.issues[0]?.path[0]) });
    return;
  }
  const input = normalizeInput(parsed.data);
  if (!input.value) {
    res.status(400).json({ error: input.error });
    return;
  }

  const row = await db.transaction(async (tx) => {
    const [created] = await tx.insert(ingredientsTable).values(input.value).returning();
    await tx.insert(ingredientPriceHistoryTable).values({
      ingredientId: created.id,
      purchasePriceCents: created.purchasePriceCents,
      purchaseQuantity: created.purchaseQuantity,
      purchaseUnit: created.purchaseUnit,
      costPerUnit: (created.purchasePriceCents / 100) / created.purchaseQuantity,
    });
    return created;
  });
  res.status(201).json(CreateIngredientResponse.parse(presentIngredient(row)));
});

router.put("/ingredients/:id", async (req, res): Promise<void> => {
  const params = UpdateIngredientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Choose a valid ingredient to edit." });
    return;
  }
  const parsed = UpdateIngredientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: inputError(parsed.error.issues[0]?.path[0]) });
    return;
  }
  const input = normalizeInput(parsed.data);
  if (!input.value) {
    res.status(400).json({ error: input.error });
    return;
  }

  const result = await db.transaction(async (tx) => {
    const [previous] = await tx.select().from(ingredientsTable)
      .where(eq(ingredientsTable.id, params.data.id)).for("update");
    if (!previous) return { row: null, incompatible: false };
    const costChanged = previous.purchasePriceCents !== input.value.purchasePriceCents
      || previous.purchaseQuantity !== input.value.purchaseQuantity
      || previous.purchaseUnit !== input.value.purchaseUnit;
    let menuIds: number[] = [];
    if (costChanged) {
      const references = await tx.select({ menuItemId: recipeLinesTable.menuItemId, unit: recipeLinesTable.unit })
        .from(recipeLinesTable).where(eq(recipeLinesTable.ingredientId, previous.id));
      if (references.some(({ unit }) => dimensions[unit] !== dimensions[input.value.purchaseUnit])) {
        return { row: null, incompatible: true };
      }
      const [priorHistory] = await tx.select({ id: ingredientPriceHistoryTable.id })
        .from(ingredientPriceHistoryTable)
        .where(eq(ingredientPriceHistoryTable.ingredientId, previous.id)).limit(1);
      if (!priorHistory) {
        await tx.insert(ingredientPriceHistoryTable).values({
          ingredientId: previous.id,
          date: previous.lastUpdated,
          purchasePriceCents: previous.purchasePriceCents,
          purchaseQuantity: previous.purchaseQuantity,
          purchaseUnit: previous.purchaseUnit,
          costPerUnit: (previous.purchasePriceCents / 100) / previous.purchaseQuantity,
        });
      }
      menuIds = [...new Set(references.map((reference) => reference.menuItemId))];
      for (const id of menuIds) await ensureMenuSnapshot(tx, id);
    }
    const [updated] = await tx.update(ingredientsTable).set({
      ...input.value,
      lastUpdated: sql`CASE WHEN ${ingredientsTable.purchasePriceCents} <> ${input.value.purchasePriceCents} OR ${ingredientsTable.purchaseQuantity} <> ${input.value.purchaseQuantity} OR ${ingredientsTable.purchaseUnit} <> ${input.value.purchaseUnit} THEN NOW() ELSE ${ingredientsTable.lastUpdated} END`,
    }).where(eq(ingredientsTable.id, params.data.id)).returning();
    if (costChanged) {
      await tx.insert(ingredientPriceHistoryTable).values({
        ingredientId: updated.id,
        purchasePriceCents: updated.purchasePriceCents,
        purchaseQuantity: updated.purchaseQuantity,
        purchaseUnit: updated.purchaseUnit,
        costPerUnit: (updated.purchasePriceCents / 100) / updated.purchaseQuantity,
      });
      for (const id of menuIds) await appendMenuSnapshot(tx, id, "ingredient_cost");
    }
    return { row: updated, incompatible: false };
  });
  if (result.incompatible) {
    res.status(409).json({ error: "This purchase unit is incompatible with an existing recipe. Update the recipe before changing the unit." });
    return;
  }
  if (!result.row) {
    res.status(404).json({ error: "Ingredient not found. Refresh the list and try again." });
    return;
  }
  res.json(UpdateIngredientResponse.parse(presentIngredient(result.row)));
});

router.delete("/ingredients/:id", async (req, res): Promise<void> => {
  const params = DeleteIngredientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Choose a valid ingredient to delete." });
    return;
  }
  const [inRecipe] = await db.select({ id: recipeLinesTable.id })
    .from(recipeLinesTable)
    .where(eq(recipeLinesTable.ingredientId, params.data.id))
    .limit(1);
  if (inRecipe) {
    res.status(409).json({ error: "This ingredient is used in a menu recipe. Remove it from the recipe before deleting it." });
    return;
  }
  const [deleted] = await db
    .delete(ingredientsTable)
    .where(eq(ingredientsTable.id, params.data.id))
    .returning({ id: ingredientsTable.id });
  if (!deleted) {
    res.status(404).json({ error: "Ingredient not found. Refresh the list and try again." });
    return;
  }
  res.sendStatus(204);
});

export default router;