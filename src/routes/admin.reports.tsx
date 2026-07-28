import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2, FileText } from "lucide-react";
import { appScriptRequest, isAppScriptConfigured } from "@/lib/appscript";
import type { Customer, Transaction } from "@/lib/mock-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<(Transaction & { customerName?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (!isAppScriptConfigured()) {
        setCustomers([]);
        setTransactions([]);
        return;
      }
      const [c, t] = await Promise.all([
        appScriptRequest<Customer[]>("listCustomers", {}),
        appScriptRequest<(Transaction & { customerName?: string })[]>("listAllTransactions", {}),
      ]);
      if (c.ok && Array.isArray(c.data)) setCustomers(c.data);
      else toast.error(c.error || "Failed to load customers");
      if (t.ok && Array.isArray(t.data)) setTransactions(t.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const report = useMemo(() => {
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let totalBal = 0;
    let credits = 0;
    let debits = 0;

    for (const c of customers) {
      byType[c.accountType || "Unknown"] = (byType[c.accountType || "Unknown"] || 0) + 1;
      byStatus[c.status || "Unknown"] = (byStatus[c.status || "Unknown"] || 0) + 1;
      totalBal += Number(c.balance) || 0;
    }
    for (const t of transactions) {
      if (t.type === "Credit") credits += Number(t.amount) || 0;
      else debits += Number(t.amount) || 0;
    }

    return { byType, byStatus, totalBal, credits, debits, customerCount: customers.length, txCount: transactions.length };
  }, [customers, transactions]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Snapshot of customers, balances, and ledger activity from Google Sheets.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <Card className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Building report…
        </Card>
      ) : !isAppScriptConfigured() ? (
        <Card className="flex flex-col items-center gap-2 p-12 text-sm text-muted-foreground">
          <FileText className="h-8 w-8 opacity-40" />
          Configure VITE_APP_SCRIPT_URL to generate reports.
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="p-6">
            <h3 className="font-semibold">Portfolio summary</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <Row k="Customers" v={String(report.customerCount)} />
              <Row
                k="Total balances"
                v={`${report.totalBal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              />
              <Row k="Transactions" v={String(report.txCount)} />
              <Row
                k="Total credits"
                v={`${report.credits.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              />
              <Row
                k="Total debits"
                v={`${report.debits.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              />
            </ul>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold">By account type</h3>
            <ul className="mt-4 space-y-2 text-sm">
              {Object.keys(report.byType).length === 0 && (
                <li className="text-muted-foreground">No data</li>
              )}
              {Object.entries(report.byType)
                .sort((a, b) => b[1] - a[1])
                .map(([k, v]) => (
                  <Row key={k} k={k} v={String(v)} />
                ))}
            </ul>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold">By status</h3>
            <ul className="mt-4 space-y-2 text-sm">
              {Object.entries(report.byStatus).map(([k, v]) => (
                <Row key={k} k={k} v={String(v)} />
              ))}
            </ul>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold">Top balances</h3>
            <ul className="mt-4 divide-y divide-border text-sm">
              {[...customers]
                .sort((a, b) => (Number(b.balance) || 0) - (Number(a.balance) || 0))
                .slice(0, 8)
                .map((c) => (
                  <li key={c.customerId} className="flex justify-between py-2">
                    <span>
                      {c.firstName} {c.lastName}
                    </span>
                    <span className="font-medium">
                      {"$" + Number(c.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </li>
                ))}
              {customers.length === 0 && <li className="py-2 text-muted-foreground">No customers</li>}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <li className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium">{v}</span>
    </li>
  );
}
