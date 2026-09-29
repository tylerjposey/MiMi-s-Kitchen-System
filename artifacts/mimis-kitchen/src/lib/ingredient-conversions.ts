import type { IngredientUnit } from '@workspace/api-client-react';

export type MeasurementDimension = 'weight' | 'volume' | 'count';

export const unitGroups = {
  Weight: ['lb', 'oz'],
  Volume: ['gallon', 'quart', 'cup', 'fl oz'],
  Count: ['each'],
} as const satisfies Record<string, readonly IngredientUnit[]>;

export const unitDimensions: Record<IngredientUnit, MeasurementDimension> = {
  lb: 'weight',
  oz: 'weight',
  gallon: 'volume',
  quart: 'volume',
  cup: 'volume',
  'fl oz': 'volume',
  each: 'count',
};

// Factors are expressed in the smallest unit of each dimension (oz / fl oz / each).
export const unitFactors: Record<IngredientUnit, number> = {
  lb: 16,
  oz: 1,
  gallon: 128,
  quart: 32,
  cup: 8,
  'fl oz': 1,
  each: 1,
};

export function compatibleUnits(unit: IngredientUnit): IngredientUnit[] {
  return Object.values(unitGroups).flat().filter((target) => unitDimensions[target] === unitDimensions[unit]);
}

export function convertQuantity(quantity: number, from: IngredientUnit, to: IngredientUnit): number | null {
  if (unitDimensions[from] !== unitDimensions[to] || !Number.isFinite(quantity)) return null;
  return quantity * unitFactors[from] / unitFactors[to];
}

export function convertCostPerUnit(price: number, quantity: number, from: IngredientUnit, to: IngredientUnit): number | null {
  const converted = convertQuantity(quantity, from, to);
  if (converted === null || converted <= 0 || !Number.isFinite(price)) return null;
  return price / converted;
}