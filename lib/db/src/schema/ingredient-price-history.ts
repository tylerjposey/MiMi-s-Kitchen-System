import { sql } from "drizzle-orm";
import { check, doublePrecision, index, integer, pgTable, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { ingredientsTable, ingredientUnitEnum } from "./ingredients";

export const ingredientPriceHistoryTable = pgTable("ingredient_price_history", {
  id: serial("id").primaryKey(),
  ingredientId: integer("ingredient_id").notNull().references(() => ingredientsTable.id, { onDelete: "cascade" }),
  date: timestamp("date", { withTimezone: true }).notNull().defaultNow(),
  purchasePriceCents: integer("purchase_price_cents").notNull(),
  purchaseQuantity: doublePrecision("purchase_quantity").notNull(),
  purchaseUnit: ingredientUnitEnum("purchase_unit").notNull(),
  costPerUnit: doublePrecision("cost_per_unit").notNull(),
}, (table) => [
  index("ingredient_price_history_ingredient_idx").on(table.ingredientId),
  check("ingredient_price_history_valid_quantity", sql`${table.purchaseQuantity} > 0`),
  check("ingredient_price_history_valid_price", sql`${table.purchasePriceCents} >= 0`),
]);

export const insertIngredientPriceHistorySchema = createInsertSchema(ingredientPriceHistoryTable).omit({ id: true, date: true });
export type InsertIngredientPriceHistory = z.infer<typeof insertIngredientPriceHistorySchema>;
export type IngredientPriceHistoryRecord = typeof ingredientPriceHistoryTable.$inferSelect;