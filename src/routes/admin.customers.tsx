import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, RefreshCw, Loader2 } from "lucide-react";
import { appScriptRequest, isAppScriptConfigured } from "@/lib/appscript";
import type { Customer } from "@/lib/mock-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/customers")({
  component: CustomersPage,
});

function CustomersPage() {
  const [q, setQ] = useState("");
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
      else toast.error(res.error || "Failed to load customers");
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
        toast.success(`Status → ${status}`);
        void load();
      } else toast.error(res.error || "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  const filtered = customers.filter((c) =>
    `${c.firstName} ${c.lastName} ${c.email} ${c.customerId} ${c.accountNumber}`
      .toLowerCase()
      .includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAppScriptConfigured()
              ? "Live data from Google Sheets."
              : "Configure VITE_APP_SCRIPT_URL to load customers from Sheets."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-56 pl-9"
            />
          </div>
          <Button variant="outline" size="icon" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Account</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Balance</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    No customers found.
                  </td>
                </tr>
              )}
              {filtered.map((c) => (
                <tr key={c.customerId} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="font-medium">
                      {c.firstName} {c.lastName}
                    </div>
                    <div className="text-xs text-muted-foreground">{c.email}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {c.accountNumber}
                    <div className="text-muted-foreground">{c.customerId}</div>
                  </td>
                  <td className="px-4 py-3">{c.accountType}</td>
                  <td className="px-4 py-3 font-medium">
                    ${Number(c.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        c.status === "Active" ? "default" : c.status === "Suspended" ? "destructive" : "secondary"
                      }
                      className={c.status === "Active" ? "bg-success/15 text-success hover:bg-success/20" : ""}
                    >
                      {c.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      {c.status !== "Active" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busyId === c.customerId}
                          onClick={() => void setStatus(c.customerId, "Active")}
                        >
                          Activate
                        </Button>
                      )}
                      {c.status !== "Suspended" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busyId === c.customerId}
                          onClick={() => void setStatus(c.customerId, "Suspended")}
                        >
                          Suspend
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
