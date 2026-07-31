import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/mock-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  listMyCards,
  requestCard,
  setCardFrozen,
  subscribeCards,
  type BankCard,
  type CardType,
} from "@/lib/cards";

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

  const load = useCallback(async () => {
    if (!user?.customerId) return;
    setLoading(true);
    try {
      const list = await listMyCards(user.customerId);
      setCards(list);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load cards");
    } finally {
      setLoading(false);
    }
  }, [user?.customerId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return subscribeCards(() => {
      void load();
    });
  }, [load]);

  if (!user) return null;

  const issued = cards.filter((c) => c.status === "Active" || c.status === "Frozen");
  const pending = cards.filter((c) => c.status === "Pending");
  const other = cards.filter((c) => c.status === "Rejected" || c.status === "Cancelled");

  const submitRequest = async () => {
    setRequesting(true);
    try {
      await requestCard({
        customerId: user.customerId,
        customerName: `${user.firstName} ${user.lastName}`.trim(),
        customerEmail: user.email,
        accountNumber: user.accountNumber,
        type: reqType,
        holderName: `${user.firstName} ${user.lastName}`.trim(),
        note: reqNote,
      });
      toast.success("Card request submitted — awaiting admin approval");
      setReqNote("");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Request failed");
    } finally {
      setRequesting(false);
    }
  };

  const toggleFreeze = async (card: BankCard) => {
    if (card.status !== "Active" && card.status !== "Frozen") return;
    setBusyId(card.id);
    try {
      await setCardFrozen(card.id, card.status === "Active");
      toast.success(card.status === "Active" ? "Card frozen" : "Card unfrozen");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold sm:text-2xl">Cards</h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Request a card, then manage freeze controls once the bank issues it.
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-10 shrink-0" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Request form */}
      <Card className="p-4 sm:p-6">
        <h3 className="font-semibold">Request a new card</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Requests are reviewed by the bank. Your card is only issued after approval.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Card type</Label>
            <Select value={reqType} onValueChange={(v) => setReqType(v as CardType)}>
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
          <div className="sm:col-span-2">
            <Label className="text-xs">Note for the bank (optional)</Label>
            <Textarea
              className="mt-1.5 min-h-[72px]"
              placeholder="e.g. Need a virtual card for online payments"
              value={reqNote}
              onChange={(e) => setReqNote(e.target.value)}
            />
          </div>
        </div>
        <Button
          className="mt-4 h-11 w-full gradient-primary text-primary-foreground sm:w-auto"
          disabled={requesting}
          onClick={() => void submitRequest()}
        >
          {requesting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" /> Submit request
            </>
          )}
        </Button>
      </Card>

      {loading ? (
        <Card className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading cards…
        </Card>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Pending requests
              </h2>
              <div className="grid gap-3">
                {pending.map((c) => (
                  <Card key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <div className="font-medium">
                        {c.type} card · {c.holderName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Submitted {new Date(c.createdAt).toLocaleString()}
                        {c.note ? ` · “${c.note}”` : ""}
                      </div>
                    </div>
                    {statusBadge(c.status)}
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Issued cards
            </h2>
            {issued.length === 0 ? (
              <Card className="flex flex-col items-center gap-2 p-10 text-sm text-muted-foreground">
                <CreditCard className="h-8 w-8 opacity-40" />
                No issued cards yet. Submit a request above.
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {issued.map((c) => {
                  const frozen = c.status === "Frozen";
                  return (
                    <div
                      key={c.id}
                      className={cn(
                        "relative overflow-hidden rounded-2xl p-5 shadow-elevated sm:rounded-3xl sm:p-6",
                        frozen ? "bg-muted text-foreground" : GOLD_CARD,
                      )}
                    >
                      {!frozen && (
                        <div
                          className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/20 blur-2xl"
                          aria-hidden
                        />
                      )}
                      <div className="relative flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className={cn("text-[11px] sm:text-xs", frozen ? "opacity-70" : "opacity-80")}>
                            Bangue Herutage {c.type}
                          </div>
                          <div className="mt-1 truncate text-base font-semibold sm:text-lg">
                            {c.holderName}
                          </div>
                        </div>
                        <CreditCard className="h-5 w-5 shrink-0 opacity-90 sm:h-6 sm:w-6" />
                      </div>
                      <div className="relative mt-8 font-mono text-base tracking-[0.2em] sm:mt-10 sm:text-lg sm:tracking-widest">
                        •••• •••• •••• {c.last4}
                      </div>
                      <div className="relative mt-4 flex flex-wrap items-end justify-between gap-3 text-xs">
                        <div>
                          <div className="opacity-70">Valid thru</div>
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
