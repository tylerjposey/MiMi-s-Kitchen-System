import { useState } from 'react';
import { useGetWorkspaceHistory, useListIngredients, useListMenuItems, type IngredientPriceHistory, type MenuProfitabilityHistory } from '@workspace/api-client-react';
import { BarChart3, RotateCcw } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const precise = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 4 });
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 });
const date = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const dateTime = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
const formatDate = (value: string) => Number.isNaN(Date.parse(value)) ? value : date.format(new Date(value));
const formatPoint = (value: number) => dateTime.format(new Date(value));
const card = 'rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.84)] shadow-[var(--shadow-soft)]';
const secondaryButton = 'inline-flex items-center justify-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3.5 py-2 text-[12px] font-semibold text-[hsl(var(--foreground))] hover:border-[hsl(var(--primary)/.5)]';
const baseUnit: Record<IngredientPriceHistory['purchaseUnit'], { label: string; factor: number }> = {
  lb: { label: 'oz', factor: 16 }, oz: { label: 'oz', factor: 1 },
  gallon: { label: 'fl oz', factor: 128 }, quart: { label: 'fl oz', factor: 32 },
  cup: { label: 'fl oz', factor: 8 }, 'fl oz': { label: 'fl oz', factor: 1 },
  each: { label: 'each', factor: 1 },
};

function TrendChart({ rows, field, title, kind, testId }: { rows: MenuProfitabilityHistory[] | IngredientPriceHistory[]; field: 'costPerUnit' | 'ingredientCost' | 'profit' | 'profitMarginPercent'; title: string; kind: 'money' | 'precise' | 'percent'; testId: string }) {
  const points = rows.map((row) => ({
    date: Date.parse(row.date),
    value: Number(row[field as keyof typeof row]),
    id: row.id,
  })).filter((point) => Number.isFinite(point.date) && Number.isFinite(point.value));
  const format = (value: number) => kind === 'percent' ? `${number.format(value)}%` : kind === 'precise' ? precise.format(value) : money.format(value);
  return <section data-testid={testId} className={`${card} min-w-0 p-5 sm:p-6`}>
    <div className="flex items-baseline justify-between gap-3"><h3 className="font-display text-[21px] tracking-[-.025em]">{title}</h3><span className="font-data text-[9px] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">Over time</span></div>
    {points.length < 2 || new Set(points.map((point) => point.date)).size < 2
      ? <div className="mt-5 flex h-[230px] items-center justify-center rounded-xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.18)] px-6 text-center text-[12px] leading-relaxed text-[hsl(var(--muted-foreground))]">At least two dated records are needed to draw this trend.</div>
      : <div className="mt-5 h-[240px] w-full" role="img" aria-label={`${title} by date`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 15, left: 4, bottom: 4 }}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 5" vertical={false} />
            <XAxis dataKey="date" type="number" domain={['dataMin', 'dataMax']} scale="time" tickFormatter={(v: number) => date.format(new Date(v))} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={28} />
            <YAxis tickFormatter={format} width={74} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
            <Tooltip labelFormatter={(label) => formatPoint(Number(label))} formatter={(value) => [format(Number(value)), title]} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 10, fontSize: 12 }} />
            <Line dataKey="value" type="linear" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3, fill: 'hsl(var(--card))', strokeWidth: 2 }} activeDot={{ r: 5 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>}
  </section>;
}

function Stat({ label, value, testId }: { label: string; value: string; testId: string }) {
  return <div className="min-w-0"><p className="font-data text-[9px] font-bold uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">{label}</p><p data-testid={testId} className="mt-2 font-display text-[25px] tabular-nums tracking-[-.03em]">{value}</p></div>;
}

export default function Trends() {
  const history = useGetWorkspaceHistory();
  const ingredients = useListIngredients();
  const menu = useListMenuItems();
  const [ingredientId, setIngredientId] = useState<number | null>(null);
  const [menuId, setMenuId] = useState<number | null>(null);
  const selectedIngredient = ingredients.data?.find((item) => item.id === ingredientId) ?? ingredients.data?.[0];
  const selectedMenu = menu.data?.find((item) => item.id === menuId) ?? menu.data?.[0];
  const ingredientRows = (history.data?.ingredientPrices ?? []).filter((row) => row.ingredientId === selectedIngredient?.id);
  const menuRows = (history.data?.menuProfitability ?? []).filter((row) => row.menuItemId === selectedMenu?.id);
  const current = selectedIngredient?.costPerUnit;
  const last = ingredientRows.at(-1);
  const previous = last && current !== undefined && (Math.abs(last.costPerUnit - current) > 0.000001 || last.purchaseUnit !== selectedIngredient?.purchaseUnit) ? last : ingredientRows.at(-2);
  const currentBase = selectedIngredient && current !== undefined ? current / baseUnit[selectedIngredient.purchaseUnit].factor : null;
  const previousBase = previous ? previous.costPerUnit / baseUnit[previous.purchaseUnit].factor : null;
  const comparable = selectedIngredient && previous && baseUnit[previous.purchaseUnit].label === baseUnit[selectedIngredient.purchaseUnit].label;
  const change = comparable && currentBase !== null && previousBase !== null && previousBase !== 0 ? (currentBase - previousBase) / previousBase * 100 : null;
  const chartBase = selectedIngredient ? baseUnit[selectedIngredient.purchaseUnit].label : null;
  const ingredientChartRows = ingredientRows
    .filter((row) => baseUnit[row.purchaseUnit].label === chartBase)
    .map((row) => ({ ...row, costPerUnit: row.costPerUnit / baseUnit[row.purchaseUnit].factor }));
  const loading = history.isLoading || ingredients.isLoading || menu.isLoading;
  const error = history.isError || ingredients.isError || menu.isError;

  return <div className="animate-enter">
    <div className="mb-9"><p className="font-data text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--accent))]">A longer view</p><h1 className="mt-2 font-display text-[42px] leading-[1.05] tracking-[-.035em]">Trends & History</h1><p className="mt-3 max-w-[600px] text-[14px] leading-relaxed text-[hsl(var(--muted-foreground))]">Follow recorded purchase prices and plate economics over time. Only changes captured in your kitchen ledger appear here.</p></div>
    {loading ? <div data-testid="loading-trends" aria-label="Loading history" className="space-y-5"><div className="h-40 animate-pulse rounded-2xl bg-[hsl(var(--muted))]" /><div className="h-72 animate-pulse rounded-2xl bg-[hsl(var(--muted))]" /></div>
      : error ? <section data-testid="error-trends" className={`${card} px-8 py-16 text-center`}><h2 className="font-display text-[25px]">History couldn’t be loaded.</h2><p className="mt-2 text-[13px] text-[hsl(var(--muted-foreground))]">Your entries are safe. Check your connection and try again.</p><button type="button" data-testid="button-retry-trends" onClick={() => { if (history.isError) void history.refetch(); if (ingredients.isError) void ingredients.refetch(); if (menu.isError) void menu.refetch(); }} className={`${secondaryButton} mt-5`}><RotateCcw size={14} /> Try again</button></section>
      : <div className="space-y-9">
        <section aria-labelledby="ingredient-history-title">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4"><div><p className="font-data text-[9px] font-bold uppercase tracking-[.18em] text-[hsl(var(--accent))]">Purchase ledger</p><h2 id="ingredient-history-title" className="mt-1 font-display text-[27px] tracking-[-.03em]">Ingredient prices</h2></div>
            {!!ingredients.data?.length && <div><label htmlFor="trend-ingredient" className="mb-1 block font-data text-[9px] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">Ingredient</label><select id="trend-ingredient" data-testid="select-trends-ingredient" value={selectedIngredient?.id ?? ''} onChange={(event) => setIngredientId(Number(event.target.value))} className="h-10 min-w-[220px] rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-[12px] outline-none focus:border-[hsl(var(--primary))]">{ingredients.data.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>}
          </div>
          {!selectedIngredient ? <div data-testid="empty-trends-ingredients" className={`${card} flex min-h-[190px] flex-col items-center justify-center px-6 text-center`}><BarChart3 size={23} className="text-[hsl(var(--primary))]" /><h3 className="mt-3 font-display text-[21px]">No ingredients yet</h3><p className="mt-1 text-[12px] text-[hsl(var(--muted-foreground))]">Add an ingredient to begin tracking its purchase cost.</p></div> : <>
             <div className={`${card} grid gap-5 p-5 sm:grid-cols-3 sm:gap-0 sm:p-6 sm:[&>div+div]:border-l sm:[&>div+div]:border-[hsl(var(--border))] sm:[&>div+div]:pl-6`}><Stat label={`Current cost / ${selectedIngredient.purchaseUnit}`} value={precise.format(current!)} testId="text-trends-current-cost" /><Stat label={previous ? `Previous cost / ${previous.purchaseUnit}` : 'Previous recorded cost'} value={previous ? precise.format(previous.costPerUnit) : '—'} testId="text-trends-previous-cost" /><Stat label="Change from previous" value={change === null ? '—' : `${change > 0 ? '+' : ''}${number.format(change)}%`} testId="text-trends-cost-change" /></div>
             <p className="mt-2 text-[11px] text-[hsl(var(--muted-foreground))]">{previous ? !comparable ? 'Purchase units have different measurement types; a percentage comparison is not available.' : 'Percentage change compares costs using the same base unit.' : 'No earlier price recorded for comparison.'}</p>
             <div className="mt-5"><TrendChart rows={ingredientChartRows} field="costPerUnit" title={`Cost per ${chartBase} (normalized)`} kind="precise" testId="chart-trends-ingredient" />{ingredientChartRows.length !== ingredientRows.length && <p className="mt-2 text-[11px] text-[hsl(var(--muted-foreground))]">Records measured in a different type of unit are excluded from this chart; all records remain in the table below.</p>}</div>
            <div className={`${card} mt-5 overflow-hidden`}><div className="border-b border-[hsl(var(--border))] px-5 py-4"><h3 className="font-display text-[21px]">Purchase history</h3><p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">{ingredientRows.length} recorded {ingredientRows.length === 1 ? 'price' : 'prices'}</p></div>
              {!ingredientRows.length ? <p data-testid="empty-trends-ingredient-history" className="px-5 py-10 text-center text-[12px] text-[hsl(var(--muted-foreground))]">No price history was recorded for this ingredient. Its current cost is shown above.</p>
                : <div className="overflow-x-auto"><table data-testid="table-trends-ingredient-history" className="w-full min-w-[600px] text-left text-[12px]"><thead className="bg-[hsl(var(--secondary)/.38)] font-data text-[9px] uppercase tracking-[.08em] text-[hsl(var(--muted-foreground))]"><tr>{['Date', 'Purchase price', 'Quantity', 'Unit', 'Cost per unit'].map((heading) => <th key={heading} className="px-5 py-3 font-normal">{heading}</th>)}</tr></thead><tbody className="divide-y divide-[hsl(var(--border)/.7)]">{[...ingredientRows].reverse().map((row) => <tr key={row.id} data-testid={`row-trends-ingredient-${row.id}`}><td className="px-5 py-3.5">{formatDate(row.date)}</td><td className="px-5 py-3.5 font-data tabular-nums">{money.format(row.purchasePrice)}</td><td className="px-5 py-3.5 font-data tabular-nums">{number.format(row.purchaseQuantity)}</td><td className="px-5 py-3.5">{row.purchaseUnit}</td><td className="px-5 py-3.5 font-data tabular-nums text-[hsl(var(--primary))]">{precise.format(row.costPerUnit)}</td></tr>)}</tbody></table></div>}
            </div>
          </>}
        </section>
        <section aria-labelledby="menu-history-title">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4"><div><p className="font-data text-[9px] font-bold uppercase tracking-[.18em] text-[hsl(var(--accent))]">Plate economics</p><h2 id="menu-history-title" className="mt-1 font-display text-[27px] tracking-[-.03em]">Menu profitability</h2></div>
            {!!menu.data?.length && <div><label htmlFor="trend-menu" className="mb-1 block font-data text-[9px] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">Menu item</label><select id="trend-menu" data-testid="select-trends-menu" value={selectedMenu?.id ?? ''} onChange={(event) => setMenuId(Number(event.target.value))} className="h-10 min-w-[220px] rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-[12px] outline-none focus:border-[hsl(var(--primary))]">{menu.data.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>}
          </div>
          {!selectedMenu ? <div data-testid="empty-trends-menu" className={`${card} py-12 text-center`}><h3 className="font-display text-[21px]">No menu items yet</h3><p className="mt-1 text-[12px] text-[hsl(var(--muted-foreground))]">Build a recipe to begin following its profitability.</p></div> : <>
            <div className="grid gap-5 lg:grid-cols-2"><TrendChart rows={menuRows} field="ingredientCost" title="Ingredient cost" kind="money" testId="chart-trends-menu-cost" /><TrendChart rows={menuRows} field="profit" title="Profit" kind="money" testId="chart-trends-menu-profit" /><TrendChart rows={menuRows} field="profitMarginPercent" title="Profit margin" kind="percent" testId="chart-trends-menu-margin" /></div>
            {!menuRows.length && <p data-testid="empty-trends-menu-history" className="mt-3 text-[12px] text-[hsl(var(--muted-foreground))]">No profitability history was recorded for this menu item. Its current figures remain available on the Dashboard.</p>}
          </>}
        </section>
      </div>}
  </div>;
}