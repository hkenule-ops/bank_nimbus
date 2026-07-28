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
import { Search, RefreshCw, Loader2, Pencil, Trash2, Wallet } from "lucide-react";
import { appScriptRequest, isAppScriptConfigured } from "@/lib/appscript";
import type { Customer } from "@/lib/mock-auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  const [ledgerAmount, setLedgerAmount] = useState("");
  const [ledgerDesc, setLedgerDesc] = useState("");
  const [ledgerBusy, setLedgerBusy] = useState(false);

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

  const openLedger = (c: Customer) => {
    setLedgerCustomer(c);
    setLedgerAmount("");
    setLedgerDesc("");
    setLedgerOpen(true);
  };

  const applyLedger = async (kind: "credit" | "debit") => {
    if (!ledgerCustomer) return;
    const amount = Number(ledgerAmount);
    if (!(amount > 0)) {
      toast.error("Enter a positive amount");
      return;
    }
    setLedgerBusy(true);
    try {
      const action = kind === "credit" ? "adminCredit" : "adminDebit";
      const res = await appScriptRequest(action, {
        customerId: ledgerCustomer.customerId,
        amount,
        description: ledgerDesc || (kind === "credit" ? "Admin credit" : "Admin debit"),
      });
      if (res.ok) {
        toast.success(kind === "credit" ? "Credit applied" : "Debit applied");
        setLedgerOpen(false);
        void load();
      } else {
        toast.error(res.error || "Ledger update failed");
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAppScriptConfigured()
              ? "Live data from Google Sheets — edit any field, adjust balances, suspend or delete."
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
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button size="sm" variant="outline" onClick={() => openEdit(c)}>
                        <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openLedger(c)}>
                        <Wallet className="mr-1 h-3.5 w-3.5" /> Ledger
                      </Button>
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
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          setDeleting(c);
                          setDeleteOpen(true);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Full edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit customer
              {editing ? ` — ${editing.firstName} ${editing.lastName}` : ""}
            </DialogTitle>
            <DialogDescription>
              Update any profile, account, identity, or security field. Leave password blank to keep the current one.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="profile" className="mt-2">
            <TabsList className="flex flex-wrap h-auto gap-1">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="account">Account</TabsTrigger>
              <TabsTrigger value="identity">Identity</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
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
                <Field
                  label="Address"
                  value={form.address}
                  onChange={(v) => setField("address", v)}
                  className="sm:col-span-2"
                />
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
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Customer ID"
                  value={editing?.customerId || ""}
                  onChange={() => {}}
                  disabled
                />
                <Field
                  label="Account number"
                  value={form.accountNumber}
                  onChange={(v) => setField("accountNumber", v)}
                />
                <Field label="IBAN" value={form.iban} onChange={(v) => setField("iban", v)} className="sm:col-span-2" />
                <SelectField
                  label="Account type"
                  value={form.accountType}
                  onChange={(v) => setField("accountType", v)}
                  options={ACCOUNT_TYPES}
                  className="sm:col-span-2"
                />
                <SelectField
                  label="Status"
                  value={form.status}
                  onChange={(v) => setField("status", v)}
                  options={STATUSES}
                />
                <Field
                  label="Balance"
                  value={form.balance}
                  onChange={(v) => setField("balance", v)}
                  type="number"
                />
                <p className="sm:col-span-2 text-xs text-muted-foreground">
                  Setting balance here overwrites the ledger number directly. Prefer the Ledger action for
                  audited credits/debits that also create a transaction.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="identity" className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="ID document name"
                  value={form.idDocName}
                  onChange={(v) => setField("idDocName", v)}
                  className="sm:col-span-2"
                />
                <Field
                  label="Selfie document name"
                  value={form.selfieDocName}
                  onChange={(v) => setField("selfieDocName", v)}
                  className="sm:col-span-2"
                />
                <p className="sm:col-span-2 text-xs text-muted-foreground">
                  Document uploads are metadata-only in this demo. Names reflect what the customer attached at
                  registration.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="security" className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="New password (leave blank to keep)"
                  value={form.password}
                  onChange={(v) => setField("password", v)}
                  type="password"
                  className="sm:col-span-2"
                />
                <Field
                  label="Security question"
                  value={form.securityQuestion}
                  onChange={(v) => setField("securityQuestion", v)}
                  className="sm:col-span-2"
                />
                <Field
                  label="Security answer (leave blank to keep)"
                  value={form.securityAnswer}
                  onChange={(v) => setField("securityAnswer", v)}
                  className="sm:col-span-2"
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              className="gradient-primary text-primary-foreground"
              onClick={() => void saveCustomer()}
              disabled={saving}
            >
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

      {/* Ledger adjust dialog */}
      <Dialog open={ledgerOpen} onOpenChange={setLedgerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust balance</DialogTitle>
            <DialogDescription>
              {ledgerCustomer
                ? `${ledgerCustomer.firstName} ${ledgerCustomer.lastName} · $${Number(ledgerCustomer.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Amount</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={ledgerAmount}
                onChange={(e) => setLedgerAmount(e.target.value)}
                className="mt-1.5"
                placeholder="0.00"
              />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Input
                value={ledgerDesc}
                onChange={(e) => setLedgerDesc(e.target.value)}
                className="mt-1.5"
                placeholder="Admin adjustment"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              variant="outline"
              disabled={ledgerBusy}
              onClick={() => void applyLedger("debit")}
              className="text-destructive"
            >
              {ledgerBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Debit"}
            </Button>
            <Button
              className="gradient-primary text-primary-foreground"
              disabled={ledgerBusy}
              onClick={() => void applyLedger("credit")}
            >
              {ledgerBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Credit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete customer?</DialogTitle>
            <DialogDescription>
              This permanently removes{" "}
              <strong>
                {deleting?.firstName} {deleting?.lastName}
              </strong>{" "}
              ({deleting?.customerId}) from the Customers sheet. Transactions are not auto-deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleteBusy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void confirmDelete()} disabled={deleteBusy}>
              {deleteBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  className,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <div className={className}>
      <Label className="text-xs">{label}</Label>
      <Input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn("mt-1.5", disabled && "opacity-70")}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="text-xs">{label}</Label>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger className="mt-1.5">
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
