import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  KeyRound, RefreshCw, Copy, CheckCircle2, Clock, XCircle, Loader2,
} from "lucide-react";
import {
  TOTAL_OTP_STAGES,
  listTransferOtpSessions,
  adminGenerateTransferOtp,
  subscribeTransferOtp,
  type TransferOtpSession,
  isLayerVerified,
  isLayerCodeActive,
  VERIFIED_MARKER,
} from "@/lib/transfer-otp";
import { isAppScriptConfigured } from "@/lib/appscript";
import {
  listCardOrderOtp,
  adminGenerateCardOrderOtp,
  isCodeActive,
  type CardOrderOtpSession,
} from "@/lib/card-order-otp";

export const Route = createFileRoute("/admin/otp")({
  head: () => ({ meta: [{ title: "Transfer OTP — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminOtpPage,
});

function AdminOtpPage() {
  const [sessions, setSessions] = useState<TransferOtpSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [lastCode, setLastCode] = useState<{ id: string; stage: number; code: string } | null>(null);
  const [cardSessions, setCardSessions] = useState<CardOrderOtpSession[]>([]);
  const [cardBusy, setCardBusy] = useState<string | null>(null);
  const [lastCardCode, setLastCardCode] = useState<{ id: string; code: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, cards] = await Promise.all([
        listTransferOtpSessions(),
        listCardOrderOtp().catch(() => [] as CardOrderOtpSession[]),
      ]);
      setSessions(list);
      setCardSessions(cards);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 4000);
    const unsub = subscribeTransferOtp(() => void load());
    return () => {
      window.clearInterval(id);
      unsub();
    };
  }, [load]);

  const generate = async (session: TransferOtpSession, stage: number) => {
    const key = `${session.id}:${stage}`;
    setBusy(key);
    try {
      const result = await adminGenerateTransferOtp(session.id, stage);
      if (!result) {
        toast.error("Could not generate OTP for this session");
        return;
      }
      setLastCode({ id: session.id, stage, code: result.code });
      setSessions((prev) => prev.map((s) => (s.id === result.session.id ? result.session : s)));
      toast.success(`Layer ${stage} OTP generated: ${result.code}`);
    } finally {
      setBusy(null);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied");
  };

  const generateCard = async (session: CardOrderOtpSession) => {
    setCardBusy(session.id);
    try {
      const result = await adminGenerateCardOrderOtp(session.id);
      setLastCardCode({ id: session.id, code: result.code });
      setCardSessions((prev) => prev.map((s) => (s.id === result.session.id ? result.session : s)));
      toast.success(`Card shipping OTP generated: ${result.code}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate code");
    } finally {
      setCardBusy(null);
    }
  };

  const pending = sessions.filter((s) => s.status === "pending");
  const recent = sessions.filter((s) => s.status !== "pending").slice(0, 15);
  const pendingCards = cardSessions.filter((s) => s.status === "pending");

  return (
    <div className="space-y-5 sm:space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Transfer tax compliance authorization</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Issue 6-digit tax compliance codes for customer transfers that require additional verification.
            {!isAppScriptConfigured() && (
              <span className="ml-1 text-amber-700 dark:text-amber-400">
                If customers need help, direct them to email support or live chat.
              </span>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {lastCode && (
        <Card className="border-primary/40 bg-primary/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/15 text-primary">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-medium">Last issued code</div>
                <div className="text-xs text-muted-foreground">
                  Session {lastCode.id} · Layer {lastCode.stage}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xl font-bold tracking-[0.2em] text-primary sm:text-2xl sm:tracking-[0.3em]">{lastCode.code}</span>
              <Button size="sm" variant="outline" onClick={() => copyCode(lastCode.code)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Pending transfers ({pending.length})
        </h2>
        {loading && sessions.length === 0 ? (
          <Card className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading sessions…
          </Card>
        ) : pending.length === 0 ? (
          <Card className="p-10 text-center text-sm text-muted-foreground">
            No pending transfer OTP requests. When a customer starts a transfer, it will appear here.
          </Card>
        ) : (
          <div className="space-y-4">
            {pending.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                busy={busy}
                onGenerate={generate}
                onCopy={copyCode}
              />
            ))}
          </div>
        )}
      </section>

      {recent.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Recent (completed / cancelled)
          </h2>
          <div className="space-y-3">
            {recent.map((s) => (
              <Card key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4 opacity-80">
                <div>
                  <div className="font-medium">{s.customerName}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.id} · ${s.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} → {s.to}
                  </div>
                </div>
                <StatusBadge status={s.status} />
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Card shipping authorization ({pendingCards.length})
        </h2>
        {lastCardCode && (
          <Card className="mb-4 border-primary/40 bg-primary/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm font-medium">Last card shipping code</div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xl font-bold tracking-[0.2em] text-primary">{lastCardCode.code}</span>
                <Button size="sm" variant="outline" onClick={() => copyCode(lastCardCode.code)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        )}
        {pendingCards.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            No pending card shipping OTP requests.
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingCards.map((s) => (
              <Card key={s.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{s.customerName}</h3>
                      <StatusBadge status={s.status} />
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {s.cardType} · {s.holderName} · {s.accountNumber}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Ship: {s.shippingSummary || "—"}
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">{s.id}</div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {isCodeActive(s.code) ? (
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-lg font-bold tracking-widest">{s.code}</span>
                        <Button size="sm" variant="outline" onClick={() => copyCode(s.code!)}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" disabled={cardBusy === s.id} onClick={() => void generateCard(s)}>
                          Regen
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        className="gradient-primary text-primary-foreground"
                        disabled={cardBusy === s.id}
                        onClick={() => void generateCard(s)}
                      >
                        {cardBusy === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Issue shipping code"}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}

function SessionCard({
  session: s,
  busy,
  onGenerate,
  onCopy,
}: {
  session: TransferOtpSession;
  busy: string | null;
  onGenerate: (s: TransferOtpSession, stage: number) => void;
  onCopy: (code: string) => void;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-border/60 bg-muted/30 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{s.customerName}</h3>
              <StatusBadge status={s.status} />
            </div>
            <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
              <div>
                {s.customerEmail} · Acct {s.accountNumber}
              </div>
              <div>
                Transfer ${s.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} → {s.to}
                {s.desc ? ` · ${s.desc}` : ""}
              </div>
              <div className="font-mono">Session {s.id}</div>
            </div>
          </div>
          <div className="rounded-lg bg-background px-3 py-2 text-center">
            <div className="text-[10px] uppercase text-muted-foreground">Customer on</div>
            <div className="text-lg font-bold text-primary">
              Layer {s.stage}/{TOTAL_OTP_STAGES}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 sm:gap-3 sm:p-5 lg:grid-cols-5">
        {Array.from({ length: TOTAL_OTP_STAGES }).map((_, i) => {
          const stage = i + 1;
          const code = s.codes[i];
          const isCurrent = stage === s.stage;
          const isPast = stage < s.stage;
          const key = `${s.id}:${stage}`;
          const isBusy = busy === key;

          return (
            <div
              key={stage}
              className={`rounded-xl border p-3 ${
                isCurrent
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : isPast
                    ? "border-success/30 bg-success/5"
                    : "border-border/60"
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold">Layer {stage}</span>
                {isPast && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
                {isCurrent && !code && <Clock className="h-3.5 w-3.5 animate-pulse text-amber-600" />}
              </div>

              {isPast || isLayerVerified(code) ? (
                <div className="rounded-lg bg-success/10 px-2 py-2 text-center text-[11px] font-semibold text-success">
                  Verified
                </div>
              ) : isLayerCodeActive(code) ? (
                <div className="space-y-2">
                  <div className="font-mono text-sm font-bold tracking-widest">{code}</div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="h-7 flex-1 text-xs" onClick={() => onCopy(code!)}>
                      <Copy className="mr-1 h-3 w-3" /> Copy
                    </Button>
                    {isCurrent && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        disabled={isBusy}
                        onClick={() => onGenerate(s, stage)}
                      >
                        Regen
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <Button
                  size="sm"
                  className="h-8 w-full gradient-primary text-xs text-primary-foreground"
                  disabled={!isCurrent || isBusy}
                  onClick={() => onGenerate(s, stage)}
                >
                  {isBusy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <KeyRound className="mr-1 h-3.5 w-3.5" /> Generate
                    </>
                  )}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "pending") {
    return (
      <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400">
        <Clock className="mr-1 h-3 w-3" /> Pending
      </Badge>
    );
  }
  if (status === "completed") {
    return (
      <Badge variant="outline" className="border-success/40 bg-success/10 text-success">
        <CheckCircle2 className="mr-1 h-3 w-3" /> Completed
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      <XCircle className="mr-1 h-3 w-3" /> Cancelled
    </Badge>
  );
}
