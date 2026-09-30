import type { IngredientRecord } from "@workspace/db";
import type { IngredientUnit } from "@workspace/api-zod";

export const dimensions: Record<IngredientUnit, "weight" | "volume" | "count"> = {
  lb: "weight", oz: "weight", gallon: "volume", quart: "volume",
  cup: "volume", "fl oz": "volume", each: "count",
};

// Conversion factors within their dimension, in oz / fl oz / each.
const factors: Record<IngredientUnit, number> = {
  lb: 16, oz: 1, gallon: 128, quart: 32,
  cup: 8, "fl oz": 1, each: 1,
};

export function ingredientCost(ingredient: IngredientRecord, quantity: number, unit: IngredientUnit): number {
  return (ingredient.purchasePriceCents / 100)
    * (quantity * factors[unit] / factors[ingredient.purchaseUnit])
    / ingredient.purchaseQuantity;
}