import { useState } from 'react';
import { useGetWorkspaceSettings, useListIngredients, useListMenuItems, type MenuItem } from '@workspace/api-client-react';
import { ChevronDown, ChevronRight, RotateCcw, SlidersHorizontal, UtensilsCrossed } from 'lucide-react';
import { Link } from 'wouter';
import WhatIfPricing from './what-if-pricing';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const percent = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const quantity = new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 });
const amount = (value: number) => Number.isFinite(value) ? money.format(value) : '—';
const rate = (value: number) => Number.isFinite(value) ? `${percent.format(value)}%` : '—';
const secondaryButton = 'inline-flex items-center justify-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3.5 py-2 text-[12px] font-semibold text-[hsl(var(--foreground))] transition-colors hover:border-[hsl(var(--primary)/.5)] hover:text-[hsl(var(--primary))]';

function statusFor(item: MenuItem, threshold: number) {
  if (item.profitMarginPercent < threshold) return 'Low Margin';
  if (item.costIncreased) return 'Cost Increase';
  if (item.profitMarginPercent <= threshold + 5) return 'Watch';
  return 'Normal';
}

function PlateRow({ item, threshold }: { item: MenuItem; threshold: number }) {
  const [expanded, setExpanded] = useState(false);
  const [scenario, setScenario] = useState(false);
  const status = statusFor(item, threshold);
  const tone = status === 'Low Margin' ? 'border-[hsl(var(--destructive)/.27)] bg-[hsl(var(--destructive)/.06)] text-[hsl(var(--destructive))]' : status === 'Cost Increase' ? 'border-[hsl(var(--accent)/.35)] bg-[hsl(var(--accent)/.08)] text-[hsl(var(--foreground))]' : status === 'Watch' ? 'border-[hsl(var(--accent)/.2)] bg-[hsl(var(--secondary)/.65)] text-[hsl(var(--foreground))]' : 'border-[hsl(var(--primary)/.18)] bg-[hsl(var(--primary)/.06)] text-[hsl(var(--primary))]';
  return <><tbody data-testid={`row-dashboard-item-${item.id}`} className="border-b border-[hsl(var(--border)/.7)]">
    <tr className="hover:bg-[hsl(var(--secondary)/.16)]">
      <td data-testid={`text-dashboard-name-${item.id}`} className="py-4 pl-5 pr-3 text-[12px] font-semibold">{item.name}</td>
      <td data-testid={`text-dashboard-cost-${item.id}`} className="px-2 py-4 font-data text-[11px] tabular-nums">{amount(item.recipeCost)}</td>
      <td data-testid={`text-dashboard-price-${item.id}`} className="px-2 py-4 font-data text-[11px] tabular-nums">{amount(item.sellingPrice)}</td>
      <td data-testid={`text-dashboard-profit-${item.id}`} className="px-2 py-4 font-data text-[11px] tabular-nums">{amount(item.profit)}</td>
      <td data-testid={`text-dashboard-food-cost-${item.id}`} className="px-2 py-4 font-data text-[11px] tabular-nums">{rate(item.foodCostPercent)}</td>
      <td data-testid={`text-dashboard-margin-${item.id}`} className="px-2 py-4 font-data text-[11px] tabular-nums">{rate(item.profitMarginPercent)}</td>
      <td className="px-2 py-4"><span data-testid={`status-dashboard-${item.id}`} className={`inline-flex whitespace-nowrap rounded-full border px-2 py-1 text-[10px] font-semibold ${tone}`}>{status}</span></td>
       <td className="px-2 py-4"><button type="button" data-testid={`button-what-if-${item.id}`} aria-haspopup="dialog" onClick={() => setScenario(true)} className="whitespace-nowrap text-[11px] font-semibold text-[hsl(var(--primary))] hover:underline">What-if</button></td>
      <td className="py-4 pl-2 pr-5"><button type="button" data-testid={`button-expand-dashboard-${item.id}`} aria-label={`${expanded ? 'Collapse' : 'Expand'} recipe for ${item.name}`} aria-expanded={expanded} onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 whitespace-nowrap text-[11px] font-semibold text-[hsl(var(--primary))] hover:underline">{expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}{expanded ? 'Collapse' : 'Expand'}</button></td>
    </tr>
    {expanded && <tr><td colSpan={9} className="bg-[hsl(var(--secondary)/.22)] px-5 py-5">
      <section data-testid={`panel-dashboard-recipe-${item.id}`} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.8)] p-5">
        <p className="font-data text-[9px] font-bold uppercase tracking-[.17em] text-[hsl(var(--accent))]">Recipe / current ingredient costs</p>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[500px] text-left text-[11px]"><thead className="border-b border-[hsl(var(--border))] font-data text-[9px] uppercase tracking-[.08em] text-[hsl(var(--muted-foreground))]"><tr><th className="pb-2 font-normal">Ingredient Name</th><th className="pb-2 font-normal">Quantity Used</th><th className="pb-2 font-normal">Unit</th><th className="pb-2 text-right font-normal">Cost for that Ingredient</th></tr></thead><tbody>{item.recipe.map((line, index) => <tr key={`${line.ingredientId}-${index}`} data-testid={`row-dashboard-recipe-${item.id}-${index}`} className="border-b border-[hsl(var(--border)/.6)]"><td className="py-3">{line.ingredientName}</td><td className="py-3 font-data tabular-nums">{quantity.format(line.quantity)}</td><td className="py-3">{line.unit}</td><td className="py-3 text-right font-data tabular-nums">{amount(line.ingredientCost)}</td></tr>)}</tbody></table></div>
        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-[hsl(var(--border))] pt-4 sm:grid-cols-5">{([['Total Ingredient Cost', amount(item.recipeCost), 'cost'], ['Selling Price', amount(item.sellingPrice), 'price'], ['Profit', amount(item.profit), 'profit'], ['Food Cost %', rate(item.foodCostPercent), 'food-cost'], ['Profit Margin %', rate(item.profitMarginPercent), 'margin']] as const).map(([label, value, key]) => <div key={key}><p className="text-[10px] leading-tight text-[hsl(var(--muted-foreground))]">{label}</p><p data-testid={`text-dashboard-detail-${key}-${item.id}`} className="mt-1 font-display text-[19px] tabular-nums">{value}</p></div>)}</div>
      </section>
    </td></tr>}
  </tbody>
  {scenario && <WhatIfPricing item={item} onClose={() => setScenario(false)} />}
  </>;
}

export default function Dashboard() {
  const menu = useListMenuItems();
  const ingredients = useListIngredients();
  const settings = useGetWorkspaceSettings();
  const loading = menu.isLoading || ingredients.isLoading || settings.isLoading;
  const error = menu.isError || ingredients.isError || settings.isError;
  const items = menu.data ?? [];
  const threshold = settings.data?.lowProfitMarginThreshold;
  const average = (key: 'foodCostPercent' | 'profitMarginPercent') => items.length ? rate(items.reduce((sum, item) => sum + item[key], 0) / items.length) : '—';
  const highest = items.reduce<MenuItem | null>((best, item) => !best || item.recipeCost > best.recipeCost ? item : best, null);
  const lowest = items.reduce<MenuItem | null>((best, item) => !best || item.profitMarginPercent < best.profitMarginPercent ? item : best, null);
  const cards = [
    ['Average Food Cost %', average('foodCostPercent'), 'average-food-cost', 'Unweighted across menu items'],
    ['Average Profit Margin %', average('profitMarginPercent'), 'average-profit-margin', 'Unweighted across menu items'],
    ['Highest Ingredient-Cost Menu Item', highest?.name ?? '—', 'highest-ingredient-cost', highest ? amount(highest.recipeCost) + ' ingredient cost' : 'No menu items yet'],
    ['Lowest Profit-Margin Menu Item', lowest?.name ?? '—', 'lowest-profit-margin', lowest ? rate(lowest.profitMarginPercent) + ' profit margin' : 'No menu items yet'],
    ['Number of Ingredients', String(ingredients.data?.length ?? 0), 'ingredient-count', 'In your kitchen ledger'],
    ['Number of Menu Items', String(items.length), 'menu-count', 'Plates in your menu'],
  ] as const;
  return <div className="animate-enter">
    <div className="mb-9"><p className="font-data text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--accent))]">Plate economics / overview</p><h1 className="mt-2 font-display text-[42px] leading-[1.05] tracking-[-.035em]">Dashboard</h1><p className="mt-3 max-w-[620px] text-[14px] leading-relaxed text-[hsl(var(--muted-foreground))]">A dependable view of what each plate costs and what it leaves behind. Figures follow current ingredient prices.</p></div>
    {loading ? <div data-testid="loading-dashboard" aria-label="Loading profitability" className="space-y-5"><div className="grid grid-cols-2 gap-4 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-[hsl(var(--muted))]" />)}</div><div className="h-56 animate-pulse rounded-2xl bg-[hsl(var(--muted))]" /></div>
    : error ? <section data-testid="error-dashboard" className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.75)] px-8 py-16 text-center"><h2 className="font-display text-[25px]">The profitability view couldn’t be loaded.</h2><p className="mt-2 text-[13px] text-[hsl(var(--muted-foreground))]">Check your connection and try again. Your entries are safe.</p><button type="button" data-testid="button-retry-dashboard" onClick={() => { if (menu.isError) void menu.refetch(); if (ingredients.isError) void ingredients.refetch(); if (settings.isError) void settings.refetch(); }} className={`${secondaryButton} mt-5`}><RotateCcw size={14} /> Try again</button></section>
    : <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">{cards.map(([label, value, id, note], i) => <section key={id} data-testid={`card-dashboard-${id}`} className={`min-h-[142px] rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.78)] p-5 shadow-[var(--shadow-soft)] ${i === 1 ? 'bg-[hsl(var(--secondary)/.55)]' : ''}`}><p className="font-data text-[9px] font-bold uppercase leading-relaxed tracking-[.1em] text-[hsl(var(--muted-foreground))]">{label}</p><p data-testid={`text-dashboard-${id}`} className={`mt-4 break-words font-display tracking-[-.03em] ${i === 2 || i === 3 ? 'text-[23px]' : 'text-[32px]'}`}>{value}</p><p className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">{note}</p></section>)}</div>
      <div className="mt-8 flex flex-wrap items-start justify-between gap-5"><div><p className="font-data text-[9px] font-bold uppercase tracking-[.18em] text-[hsl(var(--accent))]">Every plate, accounted for</p><h2 className="mt-1 font-display text-[27px] tracking-[-.03em]">Menu profitability</h2><p className="mt-1 text-[12px] text-[hsl(var(--muted-foreground))]">All menu items, calculated from the latest server-returned ingredient costs.</p></div><Link href="/settings" data-testid="link-dashboard-threshold" className={`${secondaryButton} shrink-0`}><SlidersHorizontal size={14} /> Low margin threshold: {threshold === undefined ? '—' : rate(threshold)}</Link></div>
      {!items.length ? <section data-testid="empty-dashboard" className="paper-grid mt-5 flex min-h-[290px] flex-col items-center justify-center rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card)/.68)] px-8 text-center"><div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><UtensilsCrossed size={25} strokeWidth={1.5} /></div><h3 className="font-display text-[25px]">The first plate starts the picture.</h3><p className="mt-2 text-[13px] text-[hsl(var(--muted-foreground))]">No menu items yet. Add ingredients, then build a recipe to see its real margin here.</p><div className="mt-6 flex gap-5"><Link href="/ingredients" data-testid="link-dashboard-ingredients" className="text-[12px] font-semibold text-[hsl(var(--primary))] hover:underline">Add ingredients</Link><Link href="/menu" data-testid="link-dashboard-menu" className="text-[12px] font-semibold text-[hsl(var(--primary))] hover:underline">Build the menu</Link></div></section>
       : <section data-testid="table-dashboard-items" className="mt-5 overflow-x-auto rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.84)] shadow-[var(--shadow-soft)]"><table className="w-full min-w-[1050px] table-fixed border-collapse text-left"><colgroup><col className="w-[15%]" /><col className="w-[11%]" /><col className="w-[10%]" /><col className="w-[9%]" /><col className="w-[11%]" /><col className="w-[12%]" /><col className="w-[12%]" /><col className="w-[8%]" /><col className="w-[12%]" /></colgroup><thead className="bg-[hsl(var(--secondary)/.38)]"><tr>{['Menu Item', 'Ingredient Cost', 'Selling Price', 'Profit', 'Food Cost %', 'Profit Margin %', 'Status', 'What-If', 'Expand / Collapse'].map((heading) => <th key={heading} scope="col" className="px-2 py-4 first:pl-5 last:pr-5 font-data text-[9px] font-bold uppercase leading-snug tracking-[.06em] text-[hsl(var(--muted-foreground))]">{heading}</th>)}</tr></thead>{items.map((item) => <PlateRow key={item.id} item={item} threshold={threshold ?? 60} />)}</table></section>}
      <section data-testid="dashboard-status-guide" className="mt-6 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.5)] px-5 py-4 text-[11px] leading-relaxed text-[hsl(var(--muted-foreground))]"><p><strong className="text-[hsl(var(--foreground))]">How to read the flags.</strong> Low Margin is below your saved threshold and takes priority. Cost Increase means ingredient cost has risen since the recipe was last saved. Watch means margin is within 5 percentage points above the threshold. Normal means none apply.</p><p className="mt-1">The default 60% margin is a configurable benchmark for this workspace, not an industry standard. <Link href="/settings" data-testid="link-dashboard-adjust-threshold" className="font-semibold text-[hsl(var(--primary))] hover:underline">Adjust it in Settings.</Link></p></section>
    </>}
  </div>;
}