import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  Wallet,
  Receipt,
  KeyRound,
  TrendingUp,
  RefreshCw,
  Loader2,
  MessageCircle,
} from "lucide-react";
import { appScriptRequest, isAppScriptConfigured } from "@/lib/appscript";
import type { Customer, Transaction } from "@/lib/mock-auth";
import { listTransferOtpSessions, type TransferOtpSession } from "@/lib/transfer-otp";
import { chatListThreads, type ChatThread } from "@/lib/live-chat";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/")({
  component: AdminHome,
});

function AdminHome() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<(Transaction & { customerName?: string })[]>([]);
  const [otpPending, setOtpPending] = useState(0);
  const [openChats, setOpenChats] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (!isAppScriptConfigured()) {
        setCustomers([]);
        setTransactions([]);
        setOtpPending(0);
        setOpenChats(0);
        return;
      }

      const [custRes, txRes, otpList, threads] = await Promise.all([
        appScriptRequest<Customer[]>("listCustomers", {}),
        appScriptRequest<(Transaction & { customerName?: string })[]>("listAllTransactions", {}),
        listTransferOtpSessions(),
        chatListThreads().catch(() => [] as ChatThread[]),
      ]);

      if (custRes.ok && Array.isArray(custRes.data)) setCustomers(custRes.data);
      else if (!custRes.ok) toast.error(custRes.error || "Failed to load customers");

      if (txRes.ok && Array.isArray(txRes.data)) setTransactions(txRes.data);

      setOtpPending(otpList.filter((s: TransferOtpSession) => s.status === "pending").length);
      setOpenChats(threads.filter((t) => t.status === "open").length);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totalBalance = customers.reduce((sum, c) => sum + (Number(c.balance) || 0), 0);
  const activeCount = customers.filter((c) => c.status === "Active").length;
  const suspendedCount = customers.filter((c) => c.status === "Suspended").length;
  const recentTx = transactions.slice(0, 8);

  const stats = [
    {
      l: "Total customers",
      v: String(customers.length),
      i: Users,
      d: `${activeCount} active · ${suspendedCount} suspended`,
    },
    {
      l: "Total balances",
      v: `$${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      i: Wallet,
      d: "Sum of all account balances",
    },
    {
      l: "Transactions",
      v: String(transactions.length),
      i: Receipt,
      d: "All-time ledger entries",
    },
    {
      l: "Pending OTP",
      v: String(otpPending),
      i: KeyRound,
      d: `${openChats} open chat thread${openChats === 1 ? "" : "s"}`,
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAppScriptConfigured()
              ? "Live statistics from Google Sheets."
              : "Configure VITE_APP_SCRIPT_URL for live admin data."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loading && customers.length === 0 ? (
        <Card className="flex items-center justify-center gap-2 p-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading overview…
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => (
              <Card key={s.l} className="p-5">
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">{s.l}</div>
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                    <s.i className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-bold">{s.v}</div>
                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 text-success" /> {s.d}
                </div>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="p-6 lg:col-span-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Recent transactions</h3>
                <Link to="/admin/transactions" className="text-xs text-primary hover:underline">
                  View all
                </Link>
              </div>
              {recentTx.length === 0 ? (
                <p className="mt-6 text-sm text-muted-foreground">No transactions yet.</p>
              ) : (
                <ul className="mt-4 divide-y divide-border">
                  {recentTx.map((t) => (
                    <li key={t.id} className="flex items-center justify-between py-3">
                      <div>
                        <div className="text-sm font-medium">{t.description}</div>
                        <div className="text-xs text-muted-foreground">
                          {t.customerName || t.customerId || "—"} ·{" "}
                          {t.date ? new Date(t.date).toLocaleString() : ""}
                        </div>
                      </div>
                      <div
                        className={`text-sm font-semibold ${t.type === "Credit" ? "text-success" : ""}`}
                      >
                        {t.type === "Credit" ? "+" : "-"}$
                        {Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold">Quick links</h3>
              <ul className="mt-4 space-y-2 text-sm">
                <QuickLink to="/admin/customers" icon={Users} label="Manage customers" />
                <QuickLink to="/admin/otp" icon={KeyRound} label="Transfer OTP desk" />
                <QuickLink to="/admin/chat" icon={MessageCircle} label="Live chat" />
                <QuickLink to="/admin/transactions" icon={Receipt} label="All transactions" />
              </ul>
              <div className="mt-6 space-y-2 border-t border-border pt-4 text-sm">
                <Row k="Active accounts" v={String(activeCount)} />
                <Row k="Suspended" v={String(suspendedCount)} />
                <Row k="Pending OTP sessions" v={String(otpPending)} />
                <Row k="Open chats" v={String(openChats)} />
              </div>
            </Card>
          </div>
        </>
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

function QuickLink({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: typeof Users;
  label: string;
}) {
  return (
    <li>
      <Link
        to={to}
        className="flex items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-muted"
      >
        <Icon className="h-4 w-4 text-primary" />
        <span>{label}</span>
      </Link>
    </li>
  );
}
