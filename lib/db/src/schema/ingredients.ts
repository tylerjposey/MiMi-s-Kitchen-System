import { sql } from "drizzle-orm";
import {
  check,
  doublePrecision,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ingredientUnitEnum = pgEnum("ingredient_unit", [
  "lb",
  "oz",
  "gallon",
  "quart",
  "cup",
  "fl oz",
  "each",
]);

export const ingredientsTable = pgTable(
  "ingredients",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    purchaseQuantity: doublePrecision("purchase_quantity").notNull(),
    purchaseUnit: ingredientUnitEnum("purchase_unit").notNull(),
    purchasePriceCents: integer("purchase_price_cents").notNull(),
    supplier: text("supplier"),
    lastUpdated: timestamp("last_updated", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("ingredients_positive_quantity", sql`${table.purchaseQuantity} > 0`),
    check("ingredients_nonnegative_price", sql`${table.purchasePriceCents} >= 0`),
  ],
);

export const insertIngredientSchema = createInsertSchema(ingredientsTable).omit({
  id: true,
  lastUpdated: true,
});
export type InsertIngredient = z.infer<typeof insertIngredientSchema>;
export type IngredientRecord = typeof ingredientsTable.$inferSelect;