import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/mock-auth";
import { appScriptRequest, isAppScriptConfigured } from "@/lib/appscript";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Bitcoin,
  TrendingUp,
  TrendingDown,
  ArrowDownToLine,
  ArrowUpFromLine,
  Wallet,
  Sparkles,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { cn, userFacingError } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/crypto")({
  head: () => ({ meta: [{ title: "Crypto — Bangue Herutage Bank" }] }),
  component: CryptoPage,
});

interface Asset {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
}

interface Holding {
  symbol: string;
  amount: number;
  avgCost: number;
}

const FALLBACK_ASSETS: Asset[] = [
  { symbol: "BTC", name: "Bitcoin", price: 64250.32, change24h: 2.4 },
  { symbol: "ETH", name: "Ethereum", price: 3180.55, change24h: -1.1 },
  { symbol: "SOL", name: "Solana", price: 142.87, change24h: 5.6 },
  { symbol: "USDT", name: "Tether", price: 1.0, change24h: 0.01 },
  { symbol: "XRP", name: "Ripple", price: 0.62, change24h: 1.8 },
];

function CryptoPage() {
  const { user, updateBalance } = useAuth();
  const { currency, toggleCurrency, format } = useCurrency();
  const [assets, setAssets] = useState<Asset[]>(FALLBACK_ASSETS);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [symbol, setSymbol] = useState("BTC");
  const [usdAmount, setUsdAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [cryptoStatus, setCryptoStatus] = useState<"None" | "Pending" | "Verified" | "Rejected" | string>("None");
  const [verLoading, setVerLoading] = useState(true);
  const [idType, setIdType] = useState("Passport");
  const [idNumber, setIdNumber] = useState("");
  const [docFileName, setDocFileName] = useState("");


  useEffect(() => {
    if (!isAppScriptConfigured()) return;
    void (async () => {
      try {
        const res = await appScriptRequest<(Asset & { status?: string })[]>("listCryptoAssets", {});
        if (res.ok && Array.isArray(res.data) && res.data.length) {
          const listed = res.data
            .filter((a) => !a.status || a.status === "Listed")
            .map((a) => ({
              symbol: String(a.symbol),
              name: String(a.name),
              price: Number(a.price) || 0,
              change24h: Number(a.change24h) || 0,
            }));
          if (listed.length) {
            setAssets(listed);
            setSymbol((s) => (listed.some((x) => x.symbol === s) ? s : listed[0].symbol));
          }
        }
        // Unknown action / old deployment → keep FALLBACK_ASSETS silently
      } catch {
        /* keep fallbacks */
      }
    })();
  }, []);

  useEffect(() => {
    if (!user?.customerId) {
      setVerLoading(false);
      return;
    }
    if (!isAppScriptConfigured()) {
      setCryptoStatus("Verified");
      setVerLoading(false);
      return;
    }
    void (async () => {
      setVerLoading(true);
      try {
        const res = await appScriptRequest<{ status: string }>("getCryptoVerification", {
          customerId: user.customerId,
        });
        if (res.ok && res.data) setCryptoStatus(res.data.status || "None");
      } finally {
        setVerLoading(false);
      }
    })();
  }, [user?.customerId]);


  const asset = assets.find((a) => a.symbol === symbol) || assets[0];

  const portfolioValue = useMemo(
    () =>
      holdings.reduce((sum, h) => {
        const a = assets.find((x) => x.symbol === h.symbol);
        return sum + (a ? a.price * h.amount : 0);
      }, 0),
    [holdings],
  );

  const costBasis = useMemo(
    () => holdings.reduce((sum, h) => sum + h.avgCost * h.amount, 0),
    [holdings],
  );

  const pnl = portfolioValue - costBasis;
  const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

  if (!user) return null;

  const verified = cryptoStatus === "Verified";

  const submitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!idNumber.trim() || !docFileName.trim()) {
      return toast.error("Enter ID number and document file name");
    }
    setBusy(true);
    try {
      const res = await appScriptRequest<{ status: string }>("submitCryptoVerification", {
        customerId: user.customerId,
        fullName: `${user.firstName} ${user.lastName}`,
        idType,
        idNumber: idNumber.trim(),
        docs: [{ type: idType, fileName: docFileName.trim() }],
      });
      if (!res.ok || !res.data) {
        toast.error(userFacingError(res.error, "We couldn't complete verification. Please try again."));
        return;
      }
      setCryptoStatus(res.data.status);
      if (res.data.status === "Verified") {
        toast.success("Identity verified — you can buy and sell crypto");
      } else if (res.data.status === "Pending") {
        toast.success("Verification submitted — pending bank review");
      }
    } finally {
      setBusy(false);
    }
  };

  const buy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verified) return toast.error("Complete crypto identity verification first");
    const usd = parseFloat(usdAmount);
    if (!usd || usd <= 0) return toast.error("Enter a valid amount");
    if (usd > user.balance) return toast.error("Insufficient cash balance");
    setBusy(true);
    try {
      const cryptoAmt = usd / asset.price;
      setHoldings((h) => {
        const existing = h.find((x) => x.symbol === symbol);
        if (existing) {
          const totalAmt = existing.amount + cryptoAmt;
          const newAvg = (existing.avgCost * existing.amount + usd) / totalAmt;
          return h.map((x) =>
            x.symbol === symbol ? { ...x, amount: totalAmt, avgCost: newAvg } : x,
          );
        }
        return [...h, { symbol, amount: cryptoAmt, avgCost: asset.price }];
      });
      await updateBalance(usd, `Crypto buy · ${cryptoAmt.toFixed(6)} ${symbol}`, "Debit");
      toast.success(`Bought ${cryptoAmt.toFixed(6)} ${symbol}`);
      setUsdAmount("");
    } finally {
      setBusy(false);
    }
  };

  const sell = async (h: Holding) => {
    if (!verified) return toast.error("Complete crypto identity verification first");
    const a = assets.find((x) => x.symbol === h.symbol);
    if (!a) return;
    const usdValue = a.price * h.amount;
    setBusy(true);
    try {
      setHoldings((prev) => prev.filter((x) => x.symbol !== h.symbol));
      await updateBalance(usdValue, `Crypto sell · ${h.amount.toFixed(6)} ${h.symbol}`, "Credit");
      toast.success(`Sold ${h.symbol} for ${format(usdValue)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 pb-2 md:pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Crypto</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Simulated trading desk — live-style prices for demonstration only.
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
        <button type="button" onClick={toggleCurrency} className="group text-left sm:col-span-2">
          <div className="glass-card relative overflow-hidden rounded-2xl p-6 sm:rounded-3xl sm:p-8">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#c9aa54]/20 blur-3xl" />
            <div className="relative flex items-center gap-2 text-sm text-muted-foreground">
              <Wallet className="h-4 w-4 text-[#c9aa54]" />
              Portfolio value
            </div>
            <div className="relative mt-2 text-3xl font-bold tracking-tight sm:text-4xl group-hover:opacity-80 transition-opacity">
              {format(portfolioValue)}
            </div>
            <div className="relative mt-2 flex flex-wrap items-center gap-3 text-xs">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium",
                  pnl >= 0 ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
                )}
              >
                {pnl >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {pnl >= 0 ? "+" : ""}
                {format(pnl)} ({pnlPct >= 0 ? "+" : ""}
                {pnlPct.toFixed(2)}%)
              </span>
              <span className="text-muted-foreground">
                Cash: <span className="font-medium text-foreground">{format(user.balance)}</span>
              </span>
            </div>
          </div>
        </button>
        <Card className="flex flex-col justify-center p-6">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#c9aa54]">
            <Sparkles className="h-3.5 w-3.5" />
            Markets
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {assets.length} assets · simulated quotes refreshed for demo realism.
          </p>
        </Card>
      </div>


      {!verLoading && !verified && (
        <Card className="border-[#c9aa54]/30 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-[#c9aa54]/15 text-[#b8901f]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">One-time crypto verification</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Before your first trade, confirm your identity once. After approval, buying and selling stay
                available on this account.
              </p>
              {cryptoStatus === "Pending" ? (
                <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                  Your documents are pending review. Trading unlocks when status becomes Verified.
                </p>
              ) : cryptoStatus === "Rejected" ? (
                <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  Verification was declined. Update your details and resubmit.
                </p>
              ) : null}
              {(cryptoStatus === "None" || cryptoStatus === "Rejected") && (
                <form onSubmit={submitVerification} className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>ID type</Label>
                    <Select value={idType} onValueChange={setIdType}>
                      <SelectTrigger className="mt-1.5 h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Passport">Passport</SelectItem>
                        <SelectItem value="National ID">National ID</SelectItem>
                        <SelectItem value="Driver licence">Driver licence</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>ID number</Label>
                    <Input
                      className="mt-1.5 h-11"
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      placeholder="Document number"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Identity document file name</Label>
                    <Input
                      className="mt-1.5 h-11"
                      value={docFileName}
                      onChange={(e) => setDocFileName(e.target.value)}
                      placeholder="e.g. passport_scan.pdf"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Button
                      type="submit"
                      disabled={busy}
                      className="h-11 w-full gradient-primary text-primary-foreground sm:w-auto"
                    >
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit verification"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </Card>
      )}

      {verified && (
        <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-4 py-2 text-xs text-success">
          <ShieldCheck className="h-4 w-4" />
          Crypto trading verified — buy and sell enabled for this account.
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 sm:p-6 lg:col-span-2">
          <h3 className="font-semibold">Market overview</h3>
          <ul className="mt-4 divide-y divide-border">
            {assets.map((a) => (
              <li
                key={a.symbol}
                className={cn(
                  "flex cursor-pointer items-center justify-between py-3 transition-colors hover:bg-muted/40 -mx-2 rounded-lg px-2",
                  symbol === a.symbol && "bg-[#c9aa54]/10",
                )}
                onClick={() => setSymbol(a.symbol)}
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-[#c9aa54]/15 text-[#b8901f]">
                    <Bitcoin className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{a.name}</div>
                    <div className="text-xs text-muted-foreground">{a.symbol}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{format(a.price)}</div>
                  <div
                    className={cn(
                      "flex items-center justify-end gap-1 text-xs font-medium",
                      a.change24h >= 0 ? "text-success" : "text-destructive",
                    )}
                  >
                    {a.change24h >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {a.change24h >= 0 ? "+" : ""}
                    {a.change24h}%
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <h3 className="mt-8 font-semibold">Your holdings</h3>
          {holdings.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              No positions yet. Select an asset and buy with available cash.
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {holdings.map((h) => {
                const a = assets.find((x) => x.symbol === h.symbol)!;
                const value = a.price * h.amount;
                const hPnl = value - h.avgCost * h.amount;
                return (
                  <li key={h.symbol} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <div className="text-sm font-medium">
                        {h.amount.toFixed(6)} {h.symbol}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(value)} · avg {format(h.avgCost)}
                        <span className={cn("ml-1.5 font-medium", hPnl >= 0 ? "text-success" : "text-destructive")}>
                          {hPnl >= 0 ? "+" : ""}
                          {format(hPnl)}
                        </span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" disabled={busy || !verified} onClick={() => void sell(h)}>
                      <ArrowUpFromLine className="mr-2 h-3 w-3" /> Sell all
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="h-fit border-[#c9aa54]/20 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Buy crypto</h3>
            <Badge variant="outline" className="border-[#c9aa54]/40 text-[#b8901f]">
              Instant
            </Badge>
          </div>
          <form onSubmit={buy} className="mt-4 space-y-4">
            <div>
              <Label>Asset</Label>
              <Select value={symbol} onValueChange={setSymbol}>
                <SelectTrigger className="mt-1.5 h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((a) => (
                    <SelectItem key={a.symbol} value={a.symbol}>
                      {a.name} ({a.symbol})
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
                value={usdAmount}
                onChange={(e) => setUsdAmount(e.target.value)}
                placeholder="0.00"
                className="mt-1.5 h-11"
              />
              {usdAmount && !Number.isNaN(parseFloat(usdAmount)) && parseFloat(usdAmount) > 0 && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  ≈ {(parseFloat(usdAmount) / asset.price).toFixed(6)} {symbol} @ {format(asset.price)}
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Available: <span className="font-medium text-foreground">{format(user.balance)}</span>
            </p>
            <Button
              type="submit"
              disabled={busy || !verified}
              className="w-full h-11 gradient-primary text-primary-foreground"
            >
              <ArrowDownToLine className="mr-2 h-4 w-4" /> Buy {symbol}
            </Button>
          </form>
        </Card>
      </section>
    </div>
  );
}
