import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { appScriptRequest, isAppScriptConfigured } from "@/lib/appscript";
import type { Transaction } from "@/lib/mock-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/transactions")({
  component: AdminTransactionsPage,
});

function AdminTransactionsPage() {
  const [rows, setRows] = useState<(Transaction & { customerName?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (!isAppScriptConfigured()) {
        setRows([]);
        return;
      }
      const res = await appScriptRequest<(Transaction & { customerName?: string })[]>("listAllTransactions", {});
      if (res.ok && Array.isArray(res.data)) setRows(res.data);
      else toast.error(res.error || "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Transactions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAppScriptConfigured()
              ? "All ledger entries from Google Sheets."
              : "Configure VITE_APP_SCRIPT_URL to load transactions."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">No transactions yet.</div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((t) => (
              <li key={t.id} className="flex items-start justify-between gap-3 px-3 py-3.5 sm:items-center sm:px-5 sm:py-4">
                <div className="flex min-w-0 items-start gap-3 sm:items-center">
                  <div
                    className={`grid h-10 w-10 place-items-center rounded-full ${
                      t.type === "Credit" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {t.type === "Credit" ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{t.description}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(t.date).toLocaleString()}
                      {t.customerName ? ` · ${t.customerName}` : ""}
                      {t.customerId ? ` · ${t.customerId}` : ""}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-[10px]">
                    {t.status}
                  </Badge>
                  <div className={`text-sm font-semibold ${t.type === "Credit" ? "text-success" : ""}`}>
                    {t.type === "Credit" ? "+" : "-"}$
                    {Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
