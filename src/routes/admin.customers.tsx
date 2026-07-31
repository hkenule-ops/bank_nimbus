import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Search,
  RefreshCw,
  Loader2,
  Pencil,
  Trash2,
  Wallet,
  MoreHorizontal,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { appScriptRequest, isAppScriptConfigured } from "@/lib/appscript";
import type { Customer, Transaction } from "@/lib/mock-auth";
import { sortTransactionsByDate } from "@/lib/mock-auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/admin/customers")({
  component: CustomersPage,
});

const ACCOUNT_TYPES = [
  "Savings Account",
  "Current (Checking) Account",
  "Business Account",
  "Corporate Account",
  "Joint Account",
  "Student Account",
  "Fixed Deposit Account",
  "Foreign Currency Account",
  "Salary Account",
  "Investment Account",
  "Premium/VIP Account",
];

const STATUSES: Customer["status"][] = ["Active", "Suspended", "Pending Verification"];

const TX_TYPES: Transaction["type"][] = ["Credit", "Debit"];
const TX_STATUSES: Transaction["status"][] = ["Completed", "Pending", "Failed"];

type TxForm = {
  type: Transaction["type"];
  amount: string;
  description: string;
  /** datetime-local value (no timezone) */
  dateLocal: string;
  status: Transaction["status"];
  reference: string;
  counterparty: string;
  category: string;
  notes: string;
  /** Optional running balance after this entry — leave blank to let backend recompute */
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

function emptyTxForm(): TxForm {
  return {
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

function txToForm(t: Transaction): TxForm {
  return {
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

type EditForm = {
  firstName: string;
  middleName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string;
  accountNumber: string;
  iban: string;
  accountType: string;
  status: string;
  balance: string;
  dob: string;
  gender: string;
  nationality: string;
  occupation: string;
  employer: string;
  address: string;
  city: string;
  country: string;
  residesInSwitzerland: string;
  securityQuestion: string;
  securityAnswer: string;
  password: string;
  idDocName: string;
  selfieDocName: string;
};

function emptyForm(): EditForm {
  return {
    firstName: "",
    middleName: "",
    lastName: "",
    username: "",
    email: "",
    phone: "",
    accountNumber: "",
    iban: "",
    accountType: "Savings Account",
    status: "Active",
    balance: "0",
    dob: "",
    gender: "",
    nationality: "",
    occupation: "",
    employer: "",
    address: "",
    city: "",
    country: "",
    residesInSwitzerland: "",
    securityQuestion: "",
    securityAnswer: "",
    password: "",
    idDocName: "",
    selfieDocName: "",
  };
}

function customerToForm(c: Customer): EditForm {
  return {
    firstName: c.firstName || "",
    middleName: c.middleName || "",
    lastName: c.lastName || "",
    username: c.username || "",
    email: c.email || "",
    phone: c.phone || "",
    accountNumber: c.accountNumber || "",
    iban: c.iban || "",
    accountType: c.accountType || "Savings Account",
    status: c.status || "Active",
    balance: String(c.balance ?? 0),
    dob: c.dob || "",
    gender: c.gender || "",
    nationality: c.nationality || "",
    occupation: c.occupation || "",
    employer: c.employer || "",
    address: c.address || "",
    city: c.city || "",
    country: c.country || "",
    residesInSwitzerland: c.residesInSwitzerland || "",
    securityQuestion: c.securityQuestion || "",
    securityAnswer: "",
    password: "",
    idDocName: c.idDocName || "",
    selfieDocName: c.selfieDocName || "",
  };
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant={status === "Active" ? "default" : status === "Suspended" ? "destructive" : "secondary"}
      className={cn(
        "whitespace-nowrap",
        status === "Active" && "bg-success/15 text-success hover:bg-success/20",
      )}
    >
      {status}
    </Badge>
  );
}

function CustomersPage() {
  const [q, setQ] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<EditForm>(emptyForm());
  const [saving, setSaving] = useState(false);

  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [ledgerCustomer, setLedgerCustomer] = useState<Customer | null>(null);
  const [ledgerTxs, setLedgerTxs] = useState<Transaction[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerBusy, setLedgerBusy] = useState(false);
  const [txFormMode, setTxFormMode] = useState<"list" | "create" | "edit">("list");
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [txForm, setTxForm] = useState<TxForm>(emptyTxForm());

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<Customer | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

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

  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm(customerToForm(c));
    setEditOpen(true);
  };

  const setField = (key: keyof EditForm, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const saveCustomer = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        customerId: editing.customerId,
        firstName: form.firstName,
        middleName: form.middleName,
        lastName: form.lastName,
        username: form.username,
        email: form.email,
        phone: form.phone,
        accountNumber: form.accountNumber,
        iban: form.iban,
        accountType: form.accountType,
        status: form.status,
        balance: Number(form.balance) || 0,
        dob: form.dob,
        gender: form.gender,
        nationality: form.nationality,
        occupation: form.occupation,
        employer: form.employer,
        address: form.address,
        city: form.city,
        country: form.country,
        residesInSwitzerland: form.residesInSwitzerland,
        securityQuestion: form.securityQuestion,
        idDocName: form.idDocName,
        selfieDocName: form.selfieDocName,
      };
      if (form.password.trim()) payload.password = form.password.trim();
      if (form.securityAnswer.trim()) payload.securityAnswer = form.securityAnswer.trim();

      const res = await appScriptRequest<Customer>("updateCustomer", payload);
      if (res.ok) {
        toast.success("Customer updated");
        setEditOpen(false);
        setEditing(null);
        void load();
      } else {
        toast.error(res.error || "Update failed");
      }
    } finally {
      setSaving(false);
    }
  };

  const loadCustomerTxs = useCallback(async (customerId: string) => {
    setLedgerLoading(true);
    try {
      if (!isAppScriptConfigured()) {
        setLedgerTxs([]);
        return;
      }
      const res = await appScriptRequest<Transaction[]>("getTransactions", { customerId });
      if (res.ok && Array.isArray(res.data)) {
        setLedgerTxs(sortTransactionsByDate(res.data));
      } else {
        setLedgerTxs([]);
        if (res.error) toast.error(res.error);
      }
    } finally {
      setLedgerLoading(false);
    }
  }, []);

  const openLedger = (c: Customer) => {
    setLedgerCustomer(c);
    setTxFormMode("list");
    setEditingTx(null);
    setTxForm(emptyTxForm());
    setLedgerOpen(true);
    void loadCustomerTxs(c.customerId);
  };

  const setTxField = (key: keyof TxForm, value: string) => {
    setTxForm((f) => ({ ...f, [key]: value }));
  };

  const openCreateTx = () => {
    setEditingTx(null);
    setTxForm(emptyTxForm());
    setTxFormMode("create");
  };

  const openEditTx = (t: Transaction) => {
    setEditingTx(t);
    setTxForm(txToForm(t));
    setTxFormMode("edit");
  };

  const buildTxPayload = (mode: "create" | "edit") => {
    const amount = Number(txForm.amount);
    if (!(amount > 0) || Number.isNaN(amount)) {
      toast.error("Enter a positive amount");
      return null;
    }
    if (!txForm.description.trim()) {
      toast.error("Description is required");
      return null;
    }
    // Auto-generated fields (same idea as bank systems — not blank for the admin to invent)
    const autoRef =
      txForm.reference.trim() ||
      `REF-${Date.now().toString(36).toUpperCase()}`;
    const autoCounterparty =
      txForm.counterparty.trim() || "Bangue Herutage Bank";
    const autoCategory =
      txForm.category.trim() ||
      (txForm.type === "Credit" ? "Deposit" : "Withdrawal");

    const payload: Record<string, unknown> = {
      customerId: ledgerCustomer?.customerId,
      type: txForm.type,
      amount,
      description: txForm.description.trim(),
      date: fromDateLocal(txForm.dateLocal),
      status: txForm.status || "Completed",
      reference: autoRef,
      counterparty: autoCounterparty,
      category: autoCategory,
      notes: txForm.notes.trim() || undefined,
    };
    // Running balance is always computed by the backend on create
    if (mode === "edit" && txForm.balanceAfter.trim() !== "") {
      const bal = Number(txForm.balanceAfter);
      if (!Number.isNaN(bal)) payload.balance = bal;
    }
    return payload;
  };

  const saveTransaction = async () => {
    if (!ledgerCustomer) return;
    const payload = buildTxPayload(txFormMode === "edit" ? "edit" : "create");
    if (!payload) return;

    setLedgerBusy(true);
    try {
      if (txFormMode === "edit" && editingTx) {
        const res = await appScriptRequest<Transaction>("adminUpdateTransaction", {
          ...payload,
          transactionId: editingTx.id,
          id: editingTx.id,
        });
        if (res.ok) {
          toast.success("Transaction updated — customer ledger will show the change");
          setTxFormMode("list");
          setEditingTx(null);
          await loadCustomerTxs(ledgerCustomer.customerId);
          void load();
        } else {
          // Fallback: recreate via credit/debit if update action is not on the script yet
          toast.error(res.error || "Update failed. Ensure adminUpdateTransaction is deployed on Apps Script.");
        }
      } else {
        // Prefer full create; fall back to adminCredit / adminDebit with extra fields
        let res = await appScriptRequest<{
          transaction?: Transaction;
          transactions?: Transaction[];
          user?: Customer;
        }>("adminCreateTransaction", payload);

        if (!res.ok) {
          const action = txForm.type === "Credit" ? "adminCredit" : "adminDebit";
          res = await appScriptRequest(action, {
            customerId: ledgerCustomer.customerId,
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
          toast.success("Transaction created — visible on the customer account in date order");
          setTxFormMode("list");
          setTxForm(emptyTxForm());
          await loadCustomerTxs(ledgerCustomer.customerId);
          void load();
        } else {
          toast.error(res.error || "Could not create transaction");
        }
      }
    } finally {
      setLedgerBusy(false);
    }
  };

  const deleteTransaction = async (t: Transaction) => {
    if (!ledgerCustomer) return;
    if (!window.confirm(`Delete transaction “${t.description}” (${t.id})?`)) return;
    setLedgerBusy(true);
    try {
      const res = await appScriptRequest("adminDeleteTransaction", {
        customerId: ledgerCustomer.customerId,
        transactionId: t.id,
        id: t.id,
      });
      if (res.ok) {
        toast.success("Transaction deleted");
        await loadCustomerTxs(ledgerCustomer.customerId);
        void load();
      } else {
        toast.error(res.error || "Delete failed. Ensure adminDeleteTransaction is deployed.");
      }
    } finally {
      setLedgerBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      const res = await appScriptRequest("deleteCustomer", { customerId: deleting.customerId });
      if (res.ok) {
        toast.success("Customer deleted");
        setDeleteOpen(false);
        setDeleting(null);
        void load();
      } else {
        toast.error(res.error || "Delete failed");
      }
    } finally {
      setDeleteBusy(false);
    }
  };

  const filtered = customers.filter((c) =>
    `${c.firstName} ${c.lastName} ${c.email} ${c.customerId} ${c.accountNumber} ${c.username}`
      .toLowerCase()
      .includes(q.toLowerCase()),
  );

  const actionsMenu = (c: Customer) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0" aria-label="Actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => openEdit(c)}>
          <Pencil className="mr-2 h-4 w-4" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openLedger(c)}>
          <Wallet className="mr-2 h-4 w-4" /> Ledger
        </DropdownMenuItem>
        {c.status !== "Active" && (
          <DropdownMenuItem disabled={busyId === c.customerId} onClick={() => void setStatus(c.customerId, "Active")}>
            Activate
          </DropdownMenuItem>
        )}
        {c.status !== "Suspended" && (
          <DropdownMenuItem disabled={busyId === c.customerId} onClick={() => void setStatus(c.customerId, "Suspended")}>
            Suspend
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => {
            setDeleting(c);
            setDeleteOpen(true);
          }}
        >
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold sm:text-2xl">Customers</h1>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            {isAppScriptConfigured()
              ? "Edit any field, adjust balances, suspend or delete."
              : "Configure VITE_APP_SCRIPT_URL to load customers."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-10 w-full pl-9 sm:w-56"
            />
          </div>
          <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Mobile card list */}
      <div className="space-y-3 md:hidden">
        {loading && (
          <Card className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </Card>
        )}
        {!loading && filtered.length === 0 && (
          <Card className="p-10 text-center text-sm text-muted-foreground">No customers found.</Card>
        )}
        {filtered.map((c) => (
          <Card key={c.customerId} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">
                  {c.firstName} {c.lastName}
                </div>
                <div className="truncate text-xs text-muted-foreground">{c.email}</div>
                <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                  {c.accountNumber}
                  <span className="mx-1">·</span>
                  {c.customerId}
                </div>
              </div>
              {actionsMenu(c)}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
              <div>
                <div className="text-[10px] uppercase text-muted-foreground">Balance</div>
                <div className="font-semibold">
                  ${Number(c.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="text-right">
                <div className="mb-1 text-[10px] uppercase text-muted-foreground">{c.accountType}</div>
                <StatusBadge status={c.status} />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" className="h-10" onClick={() => openEdit(c)}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
              </Button>
              <Button size="sm" variant="outline" className="h-10" onClick={() => openLedger(c)}>
                <Wallet className="mr-1.5 h-3.5 w-3.5" /> Ledger
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Desktop table */}
      <Card className="hidden overflow-hidden md:block">
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
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" onClick={() => openEdit(c)}>
                        <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openLedger(c)}>
                        <Wallet className="mr-1 h-3.5 w-3.5" /> Ledger
                      </Button>
                      {actionsMenu(c)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit dialog — full screen on mobile */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="flex max-h-[100dvh] w-full max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-h-[90vh] sm:rounded-xl">
          <DialogHeader className="shrink-0 border-b border-border px-4 py-4 sm:px-6">
            <DialogTitle className="pr-8 text-base sm:text-lg">
              Edit customer
              {editing ? ` — ${editing.firstName} ${editing.lastName}` : ""}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Update any field. Leave password blank to keep the current one.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
            <Tabs defaultValue="profile">
              <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
                <TabsTrigger value="profile" className="flex-1 sm:flex-none">Profile</TabsTrigger>
                <TabsTrigger value="account" className="flex-1 sm:flex-none">Account</TabsTrigger>
                <TabsTrigger value="identity" className="flex-1 sm:flex-none">Identity</TabsTrigger>
                <TabsTrigger value="security" className="flex-1 sm:flex-none">Security</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="mt-4 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                  <Field label="First name" value={form.firstName} onChange={(v) => setField("firstName", v)} />
                  <Field label="Middle name" value={form.middleName} onChange={(v) => setField("middleName", v)} />
                  <Field label="Last name" value={form.lastName} onChange={(v) => setField("lastName", v)} />
                  <Field label="Username" value={form.username} onChange={(v) => setField("username", v)} />
                  <Field label="Email" value={form.email} onChange={(v) => setField("email", v)} type="email" />
                  <Field label="Phone" value={form.phone} onChange={(v) => setField("phone", v)} />
                  <Field label="Date of birth" value={form.dob} onChange={(v) => setField("dob", v)} type="date" />
                  <Field label="Gender" value={form.gender} onChange={(v) => setField("gender", v)} />
                  <Field label="Nationality" value={form.nationality} onChange={(v) => setField("nationality", v)} />
                  <Field label="Occupation" value={form.occupation} onChange={(v) => setField("occupation", v)} />
                  <Field label="Employer" value={form.employer} onChange={(v) => setField("employer", v)} />
                  <Field label="Address" value={form.address} onChange={(v) => setField("address", v)} className="sm:col-span-2" />
                  <Field label="City" value={form.city} onChange={(v) => setField("city", v)} />
                  <Field label="Country" value={form.country} onChange={(v) => setField("country", v)} />
                  <SelectField
                    label="Resides in Switzerland?"
                    value={form.residesInSwitzerland}
                    onChange={(v) => setField("residesInSwitzerland", v)}
                    options={["Yes", "No"]}
                    className="sm:col-span-2"
                  />
                </div>
              </TabsContent>

              <TabsContent value="account" className="mt-4 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                  <Field label="Customer ID" value={editing?.customerId || ""} onChange={() => {}} disabled />
                  <Field label="Account number" value={form.accountNumber} onChange={(v) => setField("accountNumber", v)} />
                  <Field label="IBAN" value={form.iban} onChange={(v) => setField("iban", v)} className="sm:col-span-2" />
                  <SelectField
                    label="Account type"
                    value={form.accountType}
                    onChange={(v) => setField("accountType", v)}
                    options={ACCOUNT_TYPES}
                    className="sm:col-span-2"
                  />
                  <SelectField label="Status" value={form.status} onChange={(v) => setField("status", v)} options={STATUSES} />
                  <Field label="Balance" value={form.balance} onChange={(v) => setField("balance", v)} type="number" />
                  <p className="text-xs text-muted-foreground sm:col-span-2">
                    Prefer Ledger for audited credits/debits that also create a transaction.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="identity" className="mt-4 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                  <Field label="ID document name" value={form.idDocName} onChange={(v) => setField("idDocName", v)} className="sm:col-span-2" />
                  <Field label="Selfie document name" value={form.selfieDocName} onChange={(v) => setField("selfieDocName", v)} className="sm:col-span-2" />
                </div>
              </TabsContent>

              <TabsContent value="security" className="mt-4 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                  <Field label="New password (leave blank to keep)" value={form.password} onChange={(v) => setField("password", v)} type="password" className="sm:col-span-2" />
                  <Field label="Security question" value={form.securityQuestion} onChange={(v) => setField("securityQuestion", v)} className="sm:col-span-2" />
                  <Field label="Security answer (leave blank to keep)" value={form.securityAnswer} onChange={(v) => setField("securityAnswer", v)} className="sm:col-span-2" />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t border-border px-4 py-3 sm:px-6">
            <Button variant="outline" className="h-11 flex-1 sm:flex-none" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button className="h-11 flex-1 gradient-primary text-primary-foreground sm:flex-none" onClick={() => void saveCustomer()} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={ledgerOpen}
        onOpenChange={(open) => {
          setLedgerOpen(open);
          if (!open) {
            setTxFormMode("list");
            setEditingTx(null);
          }
        }}
      >
        <DialogContent className="flex max-h-[100dvh] w-full max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-h-[90vh] sm:rounded-xl">
          <DialogHeader className="shrink-0 border-b border-border px-4 py-4 sm:px-6">
            <DialogTitle className="pr-8 text-base sm:text-lg">
              {txFormMode === "list" && "Customer ledger"}
              {txFormMode === "create" && "New transaction"}
              {txFormMode === "edit" && "Edit transaction"}
              {ledgerCustomer ? ` — ${ledgerCustomer.firstName} ${ledgerCustomer.lastName}` : ""}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {txFormMode === "list"
                ? `Balance $${Number(ledgerCustomer?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} · entries appear on the customer account sorted by date`
                : "Enter type, amount, date, status, and description. ID, reference, counterparty, category, and balance are generated automatically."}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
            {txFormMode === "list" && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {ledgerLoading ? "Loading…" : `${ledgerTxs.length} transaction${ledgerTxs.length === 1 ? "" : "s"}`}
                  </p>
                  <Button size="sm" className="gradient-primary text-primary-foreground" onClick={openCreateTx}>
                    <Plus className="mr-1.5 h-4 w-4" /> New transaction
                  </Button>
                </div>

                {ledgerLoading ? (
                  <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading ledger…
                  </div>
                ) : ledgerTxs.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
                    No transactions yet. Create one to post to this customer’s account.
                  </div>
                ) : (
                  <ul className="divide-y divide-border rounded-lg border border-border">
                    {ledgerTxs.map((t) => (
                      <li key={t.id} className="flex items-start justify-between gap-3 px-3 py-3 sm:px-4">
                        <div className="flex min-w-0 items-start gap-3">
                          <div
                            className={cn(
                              "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full",
                              t.type === "Credit" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
                            )}
                          >
                            {t.type === "Credit" ? (
                              <ArrowDownLeft className="h-4 w-4" />
                            ) : (
                              <ArrowUpRight className="h-4 w-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">{t.description}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {new Date(t.date).toLocaleString()} · {t.status}
                              {t.reference ? ` · ref ${t.reference}` : ""}
                            </div>
                            <div className="font-mono text-[10px] text-muted-foreground">{t.id}</div>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <div className={cn("text-sm font-semibold", t.type === "Credit" && "text-success")}>
                            {t.type === "Credit" ? "+" : "-"}$
                            {Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => openEditTx(t)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-destructive"
                              disabled={ledgerBusy}
                              onClick={() => void deleteTransaction(t)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {(txFormMode === "create" || txFormMode === "edit") && (
              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                {txFormMode === "edit" && editingTx && (
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Transaction ID (system)</Label>
                    <Input value={editingTx.id} disabled className="mt-1.5 h-11 font-mono text-xs opacity-70" />
                  </div>
                )}

                {txFormMode === "create" && (
                  <div className="sm:col-span-2 rounded-xl border border-border/80 bg-muted/30 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
                    <span className="font-medium text-foreground">Auto-generated:</span> transaction ID,
                    reference, counterparty (Bangue Herutage Bank), category (Deposit / Withdrawal), and
                    running balance after the entry.
                  </div>
                )}

                <SelectField
                  label="Type *"
                  value={txForm.type}
                  onChange={(v) => setTxField("type", v)}
                  options={TX_TYPES}
                />
                <SelectField
                  label="Status *"
                  value={txForm.status}
                  onChange={(v) => setTxField("status", v)}
                  options={TX_STATUSES}
                />
                <Field
                  label="Amount *"
                  value={txForm.amount}
                  onChange={(v) => setTxField("amount", v)}
                  type="number"
                />
                <div>
                  <Label className="text-xs">Date & time *</Label>
                  <Input
                    type="datetime-local"
                    value={txForm.dateLocal}
                    onChange={(e) => setTxField("dateLocal", e.target.value)}
                    className="mt-1.5 h-11"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Description *</Label>
                  <Input
                    value={txForm.description}
                    onChange={(e) => setTxField("description", e.target.value)}
                    className="mt-1.5 h-11"
                    placeholder="e.g. Wire credit — Acme Corp payroll"
                  />
                </div>

                {/* Edit only: allow overriding system fields if needed */}
                {txFormMode === "edit" && (
                  <>
                    <Field
                      label="Counterparty"
                      value={txForm.counterparty}
                      onChange={(v) => setTxField("counterparty", v)}
                    />
                    <Field
                      label="Reference"
                      value={txForm.reference}
                      onChange={(v) => setTxField("reference", v)}
                    />
                    <Field
                      label="Category"
                      value={txForm.category}
                      onChange={(v) => setTxField("category", v)}
                    />
                    <Field
                      label="Balance after"
                      value={txForm.balanceAfter}
                      onChange={(v) => setTxField("balanceAfter", v)}
                      type="number"
                    />
                    <div className="sm:col-span-2">
                      <Label className="text-xs">Notes</Label>
                      <Textarea
                        value={txForm.notes}
                        onChange={(e) => setTxField("notes", e.target.value)}
                        className="mt-1.5 min-h-[72px]"
                        placeholder="Internal admin notes (optional)"
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t border-border px-4 py-3 sm:px-6">
            {txFormMode === "list" ? (
              <Button variant="outline" className="h-11 w-full sm:w-auto" onClick={() => setLedgerOpen(false)}>
                Close
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="h-11 flex-1 sm:flex-none"
                  disabled={ledgerBusy}
                  onClick={() => {
                    setTxFormMode("list");
                    setEditingTx(null);
                  }}
                >
                  Back
                </Button>
                <Button
                  className="h-11 flex-1 gradient-primary text-primary-foreground sm:flex-none"
                  disabled={ledgerBusy}
                  onClick={() => void saveTransaction()}
                >
                  {ledgerBusy ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
                    </>
                  ) : txFormMode === "edit" ? (
                    "Save changes"
                  ) : (
                    "Post transaction"
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md w-[calc(100%-1.5rem)] rounded-xl sm:w-full">
          <DialogHeader>
            <DialogTitle>Delete customer?</DialogTitle>
            <DialogDescription>
              Permanently removes{" "}
              <strong>
                {deleting?.firstName} {deleting?.lastName}
              </strong>{" "}
              ({deleting?.customerId}). Transactions are not auto-deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="h-11 flex-1 sm:flex-none" onClick={() => setDeleteOpen(false)} disabled={deleteBusy}>
              Cancel
            </Button>
            <Button variant="destructive" className="h-11 flex-1 sm:flex-none" onClick={() => void confirmDelete()} disabled={deleteBusy}>
              {deleteBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", className, disabled,
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string; className?: string; disabled?: boolean;
}) {
  return (
    <div className={className}>
      <Label className="text-xs">{label}</Label>
      <Input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn("mt-1.5 h-11", disabled && "opacity-70")}
      />
    </div>
  );
}

function SelectField({
  label, value, onChange, options, className,
}: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; className?: string;
}) {
  return (
    <div className={className}>
      <Label className="text-xs">{label}</Label>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger className="mt-1.5 h-11">
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>{o}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
