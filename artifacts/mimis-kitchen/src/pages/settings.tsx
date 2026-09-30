import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetWorkspaceHistoryQueryKey, getGetWorkspaceSettingsQueryKey, getListIngredientsQueryKey, getListMenuItemsQueryKey, useClearWorkspaceData, useGetWorkspaceSettings, useUpdateWorkspaceSettings } from '@workspace/api-client-react';
import { RotateCcw } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading, isError, refetch } = useGetWorkspaceSettings();
  const update = useUpdateWorkspaceSettings();
  const clear = useClearWorkspaceData();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [clearError, setClearError] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [draft, setDraft] = useState('');
  const [feedback, setFeedback] = useState<'saved' | 'error' | null>(null);
  useEffect(() => { if (settings) setDraft(String(settings.lowProfitMarginThreshold)); }, [settings?.lowProfitMarginThreshold]);
  const value = draft.trim() === '' ? NaN : Number(draft);
  const valid = Number.isFinite(value) && value >= 0 && value <= 100;
  const changed = valid && settings && value !== settings.lowProfitMarginThreshold;
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!valid || !changed) return;
    setFeedback(null);
    try {
      await update.mutateAsync({ data: { lowProfitMarginThreshold: value } });
      await queryClient.invalidateQueries({ queryKey: getGetWorkspaceSettingsQueryKey() });
      setFeedback('saved');
    } catch { setFeedback('error'); }
  };
  const confirmClear = async () => {
    setClearError(false);
    try {
       await clear.mutateAsync({ data: { confirmation: 'CLEAR ALL DATA' } });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListIngredientsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getListMenuItemsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetWorkspaceHistoryQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetWorkspaceSettingsQueryKey() }),
      ]);
      setConfirmOpen(false);
      setCleared(true);
    } catch { setClearError(true); }
  };
  return <>
    <div className="animate-enter mb-9"><p className="font-data text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--accent))]">Workspace preferences</p><h1 className="mt-2 font-display text-[42px] leading-[1.05] tracking-[-.035em]">Settings</h1><p className="mt-3 max-w-[560px] text-[14px] leading-relaxed text-[hsl(var(--muted-foreground))]">A few quiet controls for how MiMi’s Kitchen will work for you. More will be added when the kitchen is ready for them.</p></div>
    <div className="max-w-[760px] space-y-5">
      <section data-testid="settings-profit-threshold" className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.72)] p-6 shadow-[var(--shadow-soft)]">
        <p className="font-data text-[9px] font-bold uppercase tracking-[.18em] text-[hsl(var(--accent))]">Profit guardrail</p>
        <h2 className="mt-2 font-display text-[24px] tracking-[-.025em]">Low profit margin threshold</h2>
        <p className="mt-2 max-w-[580px] text-[13px] leading-relaxed text-[hsl(var(--muted-foreground))]">Menu items below this margin are flagged Low Margin. The default 60% is a configurable workspace benchmark, not an industry standard.</p>
        {isLoading ? <div data-testid="loading-settings-threshold" className="mt-6 flex gap-3"><div className="h-11 w-40 animate-pulse rounded-lg bg-[hsl(var(--muted))]" /><div className="h-11 w-24 animate-pulse rounded-lg bg-[hsl(var(--muted))]" /></div>
        : isError ? <div data-testid="error-settings-threshold" className="mt-6 rounded-xl border border-[hsl(var(--destructive)/.25)] bg-[hsl(var(--destructive)/.06)] p-4 text-[12px]">The threshold couldn’t be loaded. <button type="button" data-testid="button-retry-settings-threshold" onClick={() => { void refetch(); }} className="ml-2 inline-flex items-center gap-1 font-semibold text-[hsl(var(--primary))] hover:underline"><RotateCcw size={13} /> Try again</button></div>
        : <form onSubmit={(event) => { void save(event); }} noValidate className="mt-6 border-t border-[hsl(var(--border))] pt-5">
          <label htmlFor="low-profit-threshold" className="block text-[12px] font-semibold">Threshold percentage</label>
          <div className="mt-2 flex flex-wrap items-center gap-3"><div className="relative"><input id="low-profit-threshold" data-testid="input-low-profit-margin-threshold" type="number" min="0" max="100" step="any" value={draft} onChange={(event) => { setDraft(event.target.value); setFeedback(null); }} aria-invalid={!valid} className="h-11 w-36 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3.5 pr-8 font-data text-[13px] outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/.12)]" /><span className="pointer-events-none absolute right-4 top-3 text-[13px] text-[hsl(var(--muted-foreground))]">%</span></div><button type="submit" data-testid="button-save-threshold" disabled={!changed || update.isPending} className="inline-flex h-11 items-center rounded-lg bg-[hsl(var(--primary))] px-5 text-[12px] font-semibold text-[hsl(var(--primary-foreground))] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">{update.isPending ? 'Saving…' : 'Save threshold'}</button></div>
          {!valid && <p role="alert" data-testid="error-threshold-validation" className="mt-2 text-[11px] text-[hsl(var(--destructive))]">Enter a percentage from 0 to 100.</p>}
          {feedback === 'saved' && <p role="status" data-testid="status-threshold-saved" className="mt-3 text-[12px] text-[hsl(var(--primary))]">Threshold saved. Dashboard flags now use this value.</p>}
          {feedback === 'error' && <p role="alert" data-testid="error-threshold-save" className="mt-3 text-[12px] text-[hsl(var(--destructive))]">The threshold couldn’t be saved. Please try again.</p>}
        </form>}
      </section>
      <section data-testid="settings-clear-data" className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.72)] p-6 shadow-[var(--shadow-soft)]">
         <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:gap-8">
          <div>
            <p className="font-data text-[9px] font-bold uppercase tracking-[.18em] text-[hsl(var(--accent))]">Workspace maintenance</p>
            <h2 className="mt-2 font-display text-[24px] tracking-[-.025em]">Clear all data</h2>
             <p className="mt-2 max-w-[500px] text-[13px] leading-relaxed text-[hsl(var(--muted-foreground))]">Permanently remove your ingredients, menu items, recipes, and recorded history. This cannot be undone.</p>
          </div>
           <button type="button" data-testid="button-clear-all-data" onClick={() => { setClearError(false); setConfirmOpen(true); }} className="shrink-0 rounded-lg border border-[hsl(var(--destructive)/.4)] px-4 py-2.5 text-[12px] font-semibold text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/.07)]">Clear All Data</button>
        </div>
         {cleared && <p role="status" data-testid="status-clear-all-data" className="mt-4 text-[12px] text-[hsl(var(--primary))]">Workspace data cleared.</p>}
      </section>
    </div>
     <AlertDialog open={confirmOpen} onOpenChange={(open) => { if (!clear.isPending) setConfirmOpen(open); }}>
       <AlertDialogContent className="border-[hsl(var(--border))] bg-[hsl(var(--card))]">
         <AlertDialogHeader><AlertDialogTitle className="font-display text-[27px] font-medium">Clear all data?</AlertDialogTitle><AlertDialogDescription className="text-[13px] leading-relaxed">Are you sure you want to permanently remove all ingredient, menu, recipe, and history data?</AlertDialogDescription></AlertDialogHeader>
         {clearError && <p role="alert" data-testid="error-clear-all-data" className="rounded-lg bg-[hsl(var(--destructive)/.07)] p-3 text-[12px] text-[hsl(var(--destructive))]">Data couldn’t be cleared. Please try again.</p>}
         <AlertDialogFooter><AlertDialogCancel data-testid="button-cancel-clear-all-data" disabled={clear.isPending} className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-2 text-[12px]">Cancel</AlertDialogCancel><AlertDialogAction data-testid="button-confirm-clear-all-data" disabled={clear.isPending} onClick={(event) => { event.preventDefault(); void confirmClear(); }} className="rounded-lg bg-[hsl(var(--destructive))] px-4 py-2 text-[12px] font-semibold text-[hsl(var(--destructive-foreground))] hover:bg-[hsl(var(--destructive)/.9)]">{clear.isPending ? 'Clearing…' : 'Clear All Data'}</AlertDialogAction></AlertDialogFooter>
       </AlertDialogContent>
     </AlertDialog>
  </>;
}