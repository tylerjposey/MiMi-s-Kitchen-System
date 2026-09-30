import { Router, type IRouter } from "express";
import { asc, sql } from "drizzle-orm";
import {
  db, ingredientPriceHistoryTable, ingredientsTable, menuItemsTable,
  menuProfitabilityHistoryTable, workspaceSettingsTable,
} from "@workspace/db";
import { ClearWorkspaceDataBody, GetWorkspaceHistoryResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/history", async (_req, res): Promise<void> => {
  const [ingredientPrices, menuProfitability] = await Promise.all([
    db.select().from(ingredientPriceHistoryTable).orderBy(asc(ingredientPriceHistoryTable.id)),
    db.select().from(menuProfitabilityHistoryTable).orderBy(asc(menuProfitabilityHistoryTable.id)),
  ]);
  res.json(GetWorkspaceHistoryResponse.parse({
    ingredientPrices: ingredientPrices.map((row) => ({
      id: row.id,
      ingredientId: row.ingredientId,
      date: row.date,
      purchasePrice: row.purchasePriceCents / 100,
      purchaseQuantity: row.purchaseQuantity,
      purchaseUnit: row.purchaseUnit,
      costPerUnit: row.costPerUnit,
    })),
    menuProfitability: menuProfitability.map((row) => ({
      id: row.id,
      menuItemId: row.menuItemId,
      date: row.date,
      ingredientCost: row.ingredientCost,
      sellingPrice: row.sellingPriceCents / 100,
      profit: row.profit,
      foodCostPercent: row.foodCostPercent,
      profitMarginPercent: row.profitMarginPercent,
      source: row.source,
    })),
  }));
});

router.delete("/workspace/data", async (req, res): Promise<void> => {
  if (!ClearWorkspaceDataBody.safeParse(req.body).success) {
    res.status(400).json({ error: "Confirm that all workspace data should be permanently removed." });
    return;
  }
  await db.transaction(async (tx) => {
    // Wait for in-flight writes before deleting, and hold other writes until this reset commits.
    await tx.execute(sql`LOCK TABLE recipe_lines, menu_profitability_history, ingredient_price_history, menu_items, ingredients, workspace_settings IN ACCESS EXCLUSIVE MODE`);
    await tx.delete(menuItemsTable);
    await tx.delete(ingredientsTable);
    await tx.delete(workspaceSettingsTable);
  });
  res.sendStatus(204);
});

export default router;