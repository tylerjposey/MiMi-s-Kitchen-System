import { eq } from "drizzle-orm";
import { db, ingredientsTable, menuItemsTable, menuProfitabilityHistoryTable, recipeLinesTable } from "@workspace/db";
import { ingredientCost } from "./recipe-cost";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type SnapshotSource = "initial" | "ingredient_cost" | "recipe" | "selling_price";

export async function appendMenuSnapshot(tx: Transaction, menuItemId: number, source: SnapshotSource): Promise<void> {
  const [item] = await tx.select().from(menuItemsTable).where(eq(menuItemsTable.id, menuItemId));
  if (!item) return;
  const lines = await tx.select({ line: recipeLinesTable, ingredient: ingredientsTable })
    .from(recipeLinesTable)
    .innerJoin(ingredientsTable, eq(recipeLinesTable.ingredientId, ingredientsTable.id))
    .where(eq(recipeLinesTable.menuItemId, menuItemId));
  const cost = lines.reduce((sum, { line, ingredient }) => sum + ingredientCost(ingredient, line.quantity, line.unit), 0);
  const price = item.sellingPriceCents / 100;
  const profit = price - cost;
  if (![cost, price, profit].every(Number.isFinite)) throw new Error("Menu snapshot could not be calculated");
  await tx.insert(menuProfitabilityHistoryTable).values({
    menuItemId,
    ingredientCost: cost,
    sellingPriceCents: item.sellingPriceCents,
    profit,
    foodCostPercent: cost / price * 100,
    profitMarginPercent: profit / price * 100,
    source,
  });
}

// Older menu items have no recorded history. Capture their current state before an edit.
export async function ensureMenuSnapshot(tx: Transaction, menuItemId: number): Promise<void> {
  const [existing] = await tx.select({ id: menuProfitabilityHistoryTable.id })
    .from(menuProfitabilityHistoryTable)
    .where(eq(menuProfitabilityHistoryTable.menuItemId, menuItemId))
    .limit(1);
  if (!existing) await appendMenuSnapshot(tx, menuItemId, "initial");
}