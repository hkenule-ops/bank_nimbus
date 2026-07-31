import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
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
import {
  RefreshCw,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Landmark,
  Percent,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
} from "lucide-react";
import { appScriptRequest, isAppScriptConfigured } from "@/lib/appscript";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/loans")({
  component: AdminLoansPage,
});

export interface LoanProduct {
  id: string;
  label: string;
  rate: number;
  maxAmount: number;
  maxTermMonths: number;
  blurb: string;
  status: "Open" | "Closed" | "Coming soon";
  minAmount: number;
}

type LoanApp = {
  id: string;
  customerId: string;
  customerName: string;
  productId: string;
  typeLabel: string;
  principal: number;
  rate: number;
  termMonths: number;
  monthlyPayment: number;
  balance: number;
  status: string;
  purpose?: string;
  employmentStatus?: string;
  monthlyIncome?: number;
  docs?: { type: string; fileName: string }[];
  rejectionReason?: string;
  createdAt?: string;
};

type FormState = {
  label: string;
  rate: string;
  maxAmount: string;
  minAmount: string;
  maxTermMonths: string;
  blurb: string;
  status: LoanProduct["status"];
};

function emptyForm(): FormState {
  return { label: "", rate: "", maxAmount: "", minAmount: "0", maxTermMonths: "36", blurb: "", status: "Open" };
}

function productToForm(p: LoanProduct): FormState {
  return {
    label: p.label,
    rate: String(p.rate),
    maxAmount: String(p.maxAmount),
    minAmount: String(p.minAmount),
    maxTermMonths: String(p.maxTermMonths),
    blurb: p.blurb,
    status: p.status,
  };
}

function AdminLoansPage() {
  const [tab, setTab] = useState<"applications" | "products">("applications");
  const [products, setProducts] = useState<LoanProduct[]>([]);
  const [apps, setApps] = useState<LoanApp[]>([]);
  const [statusFilter, setStatusFilter] = useState("Pending");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<LoanProduct | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectTarget, setRejectTarget] = useState<LoanApp | null>(null);

  const loadProducts = useCallback(async () => {
    if (!isAppScriptConfigured()) return;
    const res = await appScriptRequest<LoanProduct[]>("listLoanProducts", {});
    if (res.ok && Array.isArray(res.data)) setProducts(res.data);
  }, []);

  const loadApps = useCallback(async () => {
    if (!isAppScriptConfigured()) {
      setApps([]);
      return;
    }
    const res = await appScriptRequest<LoanApp[]>("listLoanApplications", {
      status: statusFilter === "all" ? "" : statusFilter,
    });
    if (res.ok && Array.isArray(res.data)) setApps(res.data);
    else toast.error(res.error || "Failed to load applications");
  }, [statusFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (!isAppScriptConfigured()) {
        toast.error("Configure VITE_APP_SCRIPT_URL");
        return;
      }
      await Promise.all([loadProducts(), loadApps()]);
    } finally {
      setLoading(false);
    }
  }, [loadProducts, loadApps]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setMode("create");
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const openEdit = (p: LoanProduct) => {
    setMode("edit");
    setEditing(p);
    setForm(productToForm(p));
    setOpen(true);
  };

  const saveProduct = async () => {
    const label = form.label.trim();
    const rate = Number(form.rate);
    const maxAmount = Number(form.maxAmount);
    const minAmount = Number(form.minAmount);
    const maxTermMonths = parseInt(form.maxTermMonths, 10);
    if (!label) return toast.error("Product name is required");
    if (Number.isNaN(rate) || rate < 0) return toast.error("Enter a valid APR");
    if (!(maxAmount > 0)) return toast.error("Enter a valid max amount");
    if (!(maxTermMonths > 0)) return toast.error("Enter a valid max term");
    setSaving(true);
    try {
      const res = await appScriptRequest<LoanProduct>("upsertLoanProduct", {
        id: mode === "edit" && editing ? editing.id : undefined,
        label,
        rate,
        maxAmount,
        minAmount: Number.isNaN(minAmount) ? 0 : minAmount,
        maxTermMonths,
        blurb: form.blurb.trim(),
        status: form.status,
      });
      if (res.ok) {
        toast.success(mode === "edit" ? "Product updated" : "Product created");
        setOpen(false);
        void loadProducts();
      } else toast.error(res.error || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const removeProduct = async (p: LoanProduct) => {
    if (!window.confirm(`Delete loan product "${p.label}"?`)) return;
    const res = await appScriptRequest("deleteLoanProduct", { id: p.id });
    if (res.ok) {
      toast.success("Product removed");
      void loadProducts();
    } else toast.error(res.error || "Delete failed");
  };

  const approve = async (app: LoanApp) => {
    setReviewId(app.id);
    try {
      const res = await appScriptRequest("reviewLoanApplication", { id: app.id, decision: "approve" });
      if (res.ok) {
        toast.success("Approved — principal disbursed to customer");
        void loadApps();
      } else toast.error(res.error || "Approval failed");
    } finally {
      setReviewId(null);
    }
  };

  const reject = async () => {
    if (!rejectTarget) return;
    setReviewId(rejectTarget.id);
    try {
      const res = await appScriptRequest("reviewLoanApplication", {
        id: rejectTarget.id,
        decision: "reject",
        rejectionReason: rejectReason.trim() || "Application declined after document review",
      });
      if (res.ok) {
        toast.success("Application rejected");
        setRejectOpen(false);
        setRejectTarget(null);
        setRejectReason("");
        void loadApps();
      } else toast.error(res.error || "Reject failed");
    } finally {
      setReviewId(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Loans</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review pending applications with documents, then manage product catalog.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {tab === "products" && (
            <Button size="sm" className="gradient-primary text-primary-foreground" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> New product
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-2 border-b border-border pb-2">
        <Button
          size="sm"
          variant={tab === "applications" ? "default" : "ghost"}
          className={tab === "applications" ? "gradient-primary text-primary-foreground" : ""}
          onClick={() => setTab("applications")}
        >
          Applications
        </Button>
        <Button
          size="sm"
          variant={tab === "products" ? "default" : "ghost"}
          className={tab === "products" ? "gradient-primary text-primary-foreground" : ""}
          onClick={() => setTab("products")}
        >
          Products
        </Button>
      </div>

      {tab === "applications" && (
        <>
          <div className="flex flex-wrap gap-2">
            {["Pending", "Active", "Rejected", "Paid off", "all"].map((s) => (
              <Button
                key={s}
                size="sm"
                variant={statusFilter === s ? "default" : "outline"}
                className={statusFilter === s ? "gradient-primary text-primary-foreground" : ""}
                onClick={() => setStatusFilter(s)}
              >
                {s === "all" ? "All" : s}
              </Button>
            ))}
          </div>
          <Card className="overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : apps.length === 0 ? (
              <div className="p-12 text-center text-sm text-muted-foreground">No applications in this filter.</div>
            ) : (
              <ul className="divide-y divide-border">
                {apps.map((a) => (
                  <li key={a.id} className="space-y-3 px-4 py-4 sm:px-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">
                          {a.customerName || a.customerId} · {a.typeLabel}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          ${Number(a.principal).toLocaleString()} · {a.rate}% APR · {a.termMonths} mo · ~$
                          {Number(a.monthlyPayment).toFixed(2)}/mo
                          {a.createdAt ? ` · ${new Date(a.createdAt).toLocaleString()}` : ""}
                        </div>
                        {a.purpose && <p className="mt-1 text-xs text-muted-foreground">Purpose: {a.purpose}</p>}
                        {(a.employmentStatus || a.monthlyIncome) && (
                          <p className="text-xs text-muted-foreground">
                            {a.employmentStatus}
                            {a.monthlyIncome ? ` · income $${Number(a.monthlyIncome).toLocaleString()}/mo` : ""}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          a.status === "Pending"
                            ? "border-amber-500/40 text-amber-700"
                            : a.status === "Active"
                              ? "border-[#c9aa54]/40 text-[#b8901f]"
                              : ""
                        }
                      >
                        {a.status === "Pending" && <Clock className="mr-1 h-3 w-3" />}
                        {a.status}
                      </Badge>
                    </div>
                    {a.docs && a.docs.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {a.docs.map((d, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px]"
                          >
                            <FileText className="h-2.5 w-2.5 text-[#c9aa54]" />
                            {d.type}: {d.fileName}
                          </span>
                        ))}
                      </div>
                    )}
                    {a.status === "Pending" && (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          className="gradient-primary text-primary-foreground"
                          disabled={reviewId === a.id}
                          onClick={() => void approve(a)}
                        >
                          {reviewId === a.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Approve & disburse
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={reviewId === a.id}
                          onClick={() => {
                            setRejectTarget(a);
                            setRejectOpen(true);
                          }}
                        >
                          <XCircle className="mr-1.5 h-3.5 w-3.5" /> Reject
                        </Button>
                      </div>
                    )}
                    {a.status === "Rejected" && a.rejectionReason && (
                      <p className="text-xs text-destructive">{a.rejectionReason}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}

      {tab === "products" && (
        <Card className="overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : products.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">No loan products.</div>
          ) : (
            <ul className="divide-y divide-border">
              {products.map((p) => (
                <li key={p.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-4 sm:px-5">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-[#c9aa54]/15 text-[#b8901f]">
                      <Landmark className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium">{p.label}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{p.blurb}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-0.5 font-semibold text-[#b8901f]">
                          <Percent className="h-3 w-3" />
                          {p.rate}% APR
                        </span>
                        <span>
                          ${Number(p.minAmount).toLocaleString()} – ${Number(p.maxAmount).toLocaleString()}
                        </span>
                        <span>up to {p.maxTermMonths} mo</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {p.status}
                    </Badge>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(p)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={() => void removeProduct(p)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg w-[calc(100%-1.5rem)] rounded-xl sm:w-full">
          <DialogHeader>
            <DialogTitle>{mode === "create" ? "New loan product" : "Edit loan product"}</DialogTitle>
            <DialogDescription>Saved to LoanProducts sheet.</DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[60vh] gap-3 overflow-y-auto sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label className="text-xs">Product name *</Label>
              <Input className="mt-1.5 h-11" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">APR % *</Label>
              <Input type="number" step="0.01" className="mt-1.5 h-11" value={form.rate} onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as LoanProduct["status"] }))}>
                <SelectTrigger className="mt-1.5 h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                  <SelectItem value="Coming soon">Coming soon</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Min amount</Label>
              <Input type="number" className="mt-1.5 h-11" value={form.minAmount} onChange={(e) => setForm((f) => ({ ...f, minAmount: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Max amount *</Label>
              <Input type="number" className="mt-1.5 h-11" value={form.maxAmount} onChange={(e) => setForm((f) => ({ ...f, maxAmount: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Max term (months) *</Label>
              <Input type="number" className="mt-1.5 h-11" value={form.maxTermMonths} onChange={(e) => setForm((f) => ({ ...f, maxTermMonths: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Description</Label>
              <Textarea className="mt-1.5 min-h-[80px]" value={form.blurb} onChange={(e) => setForm((f) => ({ ...f, blurb: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="h-11 flex-1 sm:flex-none" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="h-11 flex-1 gradient-primary text-primary-foreground sm:flex-none" disabled={saving} onClick={() => void saveProduct()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md w-[calc(100%-1.5rem)] rounded-xl">
          <DialogHeader>
            <DialogTitle>Reject application</DialogTitle>
            <DialogDescription>Provide a reason shown to the customer.</DialogDescription>
          </DialogHeader>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Insufficient documentation…" className="min-h-[100px]" />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={!!reviewId} onClick={() => void reject()}>Confirm reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
