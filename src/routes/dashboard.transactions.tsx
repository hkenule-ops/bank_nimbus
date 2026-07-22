import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/mock-auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/dashboard/transactions")({
  head: () => ({ meta: [{ title: "Transactions — Bangue Herutage Bank" }] }),
  component: TxPage,
});

function TxPage() {
  const { transactions } = useAuth();
  return (
    <div className="space-y-6 pb-24 md:pb-8">
      <div>
        <h1 className="text-2xl font-bold">Transactions</h1>
        <p className="mt-1 text-sm text-muted-foreground">Every credit and debit on your account.</p>
      </div>
      <Card className="overflow-hidden">
        <ul className="divide-y divide-border">
          {transactions.map((t) => (
            <li key={t.id} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div className={`grid h-10 w-10 place-items-center rounded-full ${t.type === "Credit" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                  {t.type === "Credit" ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                </div>
                <div>
                  <div className="text-sm font-medium">{t.description}</div>
                  <div className="text-xs text-muted-foreground">{new Date(t.date).toLocaleString()}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-[10px]">{t.status}</Badge>
                <div className={`text-sm font-semibold ${t.type === "Credit" ? "text-success" : ""}`}>
                  {t.type === "Credit" ? "+" : "-"}{t.amount.toLocaleString(undefined, { style: "currency", currency: "USD" })}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
