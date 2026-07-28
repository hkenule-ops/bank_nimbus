import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/mock-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useCurrency } from "@/lib/currency";
import { toast } from "sonner";
import { Landmark, HandCoins, CalendarClock } from "lucide-react";

export const Route = createFileRoute("/dashboard/loans")({
  head: () => ({ meta: [{ title: "Loans — Bangue Herutage Bank" }] }),
  component: LoansPage,
});

const LOAN_TYPES = [
  { id: "personal", label: "Personal Loan", rate: 9.5, maxAmount: 50_000, maxTermMonths: 60 },
  { id: "auto", label: "Auto Loan", rate: 6.2, maxAmount: 80_000, maxTermMonths: 72 },
  { id: "mortgage", label: "Mortgage", rate: 5.1, maxAmount: 500_000, maxTermMonths: 360 },
  { id: "business", label: "Business Loan", rate: 8.0, maxAmount: 200_000, maxTermMonths: 84 },
] as const;

interface Loan {
  id: string;
  typeLabel: string;
  principal: number;
  rate: number;
  termMonths: number;
  balance: number;
  monthlyPayment: number;
  status: "Active" | "Paid off";
}

function monthlyPayment(principal: number, annualRatePct: number, termMonths: number) {
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / termMonths;
  return (principal * r * Math.pow(1 + r, termMonths)) / (Math.pow(1 + r, termMonths) - 1);
}

function LoansPage() {
  const { user, updateBalance } = useAuth();
  const { currency, toggleCurrency, format } = useCurrency();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [typeId, setTypeId] = useState<typeof LOAN_TYPES[number]["id"]>("personal");
  const [amount, setAmount] = useState("");
  const [term, setTerm] = useState("");

  if (!user) return null;

  const selectedType = LOAN_TYPES.find((t) => t.id === typeId)!;
  const preview = amount && term && Number(amount) > 0 && Number(term) > 0
    ? monthlyPayment(Number(amount), selectedType.rate, Number(term))
    : null;

  const apply = async (e: React.FormEvent) => {
    e.preventDefault();
    const principal = parseFloat(amount);
    const termMonths = parseInt(term, 10);
    if (!principal || principal <= 0 || principal > selectedType.maxAmount) {
      return toast.error(`Enter an amount up to ${format(selectedType.maxAmount)}`);
    }
    if (!termMonths || termMonths <= 0 || termMonths > selectedType.maxTermMonths) {
      return toast.error(`Enter a term up to ${selectedType.maxTermMonths} months`);
    }
    const payment = monthlyPayment(principal, selectedType.rate, termMonths);
    const loan: Loan = {
      id: "l" + Date.now(),
      typeLabel: selectedType.label,
      principal,
      rate: selectedType.rate,
      termMonths,
      balance: principal,
      monthlyPayment: payment,
      status: "Active",
    };
    setLoans((l) => [loan, ...l]);
    await updateBalance(principal, `${selectedType.label} disbursed`, "Credit");
    toast.success(`${selectedType.label} approved — ${format(principal)} disbursed`);
    setAmount(""); setTerm("");
  };

  const makePayment = async (loan: Loan) => {
    const pay = Math.min(loan.monthlyPayment, loan.balance);
    if (pay > user.balance) return toast.error("Insufficient balance for this payment");
    setLoans((prev) => prev.map((l) => {
      if (l.id !== loan.id) return l;
      const newBalance = Math.max(0, l.balance - pay);
      return { ...l, balance: newBalance, status: newBalance <= 0 ? "Paid off" : "Active" };
    }));
    await updateBalance(pay, `Loan payment — ${loan.typeLabel}`, "Debit");
    toast.success(`Payment of ${format(pay)} applied to ${loan.typeLabel}`);
  };

  return (
    <div className="space-y-6 pb-2 md:pb-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Loans</h1>
          <p className="mt-1 text-sm text-muted-foreground">Apply for financing and manage repayments — simulated rates.</p>
        </div>
        <button
          type="button"
          onClick={toggleCurrency}
          className="shrink-0 rounded-full border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
        >
          Showing {currency} — tap to switch
        </button>
      </div>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <h3 className="font-semibold">Your loans</h3>
          {loans.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">You don't have any active loans. Apply below to get started.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {loans.map((l) => {
                const paidPct = ((l.principal - l.balance) / l.principal) * 100;
                return (
                  <li key={l.id} className="rounded-2xl border border-border/60 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary">
                          <Landmark className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">{l.typeLabel}</div>
                          <div className="text-xs text-muted-foreground">{l.rate}% APR • {l.termMonths} mo</div>
                        </div>
                      </div>
                      <Badge variant={l.status === "Paid off" ? "secondary" : "outline"}>{l.status}</Badge>
                    </div>
                    <Progress value={paidPct} className="mt-4" />
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Remaining: <span className="font-medium text-foreground">{format(l.balance)}</span></span>
                      <span className="flex items-center gap-1"><CalendarClock className="h-3 w-3" /> {format(l.monthlyPayment)}/mo</span>
                    </div>
                    {l.status === "Active" && (
                      <Button size="sm" className="mt-4 w-full gradient-primary text-primary-foreground" onClick={() => makePayment(l)}>
                        <HandCoins className="mr-2 h-3 w-3" /> Make payment ({format(Math.min(l.monthlyPayment, l.balance))})
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="h-fit p-6">
          <h3 className="font-semibold">Apply for a loan</h3>
          <form onSubmit={apply} className="mt-4 space-y-4">
            <div>
              <Label>Loan type</Label>
              <Select value={typeId} onValueChange={(v) => setTypeId(v as typeof typeId)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LOAN_TYPES.map((t) => <SelectItem key={t.id} value={t.id}>{t.label} — {t.rate}% APR</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount ({currency})</Label>
              <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="mt-1.5" />
              <p className="mt-1.5 text-xs text-muted-foreground">Max {format(selectedType.maxAmount)}</p>
            </div>
            <div>
              <Label>Term (months)</Label>
              <Input type="number" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="36" className="mt-1.5" />
              <p className="mt-1.5 text-xs text-muted-foreground">Max {selectedType.maxTermMonths} months</p>
            </div>
            {preview !== null && (
              <div className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
                Estimated payment: <span className="font-semibold text-foreground">{format(preview)}/mo</span>
              </div>
            )}
            <Button type="submit" className="w-full gradient-primary text-primary-foreground">Apply now</Button>
          </form>
        </Card>
      </section>
    </div>
  );
}