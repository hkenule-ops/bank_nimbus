import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/mock-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowDownLeft, ArrowUpRight, Send, CreditCard, Users, Plus, ShieldCheck, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardHome,
});

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function DashboardHome() {
  const { user, transactions } = useAuth();
  if (!user) return null;

  return (
    <div className="space-y-8 pb-24 md:pb-8">
      <section>
        <div className="glass-card overflow-hidden rounded-3xl p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="text-sm text-muted-foreground">Available balance</div>
              <div className="mt-1 text-4xl font-bold sm:text-5xl">{formatMoney(user.balance)}</div>
              <div className="mt-3 flex items-center gap-3 text-sm">
                <Badge variant="secondary" className="rounded-full">{user.accountType}</Badge>
                <span className="text-muted-foreground">•••• {user.accountNumber.slice(-4)}</span>
                <span className="flex items-center gap-1 text-success"><TrendingUp className="h-3 w-3" /> +2.4%</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild className="gradient-primary text-primary-foreground shadow-elevated"><Link to="/dashboard/transfer"><Send className="mr-2 h-4 w-4" /> Transfer</Link></Button>
              <Button variant="outline" asChild><Link to="/dashboard/cards"><CreditCard className="mr-2 h-4 w-4" /> Cards</Link></Button>
              <Button variant="outline" asChild><Link to="/dashboard/beneficiaries"><Users className="mr-2 h-4 w-4" /> Beneficiaries</Link></Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard title="Account number" value={user.accountNumber} sub={user.iban} />
        <StatCard title="Customer ID" value={user.customerId} sub={`Since ${new Date(user.registrationDate).toLocaleDateString()}`} />
        <StatCard title="Status" value={user.status} sub="Fully verified" success />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Recent transactions</h3>
            <Link to="/dashboard/transactions" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          <ul className="divide-y divide-border">
            {transactions.slice(0, 6).map((t) => (
              <li key={t.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className={`grid h-9 w-9 place-items-center rounded-full ${t.type === "Credit" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                    {t.type === "Credit" ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{t.description}</div>
                    <div className="text-xs text-muted-foreground">{new Date(t.date).toLocaleString()}</div>
                  </div>
                </div>
                <div className={`text-sm font-semibold ${t.type === "Credit" ? "text-success" : ""}`}>
                  {t.type === "Credit" ? "+" : "-"}{formatMoney(t.amount)}
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Profile completion</h3>
            </div>
            <Progress value={72} className="mt-4" />
            <p className="mt-3 text-xs text-muted-foreground">Add your address and enable 2FA to reach 100%.</p>
            <Button variant="outline" size="sm" className="mt-4 w-full" asChild><Link to="/dashboard/profile">Complete profile</Link></Button>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold">Quick actions</h3>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                { l: "Send money", i: Send, to: "/dashboard/transfer" as const },
                { l: "New card", i: Plus, to: "/dashboard/cards" as const },
                { l: "Add payee", i: Users, to: "/dashboard/beneficiaries" as const },
                { l: "Statement", i: ArrowDownLeft, to: "/dashboard/transactions" as const },
              ].map((a) => (
                <Button key={a.l} asChild variant="outline" className="h-auto justify-start py-3">
                  <Link to={a.to}><a.i className="mr-2 h-4 w-4" /> {a.l}</Link>
                </Button>
              ))}
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}

function StatCard({ title, value, sub, success }: { title: string; value: string; sub?: string; success?: boolean }) {
  return (
    <Card className="p-5">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className={`mt-1 truncate text-lg font-semibold ${success ? "text-success" : ""}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </Card>
  );
}
