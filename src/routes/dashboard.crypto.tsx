import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/mock-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useCurrency } from "@/lib/currency";
import { toast } from "sonner";
import { Bitcoin, TrendingUp, TrendingDown, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

export const Route = createFileRoute("/dashboard/crypto")({
  head: () => ({ meta: [{ title: "Crypto — Bangue Herutage Bank" }] }),
  component: CryptoPage,
});

interface Asset { symbol: string; name: string; price: number; change24h: number; }
interface Holding { symbol: string; amount: number; }

const ASSETS: Asset[] = [
  { symbol: "BTC", name: "Bitcoin", price: 64250.32, change24h: 2.4 },
  { symbol: "ETH", name: "Ethereum", price: 3180.55, change24h: -1.1 },
  { symbol: "SOL", name: "Solana", price: 142.87, change24h: 5.6 },
  { symbol: "USDT", name: "Tether", price: 1.0, change24h: 0.0 },
];

function CryptoPage() {
  const { user, updateBalance } = useAuth();
  const { currency, toggleCurrency, format } = useCurrency();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [symbol, setSymbol] = useState("BTC");
  const [usdAmount, setUsdAmount] = useState("");

  if (!user) return null;

  const asset = ASSETS.find((a) => a.symbol === symbol)!;
  const portfolioValue = holdings.reduce((sum, h) => {
    const a = ASSETS.find((x) => x.symbol === h.symbol);
    return sum + (a ? a.price * h.amount : 0);
  }, 0);

  const buy = async (e: React.FormEvent) => {
    e.preventDefault();
    const usd = parseFloat(usdAmount);
    if (!usd || usd <= 0) return toast.error("Enter a valid amount");
    if (usd > user.balance) return toast.error("Insufficient balance");
    const cryptoAmt = usd / asset.price;
    setHoldings((h) => {
      const existing = h.find((x) => x.symbol === symbol);
      if (existing) return h.map((x) => x.symbol === symbol ? { ...x, amount: x.amount + cryptoAmt } : x);
      return [...h, { symbol, amount: cryptoAmt }];
    });
    await updateBalance(usd, `Bought ${cryptoAmt.toFixed(6)} ${symbol}`, "Debit");
    toast.success(`Bought ${cryptoAmt.toFixed(6)} ${symbol} for ${format(usd)}`);
    setUsdAmount("");
  };

  const sell = async (h: Holding) => {
    const a = ASSETS.find((x) => x.symbol === h.symbol)!;
    const usdValue = a.price * h.amount;
    setHoldings((prev) => prev.filter((x) => x.symbol !== h.symbol));
    await updateBalance(usdValue, `Sold ${h.amount.toFixed(6)} ${h.symbol}`, "Credit");
    toast.success(`Sold ${h.symbol} for ${format(usdValue)}`);
  };

  return (
    <div className="space-y-6 pb-2 md:pb-0">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Crypto</h1>
        <p className="mt-1 text-sm text-muted-foreground">Buy, sell, and track digital assets — simulated market prices.</p>
      </div>

      <button
        type="button"
        onClick={toggleCurrency}
        className="group w-full text-left"
        aria-label={`Switch to ${currency === "USD" ? "CHF" : "USD"}`}
      >
        <div className="glass-card overflow-hidden rounded-3xl p-8">
          <div className="text-sm text-muted-foreground">Portfolio value</div>
          <div className="mt-1 text-4xl font-bold transition-opacity group-hover:opacity-70">{format(portfolioValue)}</div>
          <div className="mt-1 text-xs text-muted-foreground underline decoration-dotted underline-offset-4">
            Tap to view in {currency === "USD" ? "CHF" : "USD"}
          </div>
          <div className="mt-3 text-sm text-muted-foreground">
            Cash available: <span className="font-medium text-foreground">{format(user.balance)}</span>
          </div>
        </div>
      </button>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <h3 className="font-semibold">Market</h3>
          <ul className="mt-4 divide-y divide-border">
            {ASSETS.map((a) => (
              <li key={a.symbol} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary">
                    <Bitcoin className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{a.name}</div>
                    <div className="text-xs text-muted-foreground">{a.symbol}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{format(a.price)}</div>
                  <div className={`flex items-center justify-end gap-1 text-xs ${a.change24h >= 0 ? "text-success" : "text-destructive"}`}>
                    {a.change24h >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {a.change24h >= 0 ? "+" : ""}{a.change24h}%
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <h3 className="mt-8 font-semibold">Your holdings</h3>
          {holdings.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">You don't own any crypto yet. Buy your first asset to get started.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {holdings.map((h) => {
                const a = ASSETS.find((x) => x.symbol === h.symbol)!;
                const value = a.price * h.amount;
                return (
                  <li key={h.symbol} className="flex items-center justify-between py-3">
                    <div>
                      <div className="text-sm font-medium">{h.amount.toFixed(6)} {h.symbol}</div>
                      <div className="text-xs text-muted-foreground">{format(value)}</div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => sell(h)}>
                      <ArrowUpFromLine className="mr-2 h-3 w-3" /> Sell
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="h-fit p-6">
          <h3 className="font-semibold">Buy crypto</h3>
          <form onSubmit={buy} className="mt-4 space-y-4">
            <div>
              <Label>Asset</Label>
              <Select value={symbol} onValueChange={setSymbol}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASSETS.map((a) => <SelectItem key={a.symbol} value={a.symbol}>{a.name} ({a.symbol})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount ({currency})</Label>
              <Input type="number" step="0.01" value={usdAmount} onChange={(e) => setUsdAmount(e.target.value)} placeholder="0.00" className="mt-1.5" />
              {usdAmount && !isNaN(parseFloat(usdAmount)) && (
                <p className="mt-1.5 text-xs text-muted-foreground">≈ {(parseFloat(usdAmount) / asset.price).toFixed(6)} {symbol}</p>
              )}
            </div>
            <Button type="submit" className="w-full gradient-primary text-primary-foreground">
              <ArrowDownToLine className="mr-2 h-4 w-4" /> Buy {symbol}
            </Button>
          </form>
        </Card>
      </section>
    </div>
  );
}