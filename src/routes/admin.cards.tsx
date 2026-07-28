import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Loader2, CreditCard } from "lucide-react";
import { appScriptRequest, isAppScriptConfigured } from "@/lib/appscript";
import type { Customer } from "@/lib/mock-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/cards")({
  component: CardsPage,
});

/** Simulated debit cards linked to each customer. Freeze maps to Suspended status. */
function CardsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (!isAppScriptConfigured()) {
        setCustomers([]);
        return;
      }
      const res = await appScriptRequest<Customer[]>("listCustomers", {});
      if (res.ok && Array.isArray(res.data)) setCustomers(res.data);
      else toast.error(res.error || "Failed to load cards");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setStatus = async (customerId: string, status: Customer["status"]) => {
    setBusyId(customerId);
    try {
      const res = await appScriptRequest<Customer>("updateCustomer", { customerId, status });
      if (res.ok) {
        toast.success(status === "Suspended" ? "Card frozen" : "Card unfrozen");
        void load();
      } else toast.error(res.error || "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Cards</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Simulated debit cards linked to each customer account. Freeze maps to account suspension.
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
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-12 text-sm text-muted-foreground">
            <CreditCard className="h-8 w-8 opacity-40" />
            No customer cards yet.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {customers.map((c) => {
              const frozen = c.status === "Suspended";
              const last4 = String(c.accountNumber || "0000").slice(-4);
              return (
                <li key={c.customerId} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                  <div className="flex items-center gap-4">
                    <div className="grid h-12 w-16 place-items-center rounded-lg bg-gradient-to-br from-[#0b1e3e] to-[#1a3a5c] text-xs font-mono text-[#c9aa54]">
                      ••{last4}
                    </div>
                    <div>
                      <div className="font-medium">
                        {c.firstName} {c.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {c.accountType} · {c.accountNumber}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={frozen ? "destructive" : "outline"}>
                      {frozen ? "Frozen" : "Active"}
                    </Badge>
                    {frozen ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === c.customerId}
                        onClick={() => void setStatus(c.customerId, "Active")}
                      >
                        Unfreeze
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === c.customerId}
                        onClick={() => void setStatus(c.customerId, "Suspended")}
                      >
                        Freeze
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
