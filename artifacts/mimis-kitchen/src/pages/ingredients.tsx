import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getListIngredientsQueryKey, useCreateIngredient, useDeleteIngredient, useListIngredients, useUpdateIngredient, type Ingredient, type IngredientInput, type IngredientUnit } from '@workspace/api-client-react';
import { ArrowRightLeft, Pencil, Plus, RotateCcw, Sprout, Trash2, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { compatibleUnits, convertCostPerUnit, convertQuantity, unitGroups } from '@/lib/ingredient-conversions';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const preciseMoney = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 4 });
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 });
const date = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const formSchema = z.object({
  name: z.string().trim().min(1, 'Enter an ingredient name.').max(160, 'Keep the name under 160 characters.'),
  purchaseQuantity: z.string().trim().min(1, 'Enter a purchase quantity.').refine((value) => Number.isFinite(Number(value)) && Number(value) > 0, 'Quantity must be greater than zero.'),
  purchaseUnit: z.enum(['lb', 'oz', 'gallon', 'quart', 'cup', 'fl oz', 'each']),
  purchasePrice: z.string().trim().min(1, 'Enter a purchase price.').regex(/^\d+(?:\.\d{1,2})?$/, 'Use a non-negative price with at most two decimal places.'),
  supplier: z.string().trim().max(160, 'Keep the supplier under 160 characters.'),
});
type FormValues = z.infer<typeof formSchema>;

const fieldClass = 'mt-1.5 h-11 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3.5 text-[13px] text-[hsl(var(--foreground))] outline-none transition-colors placeholder:text-[hsl(var(--muted-foreground)/.65)] focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/.12)]';
const labelClass = 'block text-[12px] font-semibold text-[hsl(var(--foreground))]';
const secondaryButton = 'inline-flex items-center justify-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3.5 py-2 text-[12px] font-semibold text-[hsl(var(--foreground))] transition-colors hover:border-[hsl(var(--primary)/.5)] hover:text-[hsl(var(--primary))] disabled:cursor-not-allowed disabled:opacity-50';
const primaryButton = 'inline-flex items-center justify-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-[12px] font-semibold text-[hsl(var(--primary-foreground))] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50';

function IngredientForm({ ingredient, onSave, onCancel }: {
  ingredient: Ingredient | null;
  onSave: (data: IngredientInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [saveError, setSaveError] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: ingredient?.name ?? '',
      purchaseQuantity: ingredient ? String(ingredient.purchaseQuantity) : '',
      purchaseUnit: ingredient?.purchaseUnit ?? 'lb',
      purchasePrice: ingredient ? ingredient.purchasePrice.toFixed(2) : '',
      supplier: ingredient?.supplier ?? '',
    },
  });
  const { errors, isSubmitting } = form.formState;
  const submit = form.handleSubmit(async (values) => {
    setSaveError(false);
    try {
      await onSave({
        name: values.name.trim(),
        purchaseQuantity: Number(values.purchaseQuantity),
        purchaseUnit: values.purchaseUnit,
        purchasePrice: Number(values.purchasePrice),
        supplier: values.supplier.trim() || null,
      });
    } catch {
      setSaveError(true);
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={submit} noValidate className="mt-6 space-y-5">
        <div>
          <label htmlFor="ingredient-name" className={labelClass}>Ingredient name <span className="text-[hsl(var(--accent))]">*</span></label>
          <input id="ingredient-name" data-testid="input-ingredient-name" autoFocus maxLength={160} placeholder="e.g. Roma tomatoes" className={fieldClass} aria-invalid={!!errors.name} {...form.register('name')} />
          {errors.name && <p role="alert" className="mt-1.5 text-[11px] text-[hsl(var(--destructive))]">{errors.name.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="ingredient-quantity" className={labelClass}>Purchase quantity <span className="text-[hsl(var(--accent))]">*</span></label>
            <input id="ingredient-quantity" data-testid="input-ingredient-quantity" type="number" min="0" step="any" placeholder="0" className={fieldClass} aria-invalid={!!errors.purchaseQuantity} {...form.register('purchaseQuantity')} />
            {errors.purchaseQuantity && <p role="alert" className="mt-1.5 text-[11px] text-[hsl(var(--destructive))]">{errors.purchaseQuantity.message}</p>}
          </div>
          <div>
            <label htmlFor="ingredient-unit" className={labelClass}>Purchase unit <span className="text-[hsl(var(--accent))]">*</span></label>
            <select id="ingredient-unit" data-testid="select-ingredient-unit" className={fieldClass} {...form.register('purchaseUnit')}>
              {Object.entries(unitGroups).map(([group, units]) => <optgroup key={group} label={group}>{units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}</optgroup>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="ingredient-price" className={labelClass}>Purchase price <span className="text-[hsl(var(--accent))]">*</span></label>
            <div className="relative"><span className="pointer-events-none absolute left-3.5 top-[17px] text-[13px] text-[hsl(var(--muted-foreground))]">$</span><input id="ingredient-price" data-testid="input-ingredient-price" type="number" min="0" step="0.01" placeholder="0.00" className={`${fieldClass} pl-7`} aria-invalid={!!errors.purchasePrice} {...form.register('purchasePrice')} /></div>
            {errors.purchasePrice && <p role="alert" className="mt-1.5 text-[11px] text-[hsl(var(--destructive))]">{errors.purchasePrice.message}</p>}
          </div>
          <div>
            <label htmlFor="ingredient-supplier" className={labelClass}>Supplier <span className="font-normal text-[hsl(var(--muted-foreground))]">optional</span></label>
            <input id="ingredient-supplier" data-testid="input-ingredient-supplier" maxLength={160} placeholder="Where you buy it" className={fieldClass} aria-invalid={!!errors.supplier} {...form.register('supplier')} />
            {errors.supplier && <p role="alert" className="mt-1.5 text-[11px] text-[hsl(var(--destructive))]">{errors.supplier.message}</p>}
          </div>
        </div>
        <p className="rounded-lg bg-[hsl(var(--secondary)/.48)] px-3.5 py-3 text-[11px] leading-relaxed text-[hsl(var(--muted-foreground))]">Cost per unit is calculated from purchase price and quantity. Last updated is set by the kitchen ledger when you add an ingredient or change its price.</p>
        {saveError && <p role="alert" data-testid="error-save-ingredient" className="rounded-lg border border-[hsl(var(--destructive)/.25)] bg-[hsl(var(--destructive)/.06)] px-3 py-2.5 text-[12px] text-[hsl(var(--destructive))]">We couldn’t save this ingredient. Please check the details and try again.</p>}
        <div className="flex justify-end gap-2 border-t border-[hsl(var(--border))] pt-5">
          <button type="button" data-testid="button-cancel-ingredient" onClick={onCancel} disabled={isSubmitting} className={secondaryButton}>Cancel</button>
          <button type="submit" data-testid="button-save-ingredient" disabled={isSubmitting} className={primaryButton}>{isSubmitting ? 'Saving…' : ingredient ? 'Save changes' : 'Add ingredient'}</button>
        </div>
      </form>
    </Form>
  );
}

function ConversionPanel({ ingredient, onClose }: { ingredient: Ingredient; onClose: () => void }) {
  const [target, setTarget] = useState<IngredientUnit>(ingredient.purchaseUnit);
  const quantity = convertQuantity(ingredient.purchaseQuantity, ingredient.purchaseUnit, target);
  const cost = convertCostPerUnit(ingredient.purchasePrice, ingredient.purchaseQuantity, ingredient.purchaseUnit, target);
  return (
    <section data-testid="panel-ingredient-conversion" className="animate-enter mt-5 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.84)] p-6 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-data text-[9px] font-bold uppercase tracking-[.18em] text-[hsl(var(--accent))]">Measure & compare</p>
          <h2 className="mt-1 font-display text-[24px] tracking-[-.025em]">{ingredient.name}</h2>
          <p className="mt-1 text-[12px] text-[hsl(var(--muted-foreground))]">A different way to read the same purchase. No cross-type conversions.</p>
        </div>
        <button type="button" data-testid="button-close-conversion" aria-label="Close conversion" onClick={onClose} className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]"><X size={17} /></button>
      </div>
      <div className="mt-6 grid grid-cols-[1fr_32px_1fr] items-center gap-4">
        <div className="rounded-xl bg-[hsl(var(--secondary)/.45)] p-4">
          <p className="font-data text-[9px] uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">Purchased as</p>
          <p data-testid="text-conversion-source" className="mt-2 font-display text-[23px]">{number.format(ingredient.purchaseQuantity)} <span className="text-[15px]">{ingredient.purchaseUnit}</span></p>
          <p className="mt-1 text-[12px] text-[hsl(var(--muted-foreground))]">{money.format(ingredient.purchasePrice)} total</p>
        </div>
        <ArrowRightLeft size={18} className="text-[hsl(var(--accent))]" />
        <div className="rounded-xl border border-[hsl(var(--border))] p-4">
          <label htmlFor="conversion-target" className="font-data text-[9px] uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">Convert to</label>
          <select id="conversion-target" data-testid="select-conversion-target" value={target} onChange={(event) => setTarget(event.target.value as IngredientUnit)} className="ml-3 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-2 py-1 text-[12px] outline-none focus:border-[hsl(var(--primary))]">
            {compatibleUnits(ingredient.purchaseUnit).map((unit) => <option key={unit} value={unit}>{unit}</option>)}
          </select>
          <p data-testid="text-converted-quantity" className="mt-2 font-display text-[23px]">{quantity === null ? '—' : number.format(quantity)} <span className="text-[15px]">{target}</span></p>
          <p data-testid="text-converted-cost" className="mt-1 text-[12px] text-[hsl(var(--primary))]">{cost === null ? 'Not available' : `${preciseMoney.format(cost)} per ${target}`}</p>
        </div>
      </div>
    </section>
  );
}

export default function Ingredients() {
  const queryClient = useQueryClient();
  const { data: ingredients, isLoading, isError, refetch } = useListIngredients();
  const create = useCreateIngredient();
  const update = useUpdateIngredient();
  const remove = useDeleteIngredient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [deleting, setDeleting] = useState<Ingredient | null>(null);
  const [deleteError, setDeleteError] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = ingredients?.find((ingredient) => ingredient.id === selectedId);

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (ingredient: Ingredient) => { setEditing(ingredient); setFormOpen(true); };
  const save = async (data: IngredientInput) => {
    if (editing) await update.mutateAsync({ id: editing.id, data });
    else await create.mutateAsync({ data });
    await queryClient.invalidateQueries({ queryKey: getListIngredientsQueryKey() });
    setFormOpen(false);
    setEditing(null);
  };
  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteError(false);
    try {
      await remove.mutateAsync({ id: deleting.id });
      await queryClient.invalidateQueries({ queryKey: getListIngredientsQueryKey() });
      if (selectedId === deleting.id) setSelectedId(null);
      setDeleting(null);
    } catch {
      setDeleteError(true);
    }
  };

  return (
    <div className="animate-enter">
      <div className="mb-9 flex items-end justify-between gap-6">
        <div>
          <p className="font-data text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--accent))]">Kitchen inventory</p>
          <h1 className="mt-2 font-display text-[42px] leading-[1.05] tracking-[-.035em]">Ingredients</h1>
          <p className="mt-3 max-w-[560px] text-[14px] leading-relaxed text-[hsl(var(--muted-foreground))]">Keep the building blocks of every menu item in one measured, easy-to-review place.</p>
        </div>
        <button type="button" data-testid="button-add-ingredient" onClick={openCreate} className={primaryButton}><Plus size={16} strokeWidth={1.8} /> Add ingredient</button>
      </div>

      {isLoading ? (
        <section data-testid="loading-ingredients" aria-label="Loading ingredients" className="overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.75)]">
          <div className="border-b border-[hsl(var(--border))] px-6 py-5"><div className="h-4 w-36 animate-pulse rounded bg-[hsl(var(--muted))]" /></div>
          {[0, 1, 2, 3].map((row) => <div key={row} className="flex gap-8 border-b border-[hsl(var(--border)/.6)] px-6 py-5">{[28, 14, 10, 14, 12, 17].map((width, index) => <div key={index} style={{ width: `${width}%` }} className="h-4 animate-pulse rounded bg-[hsl(var(--muted))]" />)}</div>)}
        </section>
      ) : isError ? (
        <section data-testid="error-ingredients" className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.75)] px-8 py-16 text-center">
          <h2 className="font-display text-[25px]">The ingredient list couldn’t be loaded.</h2>
          <p className="mt-2 text-[13px] text-[hsl(var(--muted-foreground))]">Your entries are safe. Check your connection and try again.</p>
          <button type="button" data-testid="button-retry-ingredients" onClick={() => { void refetch(); }} className={`${secondaryButton} mt-5`}><RotateCcw size={14} /> Try again</button>
        </section>
      ) : !ingredients?.length ? (
        <section data-testid="empty-ingredients" className="paper-grid relative flex min-h-[340px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card)/.68)] px-8 text-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><Sprout size={26} strokeWidth={1.5} /></div>
          <h2 className="font-display text-[25px] tracking-[-.025em]">A clean shelf, for now.</h2>
          <p data-testid="empty-ingredients-message" className="mt-2 text-[13px] text-[hsl(var(--muted-foreground))]">No ingredients have been added yet.</p>
          <button type="button" data-testid="button-add-first-ingredient" onClick={openCreate} className={`${secondaryButton} mt-6`}><Plus size={14} /> Add your first ingredient</button>
        </section>
      ) : (
        <>
          <section className="overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.84)] shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-6 py-4">
              <div><h2 className="font-display text-[22px] tracking-[-.025em]">Your ingredient ledger</h2><p data-testid="text-ingredient-count" className="mt-0.5 text-[11px] text-[hsl(var(--muted-foreground))]">{ingredients.length} {ingredients.length === 1 ? 'ingredient' : 'ingredients'} recorded</p></div>
              <p className="font-data text-[9px] uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">Cost is calculated per purchase unit</p>
            </div>
            <table data-testid="table-ingredients" className="w-full table-fixed border-collapse text-left">
              <colgroup><col className="w-[19%]" /><col className="w-[12%]" /><col className="w-[10%]" /><col className="w-[12%]" /><col className="w-[12%]" /><col className="w-[13%]" /><col className="w-[12%]" /><col className="w-[10%]" /></colgroup>
              <thead className="bg-[hsl(var(--secondary)/.38)]"><tr>{['Ingredient Name', 'Purchase Quantity', 'Purchase Unit', 'Purchase Price', 'Cost Per Unit', 'Supplier', 'Last Updated', 'Actions'].map((heading) => <th key={heading} scope="col" className="px-3 py-3.5 first:pl-6 last:pr-5 font-data text-[9px] font-bold uppercase leading-snug tracking-[.07em] text-[hsl(var(--muted-foreground))]">{heading}</th>)}</tr></thead>
              <tbody className="divide-y divide-[hsl(var(--border)/.72)]">
                {ingredients.map((ingredient) => <tr key={ingredient.id} data-testid={`row-ingredient-${ingredient.id}`} className="transition-colors hover:bg-[hsl(var(--secondary)/.18)]">
                  <td data-testid={`text-ingredient-name-${ingredient.id}`} className="break-words py-4 pl-6 pr-3 text-[12px] font-semibold">{ingredient.name}</td>
                  <td className="px-3 py-4 font-data text-[11px] tabular-nums">{number.format(ingredient.purchaseQuantity)}</td>
                  <td className="px-3 py-4 text-[12px]">{ingredient.purchaseUnit}</td>
                  <td className="px-3 py-4 font-data text-[11px] tabular-nums">{money.format(ingredient.purchasePrice)}</td>
                  <td data-testid={`text-ingredient-cost-${ingredient.id}`} className="px-3 py-4 font-data text-[11px] tabular-nums text-[hsl(var(--primary))]">{preciseMoney.format(ingredient.costPerUnit)}</td>
                  <td className="break-words px-3 py-4 text-[11px] text-[hsl(var(--muted-foreground))]">{ingredient.supplier || '—'}</td>
                  <td className="px-3 py-4 text-[11px] text-[hsl(var(--muted-foreground))]">{Number.isNaN(new Date(ingredient.lastUpdated).getTime()) ? '—' : date.format(new Date(ingredient.lastUpdated))}</td>
                  <td className="py-3 pl-3 pr-5"><div className="flex items-center gap-0.5">
                    <button type="button" data-testid={`button-convert-ingredient-${ingredient.id}`} aria-label={`Convert ${ingredient.name}`} title="Convert units" onClick={() => setSelectedId(ingredient.id)} className="rounded-md p-1.5 text-[hsl(var(--primary))] hover:bg-[hsl(var(--secondary))]"><ArrowRightLeft size={14} /></button>
                    <button type="button" data-testid={`button-edit-ingredient-${ingredient.id}`} aria-label={`Edit ${ingredient.name}`} title="Edit" onClick={() => openEdit(ingredient)} className="rounded-md p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--primary))]"><Pencil size={14} /></button>
                    <button type="button" data-testid={`button-delete-ingredient-${ingredient.id}`} aria-label={`Delete ${ingredient.name}`} title="Delete" onClick={() => { setDeleteError(false); setDeleting(ingredient); }} className="rounded-md p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--destructive)/.08)] hover:text-[hsl(var(--destructive))]"><Trash2 size={14} /></button>
                  </div></td>
                </tr>)}
              </tbody>
            </table>
          </section>
          {selected && <ConversionPanel key={`${selected.id}-${selected.purchaseUnit}`} ingredient={selected} onClose={() => setSelectedId(null)} />}
        </>
      )}

      <Dialog open={formOpen} onOpenChange={(open) => { if (!open && (create.isPending || update.isPending)) return; setFormOpen(open); if (!open) setEditing(null); }}>
        <DialogContent className="max-w-[560px] border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 shadow-[var(--shadow-lift)]">
          <DialogHeader><p className="font-data text-[9px] font-bold uppercase tracking-[.18em] text-[hsl(var(--accent))]">Kitchen inventory</p><DialogTitle className="font-display text-[29px] font-medium tracking-[-.03em]">{editing ? 'Edit ingredient' : 'Add an ingredient'}</DialogTitle><DialogDescription className="text-[12px] text-[hsl(var(--muted-foreground))]">Record the purchase as it appears on your invoice.</DialogDescription></DialogHeader>
          {formOpen && <IngredientForm key={editing ? `edit-${editing.id}` : 'create'} ingredient={editing} onSave={save} onCancel={() => setFormOpen(false)} />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => { if (!open && !remove.isPending) { setDeleting(null); setDeleteError(false); } }}>
        <AlertDialogContent className="border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <AlertDialogHeader><AlertDialogTitle className="font-display text-[27px] font-medium">Remove this ingredient?</AlertDialogTitle><AlertDialogDescription className="text-[13px] leading-relaxed">“{deleting?.name}” will be removed from your kitchen ledger. This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          {deleteError && <p role="alert" data-testid="error-delete-ingredient" className="rounded-lg bg-[hsl(var(--destructive)/.07)] p-3 text-[12px] text-[hsl(var(--destructive))]">We couldn’t remove this ingredient. Please try again.</p>}
          <AlertDialogFooter><AlertDialogCancel data-testid="button-cancel-delete" disabled={remove.isPending} className={secondaryButton}>Keep ingredient</AlertDialogCancel><AlertDialogAction data-testid="button-confirm-delete" disabled={remove.isPending} onClick={(event) => { event.preventDefault(); void confirmDelete(); }} className="rounded-lg bg-[hsl(var(--destructive))] px-4 py-2 text-[12px] font-semibold text-[hsl(var(--destructive-foreground))] hover:bg-[hsl(var(--destructive)/.9)]">{remove.isPending ? 'Removing…' : 'Remove ingredient'}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}