import { Router, type IRouter } from "express";
import { desc, eq, inArray } from "drizzle-orm";
import {
  db,
  ingredientsTable,
  menuItemsTable,
  recipeLinesTable,
} from "@workspace/db";
import { appendMenuSnapshot, ensureMenuSnapshot } from "../lib/menu-history";
import { dimensions, ingredientCost } from "../lib/recipe-cost";
import {
  CreateMenuItemBody,
  CreateMenuItemResponse,
  DeleteMenuItemParams,
  ListMenuItemsResponse,
  UpdateMenuItemBody,
  UpdateMenuItemParams,
  UpdateMenuItemResponse,
  UpdateMenuItemSellingPriceBody,
  UpdateMenuItemSellingPriceParams,
  UpdateMenuItemSellingPriceResponse,
  type MenuItemInput,
} from "@workspace/api-zod";

const router: IRouter = Router();

function priceInCents(price: number): number | null {
  const cents = Math.round(price * 100);
  return Number.isFinite(price) && Number.isSafeInteger(cents)
    && cents >= 1 && cents <= 2_147_483_647
    && Math.abs(price * 100 - cents) <= 0.000001
    ? cents : null;
}

async function readMenuItems(id?: number) {
  const items = await db.select().from(menuItemsTable)
    .where(id === undefined ? undefined : eq(menuItemsTable.id, id))
    .orderBy(desc(menuItemsTable.id));
  const lines = await db
    .select({ line: recipeLinesTable, ingredient: ingredientsTable })
    .from(recipeLinesTable)
    .innerJoin(ingredientsTable, eq(recipeLinesTable.ingredientId, ingredientsTable.id))
    .where(id === undefined ? undefined : eq(recipeLinesTable.menuItemId, id))
    .orderBy(recipeLinesTable.id);

  return items.map((item) => {
    const recipe = lines
      .filter(({ line }) => line.menuItemId === item.id)
      .map(({ line, ingredient }) => ({
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        quantity: line.quantity,
        unit: line.unit,
        ingredientCost: ingredientCost(ingredient, line.quantity, line.unit),
      }));
    const sellingPrice = item.sellingPriceCents / 100;
    const recipeCost = recipe.reduce((total, line) => total + line.ingredientCost, 0);
    const profit = sellingPrice - recipeCost;
    return {
      id: item.id,
      name: item.name,
      sellingPrice,
      recipe,
      recipeCost,
      profit,
      foodCostPercent: recipeCost / sellingPrice * 100,
      profitMarginPercent: profit / sellingPrice * 100,
      costIncreased: item.baselineRecipeCost !== null && recipeCost > item.baselineRecipeCost + 0.005,
    };
  });
}

async function validateInput(data: MenuItemInput): Promise<
  | { error: string; value?: never }
  | { error?: never; value: { name: string; sellingPriceCents: number; baselineRecipeCost: number; recipe: MenuItemInput["recipe"] } }
> {
  const name = data.name.trim();
  if (!name || name.length > 160) {
    return { error: "Enter a menu item name (up to 160 characters)." };
  }
  const cents = priceInCents(data.sellingPrice);
  if (cents === null) {
    return { error: "Selling price must be at least $0.01 with at most two decimal places." };
  }
  if (!data.recipe.length) {
    return { error: "Add at least one ingredient to the recipe." };
  }

  const ingredientIds = [...new Set(data.recipe.map((line) => line.ingredientId))];
  const ingredients = await db.select().from(ingredientsTable)
    .where(inArray(ingredientsTable.id, ingredientIds));
  const byId = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));
  let baselineRecipeCost = 0;
  for (const line of data.recipe) {
    const ingredient = byId.get(line.ingredientId);
    if (!ingredient) {
      return { error: "A recipe ingredient is no longer available. Refresh and choose another." };
    }
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
      return { error: "Recipe quantities must be greater than zero." };
    }
    if (dimensions[line.unit] !== dimensions[ingredient.purchaseUnit]) {
      return { error: `Choose a compatible unit for ${ingredient.name}.` };
    }
    const cost = ingredientCost(ingredient, line.quantity, line.unit);
    if (!Number.isFinite(cost) || !Number.isFinite(baselineRecipeCost + cost)) {
      return { error: "A recipe quantity is too large to calculate its cost." };
    }
    baselineRecipeCost += cost;
  }
  return { value: { name, sellingPriceCents: cents, baselineRecipeCost, recipe: data.recipe } };
}

function bodyError(path: PropertyKey | undefined): string {
  switch (path) {
    case "name": return "Enter a menu item name (up to 160 characters).";
    case "sellingPrice": return "Selling price must be greater than zero.";
    case "recipe": return "Add at least one recipe ingredient with a valid quantity and unit.";
    default: return "Check the menu item details and try again.";
  }
}

router.get("/menu-items", async (_req, res): Promise<void> => {
  res.json(ListMenuItemsResponse.parse(await readMenuItems()));
});

router.post("/menu-items", async (req, res): Promise<void> => {
  const parsed = CreateMenuItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: bodyError(parsed.error.issues[0]?.path[0]) });
    return;
  }
  const input = await validateInput(parsed.data);
  if (!input.value) {
    res.status(400).json({ error: input.error });
    return;
  }
  const { recipe, ...item } = input.value;
  const id = await db.transaction(async (tx) => {
    const [created] = await tx.insert(menuItemsTable).values(item).returning({ id: menuItemsTable.id });
    await tx.insert(recipeLinesTable).values(recipe.map((line) => ({ ...line, menuItemId: created.id })));
    await appendMenuSnapshot(tx, created.id, "initial");
    return created.id;
  });
  const [created] = await readMenuItems(id);
  res.status(201).json(CreateMenuItemResponse.parse(created));
});

router.put("/menu-items/:id", async (req, res): Promise<void> => {
  const params = UpdateMenuItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Choose a valid menu item to edit." });
    return;
  }
  const parsed = UpdateMenuItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: bodyError(parsed.error.issues[0]?.path[0]) });
    return;
  }
  const input = await validateInput(parsed.data);
  if (!input.value) {
    res.status(400).json({ error: input.error });
    return;
  }
  const { recipe, ...item } = input.value;
  const updated = await db.transaction(async (tx) => {
    const [old] = await tx.select({ id: menuItemsTable.id }).from(menuItemsTable)
      .where(eq(menuItemsTable.id, params.data.id)).for("update");
    if (!old) return false;
    await ensureMenuSnapshot(tx, old.id);
    const [existing] = await tx.update(menuItemsTable).set(item)
      .where(eq(menuItemsTable.id, params.data.id)).returning({ id: menuItemsTable.id });
    if (!existing) return false;
    await tx.delete(recipeLinesTable).where(eq(recipeLinesTable.menuItemId, existing.id));
    await tx.insert(recipeLinesTable).values(recipe.map((line) => ({ ...line, menuItemId: existing.id })));
    await appendMenuSnapshot(tx, existing.id, "recipe");
    return true;
  });
  if (!updated) {
    res.status(404).json({ error: "Menu item not found. Refresh the list and try again." });
    return;
  }
  const [result] = await readMenuItems(params.data.id);
  res.json(UpdateMenuItemResponse.parse(result));
});

router.patch("/menu-items/:id/selling-price", async (req, res): Promise<void> => {
  const params = UpdateMenuItemSellingPriceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Choose a valid menu item to edit." });
    return;
  }
  const parsed = UpdateMenuItemSellingPriceBody.safeParse(req.body);
  const cents = parsed.success ? priceInCents(parsed.data.sellingPrice) : null;
  if (cents === null) {
    res.status(400).json({ error: "Selling price must be at least $0.01 with at most two decimal places." });
    return;
  }
  const updated = await db.transaction(async (tx) => {
    const [existing] = await tx.select().from(menuItemsTable)
      .where(eq(menuItemsTable.id, params.data.id)).for("update");
    if (!existing) return false;
    if (existing.sellingPriceCents === cents) return true;
    await ensureMenuSnapshot(tx, existing.id);
    await tx.update(menuItemsTable).set({ sellingPriceCents: cents }).where(eq(menuItemsTable.id, existing.id));
    await appendMenuSnapshot(tx, existing.id, "selling_price");
    return true;
  });
  if (!updated) {
    res.status(404).json({ error: "Menu item not found. Refresh the list and try again." });
    return;
  }
  const [item] = await readMenuItems(params.data.id);
  res.json(UpdateMenuItemSellingPriceResponse.parse(item));
});

router.delete("/menu-items/:id", async (req, res): Promise<void> => {
  const params = DeleteMenuItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Choose a valid menu item to delete." });
    return;
  }
  const [deleted] = await db.delete(menuItemsTable).where(eq(menuItemsTable.id, params.data.id))
    .returning({ id: menuItemsTable.id });
  if (!deleted) {
    res.status(404).json({ error: "Menu item not found. Refresh the list and try again." });
    return;
  }
  res.sendStatus(204);
});

export default router;