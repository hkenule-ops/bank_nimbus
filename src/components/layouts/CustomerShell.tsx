import { Link, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/mock-auth";
import { Logo } from "@/components/site/Logo";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Send, CreditCard, Users, User, Bell, Settings, LogOut, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

const items: ReadonlyArray<{ to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }> = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/transfer", label: "Transfer", icon: Send },
  { to: "/dashboard/transactions", label: "Transactions", icon: Receipt },
  { to: "/dashboard/cards", label: "Cards", icon: CreditCard },
  { to: "/dashboard/beneficiaries", label: "Beneficiaries", icon: Users },
  { to: "/dashboard/profile", label: "Profile", icon: User },
];

export function CustomerShell({ children }: { children?: ReactNode }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    if (!user) nav({ to: "/login" });
  }, [user, nav]);

  if (!user) return null;

  return (
    <div className="min-h-screen overflow-x-hidden bg-muted/30">
      <div className="flex min-w-0">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-border/60 bg-sidebar p-4 md:block">
          <Logo className="mb-8 px-2" />
          <nav className="space-y-1">
            {items.map((it) => {
              const active = it.exact ? loc.pathname === it.to : loc.pathname.startsWith(it.to);
              return (
                <Link key={it.to} to={it.to as string} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors", active ? "gradient-primary text-primary-foreground shadow-elevated" : "text-sidebar-foreground hover:bg-sidebar-accent")}>
                  <it.icon className="h-4 w-4" /> {it.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-8 border-t border-sidebar-border pt-4">
            <button onClick={() => { logout(); nav({ to: "/" }); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/60 bg-background/80 px-3 backdrop-blur-xl sm:px-6 lg:px-8">
            <div className="md:hidden"><Logo /></div>
            <div className="hidden md:block">
              <div className="text-sm text-muted-foreground">Welcome back,</div>
              <div className="text-sm font-semibold">{user.firstName} {user.lastName}</div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="icon" variant="ghost"><Bell className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" asChild><Link to="/dashboard/profile"><Settings className="h-4 w-4" /></Link></Button>
              <div className="grid h-9 w-9 place-items-center rounded-full gradient-primary text-sm font-semibold text-primary-foreground">
                {user.firstName[0]}{user.lastName[0]}
              </div>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-3 py-8 pb-24 sm:px-6 sm:pb-8 lg:px-8">{children ?? <Outlet />}</main>
          <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around gap-1 border-t border-border/60 bg-background/95 px-1 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
            {items.slice(0, 5).map((it) => {
              const active = it.exact ? loc.pathname === it.to : loc.pathname.startsWith(it.to);
              return (
                <Link key={it.to} to={it.to as string} className={cn("flex flex-col items-center gap-0.5 px-1 py-1 text-[9px] leading-none", active ? "text-primary" : "text-muted-foreground")}>
                  <it.icon className="h-5 w-5" /> {it.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
