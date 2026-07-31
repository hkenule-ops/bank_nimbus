import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/mock-auth";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  Receipt,
  CreditCard,
  Bell,
  Settings,
  LogOut,
  FileText,
  ShieldAlert,
  KeyRound,
  MessageCircle,
  Menu,
  X,
  Bitcoin,
  Landmark,
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
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/transactions", label: "Transactions", icon: Receipt },
  { to: "/admin/otp", label: "Transfer OTP", icon: KeyRound },
  { to: "/admin/chat", label: "Live chat", icon: MessageCircle },
  { to: "/admin/cards", label: "Cards", icon: CreditCard },
  { to: "/admin/crypto", label: "Crypto", icon: Bitcoin },
  { to: "/admin/loans", label: "Loans", icon: Landmark },
  { to: "/admin/reports", label: "Reports", icon: FileText },
  { to: "/admin/notifications", label: "Notifications", icon: Bell },
  { to: "/admin/audit", label: "Audit logs", icon: ShieldAlert },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

/** Primary destinations shown in the mobile bottom bar */
const mobilePrimary = [
  { to: "/admin", label: "Home", icon: LayoutDashboard, exact: true },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/otp", label: "OTP", icon: KeyRound },
  { to: "/admin/chat", label: "Chat", icon: MessageCircle },
] as const;

function SidebarLogo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <Link
      to="/admin"
      className={cn(
        "flex items-center gap-2 rounded-lg px-1.5 py-1 transition-opacity hover:opacity-90 select-none",
        className,
      )}
    >
      <svg viewBox="0 0 100 120" className={cn("shrink-0", compact ? "h-7 w-auto" : "h-8 w-auto")} aria-hidden="true">
        <path
          d="M50 4 L92 18 V56 C92 86 74 106 50 116 C26 106 8 86 8 56 V18 Z"
          fill="none"
          stroke="#C9AA54"
          strokeWidth="4"
        />
        <text
          x="50"
          y="80"
          textAnchor="middle"
          fontFamily="'Times New Roman', Georgia, serif"
          fontWeight="700"
          fontSize="63"
          fill="#C9AA54"
        >
          H
        </text>
      </svg>
      {!compact && (
        <>
          <div className="h-6 w-px shrink-0 bg-sidebar-border" />
          <div className="flex min-w-0 flex-col leading-tight">
            <span
              className="truncate text-[14px] font-medium tracking-[0.14em] text-sidebar-foreground"
              style={{ fontFamily: "'Times New Roman', Georgia, serif" }}
            >
              BANGUE
            </span>
            <span
              className="truncate text-[9px] tracking-[0.1em] text-[#C9AA54]"
              style={{ fontFamily: "'Times New Roman', Georgia, serif" }}
            >
              HERUTAGE BANK
            </span>
          </div>
        </>
      )}
    </Link>
  );
}

function NavLinks({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
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

export function AdminShell({ children }: { children?: ReactNode }) {
  const { isAdmin, logout, authReady } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!authReady) return;
    if (!isAdmin) nav({ to: "/login" });
  }, [isAdmin, authReady, nav]);

  // Close drawer on route change
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

  if (!isAdmin) return null;

  const pageTitle =
    items.find((it) => (it.exact ? loc.pathname === it.to : loc.pathname.startsWith(it.to)))?.label ??
    "Admin";

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-muted/30">
      <div className="flex min-w-0">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-[100dvh] w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 md:flex">
          <div className="mb-2">
            <SidebarLogo />
          </div>
          <div className="mb-4 px-2 text-[10px] font-semibold uppercase tracking-wider text-primary">
            Admin console
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <NavLinks />
          </div>
          <div className="mt-4 border-t border-sidebar-border pt-4">
            <Button
              variant="ghost"
              className="h-11 w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={() => {
                logout();
                nav({ to: "/" });
              }}
            >
              <LogOut className="mr-2 h-4 w-4 shrink-0" /> Sign out
            </Button>
          </div>
        </aside>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border/60 bg-background/90 px-3 backdrop-blur-xl sm:h-16 sm:px-6 lg:px-8 safe-top">
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
              <div className="truncate text-[10px] text-muted-foreground">Admin console</div>
            </div>

            <div className="hidden min-w-0 flex-1 md:block">
              <div className="text-sm font-semibold">Admin Console</div>
              <div className="text-xs text-muted-foreground">{pageTitle}</div>
            </div>

            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full gradient-primary text-sm font-semibold text-primary-foreground">
              AD
            </div>
          </header>

          {/* pb accounts for mobile bottom nav */}
          <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-4 sm:px-6 sm:py-8 lg:px-8 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-8">
            {children ?? <Outlet />}
          </main>
        </div>
      </div>

      {/* Mobile drawer */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="flex w-[min(100%,20rem)] flex-col bg-sidebar p-0 text-sidebar-foreground">
          <SheetHeader className="border-b border-sidebar-border px-4 py-4 text-left">
            <div className="flex items-center justify-between gap-2">
              <SidebarLogo />
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <SheetTitle className="sr-only">Admin navigation</SheetTitle>
            <SheetDescription className="sr-only">Navigate the admin console</SheetDescription>
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

      {/* Mobile bottom nav — primary actions */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-xl md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Primary admin navigation"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5 gap-0 px-1 pt-1">
          {mobilePrimary.map((it) => {
            const active = "exact" in it && it.exact ? loc.pathname === it.to : loc.pathname.startsWith(it.to);
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
              <Menu className="h-5 w-5" />
              <span>More</span>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
