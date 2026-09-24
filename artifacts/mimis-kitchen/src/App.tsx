import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BarChart3, ChevronRight, CircleHelp, CookingPot, Database, LayoutDashboard, List, PackageOpen, Settings, Sprout, UtensilsCrossed } from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Link, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';

const queryClient = new QueryClient();

type NavItemProps = {
  href: string;
  label: string;
  icon: ReactNode;
  testId: string;
};

function NavItem({ href, label, icon, testId }: NavItemProps) {
  const [location] = useLocation();
  const isActive = href === '/' ? location === '/' : location.startsWith(href);

  return (
    <Link
      href={href}
      data-testid={testId}
      className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors ${
        isActive
          ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-foreground))] shadow-[inset_3px_0_0_hsl(var(--sidebar-primary))]'
          : 'text-[hsl(var(--sidebar-foreground)/.62)] hover:bg-[hsl(var(--sidebar-accent)/.72)] hover:text-[hsl(var(--sidebar-foreground))]'
      }`}
    >
      <span className={isActive ? 'text-[hsl(var(--sidebar-primary))]' : 'text-[hsl(var(--sidebar-foreground)/.5)] group-hover:text-[hsl(var(--sidebar-primary))]'}>
        {icon}
      </span>
      <span>{label}</span>
      {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[hsl(var(--sidebar-primary))]" />}
    </Link>
  );
}

function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const pageLabel = location === '/' ? 'Dashboard' : location.startsWith('/ingredients') ? 'Ingredients' : location.startsWith('/menu') ? 'Menu' : location.startsWith('/trends') ? 'Trends & History' : 'Settings';

  return (
    <div className="workspace-shell flex min-h-[100dvh]">
      <aside className="flex w-[254px] shrink-0 flex-col bg-[hsl(var(--sidebar))] px-4 py-5 text-[hsl(var(--sidebar-foreground))]">
        <div className="flex items-center gap-3 px-2 pb-9">
          <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))] shadow-[0_7px_18px_rgba(226,201,117,.18)]">
            <CookingPot size={20} strokeWidth={1.8} />
          </div>
          <div>
            <p className="font-display text-[20px] leading-none tracking-[-.02em]">MiMi’s Kitchen</p>
            <p className="mt-1 font-data text-[9px] uppercase tracking-[.18em] text-[hsl(var(--sidebar-foreground)/.48)]">Owner workspace</p>
          </div>
        </div>

        <div className="px-3 pb-3 font-data text-[9px] font-bold uppercase tracking-[.2em] text-[hsl(var(--sidebar-foreground)/.36)]">Workspace</div>
        <nav aria-label="Primary navigation" className="space-y-1">
          <NavItem href="/" label="Dashboard" icon={<LayoutDashboard size={17} strokeWidth={1.7} />} testId="link-dashboard" />
          <NavItem href="/ingredients" label="Ingredients" icon={<Sprout size={17} strokeWidth={1.7} />} testId="link-ingredients" />
          <NavItem href="/menu" label="Menu" icon={<UtensilsCrossed size={17} strokeWidth={1.7} />} testId="link-menu" />
          <NavItem href="/trends" label="Trends & History" icon={<BarChart3 size={17} strokeWidth={1.7} />} testId="link-trends" />
        </nav>

        <div className="mt-auto space-y-1">
          <div className="mx-3 mb-4 h-px bg-[hsl(var(--sidebar-border))]" />
          <Link href="/settings" data-testid="link-settings" className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors ${location.startsWith('/settings') ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-foreground))]' : 'text-[hsl(var(--sidebar-foreground)/.62)] hover:bg-[hsl(var(--sidebar-accent)/.72)] hover:text-[hsl(var(--sidebar-foreground))]'}`}>
            <Settings size={17} strokeWidth={1.7} className={location.startsWith('/settings') ? 'text-[hsl(var(--sidebar-primary))]' : 'text-[hsl(var(--sidebar-foreground)/.5)] group-hover:text-[hsl(var(--sidebar-primary))]'} />
            <span>Settings</span>
          </Link>
          <div className="mt-5 rounded-xl border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-accent)/.45)] p-3.5">
            <div className="mb-2 flex items-center gap-2 text-[hsl(var(--sidebar-primary))]">
              <CircleHelp size={14} strokeWidth={1.8} />
              <span className="font-data text-[9px] uppercase tracking-[.14em]">A quiet workspace</span>
            </div>
            <p className="text-[11px] leading-relaxed text-[hsl(var(--sidebar-foreground)/.5)]">Built for the few decisions that keep every plate honest.</p>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex h-[76px] items-center justify-between border-b border-[hsl(var(--border)/.78)] bg-[hsl(var(--background)/.72)] px-10 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-[12px] text-[hsl(var(--muted-foreground))]">
            <span className="font-data text-[10px] uppercase tracking-[.18em]">Workspace</span>
            <ChevronRight size={13} />
            <span className="font-medium text-[hsl(var(--foreground))]">{pageLabel}</span>
          </div>
          <div className="flex items-center gap-5">
            <div data-testid="status-workspace" className="flex items-center gap-2 text-[11px] text-[hsl(var(--muted-foreground))]">
              <span className="h-2 w-2 rounded-full bg-[hsl(var(--primary))] shadow-[0_0_0_4px_hsl(var(--primary)/.12)]" />
              Workspace ready
            </div>
            <Link href="/settings" data-testid="button-header-settings" aria-label="Open settings" className="flex h-9 w-9 items-center justify-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card)/.55)] text-[hsl(var(--muted-foreground))] transition-colors hover:border-[hsl(var(--primary)/.45)] hover:text-[hsl(var(--primary))]">
              <Settings size={16} strokeWidth={1.8} />
            </Link>
          </div>
        </header>
        <div className="mx-auto max-w-[1240px] px-10 py-10">{children}</div>
      </main>
    </div>
  );
}

function PageIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="animate-enter mb-9">
      <p className="font-data text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--accent))]">{eyebrow}</p>
      <h1 className="mt-2 font-display text-[42px] leading-[1.05] tracking-[-.035em] text-[hsl(var(--foreground))]">{title}</h1>
      <p className="mt-3 max-w-[560px] text-[14px] leading-relaxed text-[hsl(var(--muted-foreground))]">{description}</p>
    </div>
  );
}

function EmptyPanel({ icon, title, message, testId }: { icon: ReactNode; title: string; message: string; testId: string }) {
  return (
    <section data-testid={testId} className="paper-grid relative flex min-h-[340px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card)/.68)] px-8 text-center">
      <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full border border-[hsl(var(--accent)/.12)]" />
      <div className="absolute -bottom-24 -left-10 h-52 w-52 rounded-full border border-[hsl(var(--primary)/.1)]" />
      <div className="relative mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]">
        {icon}
      </div>
      <h2 className="relative font-display text-[25px] tracking-[-.025em]">{title}</h2>
      <p data-testid={`${testId}-message`} className="relative mt-2 text-[13px] text-[hsl(var(--muted-foreground))]">{message}</p>
    </section>
  );
}

function Dashboard() {
  return (
    <div className="animate-enter">
      <PageIntro eyebrow="Today’s workspace" title="Good morning, MiMi." description="A clear view of food cost starts here. Keep this space close as you build the kitchen’s working record." />
      <div className="grid grid-cols-[minmax(0,1.55fr)_minmax(280px,.8fr)] gap-5">
        <section data-testid="card-dashboard-empty" className="paper-grid relative min-h-[328px] overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.75)] p-8 shadow-[var(--shadow-soft)]">
          <div className="relative z-10 flex h-full max-w-[440px] flex-col justify-between">
            <div>
              <div className="mb-6 flex items-center gap-2">
                <span className="rounded-full bg-[hsl(var(--secondary))] px-2.5 py-1 font-data text-[9px] font-bold uppercase tracking-[.16em] text-[hsl(var(--primary))]">Start with the basics</span>
              </div>
              <h2 className="font-display text-[31px] leading-[1.1] tracking-[-.03em]">Your kitchen ledger is ready.</h2>
              <p className="mt-4 max-w-[350px] text-[13px] leading-relaxed text-[hsl(var(--muted-foreground))]">Add ingredients and menu items to turn your daily notes into a dependable view of what each plate costs.</p>
            </div>
            <div className="flex items-center gap-3 pt-8">
              <Link href="/ingredients" data-testid="link-dashboard-ingredients" className="group flex items-center gap-2 text-[12px] font-semibold text-[hsl(var(--primary))]">
                Add ingredients
                <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <span className="h-1 w-1 rounded-full bg-[hsl(var(--border))]" />
              <Link href="/menu" data-testid="link-dashboard-menu" className="group flex items-center gap-2 text-[12px] font-semibold text-[hsl(var(--primary))]">
                Build the menu
                <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
          <div className="pointer-events-none absolute -bottom-12 -right-5 h-[235px] w-[285px] rotate-[-8deg] rounded-[48%] border-[1.5px] border-[hsl(var(--accent)/.23)]">
            <div className="absolute left-12 top-8 h-[178px] w-[178px] rounded-[48%] border-[1.5px] border-[hsl(var(--accent)/.16)]" />
            <div className="absolute -right-8 top-20 h-3 w-32 rotate-[-32deg] rounded-full bg-[hsl(var(--accent)/.2)]" />
            <div className="absolute right-3 top-[108px] h-3 w-24 rotate-[-32deg] rounded-full bg-[hsl(var(--accent)/.14)]" />
          </div>
        </section>

        <section data-testid="card-dashboard-overview" className="animate-enter-delay rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.78)] p-6 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-data text-[9px] font-bold uppercase tracking-[.18em] text-[hsl(var(--muted-foreground))]">Overview</p>
              <h2 className="mt-1 font-display text-[23px] tracking-[-.025em]">The essentials</h2>
            </div>
            <Database size={18} strokeWidth={1.5} className="text-[hsl(var(--accent))]" />
          </div>
          <div className="mt-8 divide-y divide-[hsl(var(--border))]">
            <Link href="/ingredients" data-testid="link-overview-ingredients" className="group flex items-center justify-between py-4 first:pt-0">
              <span className="flex items-center gap-3 text-[13px]"><PackageOpen size={16} className="text-[hsl(var(--muted-foreground))]" /> Ingredients</span>
              <ChevronRight size={15} className="text-[hsl(var(--muted-foreground))] transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link href="/menu" data-testid="link-overview-menu" className="group flex items-center justify-between py-4">
              <span className="flex items-center gap-3 text-[13px]"><List size={16} className="text-[hsl(var(--muted-foreground))]" /> Menu items</span>
              <ChevronRight size={15} className="text-[hsl(var(--muted-foreground))] transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link href="/trends" data-testid="link-overview-trends" className="group flex items-center justify-between py-4 last:pb-0">
              <span className="flex items-center gap-3 text-[13px]"><BarChart3 size={16} className="text-[hsl(var(--muted-foreground))]" /> Trends & history</span>
              <ChevronRight size={15} className="text-[hsl(var(--muted-foreground))] transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function Ingredients() {
  return (
    <>
      <PageIntro eyebrow="Kitchen inventory" title="Ingredients" description="Keep the building blocks of every menu item in one measured, easy-to-review place." />
      <EmptyPanel icon={<Sprout size={26} strokeWidth={1.5} />} title="A clean shelf, for now." message="No ingredients have been added yet." testId="empty-ingredients" />
    </>
  );
}

function Menu() {
  return (
    <>
      <PageIntro eyebrow="Your offering" title="Menu" description="See each dish as a complete picture: the ingredients behind it and the margin it needs to earn." />
      <EmptyPanel icon={<UtensilsCrossed size={26} strokeWidth={1.5} />} title="The menu is yours to shape." message="No menu items have been created yet." testId="empty-menu" />
    </>
  );
}

function Trends() {
  return (
    <>
      <PageIntro eyebrow="A longer view" title="Trends & History" description="A future home for the patterns behind your food cost, menu mix, and the decisions you make over time." />
      <EmptyPanel icon={<BarChart3 size={26} strokeWidth={1.5} />} title="Your history will take shape here." message="Trends and history will appear once your workspace has a record to look back on." testId="empty-trends" />
    </>
  );
}

function SettingsPage() {
  return (
    <>
      <PageIntro eyebrow="Workspace preferences" title="Settings" description="A few quiet controls for how MiMi’s Kitchen will work for you. More will be added when the kitchen is ready for them." />
      <div className="max-w-[760px] space-y-5">
        <section data-testid="settings-profit-threshold" className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.72)] p-6 shadow-[var(--shadow-soft)]">
          <div className="flex items-start justify-between gap-8">
            <div>
              <p className="font-data text-[9px] font-bold uppercase tracking-[.18em] text-[hsl(var(--accent))]">Profit guardrail</p>
              <h2 className="mt-2 font-display text-[24px] tracking-[-.025em]">Low profit margin threshold</h2>
              <p className="mt-2 max-w-[500px] text-[13px] leading-relaxed text-[hsl(var(--muted-foreground))]">Choose when a menu item should be called out for a closer look. This setting is reserved for a future update.</p>
            </div>
            <span className="shrink-0 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.65)] px-2.5 py-1 font-data text-[9px] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">Coming later</span>
          </div>
          <div className="mt-6 flex h-12 items-center justify-between rounded-xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted)/.35)] px-4 text-[12px] text-[hsl(var(--muted-foreground))]">
            <span>Threshold controls are not active yet</span>
            <span className="font-data text-[10px] text-[hsl(var(--muted-foreground)/.65)]">—</span>
          </div>
        </section>
        <section data-testid="settings-clear-data" className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.72)] p-6 shadow-[var(--shadow-soft)]">
          <div className="flex items-start justify-between gap-8">
            <div>
              <p className="font-data text-[9px] font-bold uppercase tracking-[.18em] text-[hsl(var(--accent))]">Workspace maintenance</p>
              <h2 className="mt-2 font-display text-[24px] tracking-[-.025em]">Clear all data</h2>
              <p className="mt-2 max-w-[500px] text-[13px] leading-relaxed text-[hsl(var(--muted-foreground))]">A reset option will live here in a future version. Your workspace is safe; there is currently nothing to clear from this screen.</p>
            </div>
            <span className="shrink-0 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.65)] px-2.5 py-1 font-data text-[9px] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">Reserved</span>
          </div>
        </section>
      </div>
    </>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <AppShell>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/ingredients" component={Ingredients} />
          <Route path="/menu" component={Menu} />
          <Route path="/trends" component={Trends} />
          <Route path="/settings" component={SettingsPage} />
          <Route component={NotFound} />
        </Switch>
      </AppShell>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;