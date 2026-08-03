import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { RefreshCw, Loader2, Pencil, Plus, Trash2, Bitcoin, TrendingUp, TrendingDown } from "lucide-react";
import { appScriptRequest, isAppScriptConfigured } from "@/lib/appscript";
import { toast } from "sonner";
import { cn, userFacingError } from "@/lib/utils";

export const Route = createFileRoute("/admin/crypto")({
  component: AdminCryptoPage,
});

export interface CryptoAsset {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  marketCap?: string;
  status: "Listed" | "Delisted" | "Maintenance";
}

type FormState = {
  symbol: string;
  name: string;
  price: string;
  change24h: string;
  marketCap: string;
  status: CryptoAsset["status"];
};

function emptyForm(): FormState {
  return {
    symbol: "",
    name: "",
    price: "",
    change24h: "0",
    marketCap: "",
    status: "Listed",
  };
}

function assetToForm(a: CryptoAsset): FormState {
  return {
    symbol: a.symbol,
    name: a.name,
    price: String(a.price),
    change24h: String(a.change24h),
    marketCap: a.marketCap || "",
    status: a.status,
  };
}

function AdminCryptoPage() {
  const [assets, setAssets] = useState<CryptoAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<CryptoAsset | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (!isAppScriptConfigured()) {
        setAssets([]);
        toast.error("Crypto settings are unavailable right now. Please try again later.");
        return;
      }
      const res = await appScriptRequest<CryptoAsset[]>("listCryptoAssets", {});
      if (res.ok && Array.isArray(res.data)) setAssets(res.data);
      else {
        const err = res.error || "We couldn't load market data. Please try again.";
        if (String(err).includes("Unknown action")) {
          toast.error("Crypto data couldn't be loaded. Please try again later.");
        } else {
          toast.error(err);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setMode("create");
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const openEdit = (a: CryptoAsset) => {
    setMode("edit");
    setEditing(a);
    setForm(assetToForm(a));
    setOpen(true);
  };

  const save = async () => {
    const symbol = form.symbol.trim().toUpperCase();
    const name = form.name.trim();
    const price = Number(form.price);
    const change24h = Number(form.change24h);
    if (!symbol || !name) return toast.error("Symbol and name are required");
    if (!(price >= 0) || Number.isNaN(price)) return toast.error("Enter a valid price");
    if (Number.isNaN(change24h)) return toast.error("Enter a valid 24h change");

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        id: mode === "edit" && editing ? editing.id : undefined,
        symbol,
        name,
        price,
        change24h,
        marketCap: form.marketCap.trim() || "",
        status: form.status,
      };
      const res = await appScriptRequest<CryptoAsset>("upsertCryptoAsset", payload);
      if (res.ok) {
        toast.success(mode === "edit" ? "Asset updated" : "Asset listed");
        setOpen(false);
        void load();
      } else {
        toast.error(userFacingError(res.error, "We couldn't save those changes. Please try again."));
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async (a: CryptoAsset) => {
    if (!window.confirm(`Remove ${a.symbol} from the market list?`)) return;
    const res = await appScriptRequest("deleteCryptoAsset", { id: a.id });
    if (res.ok) {
      toast.success("Asset removed");
      void load();
    } else {
      toast.error(userFacingError(res.error, "We couldn't remove that item. Please try again."));
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Crypto markets</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live market list from Google Sheets — edit symbols, prices, and status in real time.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" className="gradient-primary text-primary-foreground" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add asset
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : assets.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No assets yet. Add one to get started.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {assets.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-[#c9aa54]/15 text-[#b8901f]">
                    <Bitcoin className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium">
                      {a.name} <span className="text-muted-foreground">({a.symbol})</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ${Number(a.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                      {a.marketCap ? ` · MCap ${a.marketCap}` : ""}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex items-center gap-1 text-xs font-medium",
                      a.change24h >= 0 ? "text-success" : "text-destructive",
                    )}
                  >
                    {a.change24h >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {a.change24h >= 0 ? "+" : ""}
                    {a.change24h}%
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {a.status}
                  </Badge>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(a)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive"
                    onClick={() => void remove(a)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md w-[calc(100%-1.5rem)] rounded-xl sm:w-full">
          <DialogHeader>
            <DialogTitle>{mode === "create" ? "Add crypto asset" : "Edit asset"}</DialogTitle>
            <DialogDescription>Changes save to the CryptoAssets sheet immediately.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Symbol *</Label>
              <Input
                className="mt-1.5 h-11 uppercase"
                value={form.symbol}
                onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value }))}
                placeholder="BTC"
              />
            </div>
            <div>
              <Label className="text-xs">Name *</Label>
              <Input
                className="mt-1.5 h-11"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Bitcoin"
              />
            </div>
            <div>
              <Label className="text-xs">Price (USD) *</Label>
              <Input
                type="number"
                step="any"
                className="mt-1.5 h-11"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">24h change %</Label>
              <Input
                type="number"
                step="any"
                className="mt-1.5 h-11"
                value={form.change24h}
                onChange={(e) => setForm((f) => ({ ...f, change24h: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Market cap</Label>
              <Input
                className="mt-1.5 h-11"
                value={form.marketCap}
                onChange={(e) => setForm((f) => ({ ...f, marketCap: e.target.value }))}
                placeholder="1.26T"
              />
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v as CryptoAsset["status"] }))}
              >
                <SelectTrigger className="mt-1.5 h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Listed">Listed</SelectItem>
                  <SelectItem value="Delisted">Delisted</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="h-11 flex-1 sm:flex-none" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              className="h-11 flex-1 gradient-primary text-primary-foreground sm:flex-none"
              disabled={saving}
              onClick={() => void save()}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
