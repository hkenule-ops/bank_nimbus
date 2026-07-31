import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuth, sortTransactionsByDate, type Transaction } from "@/lib/mock-auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/lib/currency";
import { ArrowDownLeft, ArrowUpRight, Receipt } from "lucide-react";
import { TransactionReceiptModal } from "@/components/banking/TransactionReceipt";

export const Route = createFileRoute("/dashboard/transactions")({
  head: () => ({ meta: [{ title: "Transactions — Bangue Herutage Bank" }] }),
  component: TxPage,
});

function TxPage() {
  const { transactions, user } = useAuth();
  const { currency, toggleCurrency, format } = useCurrency();
  const ordered = useMemo(() => sortTransactionsByDate(transactions), [transactions]);
  const [selected, setSelected] = useState<Transaction | null>(null);

  return (
    <div className="space-y-6 pb-2 md:pb-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Transactions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every credit and debit on your account. Tap a row for the full receipt.
          </p>
        </div>
        <button
          type="button"
          onClick={toggleCurrency}
          className="shrink-0 rounded-full border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
        >
          Showing {currency} — tap to switch
        </button>
      </div>
      <Card className="overflow-hidden">
        {ordered.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            No transactions yet.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {ordered.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setSelected(t)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/40 focus-visible:bg-muted/50 focus-visible:outline-none"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                        t.type === "Credit" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {t.type === "Credit" ? (
                        <ArrowDownLeft className="h-4 w-4" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{t.description}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(t.date).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                    <Badge variant="outline" className="hidden text-[10px] sm:inline-flex">
                      {t.status}
                    </Badge>
                    <div
                      className={`text-sm font-semibold ${t.type === "Credit" ? "text-success" : ""}`}
                    >
                      {t.type === "Credit" ? "+" : "−"}
                      {format(t.amount)}
                    </div>
                    <Receipt className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <TransactionReceiptModal
        open={!!selected}
        onOpenChange={(o) => {
          if (!o) setSelected(null);
        }}
        transaction={selected}
        user={user}
        format={format}
      />
    </div>
  );
}
