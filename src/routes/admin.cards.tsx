import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { RefreshCw, Loader2, CreditCard, Pencil, Snowflake, Plus } from "lucide-react";
import { appScriptRequest, isAppScriptConfigured } from "@/lib/appscript";
import type { Customer } from "@/lib/mock-auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/cards")({
  component: CardsPage,
});

/** Solid gold ATM face — matches customer dashboard. */
const GOLD_CARD =
  "bg-gradient-to-br from-[#d4b45a] via-[#c9aa54] to-[#a88b2e] text-[#0b1e3e]";

type CardForm = {
  firstName: string;
  lastName: string;
  accountNumber: string;
  accountType: string;
  status: Customer["status"];
  last4: string;
  expiry: string;
  cardType: string;
};

function CardsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<CardForm>({
    firstName: "",
    lastName: "",
    accountNumber: "",
    accountType: "",
    status: "Active",
    last4: "",
    expiry: "12/29",
    cardType: "Debit",
  });
  const [saving, setSaving] = useState(false);

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

  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({
      firstName: c.firstName || "",
      lastName: c.lastName || "",
      accountNumber: c.accountNumber || "",
      accountType: c.accountType || "",
      status: c.status || "Active",
      last4: String(c.accountNumber || "0000").slice(-4),
      expiry: "12/29",
      cardType: "Debit",
    });
    setEditOpen(true);
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      let accountNumber = form.accountNumber;
      if (form.last4 && form.last4.length === 4 && accountNumber.length >= 4) {
        accountNumber = accountNumber.slice(0, -4) + form.last4;
      }
      const res = await appScriptRequest<Customer>("updateCustomer", {
        customerId: editing.customerId,
        firstName: form.firstName,
        lastName: form.lastName,
        accountNumber,
        accountType: form.accountType,
        status: form.status,
      });
      if (res.ok) {
        toast.success("Card details updated");
        setEditOpen(false);
        void load();
      } else toast.error(res.error || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Cards</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gold debit faces linked to each customer. Edit holder, number, freeze state, and more.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <Card className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </Card>
      ) : customers.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-12 text-sm text-muted-foreground">
          <CreditCard className="h-8 w-8 opacity-40" />
          No customer cards yet.
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {customers.map((c) => {
            const frozen = c.status === "Suspended";
            const last4 = String(c.accountNumber || "0000").slice(-4);
            return (
              <div key={c.customerId} className="space-y-3">
                <div
                  className={cn(
                    "relative overflow-hidden rounded-2xl p-5 shadow-elevated",
                    frozen ? "bg-muted text-foreground" : GOLD_CARD,
                  )}
                >
                  {!frozen && (
                    <div
                      className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/25 blur-2xl"
                      aria-hidden
                    />
                  )}
                  <div className="relative flex items-start justify-between">
                    <div>
                      <div className="text-[11px] opacity-80">Bangue Herutage Debit</div>
                      <div className="mt-1 font-semibold">
                        {c.firstName} {c.lastName}
                      </div>
                    </div>
                    <CreditCard className="h-5 w-5 opacity-90" />
                  </div>
                  <div className="relative mt-8 font-mono text-base tracking-[0.18em]">
                    •••• •••• •••• {last4}
                  </div>
                  <div className="relative mt-3 flex justify-between text-xs">
                    <div>
                      <div className="opacity-70">Account</div>
                      <div className="font-medium">{c.accountType || "—"}</div>
                    </div>
                    <div className="text-right">
                      <div className="opacity-70">Status</div>
                      <div className="font-medium">{frozen ? "Frozen" : "Active"}</div>
                    </div>
                  </div>
                  {frozen && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/35 backdrop-blur-[1px]">
                      <span className="rounded-full bg-background/90 px-3 py-1 text-xs font-semibold shadow">
                        Frozen
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="h-9" onClick={() => openEdit(c)}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9"
                    disabled={busyId === c.customerId}
                    onClick={() => void setStatus(c.customerId, frozen ? "Active" : "Suspended")}
                  >
                    <Snowflake className="mr-1.5 h-3.5 w-3.5" />
                    {frozen ? "Unfreeze" : "Freeze"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md w-[calc(100%-1.5rem)] rounded-xl sm:w-full">
          <DialogHeader>
            <DialogTitle>Edit card</DialogTitle>
            <DialogDescription>
              Update holder name, account digits, product type, and freeze status.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2 sm:grid-cols-2">
            <div>
              <Label className="text-xs">First name</Label>
              <Input
                className="mt-1.5 h-11"
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Last name</Label>
              <Input
                className="mt-1.5 h-11"
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Full account number</Label>
              <Input
                className="mt-1.5 h-11 font-mono"
                value={form.accountNumber}
                onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Last 4 (display)</Label>
              <Input
                className="mt-1.5 h-11 font-mono"
                maxLength={4}
                value={form.last4}
                onChange={(e) =>
                  setForm((f) => ({ ...f, last4: e.target.value.replace(/\D/g, "").slice(0, 4) }))
                }
              />
            </div>
            <div>
              <Label className="text-xs">Expiry (display)</Label>
              <Input
                className="mt-1.5 h-11"
                value={form.expiry}
                onChange={(e) => setForm((f) => ({ ...f, expiry: e.target.value }))}
                placeholder="MM/YY"
              />
            </div>
            <div>
              <Label className="text-xs">Account type</Label>
              <Input
                className="mt-1.5 h-11"
                value={form.accountType}
                onChange={(e) => setForm((f) => ({ ...f, accountType: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v as Customer["status"] }))}
              >
                <SelectTrigger className="mt-1.5 h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Suspended">Frozen / Suspended</SelectItem>
                  <SelectItem value="Pending Verification">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="h-11 flex-1 sm:flex-none" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              className="h-11 flex-1 gradient-primary text-primary-foreground sm:flex-none"
              disabled={saving}
              onClick={() => void save()}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
