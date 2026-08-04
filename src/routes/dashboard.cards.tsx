import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/mock-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  CreditCard,
  Snowflake,
  Plus,
  Loader2,
  RefreshCw,
  Clock,
  XCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  AlertTriangle,
  ShieldCheck,
  ArrowLeft,
  Truck,
} from "lucide-react";
import { cn, userFacingError } from "@/lib/utils";
import {
  listMyCards,
  requestCard,
  setCardFrozen,
  type BankCard,
  type CardType,
} from "@/lib/cards";
import {
  beginCardOrderOtp,
  verifyCardOrderOtp,
  cancelCardOrderOtp,
  getCardOrderOtp,
  isCodeActive,
  CARD_ORDER_ALERT,
  type CardOrderOtpSession,
  type CardOrderDraft,
} from "@/lib/card-order-otp";

export const Route = createFileRoute("/dashboard/cards")({
  head: () => ({ meta: [{ title: "Cards — Bangue Herutage Bank" }] }),
  component: CardsPage,
});

const GOLD_CARD =
  "bg-gradient-to-br from-[#d4b45a] via-[#c9aa54] to-[#a88b2e] text-[#0b1e3e]";

function statusBadge(status: BankCard["status"]) {
  switch (status) {
    case "Active":
      return (
        <Badge className="bg-success/15 text-success hover:bg-success/15">
          <CheckCircle2 className="mr-1 h-3 w-3" /> Active
        </Badge>
      );
    case "Frozen":
      return (
        <Badge variant="secondary">
          <Snowflake className="mr-1 h-3 w-3" /> Frozen
        </Badge>
      );
    case "Pending":
      return (
        <Badge className="bg-warning/15 text-warning-foreground hover:bg-warning/15">
          <Clock className="mr-1 h-3 w-3" /> Pending approval
        </Badge>
      );
    case "Rejected":
      return (
        <Badge variant="destructive">
          <XCircle className="mr-1 h-3 w-3" /> Rejected
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function CardsPage() {
  const { user } = useAuth();
  const [cards, setCards] = useState<BankCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [reqType, setReqType] = useState<CardType>("Debit");
  const [reqNote, setReqNote] = useState("");
  const [holderName, setHolderName] = useState("");
  const [shipName, setShipName] = useState("");
  const [shipPhone, setShipPhone] = useState("");
  const [shipAddress, setShipAddress] = useState("");
  const [shipCity, setShipCity] = useState("");
  const [shipState, setShipState] = useState("");
  const [shipPostal, setShipPostal] = useState("");
  const [shipCountry, setShipCountry] = useState("");
  const [visibleCardIds, setVisibleCardIds] = useState<string[]>([]);

  const [step, setStep] = useState<"form" | "otp">("form");
  const [session, setSession] = useState<CardOrderOtpSession | null>(null);
  const [otpInput, setOtpInput] = useState("");
  const [otpError, setOtpError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [draft, setDraft] = useState<CardOrderDraft | null>(null);

  const needsShipping = reqType === "Debit" || reqType === "Credit";

  const load = useCallback(async () => {
    if (!user?.customerId) return;
    setLoading(true);
    try {
      const list = await listMyCards(user.customerId);
      setCards(list);
    } catch (e) {
      toast.error(userFacingError(e, "We couldn't load your cards. Please try again."));
    } finally {
      setLoading(false);
    }
  }, [user?.customerId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (step !== "otp" || !session?.id) return;
    const id = window.setInterval(() => {
      void getCardOrderOtp(session.id).then((s) => {
        if (s) setSession(s);
      });
    }, 4000);
    return () => window.clearInterval(id);
  }, [step, session?.id]);

  useEffect(() => {
    if (!user) return;
    const full = `${user.firstName} ${user.lastName}`.trim();
    setHolderName((h) => h || full);
    setShipName((n) => n || full);
    setShipPhone((p) => p || user.phone || "");
    setShipCountry((c) => c || user.country || "");
    setShipCity((c) => c || user.city || "");
    setShipAddress((a) => a || user.address || "");
  }, [user]);

  if (!user) return null;

  const issued = cards.filter((c) => c.status === "Active" || c.status === "Frozen");
  const pending = cards.filter((c) => c.status === "Pending");
  const other = cards.filter((c) => c.status === "Rejected" || c.status === "Cancelled");

  const missingShipping = () => {
    if (!needsShipping) return [] as string[];
    const miss: string[] = [];
    if (!shipName.trim()) miss.push("Recipient name");
    if (!shipPhone.trim()) miss.push("Phone");
    if (!shipAddress.trim()) miss.push("Address");
    if (!shipCity.trim()) miss.push("City");
    if (!shipPostal.trim()) miss.push("Postal code");
    if (!shipCountry.trim()) miss.push("Country");
    return miss;
  };

  const submitRequest = async () => {
    if (!holderName.trim()) {
      toast.error("Cardholder name is required.");
      return;
    }
    const miss = missingShipping();
    if (miss.length) {
      toast.error(`Please complete shipping: ${miss.join(", ")}`);
      return;
    }

    setRequesting(true);
    try {
      const d: CardOrderDraft = {
        customerId: user.customerId,
        customerName: `${user.firstName} ${user.lastName}`.trim(),
        customerEmail: user.email,
        accountNumber: user.accountNumber,
        type: reqType,
        holderName: holderName.trim(),
        note: reqNote.trim() || undefined,
        shipName: needsShipping ? shipName.trim() : "",
        shipPhone: needsShipping ? shipPhone.trim() : "",
        shipAddress: needsShipping ? shipAddress.trim() : "",
        shipCity: needsShipping ? shipCity.trim() : "",
        shipState: needsShipping ? shipState.trim() : "",
        shipPostal: needsShipping ? shipPostal.trim() : "",
        shipCountry: needsShipping ? shipCountry.trim() : "",
      };

      if (!needsShipping) {
        await requestCard({
          customerId: d.customerId,
          customerName: d.customerName,
          customerEmail: d.customerEmail,
          accountNumber: d.accountNumber,
          type: d.type as CardType,
          holderName: d.holderName,
          note: d.note,
        });
        toast.success("Card request submitted — awaiting admin approval");
        setReqNote("");
        void load();
        return;
      }

      const sess = await beginCardOrderOtp(d);
      setDraft(d);
      setSession(sess);
      setOtpInput("");
      setOtpError("");
      setStep("otp");
      toast.message("Authorization required", {
        description: "Enter the shipping authorization code from the bank to place your order.",
      });
    } catch (e) {
      toast.error(userFacingError(e, "We couldn't submit your request. Please try again."));
    } finally {
      setRequesting(false);
    }
  };

  const refreshSession = async () => {
    if (!session?.id) return;
    try {
      const s = await getCardOrderOtp(session.id);
      if (s) setSession(s);
    } catch {
      /* ignore */
    }
  };

  const confirmOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.id || !draft) return;
    setSubmitting(true);
    setOtpError("");
    try {
      const result = await verifyCardOrderOtp(session.id, otpInput);
      const payload = result.draft || draft;
      await requestCard({
        customerId: payload.customerId,
        customerName: payload.customerName,
        customerEmail: payload.customerEmail,
        accountNumber: payload.accountNumber,
        type: payload.type as CardType,
        holderName: payload.holderName,
        note: payload.note,
        shipName: payload.shipName,
        shipPhone: payload.shipPhone,
        shipAddress: payload.shipAddress,
        shipCity: payload.shipCity,
        shipState: payload.shipState,
        shipPostal: payload.shipPostal,
        shipCountry: payload.shipCountry,
      });
      toast.success("Card order placed — awaiting bank approval & shipping");
      setStep("form");
      setSession(null);
      setDraft(null);
      setOtpInput("");
      setReqNote("");
      void load();
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setSubmitting(false);
    }
  };

  const cancelOtp = async () => {
    if (session?.id) {
      try {
        await cancelCardOrderOtp(session.id);
      } catch {
        /* ignore */
      }
    }
    setStep("form");
    setSession(null);
    setDraft(null);
    setOtpInput("");
    setOtpError("");
  };

  const toggleFreeze = async (card: BankCard) => {
    if (card.status !== "Active" && card.status !== "Frozen") return;
    setBusyId(card.id);
    try {
      await setCardFrozen(card.id, card.status === "Active");
      toast.success(card.status === "Active" ? "Card frozen" : "Card unfrozen");
      void load();
    } catch (e) {
      toast.error(userFacingError(e, "We couldn't save those changes. Please try again."));
    } finally {
      setBusyId(null);
    }
  };

  const toggleCardVisibility = (cardId: string) => {
    setVisibleCardIds((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId],
    );
  };

  const codeIssued = isCodeActive(session?.code);

  if (step === "otp" && session && draft) {
    return (
      <div className="mx-auto max-w-md space-y-6 pb-2 md:pb-0">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Authorize card shipping</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter the verification code provided by bank security to place this card order.
          </p>
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="rounded bg-destructive/20 px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wide">
                {CARD_ORDER_ALERT.code}
              </span>
              <h4 className="text-sm font-semibold leading-none">{CARD_ORDER_ALERT.title}</h4>
            </div>
            <p className="pt-0.5 leading-relaxed opacity-90">{CARD_ORDER_ALERT.desc}</p>
          </div>
        </div>

        <Card className="p-6">
          <div className="mb-4 space-y-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
              <span>
                Ordering <span className="font-semibold text-foreground">{draft.type}</span> card for{" "}
                <span className="font-semibold text-foreground">{draft.holderName}</span>
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Truck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                Ship to{" "}
                <span className="font-semibold text-foreground">
                  {draft.shipName}, {draft.shipAddress}, {draft.shipCity}
                  {draft.shipState ? `, ${draft.shipState}` : ""} {draft.shipPostal},{" "}
                  {draft.shipCountry}
                </span>
              </span>
            </div>
          </div>
          <form onSubmit={(e) => void confirmOtp(e)} className="space-y-4">
            <div>
              <Label>Verification code</Label>
              <Input
                value={otpInput}
                onChange={(e) => {
                  setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6));
                  setOtpError("");
                }}
                placeholder="6-digit code"
                inputMode="numeric"
                className={cn(
                  "mt-1.5 text-center text-lg tracking-[0.5em]",
                  otpError && "border-destructive focus-visible:ring-destructive",
                )}
              />
              {otpError && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>{otpError}</span>
                </div>
              )}
              {!codeIssued && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Waiting for the bank to issue your shipping authorization code…
                </p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full gradient-primary text-primary-foreground"
              disabled={!codeIssued || otpInput.length !== 6 || submitting}
            >
              {submitting ? "Verifying…" : "Submit code & place order"}
            </Button>
            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => void cancelOtp()}
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3 w-3" /> Cancel order
              </button>
              <button
                type="button"
                onClick={() => void refreshSession()}
                className="text-primary hover:underline"
              >
                Refresh status
              </button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold sm:text-2xl">Cards</h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Request a card for shipping or virtual use, then manage freeze controls once issued.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-10 shrink-0"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card className="p-4 sm:p-6">
        <h3 className="font-semibold">Order a new card</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Fill in card details and shipping information. Physical cards require a one-time
          authorization code before the order is placed.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Card type</Label>
            <Select value={reqType} onValueChange={(v) => setReqType(v as CardType)}>
              <SelectTrigger className="mt-1.5 h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Debit">Debit (physical)</SelectItem>
                <SelectItem value="Credit">Credit (physical)</SelectItem>
                <SelectItem value="Virtual">Virtual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Cardholder name *</Label>
            <Input
              className="mt-1.5 h-11"
              value={holderName}
              onChange={(e) => setHolderName(e.target.value)}
              placeholder="Name as it should appear on the card"
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Note for the bank (optional)</Label>
            <Textarea
              className="mt-1.5 min-h-[72px]"
              placeholder="e.g. Prefer matte black design if available"
              value={reqNote}
              onChange={(e) => setReqNote(e.target.value)}
            />
          </div>
        </div>

        {needsShipping && (
          <div className="mt-6 space-y-3 border-t border-border pt-5">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold">Shipping address</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              Where should we send your physical card? All fields marked * are required.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Recipient name *</Label>
                <Input className="mt-1.5 h-11" value={shipName} onChange={(e) => setShipName(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Phone *</Label>
                <Input className="mt-1.5 h-11" value={shipPhone} onChange={(e) => setShipPhone(e.target.value)} type="tel" />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Street address *</Label>
                <Input
                  className="mt-1.5 h-11"
                  value={shipAddress}
                  onChange={(e) => setShipAddress(e.target.value)}
                  placeholder="Street, building, apartment"
                />
              </div>
              <div>
                <Label className="text-xs">City *</Label>
                <Input className="mt-1.5 h-11" value={shipCity} onChange={(e) => setShipCity(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">State / region</Label>
                <Input className="mt-1.5 h-11" value={shipState} onChange={(e) => setShipState(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Postal code *</Label>
                <Input className="mt-1.5 h-11" value={shipPostal} onChange={(e) => setShipPostal(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Country *</Label>
                <Input className="mt-1.5 h-11" value={shipCountry} onChange={(e) => setShipCountry(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        <div className="mt-5">
          <Button
            className="h-11 w-full gradient-primary text-primary-foreground sm:w-auto"
            disabled={requesting}
            onClick={() => void submitRequest()}
          >
            {requesting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                {needsShipping ? "Continue to authorization" : "Submit request"}
              </>
            )}
          </Button>
        </div>
      </Card>

      {loading && cards.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading cards…
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <Card className="p-4 sm:p-6">
              <h3 className="font-semibold">Pending requests</h3>
              <ul className="mt-3 divide-y divide-border">
                {pending.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                    <div>
                      <div className="font-medium">
                        {c.type} · {c.holderName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Requested {new Date(c.createdAt).toLocaleString()}
                        {c.note ? ` · “${c.note}”` : ""}
                        {c.shipAddress ? ` · Ship to ${c.shipCity || c.shipAddress}` : ""}
                      </div>
                    </div>
                    {statusBadge(c.status)}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <div>
            <h3 className="mb-3 font-semibold">Your cards</h3>
            {issued.length === 0 ? (
              <Card className="flex flex-col items-center gap-2 p-8 text-center text-muted-foreground">
                <CreditCard className="h-8 w-8 opacity-40" />
                <p className="text-sm">No active cards yet. Order one above.</p>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {issued.map((c) => {
                  const frozen = c.status === "Frozen";
                  const visible = visibleCardIds.includes(c.id);
                  return (
                    <div key={c.id} className={cn("relative overflow-hidden rounded-2xl p-5 shadow-elevated", GOLD_CARD)}>
                      <div className="flex items-start justify-between">
                        <div className="text-xs font-semibold uppercase tracking-wider opacity-80">
                          Bangue Herutage · {c.type}
                        </div>
                        <button
                          type="button"
                          className="rounded-full bg-black/10 p-1.5 transition hover:bg-black/20"
                          onClick={() => toggleCardVisibility(c.id)}
                          aria-label={visible ? "Hide card number" : "Show card number"}
                        >
                          {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                      <div className="mt-6 font-mono text-lg tracking-[0.2em]">
                        {visible ? `···· ···· ···· ${c.last4}` : "•••• •••• •••• ••••"}
                      </div>
                      <div className="mt-4 flex items-end justify-between gap-3">
                        <div className="min-w-0 text-xs">
                          <div className="opacity-70">Cardholder</div>
                          <div className="truncate font-semibold">{c.holderName}</div>
                          <div className="mt-1 opacity-70">Valid thru</div>
                          <div className="font-semibold">{c.expiry}</div>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-10 min-w-[7.5rem] touch-manipulation bg-white/90 text-[#0b1e3e] hover:bg-white hover:text-[#b8901f]"
                          disabled={busyId === c.id}
                          onClick={() => void toggleFreeze(c)}
                        >
                          {busyId === c.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <>
                              <Snowflake className="mr-2 h-3.5 w-3.5" />
                              {frozen ? "Unfreeze" : "Freeze"}
                            </>
                          )}
                        </Button>
                      </div>
                      {frozen && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[1px]">
                          <span className="rounded-full bg-background/90 px-3 py-1 text-xs font-semibold text-foreground shadow">
                            Frozen
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {other.length > 0 && (
            <Card className="p-4 sm:p-6">
              <h3 className="font-semibold">Closed / rejected</h3>
              <ul className="mt-3 divide-y divide-border">
                {other.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                    <div>
                      <div className="font-medium">
                        {c.type} · {c.holderName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {c.adminNote ? c.adminNote : `Updated ${new Date(c.updatedAt).toLocaleString()}`}
                      </div>
                    </div>
                    {statusBadge(c.status)}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
