import { Link, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/mock-auth";
import { Logo } from "@/components/site/Logo";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Send,
  CreditCard,
  Users,
  User,
  LogOut,
  Receipt,
  Bitcoin,
  Landmark,
  Menu,
  X,
  MoreHorizontal,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const items: ReadonlyArray<{ to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }> = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/transfer", label: "Transfer", icon: Send },
  { to: "/dashboard/transactions", label: "Activity", icon: Receipt },
  { to: "/dashboard/crypto", label: "Crypto", icon: Bitcoin },
  { to: "/dashboard/loans", label: "Loans", icon: Landmark },
  { to: "/dashboard/cards", label: "Cards", icon: CreditCard },
  { to: "/dashboard/beneficiaries", label: "Payees", icon: Users },
  { to: "/dashboard/profile", label: "Profile", icon: User },
];

const mobilePrimary = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/transfer", label: "Transfer", icon: Send },
  { to: "/dashboard/transactions", label: "Activity", icon: Receipt },
  { to: "/dashboard/cards", label: "Cards", icon: CreditCard },
] as const;

function NavLinks({ onNavigate, className }: { onNavigate?: () => void; className?: string }) {
  const loc = useLocation();
  return (
    <nav className={cn("space-y-1", className)}>
      {items.map((it) => {
        const active = it.exact ? loc.pathname === it.to : loc.pathname.startsWith(it.to);
        return (
          <Link
            key={it.to}
            to={it.to as string}
            onClick={onNavigate}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors touch-manipulation",
              active
                ? "gradient-primary text-primary-foreground shadow-elevated"
                : "text-sidebar-foreground hover:bg-sidebar-accent active:bg-sidebar-accent",
            )}
          >
            <it.icon className="h-4 w-4 shrink-0" />
            <span>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function CustomerShell({ children }: { children?: ReactNode }) {
  const { user, logout, authReady } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    // Wait until session is restored from storage before deciding to kick out
    if (!authReady) return;
    if (!user) nav({ to: "/login" });
  }, [user, authReady, nav]);

  useEffect(() => {
    setMenuOpen(false);
  }, [loc.pathname]);

  if (!authReady) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-muted/30 text-sm text-muted-foreground">
        Restoring session…
      </div>
    );
  }

  if (!user) return null;

  const pageTitle =
    items.find((it) => (it.exact ? loc.pathname === it.to : loc.pathname.startsWith(it.to)))?.label ??
    "Account";

  const initials = `${(user.firstName || "?").charAt(0)}${(user.lastName || "").charAt(0)}`.toUpperCase();

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-muted/30">
      <div className="flex min-w-0">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-[100dvh] w-64 shrink-0 flex-col border-r border-border/60 bg-sidebar p-4 md:flex">
          <Logo className="mb-6 px-2" />
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <NavLinks />
          </div>
          <div className="mt-4 border-t border-sidebar-border pt-4">
            <button
              type="button"
              onClick={() => {
                logout();
                nav({ to: "/" });
              }}
              className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent"
            >
              <LogOut className="h-4 w-4 shrink-0" /> Sign out
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border/60 bg-background/90 px-3 backdrop-blur-xl sm:h-16 sm:px-6 lg:px-8">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0 md:hidden"
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="min-w-0 flex-1 md:hidden">
              <div className="truncate text-sm font-semibold">{pageTitle}</div>
              <div className="truncate text-[10px] text-muted-foreground">
                {user.firstName} {user.lastName}
              </div>
            </div>

            <div className="hidden min-w-0 flex-1 md:block">
              <div className="truncate text-sm font-semibold">
                Welcome, {user.firstName}
              </div>
              <div className="truncate text-xs text-muted-foreground">{pageTitle}</div>
            </div>

            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full gradient-primary text-xs font-semibold text-primary-foreground">
              {initials}
            </div>
          </header>

          <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-4 sm:px-6 sm:py-8 lg:px-8 pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:pb-8">
            {children ?? <Outlet />}
          </main>
        </div>
      </div>

      {/* Mobile drawer */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="flex w-[min(100%,20rem)] flex-col bg-sidebar p-0">
          <SheetHeader className="border-b border-sidebar-border px-4 py-4 text-left">
            <div className="flex items-center justify-between gap-2">
              <Logo />
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <SheetTitle className="sr-only">Account navigation</SheetTitle>
            <SheetDescription className="sr-only">Navigate your banking dashboard</SheetDescription>
            <div className="mt-3 rounded-xl bg-muted/50 px-3 py-2 text-left">
              <div className="truncate text-sm font-medium">
                {user.firstName} {user.lastName}
              </div>
              <div className="truncate text-xs text-muted-foreground">{user.email}</div>
            </div>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
            <NavLinks onNavigate={() => setMenuOpen(false)} />
          </div>
          <div className="border-t border-sidebar-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Button
              variant="ghost"
              className="h-11 w-full justify-start"
              onClick={() => {
                setMenuOpen(false);
                logout();
                nav({ to: "/" });
              }}
            >
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Mobile bottom navigation */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-xl md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Primary account navigation"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5 gap-0 px-1 pt-1">
          {mobilePrimary.map((it) => {
            const active =
              "exact" in it && it.exact ? loc.pathname === it.to : loc.pathname.startsWith(it.to);
            return (
              <li key={it.to}>
                <Link
                  to={it.to as string}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-2 text-[10px] font-medium touch-manipulation transition-colors",
                    active ? "text-primary" : "text-muted-foreground active:bg-muted",
                  )}
                >
                  <it.icon className={cn("h-5 w-5", active && "text-primary")} />
                  <span className="truncate">{it.label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="flex w-full flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-2 text-[10px] font-medium text-muted-foreground touch-manipulation active:bg-muted"
            >
              <MoreHorizontal className="h-5 w-5" />
              <span>More</span>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
