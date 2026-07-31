import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, Loader2, ArrowDownLeft, ArrowUpRight, Pencil, Trash2, Plus } from "lucide-react";
import { appScriptRequest, isAppScriptConfigured } from "@/lib/appscript";
import type { Customer, Transaction } from "@/lib/mock-auth";
import { sortTransactionsByDate } from "@/lib/mock-auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/transactions")({
  component: AdminTransactionsPage,
});

type AdminTx = Transaction & { customerName?: string };

const TX_TYPES: Transaction["type"][] = ["Credit", "Debit"];
const TX_STATUSES: Transaction["status"][] = ["Completed", "Pending", "Failed"];

type TxForm = {
  customerId: string;
  type: Transaction["type"];
  amount: string;
  description: string;
  dateLocal: string;
  status: Transaction["status"];
  reference: string;
  counterparty: string;
  category: string;
  notes: string;
  balanceAfter: string;
};

function toDateLocal(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDateLocal(local: string): string {
  if (!local) return new Date().toISOString();
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function emptyForm(customerId = ""): TxForm {
  return {
    customerId,
    type: "Credit",
    amount: "",
    description: "",
    dateLocal: toDateLocal(new Date().toISOString()),
    status: "Completed",
    reference: "",
    counterparty: "",
    category: "",
    notes: "",
    balanceAfter: "",
  };
}

function txToForm(t: AdminTx): TxForm {
  return {
    customerId: t.customerId || "",
    type: t.type,
    amount: String(t.amount ?? ""),
    description: t.description || "",
    dateLocal: toDateLocal(t.date),
    status: t.status || "Completed",
    reference: t.reference || "",
    counterparty: t.counterparty || "",
    category: t.category || "",
    notes: t.notes || "",
    balanceAfter: t.balance != null ? String(t.balance) : "",
  };
}

function AdminTransactionsPage() {
  const [rows, setRows] = useState<AdminTx[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<AdminTx | null>(null);
  const [form, setForm] = useState<TxForm>(emptyForm());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (!isAppScriptConfigured()) {
        setRows([]);
        setCustomers([]);
        return;
      }
      const [txRes, custRes] = await Promise.all([
        appScriptRequest<AdminTx[]>("listAllTransactions", {}),
        appScriptRequest<Customer[]>("listCustomers", {}),
      ]);
      if (txRes.ok && Array.isArray(txRes.data)) setRows(sortTransactionsByDate(txRes.data));
      else if (txRes.error) toast.error(txRes.error || "Failed to load transactions");
      if (custRes.ok && Array.isArray(custRes.data)) setCustomers(custRes.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setField = (key: keyof TxForm, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const openCreate = () => {
    setFormMode("create");
    setEditing(null);
    setForm(emptyForm(customers[0]?.customerId || ""));
    setFormOpen(true);
  };

  const openEdit = (t: AdminTx) => {
    setFormMode("edit");
    setEditing(t);
    setForm(txToForm(t));
    setFormOpen(true);
  };

  const buildPayload = (mode: "create" | "edit") => {
    const amount = Number(form.amount);
    if (!(amount > 0) || Number.isNaN(amount)) {
      toast.error("Enter a positive amount");
      return null;
    }
    if (!form.description.trim()) {
      toast.error("Description is required");
      return null;
    }
    if (!form.customerId.trim()) {
      toast.error("Select a customer");
      return null;
    }
    const autoRef = form.reference.trim() || `REF-${Date.now().toString(36).toUpperCase()}`;
    const autoCounterparty = form.counterparty.trim() || "Bangue Herutage Bank";
    const autoCategory =
      form.category.trim() || (form.type === "Credit" ? "Deposit" : "Withdrawal");

    const payload: Record<string, unknown> = {
      customerId: form.customerId.trim(),
      type: form.type,
      amount,
      description: form.description.trim(),
      date: fromDateLocal(form.dateLocal),
      status: form.status || "Completed",
      reference: autoRef,
      counterparty: autoCounterparty,
      category: autoCategory,
      notes: form.notes.trim() || undefined,
    };
    if (mode === "edit" && form.balanceAfter.trim() !== "") {
      const bal = Number(form.balanceAfter);
      if (!Number.isNaN(bal)) payload.balance = bal;
    }
    return payload;
  };

  const save = async () => {
    const payload = buildPayload(formMode === "edit" ? "edit" : "create");
    if (!payload) return;
    setBusy(true);
    try {
      if (formMode === "edit" && editing) {
        const res = await appScriptRequest("adminUpdateTransaction", {
          ...payload,
          transactionId: editing.id,
          id: editing.id,
        });
        if (res.ok) {
          toast.success("Transaction updated — customer view is ordered by date");
          setFormOpen(false);
          void load();
        } else {
          toast.error(res.error || "Update failed. Deploy adminUpdateTransaction on Apps Script.");
        }
      } else {
        let res = await appScriptRequest("adminCreateTransaction", payload);
        if (!res.ok) {
          const action = form.type === "Credit" ? "adminCredit" : "adminDebit";
          res = await appScriptRequest(action, {
            customerId: payload.customerId,
            amount: payload.amount,
            description: payload.description,
            date: payload.date,
            status: payload.status,
            type: payload.type,
            reference: payload.reference,
            counterparty: payload.counterparty,
            category: payload.category,
            notes: payload.notes,
            balance: payload.balance,
          });
        }
        if (res.ok) {
          toast.success("Transaction posted to customer ledger");
          setFormOpen(false);
          void load();
        } else {
          toast.error(res.error || "Could not create transaction");
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const remove = async (t: AdminTx) => {
    if (!window.confirm(`Delete transaction “${t.description}” (${t.id})?`)) return;
    setBusy(true);
    try {
      const res = await appScriptRequest("adminDeleteTransaction", {
        customerId: t.customerId,
        transactionId: t.id,
        id: t.id,
      });
      if (res.ok) {
        toast.success("Transaction deleted");
        void load();
      } else {
        toast.error(res.error || "Delete failed. Deploy adminDeleteTransaction on Apps Script.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Transactions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAppScriptConfigured()
              ? "All ledger entries. Create or edit any field — customer accounts stay in date order."
              : "Configure VITE_APP_SCRIPT_URL to load transactions."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" className="gradient-primary text-primary-foreground" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> New
          </Button>
        </div>
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
              <li
                key={t.id}
                className="flex items-start justify-between gap-3 px-3 py-3.5 sm:items-center sm:px-5 sm:py-4"
              >
                <div className="flex min-w-0 items-start gap-3 sm:items-center">
                  <div
                    className={`grid h-10 w-10 place-items-center rounded-full ${
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
                    <div className="text-sm font-medium">{t.description}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(t.date).toLocaleString()}
                      {t.customerName ? ` · ${t.customerName}` : ""}
                      {t.customerId ? ` · ${t.customerId}` : ""}
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground">{t.id}</div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                  <Badge variant="outline" className="text-[10px]">
                    {t.status}
                  </Badge>
                  <div className={`text-sm font-semibold ${t.type === "Credit" ? "text-success" : ""}`}>
                    {t.type === "Credit" ? "+" : "-"}$
                    {Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(t)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive"
                    disabled={busy}
                    onClick={() => void remove(t)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="flex max-h-[100dvh] w-full max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-h-[90vh] sm:rounded-xl">
          <DialogHeader className="shrink-0 border-b border-border px-4 py-4 sm:px-6">
            <DialogTitle className="pr-8 text-base sm:text-lg">
              {formMode === "create" ? "New transaction" : "Edit transaction"}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Enter customer, type, amount, date, status, and description. ID, reference, counterparty, category, and balance are generated automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              {formMode === "edit" && editing && (
                <div className="sm:col-span-2">
                  <Label className="text-xs">Transaction ID (system)</Label>
                  <Input value={editing.id} disabled className="mt-1.5 h-11 font-mono text-xs opacity-70" />
                </div>
              )}

              {formMode === "create" && (
                <div className="sm:col-span-2 rounded-xl border border-border/80 bg-muted/30 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">Auto-generated:</span> transaction ID,
                  reference, counterparty (Bangue Herutage Bank), category (Deposit / Withdrawal), and
                  running balance.
                </div>
              )}

              <div className="sm:col-span-2">
                <Label className="text-xs">Customer *</Label>
                <Select value={form.customerId || undefined} onValueChange={(v) => setField("customerId", v)}>
                  <SelectTrigger className="mt-1.5 h-11">
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.customerId} value={c.customerId}>
                        {c.firstName} {c.lastName} · {c.customerId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Type *</Label>
                <Select value={form.type} onValueChange={(v) => setField("type", v)}>
                  <SelectTrigger className="mt-1.5 h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TX_TYPES.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Status *</Label>
                <Select value={form.status} onValueChange={(v) => setField("status", v)}>
                  <SelectTrigger className="mt-1.5 h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TX_STATUSES.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Amount *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setField("amount", e.target.value)}
                  className="mt-1.5 h-11"
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label className="text-xs">Date & time *</Label>
                <Input
                  type="datetime-local"
                  value={form.dateLocal}
                  onChange={(e) => setField("dateLocal", e.target.value)}
                  className="mt-1.5 h-11"
                />
              </div>

              <div className="sm:col-span-2">
                <Label className="text-xs">Description *</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  className="mt-1.5 h-11"
                  placeholder="e.g. Incoming wire — client deposit"
                />
              </div>

              {formMode === "edit" && (
                <>
                  <div>
                    <Label className="text-xs">Counterparty</Label>
                    <Input
                      value={form.counterparty}
                      onChange={(e) => setField("counterparty", e.target.value)}
                      className="mt-1.5 h-11"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Reference</Label>
                    <Input
                      value={form.reference}
                      onChange={(e) => setField("reference", e.target.value)}
                      className="mt-1.5 h-11"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Category</Label>
                    <Input
                      value={form.category}
                      onChange={(e) => setField("category", e.target.value)}
                      className="mt-1.5 h-11"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Balance after</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.balanceAfter}
                      onChange={(e) => setField("balanceAfter", e.target.value)}
                      className="mt-1.5 h-11"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Notes</Label>
                    <Textarea
                      value={form.notes}
                      onChange={(e) => setField("notes", e.target.value)}
                      className="mt-1.5 min-h-[72px]"
                      placeholder="Internal notes"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t border-border px-4 py-3 sm:px-6">
            <Button variant="outline" className="h-11 flex-1 sm:flex-none" disabled={busy} onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button
              className={cn("h-11 flex-1 gradient-primary text-primary-foreground sm:flex-none")}
              disabled={busy}
              onClick={() => void save()}
            >
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
                </>
              ) : formMode === "edit" ? (
                "Save changes"
              ) : (
                "Post transaction"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
