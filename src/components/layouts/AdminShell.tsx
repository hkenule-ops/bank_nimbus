import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/mock-auth";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, Receipt, CreditCard, Bell, Settings, LogOut, FileText, ShieldAlert, KeyRound, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const items: ReadonlyArray<{ to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }> = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/transactions", label: "Transactions", icon: Receipt },
  { to: "/admin/otp", label: "Transfer OTP", icon: KeyRound },
  { to: "/admin/chat", label: "Live chat", icon: MessageCircle },
  { to: "/admin/cards", label: "Cards", icon: CreditCard },
  { to: "/admin/reports", label: "Reports", icon: FileText },
  { to: "/admin/notifications", label: "Notifications", icon: Bell },
  { to: "/admin/audit", label: "Audit logs", icon: ShieldAlert },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

/** Independent, custom logo designed specifically for the Admin Sidebar */
function SidebarLogo({ className }: { className?: string }) {
  return (
    <Link
      to="/admin"
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-opacity hover:opacity-90 select-none",
        className
      )}
    >
      {/* Gold Shield Emblem */}
      <svg
        viewBox="0 0 100 120"
        className="h-8 w-auto shrink-0"
        aria-hidden="true"
      >
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

      {/* Subtle Divider */}
      <div className="h-6 w-px bg-sidebar-border shrink-0" />

      {/* Tailored Admin Wordmark */}
      <div className="flex flex-col leading-tight">
        <span
          className="text-[15px] font-medium tracking-[0.16em] text-sidebar-foreground"
          style={{ fontFamily: "'Times New Roman', Georgia, serif" }}
        >
          BANGUE
        </span>
        <span
          className="text-[9.5px] font-normal tracking-[0.12em] text-[#C9AA54]"
          style={{ fontFamily: "'Times New Roman', Georgia, serif" }}
        >
          HERUTAGE BANK
        </span>
      </div>
    </Link>
  );
}

export function AdminShell({ children }: { children?: ReactNode }) {
  const { isAdmin, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    if (!isAdmin) nav({ to: "/admin/login" });
  }, [isAdmin, nav]);

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen overflow-x-hidden bg-muted/30">
      <div className="flex min-w-0">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-sidebar-border bg-sidebar p-4 md:block">
          
          {/* Custom Dedicated Sidebar Logo Header */}
          <div className="mb-2">
            <SidebarLogo />
          </div>

          <div className="mb-6 px-2 text-[10px] font-semibold uppercase tracking-wider text-primary">
            Admin console
          </div>

          <nav className="space-y-1">
            {items.map((it) => {
              const active = it.exact ? loc.pathname === it.to : loc.pathname.startsWith(it.to);
              return (
                <Link
                  key={it.to}
                  to={it.to as string}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "gradient-primary text-primary-foreground shadow-elevated"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <it.icon className="h-4 w-4 shrink-0" />
                  <span>{it.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 border-t border-sidebar-border pt-4">
            <Button
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={() => {
                logout();
                nav({ to: "/" });
              }}
            >
              <LogOut className="mr-2 h-4 w-4 shrink-0" /> Sign out
            </Button>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/60 bg-background/80 px-3 backdrop-blur-xl sm:px-6 lg:px-8">
            <div className="md:hidden">
              <SidebarLogo />
            </div>
            <div className="hidden md:block text-sm font-semibold">Admin Console</div>
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full gradient-primary text-sm font-semibold text-primary-foreground">
              AD
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-3 py-8 sm:px-6 lg:px-8">{children ?? <Outlet />}</main>
        </div>
      </div>
    </div>
  );
}