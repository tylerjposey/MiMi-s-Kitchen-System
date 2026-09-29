import { Router, type IRouter } from "express";
import { desc, eq, sql } from "drizzle-orm";
import { db, ingredientsTable, recipeLinesTable, type IngredientRecord } from "@workspace/db";
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

  const [row] = await db
    .insert(ingredientsTable)
    .values(input.value)
    .returning();
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

  const [row] = await db
    .update(ingredientsTable)
    .set({
      ...input.value,
      lastUpdated: sql`CASE WHEN ${ingredientsTable.purchasePriceCents} <> ${input.value.purchasePriceCents} THEN NOW() ELSE ${ingredientsTable.lastUpdated} END`,
    })
    .where(eq(ingredientsTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Ingredient not found. Refresh the list and try again." });
    return;
  }
  res.json(UpdateIngredientResponse.parse(presentIngredient(row)));
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