import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
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
import { Send, ShieldCheck, ArrowLeft, CheckCircle2, Copy, AlertTriangle } from "lucide-react";

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

const TOTAL_OTP_STAGES = 5;

// Layer-specific error alerts with unique error codes
interface LayerAlert {
  code: string;
  title: string;
  desc: string;
}

const LAYER_ALERTS: Record<number, LayerAlert> = {
  // Stage 1 (Initial OTP)
  1: {
    code: "ERR-AUTH-101",
    title: "Multi-Factor Authentication Required",
    desc: "Transaction verification required. Enter the 6-digit authentication code sent to your registered primary phone and email.",
  },
  // Triggered when entering Layer 2 (after Stage 1 passes)
  2: {
    code: "ERR-SEC-401",
    title: "Secondary Authorization Required",
    desc: "Initial authorization check cleared. High-value transfer threshold triggered secondary compliance review. Enter the newly issued code.",
  },
  // Triggered when entering Layer 3 (after Stage 2 passes)
  3: {
    code: "ERR-FRD-902",
    title: "Anti-Fraud Risk Signal Flagged",
    desc: "Automated risk protocol requires additional token validation for cross-institution routing. Input the re-issued 6-digit passcode.",
  },
  4: {
    code: "ERR-CMP-309",
    title: "Regulatory Compliance Audit",
    desc: "Security policy layer 4 verification active. Mandatory verification code sent to registered secondary contact.",
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

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function generateRef() {
  return "TXN-" + Date.now().toString(36).toUpperCase();
}

function TransferPage() {
  const { user, updateBalance } = useAuth();
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

  // Multi-step OTP state tracking with unique layer alert tracking
  const [otpStage, setOtpStage] = useState(1);
  const [otpInput, setOtpInput] = useState("");
  const [expectedOtp, setExpectedOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [layerAlert, setLayerAlert] = useState<LayerAlert | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!user) return null;

  const selectedCountry = COUNTRIES.find((c) => c.code === address.country)!;

  const setField = (field: keyof BankAddress) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setAddress((a) => ({ ...a, [field]: e.target.value }));

  const resetAll = () => {
    setTo(""); setRoutingNumber(""); setAddress(emptyAddress); setPhone(""); setAmount(""); setDesc("");
    setStep("form"); setDraft(null); setCompleted(null);
    setOtpStage(1); setOtpInput(""); setExpectedOtp(""); setOtpError(""); setLayerAlert(null);
  };

  const requestOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const entered = parseFloat(amount);
    if (!to || !entered || entered <= 0) return toast.error("Enter a valid recipient and amount");
    if (!routingNumber) return toast.error("Enter the recipient's routing number");
    if (!address.street || !address.city || !address.postalCode) return toast.error("Complete the recipient bank's address");
    if (!phone) return toast.error("Enter a contact phone number");
    const amtUsd = toUSD(entered);
    if (amtUsd > user.balance) return toast.error("Insufficient balance");

    setDraft({ to, routingNumber, address, phone, amount: amtUsd, desc });

    const firstCode = generateOtp();
    const initialAlert = LAYER_ALERTS[1];

    setOtpStage(1);
    setExpectedOtp(firstCode);
    setOtpInput("");
    setOtpError("");
    setLayerAlert(initialAlert); // Include red banner on the first OTP stage
    setStep("otp");

    toast.error(`[${initialAlert.code}] ${initialAlert.title}`);
    toast.info(`Demo mode: your verification code is ${firstCode}`, { duration: 10000 });
  };

  const confirmOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    
    if (otpInput !== expectedOtp) {
      setOtpError("Invalid code entered. Please check your device and try again.");
      return;
    }

    // Progress through layers 1 to 5
    if (otpStage < TOTAL_OTP_STAGES) {
      const nextStage = otpStage + 1;
      const nextCode = generateOtp();
      const alertForNextLayer = LAYER_ALERTS[nextStage];

      setOtpStage(nextStage);
      setExpectedOtp(nextCode);
      setOtpInput("");
      setOtpError("");
      setLayerAlert(alertForNextLayer);

      toast.error(`[${alertForNextLayer.code}] ${alertForNextLayer.title}`);
      toast.info(`Demo mode: your new verification code is ${nextCode}`, { duration: 10000 });
      return;
    }

    // Final layer validated -> execute transaction
    setSubmitting(true);
    try {
      await updateBalance(draft.amount, `Transfer to ${draft.to}${draft.desc ? ` — ${draft.desc}` : ""}`, "Debit");
      setCompleted({ ...draft, id: generateRef(), timestamp: new Date().toISOString() });
      setStep("success");
    } finally {
      setSubmitting(false);
    }
  };

  const resendOtp = () => {
    const code = generateOtp();
    setExpectedOtp(code);
    setOtpInput("");
    setOtpError("");
    toast.info(`Demo mode: your new verification code is ${code}`, { duration: 10000 });
  };

  const copyRef = () => {
    if (!completed) return;
    navigator.clipboard.writeText(completed.id);
    toast.success("Reference copied");
  };

  if (step === "success" && completed) {
    return (
      <div className="mx-auto max-w-md space-y-6 pb-24 md:pb-8">
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
            <Button className="flex-1 gradient-primary text-primary-foreground" onClick={resetAll}>
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

  if (step === "otp" && draft) {
    return (
      <div className="mx-auto max-w-md space-y-6 pb-24 md:pb-8">
        <div>
          <h1 className="text-2xl font-bold">Verify it's you</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            We sent a 6-digit code to the phone and email on file for your account. Enter it below to complete this transfer.
          </p>
        </div>

        {/* Dynamic Red Alert Message Banner with Error Code */}
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
                className={`mt-1.5 text-center text-lg tracking-[0.5em] ${otpError ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              {otpError && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>{otpError}</span>
                </div>
              )}
            </div>
            <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={otpInput.length !== 6 || submitting}>
              {submitting ? "Verifying…" : "Confirm and send"}
            </Button>
            <div className="flex items-center justify-between text-xs">
              <button type="button" onClick={() => setStep("form")} className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-3 w-3" /> Back to transfer
              </button>
              <button type="button" onClick={resendOtp} className="text-primary hover:underline">
                Resend code
              </button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-24 md:pb-8">
      <div>
        <h1 className="text-2xl font-bold">Send money</h1>
        <p className="mt-1 text-sm text-muted-foreground">Instant simulated transfer to another Bangue Herutage customer.</p>
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

          <Button type="submit" className="w-full gradient-primary text-primary-foreground">
            <Send className="mr-2 h-4 w-4" /> Continue
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