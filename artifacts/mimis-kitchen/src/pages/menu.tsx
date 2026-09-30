import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetWorkspaceHistoryQueryKey, getListMenuItemsQueryKey, useCreateMenuItem, useDeleteMenuItem, useListIngredients, useListMenuItems, useUpdateMenuItem, type Ingredient, type MenuItem, type MenuItemInput } from '@workspace/api-client-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { BookOpen, Pencil, Plus, RotateCcw, Trash2, UtensilsCrossed } from 'lucide-react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { Link } from 'wouter';
import { z } from 'zod';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { compatibleUnits, convertQuantity } from '@/lib/ingredient-conversions';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const percent = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const units = ['lb', 'oz', 'gallon', 'quart', 'cup', 'fl oz', 'each'] as const;
const schema = z.object({
  name: z.string().trim().min(1, 'Enter a menu item name.').max(160, 'Keep the name under 160 characters.'),
  sellingPrice: z.string().trim().min(1, 'Enter a selling price.').regex(/^\d+(?:\.\d{1,2})?$/, 'Use a price with at most two decimal places.').refine((value) => Number(value) > 0, 'Selling price must be greater than zero.'),
  recipe: z.array(z.object({
    ingredientId: z.string().min(1, 'Choose an ingredient.'),
    quantity: z.string().trim().min(1, 'Enter a quantity.').refine((value) => Number.isFinite(Number(value)) && Number(value) > 0, 'Quantity must be greater than zero.'),
    unit: z.enum(units),
  })).min(1, 'Add at least one ingredient to the recipe.'),
});
type Values = z.infer<typeof schema>;

const fieldClass = 'mt-1.5 h-11 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3.5 text-[13px] text-[hsl(var(--foreground))] outline-none transition-colors placeholder:text-[hsl(var(--muted-foreground)/.65)] focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/.12)] disabled:opacity-50';
const labelClass = 'block text-[12px] font-semibold text-[hsl(var(--foreground))]';
const secondaryButton = 'inline-flex items-center justify-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3.5 py-2 text-[12px] font-semibold text-[hsl(var(--foreground))] transition-colors hover:border-[hsl(var(--primary)/.5)] hover:text-[hsl(var(--primary))] disabled:cursor-not-allowed disabled:opacity-50';
const primaryButton = 'inline-flex items-center justify-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-[12px] font-semibold text-[hsl(var(--primary-foreground))] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50';

function RecipeEditor({ item, ingredients, ingredientError, ingredientLoading, retryIngredients, onSave, onCancel }: {
  item: MenuItem | null;
  ingredients: Ingredient[];
  ingredientError: boolean;
  ingredientLoading: boolean;
  retryIngredients: () => void;
  onSave: (data: MenuItemInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [saveError, setSaveError] = useState(false);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: item?.name ?? '',
      sellingPrice: item ? item.sellingPrice.toFixed(2) : '',
      recipe: item?.recipe.map((line) => ({ ingredientId: String(line.ingredientId), quantity: String(line.quantity), unit: line.unit })) ?? [],
    },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'recipe' });
  const rows = useWatch({ control: form.control, name: 'recipe' }) ?? [];
  const sellingPrice = useWatch({ control: form.control, name: 'sellingPrice' });
  const { errors, isSubmitting } = form.formState;
  const rowCosts = rows.map((row) => {
    const ingredient = ingredients.find((entry) => String(entry.id) === row?.ingredientId);
    const quantity = Number(row?.quantity);
    if (!ingredient || !row?.quantity || !Number.isFinite(quantity) || quantity <= 0 || !compatibleUnits(ingredient.purchaseUnit).includes(row.unit) || ingredient.purchaseQuantity <= 0) return null;
    const purchaseUnitsUsed = convertQuantity(quantity, row.unit, ingredient.purchaseUnit);
    return purchaseUnitsUsed === null ? null : purchaseUnitsUsed * ingredient.purchasePrice / ingredient.purchaseQuantity;
  });
  const totalCost = rows.length && rowCosts.every((cost) => cost !== null) ? rowCosts.reduce<number>((sum, cost) => sum + (cost ?? 0), 0) : null;
  const price = sellingPrice && Number.isFinite(Number(sellingPrice)) && Number(sellingPrice) > 0 ? Number(sellingPrice) : null;
  const profit = totalCost !== null && price !== null ? price - totalCost : null;

  const submit = form.handleSubmit(async (values) => {
    if (ingredientError || ingredientLoading) return;
    let invalid = false;
    values.recipe.forEach((line, index) => {
      const ingredient = ingredients.find((entry) => String(entry.id) === line.ingredientId);
      if (!ingredient) {
        form.setError(`recipe.${index}.ingredientId`, { message: 'This ingredient is no longer available. Choose another.' });
        invalid = true;
      } else if (!compatibleUnits(ingredient.purchaseUnit).includes(line.unit)) {
        form.setError(`recipe.${index}.unit`, { message: 'Choose a compatible unit.' });
        invalid = true;
      }
    });
    if (invalid) return;
    setSaveError(false);
    try {
      await onSave({
        name: values.name.trim(),
        sellingPrice: Number(values.sellingPrice),
        recipe: values.recipe.map((line) => ({ ingredientId: Number(line.ingredientId), quantity: Number(line.quantity), unit: line.unit })),
      });
    } catch {
      setSaveError(true);
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={submit} noValidate className="mt-5">
        <div className="grid grid-cols-[1fr_200px] gap-4">
          <div>
            <label htmlFor="menu-item-name" className={labelClass}>Menu item name <span className="text-[hsl(var(--accent))]">*</span></label>
            <input id="menu-item-name" data-testid="input-menu-item-name" autoFocus maxLength={160} placeholder="The name on your menu" className={fieldClass} aria-invalid={!!errors.name} {...form.register('name')} />
            {errors.name && <p role="alert" className="mt-1 text-[11px] text-[hsl(var(--destructive))]">{errors.name.message}</p>}
          </div>
          <div>
            <label htmlFor="menu-selling-price" className={labelClass}>Selling price <span className="text-[hsl(var(--accent))]">*</span></label>
            <div className="relative"><span className="pointer-events-none absolute left-3.5 top-[17px] text-[13px] text-[hsl(var(--muted-foreground))]">$</span><input id="menu-selling-price" data-testid="input-menu-selling-price" type="number" min="0.01" step="0.01" placeholder="0.00" className={`${fieldClass} pl-7`} aria-invalid={!!errors.sellingPrice} {...form.register('sellingPrice')} /></div>
            {errors.sellingPrice && <p role="alert" className="mt-1 text-[11px] text-[hsl(var(--destructive))]">{errors.sellingPrice.message}</p>}
          </div>
        </div>

        <div className="mt-7 border-t border-[hsl(var(--border))] pt-5">
          <div className="flex items-start justify-between gap-4">
            <div><p className="font-data text-[9px] font-bold uppercase tracking-[.18em] text-[hsl(var(--accent))]">The plate, measured</p><h3 className="mt-1 font-display text-[23px] tracking-[-.025em]">Recipe ingredients</h3><p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">Costs follow the current purchase price of each ingredient.</p></div>
            <button type="button" data-testid="button-add-recipe-ingredient" disabled={isSubmitting || ingredientError || ingredientLoading || !ingredients.length} onClick={() => append({ ingredientId: '', quantity: '', unit: 'each' })} className={secondaryButton}><Plus size={14} /> Add Ingredient</button>
          </div>
          {ingredientLoading ? (
            <div data-testid="loading-menu-ingredients" className="mt-5 space-y-3" aria-label="Loading ingredients">{[0, 1].map((n) => <div key={n} className="h-12 animate-pulse rounded-lg bg-[hsl(var(--muted))]" />)}</div>
          ) : ingredientError ? (
            <div data-testid="error-menu-ingredients" className="mt-5 rounded-xl border border-[hsl(var(--destructive)/.25)] bg-[hsl(var(--destructive)/.05)] p-4 text-[12px]">Ingredients couldn’t be loaded. Recipe costs can’t be checked until they’re available. <button type="button" data-testid="button-retry-menu-ingredients" onClick={retryIngredients} className="ml-2 font-semibold text-[hsl(var(--primary))] underline">Try again</button></div>
          ) : !ingredients.length ? (
            <div data-testid="empty-menu-ingredients" className="mt-5 rounded-xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.3)] p-5 text-[12px] text-[hsl(var(--muted-foreground))]">A recipe needs ingredients first. <Link href="/ingredients" data-testid="link-menu-add-ingredients" className="font-semibold text-[hsl(var(--primary))] underline">Add ingredients in your inventory</Link>, then come back to build this plate.</div>
          ) : null}
          {fields.length > 0 && (
            <div className="mt-5 overflow-x-auto">
              <div className="min-w-[660px]">
                <div className="grid grid-cols-[minmax(0,2fr)_90px_105px_115px_36px] gap-2 px-2 pb-2 font-data text-[9px] font-bold uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]"><span>Ingredient</span><span>Quantity</span><span>Unit</span><span className="text-right">Ingredient cost</span><span className="sr-only">Remove</span></div>
                <div className="space-y-2">
                  {fields.map((field, index) => {
                    const row = rows[index];
                    const selected = ingredients.find((entry) => String(entry.id) === row?.ingredientId);
                    const missing = row?.ingredientId && !selected;
                    const options = selected ? compatibleUnits(selected.purchaseUnit) : [];
                    const registration = form.register(`recipe.${index}.ingredientId`);
                    return <div key={field.id} data-testid={`row-recipe-${index}`} className="grid grid-cols-[minmax(0,2fr)_90px_105px_115px_36px] items-start gap-2 rounded-lg border border-[hsl(var(--border)/.7)] bg-[hsl(var(--secondary)/.18)] p-2">
                      <div><select aria-label={`Ingredient ${index + 1}`} data-testid={`select-recipe-ingredient-${index}`} className={`${fieldClass} mt-0 h-10 px-2`} {...registration} onChange={(event) => { registration.onChange(event); const ingredient = ingredients.find((entry) => String(entry.id) === event.target.value); form.setValue(`recipe.${index}.unit`, ingredient?.purchaseUnit ?? 'each', { shouldValidate: true }); }}>
                        <option value="">Choose ingredient</option>
                        {missing && <option value={row.ingredientId}>Unavailable ingredient (replace)</option>}
                        {ingredients.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
                      </select>{errors.recipe?.[index]?.ingredientId && <p role="alert" className="mt-1 text-[10px] text-[hsl(var(--destructive))]">{errors.recipe[index]?.ingredientId?.message}</p>}</div>
                      <div><input aria-label={`Quantity ${index + 1}`} data-testid={`input-recipe-quantity-${index}`} type="number" min="0" step="any" placeholder="0" className={`${fieldClass} mt-0 h-10 px-2`} {...form.register(`recipe.${index}.quantity`)} />{errors.recipe?.[index]?.quantity && <p role="alert" className="mt-1 text-[10px] text-[hsl(var(--destructive))]">{errors.recipe[index]?.quantity?.message}</p>}</div>
                      <div><select aria-label={`Unit ${index + 1}`} data-testid={`select-recipe-unit-${index}`} disabled={!selected} className={`${fieldClass} mt-0 h-10 px-2`} {...form.register(`recipe.${index}.unit`)}>
                        {!selected && <option value={row?.unit ?? 'each'}>{row?.unit ?? '—'}</option>}
                        {options.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                      </select>{errors.recipe?.[index]?.unit && <p role="alert" className="mt-1 text-[10px] text-[hsl(var(--destructive))]">{errors.recipe[index]?.unit?.message}</p>}</div>
                      <span data-testid={`text-recipe-ingredient-cost-${index}`} className="pt-3 text-right font-data text-[11px] tabular-nums">{rowCosts[index] === null ? '—' : money.format(rowCosts[index]!)}</span>
                      <button type="button" data-testid={`button-remove-recipe-ingredient-${index}`} aria-label={`Remove recipe row ${index + 1}`} onClick={() => remove(index)} disabled={isSubmitting} className="flex h-10 w-9 items-center justify-center rounded-md text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--destructive)/.08)] hover:text-[hsl(var(--destructive))]"><Trash2 size={14} /></button>
                    </div>;
                  })}
                </div>
              </div>
            </div>
          )}
          {errors.recipe?.root && <p role="alert" className="mt-2 text-[11px] text-[hsl(var(--destructive))]">{errors.recipe.root.message}</p>}
          {!fields.length && ingredients.length > 0 && <p data-testid="empty-recipe" className="mt-5 rounded-lg border border-dashed border-[hsl(var(--border))] px-4 py-5 text-center text-[12px] text-[hsl(var(--muted-foreground))]">No ingredients in this recipe yet. Add one to see what this plate earns.</p>}
        </div>

        <div className="mt-6 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.35)] p-5">
          <p className="font-data text-[9px] font-bold uppercase tracking-[.18em] text-[hsl(var(--muted-foreground))]">Live plate economics</p>
          <div className="mt-4 grid grid-cols-5 divide-x divide-[hsl(var(--border))]">
            {[
              ['Total Ingredient Cost', totalCost === null ? '—' : money.format(totalCost), 'total-ingredient-cost'],
              ['Selling Price', price === null ? '—' : money.format(price), 'selling-price'],
              ['Profit', profit === null ? '—' : money.format(profit), 'profit'],
              ['Food Cost %', totalCost === null || price === null ? '—' : `${percent.format(totalCost / price * 100)}%`, 'food-cost-percent'],
              ['Profit Margin %', profit === null || price === null ? '—' : `${percent.format(profit / price * 100)}%`, 'profit-margin-percent'],
            ].map(([label, value, id], index) => <div key={id} className={`${index ? 'pl-4' : ''} pr-3`}><p className="min-h-8 text-[10px] leading-tight text-[hsl(var(--muted-foreground))]">{label}</p><p data-testid={`text-live-${id}`} className={`mt-1 font-display text-[20px] tracking-[-.03em] ${id === 'profit' && profit !== null && profit < 0 ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--foreground))]'}`}>{value}</p></div>)}
          </div>
        </div>
        {saveError && <p role="alert" data-testid="error-save-menu-item" className="mt-4 rounded-lg border border-[hsl(var(--destructive)/.25)] bg-[hsl(var(--destructive)/.06)] px-3 py-2.5 text-[12px] text-[hsl(var(--destructive))]">We couldn’t save this menu item. Check the recipe and try again.</p>}
        <div className="mt-6 flex justify-end gap-2 border-t border-[hsl(var(--border))] pt-5">
          <button type="button" data-testid="button-cancel-menu-item" onClick={onCancel} disabled={isSubmitting} className={secondaryButton}>Cancel</button>
          <button type="submit" data-testid="button-save-menu-item" disabled={isSubmitting || ingredientLoading || ingredientError || !ingredients.length} className={primaryButton}>{isSubmitting ? 'Saving…' : item ? 'Save changes' : 'Add menu item'}</button>
        </div>
      </form>
    </Form>
  );
}

export default function Menu() {
  const queryClient = useQueryClient();
  const { data: items, isLoading, isError, refetch } = useListMenuItems();
  const { data: ingredients, isLoading: ingredientLoading, isError: ingredientError, refetch: refetchIngredients } = useListIngredients();
  const create = useCreateMenuItem();
  const update = useUpdateMenuItem();
  const remove = useDeleteMenuItem();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [deleting, setDeleting] = useState<MenuItem | null>(null);
  const [deleteError, setDeleteError] = useState(false);
  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (item: MenuItem) => { setEditing(item); setFormOpen(true); };
  const save = async (data: MenuItemInput) => {
    if (editing) await update.mutateAsync({ id: editing.id, data });
    else await create.mutateAsync({ data });
    await queryClient.invalidateQueries({ queryKey: getListMenuItemsQueryKey() });
    await queryClient.invalidateQueries({ queryKey: getGetWorkspaceHistoryQueryKey() });
    setFormOpen(false);
    setEditing(null);
  };
  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteError(false);
    try {
      await remove.mutateAsync({ id: deleting.id });
      await queryClient.invalidateQueries({ queryKey: getListMenuItemsQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getGetWorkspaceHistoryQueryKey() });
      setDeleting(null);
    } catch {
      setDeleteError(true);
    }
  };

  return <div className="animate-enter">
    <div className="mb-9 flex items-end justify-between gap-6">
      <div><p className="font-data text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--accent))]">Your offering</p><h1 className="mt-2 font-display text-[42px] leading-[1.05] tracking-[-.035em]">Menu</h1><p className="mt-3 max-w-[560px] text-[14px] leading-relaxed text-[hsl(var(--muted-foreground))]">See each dish as a complete picture: the ingredients behind it and the margin it needs to earn.</p></div>
      <button type="button" data-testid="button-add-menu-item" onClick={openCreate} className={primaryButton}><Plus size={16} strokeWidth={1.8} /> Add menu item</button>
    </div>
    {isLoading ? <section data-testid="loading-menu-items" aria-label="Loading menu items" className="overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.75)]"><div className="border-b border-[hsl(var(--border))] px-6 py-5"><div className="h-4 w-36 animate-pulse rounded bg-[hsl(var(--muted))]" /></div>{[0, 1, 2, 3].map((n) => <div key={n} className="flex gap-8 border-b border-[hsl(var(--border)/.6)] px-6 py-5">{[24, 15, 15, 14, 14, 10].map((width, index) => <div key={index} style={{ width: `${width}%` }} className="h-4 animate-pulse rounded bg-[hsl(var(--muted))]" />)}</div>)}</section>
    : isError ? <section data-testid="error-menu-items" className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.75)] px-8 py-16 text-center"><h2 className="font-display text-[25px]">The menu couldn’t be loaded.</h2><p className="mt-2 text-[13px] text-[hsl(var(--muted-foreground))]">Your recipes are safe. Check your connection and try again.</p><button type="button" data-testid="button-retry-menu-items" onClick={() => { void refetch(); }} className={`${secondaryButton} mt-5`}><RotateCcw size={14} /> Try again</button></section>
    : !items?.length ? <section data-testid="empty-menu" className="paper-grid relative flex min-h-[340px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card)/.68)] px-8 text-center"><div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><UtensilsCrossed size={26} strokeWidth={1.5} /></div><h2 className="font-display text-[25px] tracking-[-.025em]">The menu is yours to shape.</h2><p data-testid="empty-menu-message" className="mt-2 text-[13px] text-[hsl(var(--muted-foreground))]">No menu items have been created yet. Build a recipe to see the real cost of a plate.</p><button type="button" data-testid="button-add-first-menu-item" onClick={openCreate} className={`${secondaryButton} mt-6`}><Plus size={14} /> Add your first menu item</button>{!ingredientLoading && !ingredientError && !ingredients?.length && <p className="mt-4 text-[12px] text-[hsl(var(--muted-foreground))]">Need ingredients first? <Link href="/ingredients" data-testid="link-empty-menu-ingredients" className="font-semibold text-[hsl(var(--primary))] underline">Start in Ingredients</Link>.</p>}</section>
    : <section className="overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.84)] shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-6 py-4"><div><h2 className="font-display text-[22px] tracking-[-.025em]">Your menu ledger</h2><p data-testid="text-menu-item-count" className="mt-0.5 text-[11px] text-[hsl(var(--muted-foreground))]">{items.length} {items.length === 1 ? 'plate' : 'plates'} recorded</p></div><span className="flex items-center gap-2 font-data text-[9px] uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]"><BookOpen size={14} /> Based on current ingredient costs</span></div>
      <table data-testid="table-menu-items" className="w-full table-fixed border-collapse text-left">
        <colgroup><col className="w-[29%]" /><col className="w-[15%]" /><col className="w-[16%]" /><col className="w-[15%]" /><col className="w-[16%]" /><col className="w-[9%]" /></colgroup>
        <thead className="bg-[hsl(var(--secondary)/.38)]"><tr>{['Menu Item', 'Selling Price', 'Recipe Cost', 'Profit', 'Profit Margin %', 'Actions'].map((heading) => <th key={heading} scope="col" className="px-3 py-3.5 first:pl-6 last:pr-5 font-data text-[9px] font-bold uppercase leading-snug tracking-[.07em] text-[hsl(var(--muted-foreground))]">{heading}</th>)}</tr></thead>
        <tbody className="divide-y divide-[hsl(var(--border)/.72)]">{items.map((item) => <tr key={item.id} data-testid={`row-menu-item-${item.id}`} className="transition-colors hover:bg-[hsl(var(--secondary)/.18)]">
          <td data-testid={`text-menu-item-name-${item.id}`} className="break-words py-4 pl-6 pr-3 text-[12px] font-semibold">{item.name}<span className="mt-1 block text-[10px] font-normal text-[hsl(var(--muted-foreground))]">{item.recipe.length} {item.recipe.length === 1 ? 'ingredient' : 'ingredients'}</span></td>
          <td data-testid={`text-menu-selling-price-${item.id}`} className="px-3 py-4 font-data text-[11px] tabular-nums">{money.format(item.sellingPrice)}</td>
          <td data-testid={`text-menu-recipe-cost-${item.id}`} className="px-3 py-4 font-data text-[11px] tabular-nums">{money.format(item.recipeCost)}</td>
          <td data-testid={`text-menu-profit-${item.id}`} className={`px-3 py-4 font-data text-[11px] tabular-nums ${item.profit < 0 ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--primary))]'}`}>{money.format(item.profit)}</td>
          <td data-testid={`text-menu-profit-margin-${item.id}`} className={`px-3 py-4 font-data text-[11px] tabular-nums ${item.profitMarginPercent < 0 ? 'text-[hsl(var(--destructive))]' : ''}`}>{percent.format(item.profitMarginPercent)}%</td>
          <td className="py-3 pl-3 pr-5"><div className="flex items-center gap-0.5"><button type="button" data-testid={`button-edit-menu-item-${item.id}`} aria-label={`Edit ${item.name}`} title="Edit recipe" onClick={() => openEdit(item)} className="rounded-md p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--primary))]"><Pencil size={14} /></button><button type="button" data-testid={`button-delete-menu-item-${item.id}`} aria-label={`Delete ${item.name}`} title="Delete" onClick={() => { setDeleteError(false); setDeleting(item); }} className="rounded-md p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--destructive)/.08)] hover:text-[hsl(var(--destructive))]"><Trash2 size={14} /></button></div></td>
        </tr>)}</tbody>
      </table>
    </section>}
    <Dialog open={formOpen} onOpenChange={(open) => { if (!open && (create.isPending || update.isPending)) return; setFormOpen(open); if (!open) setEditing(null); }}>
      <DialogContent className="max-h-[90dvh] max-w-[850px] overflow-y-auto border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 shadow-[var(--shadow-lift)]">
        <DialogHeader><p className="font-data text-[9px] font-bold uppercase tracking-[.18em] text-[hsl(var(--accent))]">Plate economics</p><DialogTitle className="font-display text-[29px] font-medium tracking-[-.03em]">{editing ? 'Edit menu item' : 'Add a menu item'}</DialogTitle><DialogDescription className="text-[12px] text-[hsl(var(--muted-foreground))]">Build the recipe from your ingredient ledger. The numbers will follow as you go.</DialogDescription></DialogHeader>
        {formOpen && <RecipeEditor key={editing ? `edit-${editing.id}` : 'create'} item={editing} ingredients={ingredients ?? []} ingredientError={ingredientError} ingredientLoading={ingredientLoading} retryIngredients={() => { void refetchIngredients(); }} onSave={save} onCancel={() => setFormOpen(false)} />}
      </DialogContent>
    </Dialog>
    <AlertDialog open={!!deleting} onOpenChange={(open) => { if (!open && !remove.isPending) { setDeleting(null); setDeleteError(false); } }}>
      <AlertDialogContent className="border-[hsl(var(--border))] bg-[hsl(var(--card))]"><AlertDialogHeader><AlertDialogTitle className="font-display text-[27px] font-medium">Remove this menu item?</AlertDialogTitle><AlertDialogDescription className="text-[13px] leading-relaxed">“{deleting?.name}” and its recipe will be removed from your menu. This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
        {deleteError && <p role="alert" data-testid="error-delete-menu-item" className="rounded-lg bg-[hsl(var(--destructive)/.07)] p-3 text-[12px] text-[hsl(var(--destructive))]">We couldn’t remove this menu item. Please try again.</p>}
        <AlertDialogFooter><AlertDialogCancel data-testid="button-cancel-delete-menu-item" disabled={remove.isPending} className={secondaryButton}>Keep menu item</AlertDialogCancel><AlertDialogAction data-testid="button-confirm-delete-menu-item" disabled={remove.isPending} onClick={(event) => { event.preventDefault(); void confirmDelete(); }} className="rounded-lg bg-[hsl(var(--destructive))] px-4 py-2 text-[12px] font-semibold text-[hsl(var(--destructive-foreground))] hover:bg-[hsl(var(--destructive)/.9)]">{remove.isPending ? 'Removing…' : 'Remove menu item'}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>;
}