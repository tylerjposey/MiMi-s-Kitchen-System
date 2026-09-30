import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import {
  getListMenuItemsQueryKey,
  useUpdateMenuItemSellingPrice,
  type MenuItem,
} from '@workspace/api-client-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const percent = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fieldClass = 'mt-1.5 h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-[13px] text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/.12)] disabled:opacity-50';
const secondaryButton = 'rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-2.5 text-[12px] font-semibold hover:border-[hsl(var(--primary)/.5)] disabled:opacity-50';
const primaryButton = 'rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-[12px] font-semibold text-[hsl(var(--primary-foreground))] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50';

const schema = z.object({
  price: z.string().trim()
    .regex(/^\d+(?:\.\d{1,2})?$/, 'Use a price with at most two decimal places.')
    .refine((value) => Number(value) >= 0.01 && Number(value) <= 21_474_836.47, 'Enter a selling price of at least $0.01.'),
  increase: z.string().trim().refine((value) => value === '' || (Number.isFinite(Number(value)) && Number(value) >= 0), 'Enter a positive percentage or leave blank.'),
  decrease: z.string().trim().refine((value) => value === '' || (Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100), 'Enter a percentage from 0 to 100 or leave blank.'),
});
type ScenarioValues = z.infer<typeof schema>;

const formatMoney = (value: number) => Number.isFinite(value) ? money.format(value) : '—';
const formatPercent = (value: number) => Number.isFinite(value) ? `${percent.format(value)}%` : '—';
const formatProfitChange = (value: number) => Number.isFinite(value) ? `${value > 0.000001 ? '+' : ''}${money.format(value)}` : '—';
const formatMarginChange = (value: number) => Number.isFinite(value) ? `${value > 0.000001 ? '+' : ''}${percent.format(value)} percentage points` : '—';

function Value({ label, value, testId }: { label: string; value: string; testId: string }) {
  return <div>
    <p className="text-[10px] leading-tight text-[hsl(var(--muted-foreground))]">{label}</p>
    <p data-testid={testId} className="mt-1 font-display text-[20px] tabular-nums tracking-[-.02em]">{value}</p>
  </div>;
}

export default function WhatIfPricing({ item, onClose }: { item: MenuItem; onClose: () => void }) {
  const queryClient = useQueryClient();
  const update = useUpdateMenuItemSellingPrice();
  const [saveError, setSaveError] = useState(false);
  const form = useForm<ScenarioValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { price: item.sellingPrice.toFixed(2), increase: '', decrease: '' },
  });
  const priceInput = useWatch({ control: form.control, name: 'price' });
  const increaseInput = useWatch({ control: form.control, name: 'increase' });
  const decreaseInput = useWatch({ control: form.control, name: 'decrease' });
  const price = priceInput?.trim() ? Number(priceInput) : NaN;
  const increase = increaseInput?.trim() ? Number(increaseInput) : 0;
  const decrease = decreaseInput?.trim() ? Number(decreaseInput) : 0;
  const validPrice = /^\d+(?:\.\d{1,2})?$/.test(priceInput ?? '') && price >= 0.01 && price <= 21_474_836.47;
  const validIncrease = Number.isFinite(increase) && increase >= 0;
  const validDecrease = Number.isFinite(decrease) && decrease >= 0 && decrease <= 100;
  const projectedCost = validIncrease && validDecrease ? item.recipeCost * (1 + (increase - decrease) / 100) : NaN;
  const projectedProfit = validPrice ? price - projectedCost : NaN;
  const projectedFoodCost = validPrice ? projectedCost / price * 100 : NaN;
  const projectedMargin = validPrice ? projectedProfit / price * 100 : NaN;
  const validScenario = validPrice && validIncrease && validDecrease
    && Number.isFinite(projectedCost) && Number.isFinite(projectedProfit)
    && Number.isFinite(projectedFoodCost) && Number.isFinite(projectedMargin);

  const apply = form.handleSubmit(async (values) => {
    if (!validScenario || Number(values.price) === item.sellingPrice) return;
    setSaveError(false);
    try {
      // Only the selling price is sent. The recipe, ingredient records, and cost baseline are untouched.
      const saved = await update.mutateAsync({ id: item.id, data: { sellingPrice: Number(values.price) } });
      queryClient.setQueryData<MenuItem[]>(getListMenuItemsQueryKey(), (items) =>
        items?.map((entry) => entry.id === saved.id ? saved : entry));
      void queryClient.invalidateQueries({ queryKey: getListMenuItemsQueryKey() });
      onClose();
    } catch {
      setSaveError(true);
    }
  });

  return <Dialog open onOpenChange={(open) => { if (!open && !update.isPending) onClose(); }}>
    <DialogContent data-testid={`modal-what-if-${item.id}`} className="max-h-[90dvh] max-w-[740px] overflow-y-auto border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[var(--shadow-lift)] sm:p-7">
      <DialogHeader>
        <p className="font-data text-[9px] font-bold uppercase tracking-[.18em] text-[hsl(var(--accent))]">Pricing scenario / {item.name}</p>
        <DialogTitle className="font-display text-[29px] font-medium tracking-[-.03em]">What-If Pricing</DialogTitle>
        <DialogDescription className="text-[12px] leading-relaxed">Preview a new price and hypothetical ingredient cost changes. Nothing is saved unless you apply the new selling price.</DialogDescription>
      </DialogHeader>

      <section className="mt-5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.3)] p-4">
        <h3 className="font-data text-[10px] font-bold uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">Current values</h3>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Value label="Current Selling Price" value={formatMoney(item.sellingPrice)} testId={`text-what-if-current-price-${item.id}`} />
          <Value label="Current Ingredient Cost" value={formatMoney(item.recipeCost)} testId={`text-what-if-current-cost-${item.id}`} />
          <Value label="Current Profit" value={formatMoney(item.profit)} testId={`text-what-if-current-profit-${item.id}`} />
          <Value label="Current Food Cost %" value={formatPercent(item.foodCostPercent)} testId={`text-what-if-current-food-cost-${item.id}`} />
          <Value label="Current Profit Margin %" value={formatPercent(item.profitMarginPercent)} testId={`text-what-if-current-margin-${item.id}`} />
        </div>
      </section>

      <Form {...form}>
        <form onSubmit={(event) => { void apply(event); }} noValidate>
          <h3 className="mt-6 font-data text-[10px] font-bold uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">Try a scenario</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor={`scenario-price-${item.id}`} className="text-[12px] font-semibold">Proposed Selling Price</label>
              <input id={`scenario-price-${item.id}`} data-testid={`input-what-if-price-${item.id}`} type="number" min="0.01" step="0.01" disabled={update.isPending} aria-invalid={!validPrice} {...form.register('price', { onChange: () => setSaveError(false) })} className={fieldClass} />
              {!validPrice && <p role="alert" className="mt-1 text-[11px] text-[hsl(var(--destructive))]">Enter a price from $0.01 to $21,474,836.47 with at most two decimal places.</p>}
            </div>
            <div>
              <label htmlFor={`scenario-increase-${item.id}`} className="text-[12px] font-semibold">Ingredient Cost Increase % <span className="font-normal text-[hsl(var(--muted-foreground))]">(optional)</span></label>
              <input id={`scenario-increase-${item.id}`} data-testid={`input-what-if-cost-increase-${item.id}`} type="number" min="0" step="any" placeholder="0" disabled={update.isPending} aria-invalid={!validIncrease} {...form.register('increase', { onChange: () => setSaveError(false) })} className={fieldClass} />
              {!validIncrease && <p role="alert" className="mt-1 text-[11px] text-[hsl(var(--destructive))]">Enter a nonnegative percentage.</p>}
            </div>
            <div>
              <label htmlFor={`scenario-decrease-${item.id}`} className="text-[12px] font-semibold">Ingredient Cost Decrease % <span className="font-normal text-[hsl(var(--muted-foreground))]">(optional)</span></label>
              <input id={`scenario-decrease-${item.id}`} data-testid={`input-what-if-cost-decrease-${item.id}`} type="number" min="0" max="100" step="any" placeholder="0" disabled={update.isPending} aria-invalid={!validDecrease} {...form.register('decrease', { onChange: () => setSaveError(false) })} className={fieldClass} />
              {!validDecrease && <p role="alert" className="mt-1 text-[11px] text-[hsl(var(--destructive))]">Enter a percentage from 0 to 100.</p>}
            </div>
          </div>
          <p className="mt-2 text-[11px] text-[hsl(var(--muted-foreground))]">Both adjustments use the current ingredient cost; a decrease offsets an increase. Neither is ever saved.</p>

          <section aria-live="polite" className="mt-6 rounded-xl border border-[hsl(var(--border))] p-4">
            <h3 className="font-data text-[10px] font-bold uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">Projected values</h3>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Value label="Projected Ingredient Cost" value={formatMoney(projectedCost)} testId={`text-what-if-projected-cost-${item.id}`} />
              <Value label="Projected Profit" value={formatMoney(projectedProfit)} testId={`text-what-if-projected-profit-${item.id}`} />
              <Value label="Projected Food Cost %" value={formatPercent(projectedFoodCost)} testId={`text-what-if-projected-food-cost-${item.id}`} />
              <Value label="Projected Profit Margin %" value={formatPercent(projectedMargin)} testId={`text-what-if-projected-margin-${item.id}`} />
              <Value label="Difference in Profit Dollars" value={formatProfitChange(projectedProfit - item.profit)} testId={`text-what-if-profit-difference-${item.id}`} />
              <Value label="Difference in Profit Margin (percentage points)" value={formatMarginChange(projectedMargin - item.profitMarginPercent)} testId={`text-what-if-margin-difference-${item.id}`} />
            </div>
          </section>
          {!validScenario && validPrice && validIncrease && validDecrease && <p role="alert" className="mt-3 text-[11px] text-[hsl(var(--destructive))]">These numbers are too large to calculate. Try smaller percentages.</p>}
          {saveError && <p role="alert" data-testid={`error-what-if-save-${item.id}`} className="mt-4 text-[12px] text-[hsl(var(--destructive))]">The selling price couldn’t be saved. Please try again.</p>}
          <p className="mt-5 text-[11px] text-[hsl(var(--muted-foreground))]">Applying saves only the proposed selling price. Hypothetical ingredient cost changes stay in this preview. Change the price to enable Apply.</p>
          <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-[hsl(var(--border))] pt-5">
            <button type="button" data-testid={`button-cancel-what-if-${item.id}`} onClick={onClose} disabled={update.isPending} className={secondaryButton}>Cancel</button>
            <button type="submit" data-testid={`button-apply-what-if-price-${item.id}`} disabled={!validScenario || price === item.sellingPrice || update.isPending} className={primaryButton}>{update.isPending ? 'Applying…' : 'Apply New Selling Price'}</button>
          </div>
        </form>
      </Form>
    </DialogContent>
  </Dialog>;
}