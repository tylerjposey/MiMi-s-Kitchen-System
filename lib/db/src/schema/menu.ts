import { sql } from "drizzle-orm";
import { check, doublePrecision, index, integer, pgTable, serial, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { ingredientsTable, ingredientUnitEnum } from "./ingredients";

export const menuItemsTable = pgTable(
  "menu_items",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    sellingPriceCents: integer("selling_price_cents").notNull(),
  },
  (table) => [
    check("menu_items_positive_price", sql`${table.sellingPriceCents} > 0`),
  ],
);

export const recipeLinesTable = pgTable(
  "recipe_lines",
  {
    id: serial("id").primaryKey(),
    menuItemId: integer("menu_item_id").notNull().references(() => menuItemsTable.id, { onDelete: "cascade" }),
    ingredientId: integer("ingredient_id").notNull().references(() => ingredientsTable.id, { onDelete: "restrict" }),
    quantity: doublePrecision("quantity").notNull(),
    unit: ingredientUnitEnum("unit").notNull(),
  },
  (table) => [
    check("recipe_lines_positive_quantity", sql`${table.quantity} > 0`),
    index("recipe_lines_menu_item_idx").on(table.menuItemId),
    index("recipe_lines_ingredient_idx").on(table.ingredientId),
  ],
);

export const insertMenuItemSchema = createInsertSchema(menuItemsTable).omit({ id: true });
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type MenuItemRecord = typeof menuItemsTable.$inferSelect;
export const insertRecipeLineSchema = createInsertSchema(recipeLinesTable).omit({ id: true });
export type InsertRecipeLine = z.infer<typeof insertRecipeLineSchema>;
export type RecipeLineRecord = typeof recipeLinesTable.$inferSelect;