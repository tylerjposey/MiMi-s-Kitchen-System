import { sql } from "drizzle-orm";
import { check, doublePrecision, index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { menuItemsTable } from "./menu";

export const menuProfitabilityHistoryTable = pgTable("menu_profitability_history", {
  id: serial("id").primaryKey(),
  menuItemId: integer("menu_item_id").notNull().references(() => menuItemsTable.id, { onDelete: "cascade" }),
  date: timestamp("date", { withTimezone: true }).notNull().defaultNow(),
  ingredientCost: doublePrecision("ingredient_cost").notNull(),
  sellingPriceCents: integer("selling_price_cents").notNull(),
  profit: doublePrecision("profit").notNull(),
  foodCostPercent: doublePrecision("food_cost_percent").notNull(),
  profitMarginPercent: doublePrecision("profit_margin_percent").notNull(),
  source: text("source").notNull(),
}, (table) => [
  index("menu_profitability_history_menu_item_idx").on(table.menuItemId),
  check("menu_profitability_history_valid_price", sql`${table.sellingPriceCents} > 0`),
]);

export const insertMenuProfitabilityHistorySchema = createInsertSchema(menuProfitabilityHistoryTable).omit({ id: true, date: true });
export type InsertMenuProfitabilityHistory = z.infer<typeof insertMenuProfitabilityHistorySchema>;
export type MenuProfitabilityHistoryRecord = typeof menuProfitabilityHistoryTable.$inferSelect;