import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/mock-auth";
import { appScriptRequest, isAppScriptConfigured } from "@/lib/appscript";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrency } from "@/lib/currency";
import { toast } from "sonner";
import {
  Landmark,
  HandCoins,
  CalendarClock,
  ShieldCheck,
  Percent,
  FileText,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn, userFacingError } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/loans")({
  head: () => ({ meta: [{ title: "Loans — Bangue Herutage Bank" }] }),
  component: LoansPage,
});

const FALLBACK_LOAN_TYPES = [
  {
    id: "personal",
    label: "Personal Loan",
    rate: 9.5,
    maxAmount: 50_000,
    maxTermMonths: 60,
    blurb: "Flexible unsecured financing for life goals.",
  },
  {
    id: "auto",
    label: "Auto Loan",
    rate: 6.2,
    maxAmount: 80_000,
    maxTermMonths: 72,
    blurb: "Competitive rates for new and used vehicles.",
  },
  {
    id: "mortgage",
    label: "Mortgage",
    rate: 5.1,
    maxAmount: 500_000,
    maxTermMonths: 360,
    blurb: "Long-term home financing with clear repayment.",
  },
  {
    id: "business",
    label: "Business Loan",
    rate: 8.0,
    maxAmount: 200_000,
    maxTermMonths: 84,
    blurb: "Working capital and growth for enterprises.",
  },
];

type LoanTypeRow = {
  id: string;
  label: string;
  rate: number;
  maxAmount: number;
  maxTermMonths: number;
  blurb: string;
};

type LoanDoc = { type: string; fileName: string };

type LoanApp = {
  id: string;
  productId: string;
  typeLabel: string;
  principal: number;
  rate: number;
  termMonths: number;
  monthlyPayment: number;
  balance: number;
  status: "Pending" | "Active" | "Rejected" | "Paid off" | string;
  purpose?: string;
  docs?: LoanDoc[];
  rejectionReason?: string;
  createdAt?: string;
};

function monthlyPayment(principal: number, annualRatePct: number, termMonths: number) {
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / termMonths;
  return (principal * r * Math.pow(1 + r, termMonths)) / (Math.pow(1 + r, termMonths) - 1);
}

const DOC_TYPES = [
  "Government-issued photo ID",
  "Proof of income (payslip / tax return)",
  "Proof of address (utility bill)",
  "Bank statement (last 3 months)",
  "Employment letter",
  "Other supporting document",
];

function statusBadge(status: string) {
  if (status === "Pending")
    return (
      <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400">
        <Clock className="mr-1 h-3 w-3" /> Pending review
      </Badge>
    );
  if (status === "Active")
    return (
      <Badge variant="outline" className="border-[#c9aa54]/40 text-[#b8901f]">
        <CheckCircle2 className="mr-1 h-3 w-3" /> Active
      </Badge>
    );
  if (status === "Rejected")
    return (
      <Badge variant="destructive">
        <XCircle className="mr-1 h-3 w-3" /> Rejected
      </Badge>
    );
  if (status === "Paid off") return <Badge variant="secondary">Paid off</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

function LoansPage() {
  const { user, updateBalance, refreshTransactions } = useAuth();
  const { currency, toggleCurrency, format } = useCurrency();
  const [loanTypes, setLoanTypes] = useState<LoanTypeRow[]>(FALLBACK_LOAN_TYPES as LoanTypeRow[]);
  const [loans, setLoans] = useState<LoanApp[]>([]);
  const [typeId, setTypeId] = useState("personal");
  const [amount, setAmount] = useState("");
  const [term, setTerm] = useState("36");
  const [purpose, setPurpose] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState("Employed");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [docName, setDocName] = useState("");
  const [docs, setDocs] = useState<LoanDoc[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadLoans = useCallback(async () => {
    if (!user?.customerId) return;
    if (!isAppScriptConfigured()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await appScriptRequest<LoanApp[]>("listMyLoans", { customerId: user.customerId });
      if (res.ok && Array.isArray(res.data)) setLoans(res.data);
    } finally {
      setLoading(false);
    }
  }, [user?.customerId]);

  useEffect(() => {
    if (!isAppScriptConfigured()) return;
    void (async () => {
      const res = await appScriptRequest<(LoanTypeRow & { status?: string })[]>("listLoanProducts", {});
      if (res.ok && Array.isArray(res.data) && res.data.length) {
        const open = res.data
          .filter((t) => !t.status || t.status === "Open")
          .map((t) => ({
            id: String(t.id),
            label: String(t.label),
            rate: Number(t.rate) || 0,
            maxAmount: Number(t.maxAmount) || 0,
            maxTermMonths: Number(t.maxTermMonths) || 12,
            blurb: String(t.blurb || ""),
          }));
        if (open.length) {
          setLoanTypes(open);
          setTypeId((id) => (open.some((x) => x.id === id) ? id : open[0].id));
        }
      }
    })();
  }, []);

  useEffect(() => {
    void loadLoans();
  }, [loadLoans]);

  if (!user) return null;

  const selectedType = loanTypes.find((t) => t.id === typeId) || loanTypes[0];
  const principalNum = Number(amount);
  const termNum = Number(term);
  const preview =
    selectedType && principalNum > 0 && termNum > 0
      ? monthlyPayment(principalNum, selectedType.rate, termNum)
      : null;

  const totalOutstanding = loans
    .filter((l) => l.status === "Active")
    .reduce((s, l) => s + Number(l.balance), 0);
  const pendingCount = loans.filter((l) => l.status === "Pending").length;

  const addDoc = () => {
    const name = docName.trim();
    if (!name) return toast.error("Enter the document file name");
    setDocs((d) => [...d, { type: docType, fileName: name }]);
    setDocName("");
    toast.success("Document added to application");
  };

  const apply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) return;
    const principal = parseFloat(amount);
    const termMonths = parseInt(term, 10);
    if (!principal || principal <= 0 || principal > selectedType.maxAmount) {
      return toast.error(`Enter an amount up to ${format(selectedType.maxAmount)}`);
    }
    if (!termMonths || termMonths <= 0 || termMonths > selectedType.maxTermMonths) {
      return toast.error(`Enter a term up to ${selectedType.maxTermMonths} months`);
    }
    if (docs.length < 2) {
      return toast.error("Attach at least two supporting documents (e.g. ID + income proof)");
    }
    if (!purpose.trim()) return toast.error("Describe the purpose of the loan");

    setBusy(true);
    try {
      if (!isAppScriptConfigured()) {
        toast.error("This service is temporarily unavailable. Please try again later.");
        return;
      }
      const res = await appScriptRequest<LoanApp>("applyLoan", {
        customerId: user.customerId,
        productId: selectedType.id,
        principal,
        termMonths,
        purpose: purpose.trim(),
        employmentStatus,
        monthlyIncome: Number(monthlyIncome) || 0,
        docs,
      });
      if (!res.ok || !res.data) {
        toast.error(userFacingError(res.error, "We couldn't submit your loan application. Please try again."));
        return;
      }
      toast.success("Application submitted — pending bank review. Funds are not disbursed until approved.");
      setAmount("");
      setPurpose("");
      setDocs([]);
      void loadLoans();
    } finally {
      setBusy(false);
    }
  };

  const makePayment = async (loan: LoanApp) => {
    const pay = Math.min(Number(loan.monthlyPayment), Number(loan.balance));
    if (pay > user.balance) return toast.error("Insufficient balance for this payment");
    setBusy(true);
    try {
      const res = await appScriptRequest<LoanApp>("makeLoanPayment", {
        id: loan.id,
        customerId: user.customerId,
        amount: pay,
      });
      if (!res.ok) {
        toast.error(userFacingError(res.error, "We couldn't process that payment. Please try again."));
        return;
      }
      toast.success(`Payment of ${format(pay)} applied`);
      void loadLoans();
      void refreshTransactions();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 pb-2 md:pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Loans</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Apply with supporting documents. Applications stay pending until an officer approves disbursement.
          </p>
        </div>
        <button
          type="button"
          onClick={toggleCurrency}
          className="shrink-0 self-start rounded-full border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-[#c9aa54]/50 hover:text-[#b8901f]"
        >
          Showing {currency} — tap to switch
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="glass-card rounded-2xl p-5 sm:col-span-2 sm:rounded-3xl sm:p-6">
          <div className="text-sm text-muted-foreground">Outstanding (active only)</div>
          <div className="mt-1 text-3xl font-bold tracking-tight">{format(totalOutstanding)}</div>
          <div className="mt-2 text-xs text-muted-foreground">
            {loans.filter((l) => l.status === "Active").length} active · {pendingCount} pending review
          </div>
        </div>
        <Card className="flex flex-col justify-center gap-2 p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#c9aa54]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Underwriting
          </div>
          <p className="text-sm text-muted-foreground">
            ID, income, and address proofs are reviewed before funds are released.
          </p>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {loanTypes.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTypeId(t.id)}
            className={cn(
              "rounded-2xl border p-4 text-left transition-all hover:border-[#c9aa54]/50 hover:shadow-sm",
              typeId === t.id ? "border-[#c9aa54] bg-[#c9aa54]/10 shadow-sm" : "border-border bg-card",
            )}
          >
            <div className="flex items-center justify-between">
              <Landmark className="h-4 w-4 text-[#c9aa54]" />
              <span className="flex items-center gap-0.5 text-xs font-semibold text-[#b8901f]">
                <Percent className="h-3 w-3" />
                {t.rate}%
              </span>
            </div>
            <div className="mt-3 text-sm font-semibold">{t.label}</div>
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{t.blurb}</p>
          </button>
        ))}
      </div>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 sm:p-6 lg:col-span-2">
          <h3 className="font-semibold">Your applications & loans</h3>
          {loading ? (
            <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : loans.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              No applications yet. Complete the form with documents — status will show as pending until approved.
            </div>
          ) : (
            <ul className="mt-4 space-y-4">
              {loans.map((l) => {
                const paidPct =
                  l.status === "Active" || l.status === "Paid off"
                    ? Math.min(100, ((Number(l.principal) - Number(l.balance)) / Number(l.principal)) * 100)
                    : 0;
                return (
                  <li key={l.id} className="rounded-2xl border border-border/60 bg-card/50 p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-full bg-[#c9aa54]/15 text-[#b8901f]">
                          <Landmark className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">{l.typeLabel}</div>
                          <div className="text-xs text-muted-foreground">
                            {l.rate}% APR · {l.termMonths} mo · {format(l.principal)}
                            {l.createdAt ? ` · ${new Date(l.createdAt).toLocaleDateString()}` : ""}
                          </div>
                        </div>
                      </div>
                      {statusBadge(l.status)}
                    </div>

                    {l.status === "Pending" && (
                      <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                        Under review. No funds have been credited yet. An officer will approve or decline this
                        application.
                      </p>
                    )}
                    {l.status === "Rejected" && (
                      <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                        {l.rejectionReason || "Application was not approved."}
                      </p>
                    )}
                    {(l.status === "Active" || l.status === "Paid off") && (
                      <>
                        <Progress value={paidPct} className="mt-4 h-2" />
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span>
                            Remaining:{" "}
                            <span className="font-medium text-foreground">{format(l.balance)}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <CalendarClock className="h-3 w-3" />
                            {format(l.monthlyPayment)}/mo
                          </span>
                        </div>
                      </>
                    )}
                    {l.docs && l.docs.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {l.docs.map((d, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground"
                          >
                            <FileText className="h-2.5 w-2.5" />
                            {d.type}: {d.fileName}
                          </span>
                        ))}
                      </div>
                    )}
                    {l.status === "Active" && (
                      <Button
                        size="sm"
                        disabled={busy}
                        className="mt-4 h-10 w-full gradient-primary text-primary-foreground"
                        onClick={() => void makePayment(l)}
                      >
                        <HandCoins className="mr-2 h-3.5 w-3.5" />
                        Make payment ({format(Math.min(l.monthlyPayment, l.balance))})
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="h-fit border-[#c9aa54]/20 p-5 sm:p-6">
          <h3 className="font-semibold">Apply — {selectedType?.label}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{selectedType?.blurb}</p>
          <form onSubmit={apply} className="mt-4 space-y-4">
            <div>
              <Label>Loan type</Label>
              <Select value={typeId} onValueChange={setTypeId}>
                <SelectTrigger className="mt-1.5 h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {loanTypes.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label} — {t.rate}% APR
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount ({currency})</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="mt-1.5 h-11"
              />
            </div>
            <div>
              <Label>Term (months)</Label>
              <Input
                type="number"
                min="1"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="mt-1.5 h-11"
              />
            </div>
            <div>
              <Label>Purpose of funds *</Label>
              <Textarea
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="e.g. Home renovation, vehicle purchase…"
                className="mt-1.5 min-h-[72px]"
              />
            </div>
            <div>
              <Label>Employment status</Label>
              <Select value={employmentStatus} onValueChange={setEmploymentStatus}>
                <SelectTrigger className="mt-1.5 h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Employed">Employed</SelectItem>
                  <SelectItem value="Self-employed">Self-employed</SelectItem>
                  <SelectItem value="Business owner">Business owner</SelectItem>
                  <SelectItem value="Retired">Retired</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Monthly income ({currency})</Label>
              <Input
                type="number"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value)}
                className="mt-1.5 h-11"
                placeholder="0"
              />
            </div>

            <div className="rounded-xl border border-border/80 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <FileText className="h-3.5 w-3.5 text-[#c9aa54]" />
                Supporting documents *
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Standard underwriting pack: government ID, income proof, and address proof. Enter the file
                name of each document you are submitting (min. 2).
              </p>
              <div className="mt-2 space-y-2">
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Input
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    placeholder="e.g. passport_scan.pdf"
                    className="h-10"
                  />
                  <Button type="button" variant="outline" className="h-10 shrink-0" onClick={addDoc}>
                    Add
                  </Button>
                </div>
                {docs.length > 0 && (
                  <ul className="space-y-1">
                    {docs.map((d, i) => (
                      <li key={i} className="flex items-center justify-between text-[11px]">
                        <span className="truncate text-muted-foreground">
                          {d.type}: <span className="text-foreground">{d.fileName}</span>
                        </span>
                        <button
                          type="button"
                          className="text-destructive"
                          onClick={() => setDocs((x) => x.filter((_, j) => j !== i))}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {preview !== null && selectedType && (
              <div className="rounded-xl border border-[#c9aa54]/25 bg-[#c9aa54]/10 p-3 text-xs">
                Estimated payment:{" "}
                <span className="font-semibold text-foreground">{format(preview)}/mo</span>
                <span className="text-muted-foreground"> at {selectedType.rate}% APR · pending approval</span>
              </div>
            )}
            <Button
              type="submit"
              disabled={busy}
              className="h-11 w-full gradient-primary text-primary-foreground"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit application"}
            </Button>
          </form>
        </Card>
      </section>
    </div>
  );
}
