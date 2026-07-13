import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Users, Wallet, Receipt, CreditCard, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminHome,
});

const stats = [
  { l: "Total customers", v: "12,438", i: Users, d: "+312 this month" },
  { l: "Total balances", v: "$48.2M", i: Wallet, d: "+4.1% MoM" },
  { l: "Transactions (30d)", v: "89,214", i: Receipt, d: "+7.9% vs prev" },
  { l: "Active cards", v: "9,782", i: CreditCard, d: "+128 requests" },
];

const activity = [
  { t: "New customer registered", d: "Priya Shah • Savings", w: "2m ago" },
  { t: "Large transfer flagged", d: "$18,400 • Business", w: "12m ago" },
  { t: "Card request approved", d: "Debit • Alex Morgan", w: "34m ago" },
  { t: "Account frozen", d: "Compliance review", w: "1h ago" },
  { t: "Password reset", d: "Automated OTP", w: "2h ago" },
];

function AdminHome() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">System-wide statistics for Nimbus Bank.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.l} className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{s.l}</div>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary"><s.i className="h-4 w-4" /></div>
            </div>
            <div className="mt-2 text-2xl font-bold">{s.v}</div>
            <div className="mt-2 flex items-center gap-1 text-xs text-success"><TrendingUp className="h-3 w-3" /> {s.d}</div>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <h3 className="font-semibold">Recent activity</h3>
          <ul className="mt-4 divide-y divide-border">
            {activity.map((a, i) => (
              <li key={i} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-medium">{a.t}</div>
                  <div className="text-xs text-muted-foreground">{a.d}</div>
                </div>
                <div className="text-xs text-muted-foreground">{a.w}</div>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold">Operational health</h3>
          <ul className="mt-4 space-y-3 text-sm">
            <Row k="Uptime (30d)" v="99.98%" />
            <Row k="Avg. response" v="182ms" />
            <Row k="Pending approvals" v="7" />
            <Row k="Support tickets" v="24 open" />
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <li className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0"><span className="text-muted-foreground">{k}</span><span className="font-medium">{v}</span></li>;
}
