import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/mock-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CreditCard, Snowflake, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/cards")({
  head: () => ({ meta: [{ title: "Cards — Bangue Herutage Bank" }] }),
  component: CardsPage,
});

interface CardItem {
  id: string;
  type: "Debit" | "Virtual";
  last4: string;
  frozen: boolean;
  expiry: string;
  holderName?: string;
}

/** Solid gold ATM card face — navy text for contrast on gold. */
const GOLD_CARD =
  "bg-gradient-to-br from-[#d4b45a] via-[#c9aa54] to-[#a88b2e] text-[#0b1e3e]";

function CardsPage() {
  const { user } = useAuth();
  const [cards, setCards] = useState<CardItem[]>([
    { id: "c1", type: "Debit", last4: "4821", frozen: false, expiry: "12/29" },
    { id: "c2", type: "Virtual", last4: "9021", frozen: false, expiry: "08/28" },
  ]);

  if (!user) return null;

  const toggle = (id: string) => {
    setCards((c) => c.map((x) => (x.id === id ? { ...x, frozen: !x.frozen } : x)));
    toast.success("Card status updated");
  };

  const request = (type: "Debit" | "Virtual") => {
    const mm = String(new Date().getMonth() + 1).padStart(2, "0");
    const yy = String((new Date().getFullYear() + 4) % 100).padStart(2, "0");
    setCards((c) => [
      ...c,
      {
        id: "c" + Date.now(),
        type,
        last4: String(Math.floor(1000 + Math.random() * 8999)),
        frozen: false,
        expiry: `${mm}/${yy}`,
      },
    ]);
    toast.success(`${type} card issued`);
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold sm:text-2xl">Cards</h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Manage your Bangue Herutage debit and virtual cards.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <Button variant="outline" className="h-11 w-full sm:w-auto" onClick={() => request("Virtual")}>
            <Plus className="mr-1.5 h-4 w-4 shrink-0" />
            <span className="truncate">Virtual</span>
          </Button>
          <Button
            className="h-11 w-full gradient-primary text-primary-foreground sm:w-auto"
            onClick={() => request("Debit")}
          >
            <Plus className="mr-1.5 h-4 w-4 shrink-0" />
            <span className="truncate">New card</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <div
            key={c.id}
            className={cn(
              "relative overflow-hidden rounded-2xl p-5 shadow-elevated sm:rounded-3xl sm:p-6",
              c.frozen ? "bg-muted text-foreground" : GOLD_CARD,
            )}
          >
            {!c.frozen && (
              <div
                className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/20 blur-2xl"
                aria-hidden
              />
            )}
            <div className="relative flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className={cn("text-[11px] sm:text-xs", c.frozen ? "opacity-70" : "opacity-80")}>
                  Bangue Herutage {c.type}
                </div>
                <div className="mt-1 truncate text-base font-semibold sm:text-lg">
                  {user.firstName} {user.lastName}
                </div>
              </div>
              <CreditCard className="h-5 w-5 shrink-0 opacity-90 sm:h-6 sm:w-6" />
            </div>

            <div className="relative mt-8 font-mono text-base tracking-[0.2em] sm:mt-10 sm:text-lg sm:tracking-widest">
              •••• •••• •••• {c.last4}
            </div>

            <div className="relative mt-4 flex flex-wrap items-end justify-between gap-3 text-xs">
              <div>
                <div className={c.frozen ? "opacity-70" : "opacity-70"}>Valid thru</div>
                <div className="font-semibold">{c.expiry}</div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="h-10 min-w-[7.5rem] touch-manipulation bg-white/90 text-[#0b1e3e] hover:bg-white hover:text-[#b8901f]"
                onClick={() => toggle(c.id)}
              >
                <Snowflake className="mr-2 h-3.5 w-3.5" />
                {c.frozen ? "Unfreeze" : "Freeze"}
              </Button>
            </div>

            {c.frozen && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[1px]">
                <span className="rounded-full bg-background/90 px-3 py-1 text-xs font-semibold text-foreground shadow">
                  Frozen
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      <Card className="p-4 sm:p-6">
        <h3 className="font-semibold">Your cards</h3>
        <p className="mt-1 text-sm text-muted-foreground">Freeze or unfreeze anytime. New cards appear here instantly.</p>
        {cards.length > 0 && (
          <ul className="mt-4 divide-y divide-border">
            {cards.map((c) => (
              <li key={`req-${c.id}`} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium">
                    {c.type} · •••• {c.last4}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Exp {c.expiry} · {c.frozen ? "Frozen" : "Active"}
                  </div>
                </div>
                <Button size="sm" variant="outline" className="h-9 shrink-0" onClick={() => toggle(c.id)}>
                  {c.frozen ? "Unfreeze" : "Freeze"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
