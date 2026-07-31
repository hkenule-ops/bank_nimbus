import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RefreshCw,
  Loader2,
  CreditCard,
  Pencil,
  Snowflake,
  Check,
  X,
  Trash2,
  Plus,
  Search,
} from "lucide-react";
import { appScriptRequest, isAppScriptConfigured } from "@/lib/appscript";
import type { Customer } from "@/lib/mock-auth";
import {
  listAllCards,
  reviewCardRequest,
  updateCard,
  deleteCard,
  adminIssueCard,
  setCardFrozen,
  subscribeCards,
  type BankCard,
  type CardType,
  type CardStatus,
} from "@/lib/cards";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/cards")({
  component: CardsPage,
});

const GOLD_CARD =
  "bg-gradient-to-br from-[#d4b45a] via-[#c9aa54] to-[#a88b2e] text-[#0b1e3e]";

function CardsPage() {
  const [cards, setCards] = useState<BankCard[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<BankCard | null>(null);
  const [form, setForm] = useState({
    holderName: "",
    last4: "",
    expiry: "",
    type: "Debit" as CardType,
    status: "Active" as CardStatus,
    adminNote: "",
  });
  const [saving, setSaving] = useState(false);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<BankCard | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const [issueOpen, setIssueOpen] = useState(false);
  const [issueForm, setIssueForm] = useState({
    customerId: "",
    type: "Debit" as CardType,
    last4: "",
    expiry: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cardList, custRes] = await Promise.all([
        listAllCards(),
        isAppScriptConfigured()
          ? appScriptRequest<Customer[]>("listCustomers", {})
          : Promise.resolve({ ok: true, data: [] as Customer[] }),
      ]);
      setCards(cardList);
      if (custRes.ok && Array.isArray(custRes.data)) setCustomers(custRes.data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load cards");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return subscribeCards(() => {
      void load();
    });
  }, [load]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return cards;
    return cards.filter(
      (c) =>
        c.customerName.toLowerCase().includes(s) ||
        c.customerEmail.toLowerCase().includes(s) ||
        c.customerId.toLowerCase().includes(s) ||
        c.last4.includes(s) ||
        c.holderName.toLowerCase().includes(s),
    );
  }, [cards, q]);

  const pending = filtered.filter((c) => c.status === "Pending");
  const issued = filtered.filter((c) => c.status === "Active" || c.status === "Frozen");
  const closed = filtered.filter((c) => c.status === "Rejected" || c.status === "Cancelled");

  const approve = async (c: BankCard) => {
    setBusyId(c.id);
    try {
      await reviewCardRequest(c.id, "approve");
      toast.success("Card approved and issued");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setBusyId(null);
    }
  };

  const openReject = (c: BankCard) => {
    setRejectTarget(c);
    setRejectNote("");
    setRejectOpen(true);
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    setBusyId(rejectTarget.id);
    try {
      await reviewCardRequest(rejectTarget.id, "reject", { adminNote: rejectNote });
      toast.success("Request rejected");
      setRejectOpen(false);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reject failed");
    } finally {
      setBusyId(null);
    }
  };

  const toggleFreeze = async (c: BankCard) => {
    setBusyId(c.id);
    try {
      await setCardFrozen(c.id, c.status === "Active");
      toast.success(c.status === "Active" ? "Card frozen" : "Card unfrozen");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  const openEdit = (c: BankCard) => {
    setEditing(c);
    setForm({
      holderName: c.holderName,
      last4: c.last4 === "····" ? "" : c.last4,
      expiry: c.expiry === "—" ? "" : c.expiry,
      type: c.type,
      status: c.status,
      adminNote: c.adminNote || "",
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await updateCard(editing.id, {
        holderName: form.holderName,
        last4: form.last4 || undefined,
        expiry: form.expiry || undefined,
        type: form.type,
        status: form.status,
        adminNote: form.adminNote || undefined,
      });
      toast.success("Card updated");
      setEditOpen(false);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: BankCard) => {
    if (!confirm(`Delete card request/record for ${c.holderName}?`)) return;
    setBusyId(c.id);
    try {
      await deleteCard(c.id);
      toast.success("Deleted");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  };

  const issueDirect = async () => {
    const cust = customers.find((x) => x.customerId === issueForm.customerId);
    if (!cust) return toast.error("Select a customer");
    setSaving(true);
    try {
      await adminIssueCard({
        customerId: cust.customerId,
        customerName: `${cust.firstName} ${cust.lastName}`.trim(),
        customerEmail: cust.email,
        accountNumber: cust.accountNumber,
        type: issueForm.type,
        holderName: `${cust.firstName} ${cust.lastName}`.trim(),
        last4: issueForm.last4 || undefined,
        expiry: issueForm.expiry || undefined,
      });
      toast.success("Card issued");
      setIssueOpen(false);
      setIssueForm({ customerId: "", type: "Debit", last4: "", expiry: "" });
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Issue failed");
    } finally {
      setSaving(false);
    }
  };

  const CardFace = ({ c }: { c: BankCard }) => {
    const frozen = c.status === "Frozen";
    const pendingFace = c.status === "Pending";
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl p-5 shadow-elevated",
          frozen || pendingFace ? "bg-muted text-foreground" : GOLD_CARD,
        )}
      >
        {!frozen && !pendingFace && (
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/25 blur-2xl"
            aria-hidden
          />
        )}
        <div className="relative flex items-start justify-between">
          <div>
            <div className="text-[11px] opacity-80">Bangue Herutage {c.type}</div>
            <div className="mt-1 font-semibold">{c.holderName}</div>
            <div className="mt-0.5 text-[10px] opacity-70">{c.customerEmail}</div>
          </div>
          <CreditCard className="h-5 w-5 opacity-90" />
        </div>
        <div className="relative mt-8 font-mono text-base tracking-[0.18em]">
          •••• •••• •••• {c.last4}
        </div>
        <div className="relative mt-3 flex justify-between text-xs">
          <div>
            <div className="opacity-70">Expiry</div>
            <div className="font-medium">{c.expiry}</div>
          </div>
          <div className="text-right">
            <div className="opacity-70">Status</div>
            <div className="font-medium">{c.status}</div>
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
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Cards</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review customer requests, issue cards, freeze, edit, or remove records.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            className="gradient-primary text-primary-foreground"
            onClick={() => setIssueOpen(true)}
            disabled={customers.length === 0}
          >
            <Plus className="mr-2 h-4 w-4" /> Issue card
          </Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-11 pl-9"
          placeholder="Search name, email, customer id, last 4…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading ? (
        <Card className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </Card>
      ) : (
        <Tabs defaultValue="pending">
          <TabsList className="flex h-auto flex-wrap gap-1">
            <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
            <TabsTrigger value="issued">Issued ({issued.length})</TabsTrigger>
            <TabsTrigger value="closed">Closed ({closed.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4 space-y-4">
            {pending.length === 0 ? (
              <Card className="p-10 text-center text-sm text-muted-foreground">No pending requests.</Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {pending.map((c) => (
                  <div key={c.id} className="space-y-3">
                    <CardFace c={c} />
                    <Card className="space-y-2 p-3 text-xs text-muted-foreground">
                      <div>
                        <span className="font-medium text-foreground">{c.customerName}</span> ·{" "}
                        {c.customerId}
                      </div>
                      {c.note && <div>Customer note: “{c.note}”</div>}
                      <div>Requested {new Date(c.createdAt).toLocaleString()}</div>
                    </Card>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        className="h-9 gradient-primary text-primary-foreground"
                        disabled={busyId === c.id}
                        onClick={() => void approve(c)}
                      >
                        <Check className="mr-1.5 h-3.5 w-3.5" /> Approve & issue
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9"
                        disabled={busyId === c.id}
                        onClick={() => openReject(c)}
                      >
                        <X className="mr-1.5 h-3.5 w-3.5" /> Reject
                      </Button>
                      <Button size="sm" variant="ghost" className="h-9" onClick={() => openEdit(c)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="issued" className="mt-4 space-y-4">
            {issued.length === 0 ? (
              <Card className="p-10 text-center text-sm text-muted-foreground">No issued cards.</Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {issued.map((c) => (
                  <div key={c.id} className="space-y-3">
                    <CardFace c={c} />
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" className="h-9" onClick={() => openEdit(c)}>
                        <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9"
                        disabled={busyId === c.id}
                        onClick={() => void toggleFreeze(c)}
                      >
                        <Snowflake className="mr-1.5 h-3.5 w-3.5" />
                        {c.status === "Frozen" ? "Unfreeze" : "Freeze"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-9 text-destructive"
                        disabled={busyId === c.id}
                        onClick={() => void remove(c)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="closed" className="mt-4 space-y-3">
            {closed.length === 0 ? (
              <Card className="p-10 text-center text-sm text-muted-foreground">No closed records.</Card>
            ) : (
              closed.map((c) => (
                <Card key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <div className="font-medium">
                      {c.type} · {c.holderName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {c.customerName} · {c.status}
                      {c.adminNote ? ` · ${c.adminNote}` : ""}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">{c.status}</Badge>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => void remove(c)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md w-[calc(100%-1.5rem)] rounded-xl sm:w-full">
          <DialogHeader>
            <DialogTitle>Edit card</DialogTitle>
            <DialogDescription>Update holder, digits, product type, and status.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label className="text-xs">Holder name</Label>
              <Input
                className="mt-1.5 h-11"
                value={form.holderName}
                onChange={(e) => setForm((f) => ({ ...f, holderName: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Last 4</Label>
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
              <Label className="text-xs">Expiry</Label>
              <Input
                className="mt-1.5 h-11"
                value={form.expiry}
                onChange={(e) => setForm((f) => ({ ...f, expiry: e.target.value }))}
                placeholder="MM/YY"
              />
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as CardType }))}>
                <SelectTrigger className="mt-1.5 h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Debit">Debit</SelectItem>
                  <SelectItem value="Virtual">Virtual</SelectItem>
                  <SelectItem value="Credit">Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v as CardStatus }))}
              >
                <SelectTrigger className="mt-1.5 h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Frozen">Frozen</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Admin note</Label>
              <Textarea
                className="mt-1.5"
                value={form.adminNote}
                onChange={(e) => setForm((f) => ({ ...f, adminNote: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="h-11" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              className="h-11 gradient-primary text-primary-foreground"
              disabled={saving}
              onClick={() => void saveEdit()}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>Reject request</DialogTitle>
            <DialogDescription>Optional note is shown to the customer.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection"
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={!!busyId} onClick={() => void confirmReject()}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Direct issue */}
      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>Issue card</DialogTitle>
            <DialogDescription>Create an active card for a customer without a request.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label className="text-xs">Customer</Label>
              <Select
                value={issueForm.customerId}
                onValueChange={(v) => setIssueForm((f) => ({ ...f, customerId: v }))}
              >
                <SelectTrigger className="mt-1.5 h-11">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {customers.map((c) => (
                    <SelectItem key={c.customerId} value={c.customerId}>
                      {c.firstName} {c.lastName} · {c.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select
                value={issueForm.type}
                onValueChange={(v) => setIssueForm((f) => ({ ...f, type: v as CardType }))}
              >
                <SelectTrigger className="mt-1.5 h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Debit">Debit</SelectItem>
                  <SelectItem value="Virtual">Virtual</SelectItem>
                  <SelectItem value="Credit">Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Last 4 (optional)</Label>
                <Input
                  className="mt-1.5 h-11 font-mono"
                  maxLength={4}
                  value={issueForm.last4}
                  onChange={(e) =>
                    setIssueForm((f) => ({
                      ...f,
                      last4: e.target.value.replace(/\D/g, "").slice(0, 4),
                    }))
                  }
                />
              </div>
              <div>
                <Label className="text-xs">Expiry (optional)</Label>
                <Input
                  className="mt-1.5 h-11"
                  placeholder="MM/YY"
                  value={issueForm.expiry}
                  onChange={(e) => setIssueForm((f) => ({ ...f, expiry: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueOpen(false)}>
              Cancel
            </Button>
            <Button
              className="gradient-primary text-primary-foreground"
              disabled={saving}
              onClick={() => void issueDirect()}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Issue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
