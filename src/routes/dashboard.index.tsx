import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth, type Transaction } from "@/lib/mock-auth";
import { TransactionReceiptModal } from "@/components/banking/TransactionReceipt";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/lib/currency";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Send,
  CreditCard,
  Users,
  Plus,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardHome,
});

/** Keep long transfer notes readable without blowing the layout. */
function shortDescription(text: string, max = 42): string {
  const t = (text || "").trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

function DashboardHome() {
  const { user, transactions } = useAuth();
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const { currency, toggleCurrency, format } = useCurrency();
  if (!user) return null;

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Balance hero */}
      <section>
        <div className="glass-card overflow-hidden rounded-2xl p-4 sm:rounded-3xl sm:p-6 lg:p-8">
          <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
            <button
              type="button"
              onClick={toggleCurrency}
              className="group min-w-0 flex-1 text-left"
              aria-label={`Switch balance to ${currency === "USD" ? "Swiss francs" : "US dollars"}`}
            >
              <div className="text-xs text-muted-foreground sm:text-sm">Available balance</div>
              <div className="mt-1 break-words text-3xl font-bold tracking-tight transition-opacity group-hover:opacity-70 sm:text-4xl lg:text-5xl">
                {format(user.balance)}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground underline decoration-dotted underline-offset-4 sm:text-xs">
                Tap to view in {currency === "USD" ? "CHF" : "USD"}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[11px] sm:gap-3 sm:text-sm">
                <Badge variant="secondary" className="max-w-full truncate rounded-full text-[10px] sm:text-xs">
                  {user.accountType}
                </Badge>
                <span className="shrink-0 text-muted-foreground">•••• {user.accountNumber.slice(-4)}</span>
                <span className="flex shrink-0 items-center gap-1 text-success">
                  <TrendingUp className="h-3 w-3" /> +2.4%
                </span>
              </div>
            </button>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
              <Button asChild className="h-11 w-full gradient-primary text-primary-foreground shadow-elevated sm:w-auto">
                <Link to="/dashboard/transfer">
                  <Send className="mr-2 h-4 w-4" /> Transfer
                </Link>
              </Button>
              <Button variant="outline" asChild className="h-11 w-full sm:w-auto">
                <Link to="/dashboard/cards">
                  <CreditCard className="mr-2 h-4 w-4" /> Cards
                </Link>
              </Button>
              <Button variant="outline" asChild className="h-11 w-full sm:w-auto">
                <Link to="/dashboard/beneficiaries">
                  <Users className="mr-2 h-4 w-4" /> Beneficiaries
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Account meta */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard title="Account number" value={user.accountNumber} sub={user.iban} />
        <StatCard
          title="Customer ID"
          value={user.customerId}
          sub={`Since ${new Date(user.registrationDate).toLocaleDateString()}`}
        />
        <StatCard title="Status" value={user.status} sub="Fully verified" success />
      </section>

      {/* Activity + side panels */}
      <section className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        <Card className="min-w-0 p-4 sm:p-6 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between gap-2 sm:mb-4">
            <h3 className="text-sm font-semibold sm:text-base">Recent transactions</h3>
            <Link
              to="/dashboard/transactions"
              className="shrink-0 text-xs text-primary hover:underline sm:text-sm"
            >
              View all
            </Link>
          </div>
          {transactions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No recent activity yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {transactions.slice(0, 6).map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedTx(t)}
                    className="flex w-full min-w-0 items-center gap-2.5 py-2.5 text-left transition-colors hover:bg-muted/40 rounded-lg px-1 -mx-1 sm:gap-3 sm:py-3"
                  >
                    <div
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full sm:h-9 sm:w-9 ${
                        t.type === "Credit"
                          ? "bg-success/15 text-success"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {t.type === "Credit" ? (
                        <ArrowDownLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      ) : (
                        <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div
                        className="truncate text-xs font-medium sm:text-sm"
                        title={t.description}
                      >
                        {shortDescription(t.description, 36)}
                      </div>
                      <div className="truncate text-[10px] text-muted-foreground sm:text-xs">
                        {new Date(t.date).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <div
                      className={`shrink-0 text-right text-xs font-semibold tabular-nums sm:text-sm ${
                        t.type === "Credit" ? "text-success" : ""
                      }`}
                    >
                      {t.type === "Credit" ? "+" : "−"}
                      {format(t.amount)}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="grid min-w-0 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-1 lg:space-y-0">
          <Card className="p-4 sm:p-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
              <h3 className="text-sm font-semibold sm:text-base">Profile completion</h3>
            </div>
            <Progress value={72} className="mt-4" />
            <p className="mt-3 text-xs text-muted-foreground">
              Add your address and enable 2FA to reach 100%.
            </p>
            <Button variant="outline" size="sm" className="mt-4 h-10 w-full" asChild>
              <Link to="/dashboard/profile">Complete profile</Link>
            </Button>
          </Card>

          <Card className="p-4 sm:p-6">
            <h3 className="text-sm font-semibold sm:text-base">Quick actions</h3>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4">
              {[
                { l: "Send money", i: Send, to: "/dashboard/transfer" as const },
                { l: "New card", i: Plus, to: "/dashboard/cards" as const },
                { l: "Add payee", i: Users, to: "/dashboard/beneficiaries" as const },
                { l: "Statement", i: ArrowDownLeft, to: "/dashboard/transactions" as const },
              ].map((a) => (
                <Button key={a.l} asChild variant="outline" className="h-auto min-w-0 justify-start px-2 py-2.5 sm:px-3 sm:py-3">
                  <Link to={a.to} className="flex min-w-0 items-center gap-1.5">
                    <a.i className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                    <span className="truncate text-xs sm:text-sm">{a.l}</span>
                  </Link>
                </Button>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <TransactionReceiptModal
        open={!!selectedTx}
        onOpenChange={(o) => {
          if (!o) setSelectedTx(null);
        }}
        transaction={selectedTx}
        user={user}
        format={format}
      />
    </div>
  );
}

function StatCard({
  title,
  value,
  sub,
  success,
}: {
  title: string;
  value: string;
  sub?: string;
  success?: boolean;
}) {
  return (
    <Card className="min-w-0 p-3.5 sm:p-5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground sm:text-xs">{title}</div>
      <div
        className={`mt-1 truncate text-base font-semibold sm:text-lg ${success ? "text-success" : ""}`}
        title={value}
      >
        {value}
      </div>
      {sub && (
        <div className="mt-1 truncate text-[11px] text-muted-foreground sm:text-xs" title={sub}>
          {sub}
        </div>
      )}
    </Card>
  );
}
