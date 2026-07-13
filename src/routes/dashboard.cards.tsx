import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/mock-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CreditCard, Snowflake, Plus } from "lucide-react";

export const Route = createFileRoute("/dashboard/cards")({
  head: () => ({ meta: [{ title: "Cards — Nimbus Bank" }] }),
  component: CardsPage,
});

interface CardItem { id: string; type: "Debit" | "Virtual"; last4: string; frozen: boolean; }

function CardsPage() {
  const { user } = useAuth();
  const [cards, setCards] = useState<CardItem[]>([
    { id: "c1", type: "Debit", last4: "4821", frozen: false },
    { id: "c2", type: "Virtual", last4: "9021", frozen: false },
  ]);

  if (!user) return null;

  const toggle = (id: string) => {
    setCards((c) => c.map((x) => x.id === id ? { ...x, frozen: !x.frozen } : x));
    toast.success("Card status updated");
  };

  const request = (type: "Debit" | "Virtual") => {
    setCards((c) => [...c, { id: "c" + Date.now(), type, last4: String(Math.floor(1000 + Math.random() * 8999)), frozen: false }]);
    toast.success(`${type} card requested`);
  };

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cards</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your Nimbus debit and virtual cards.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => request("Virtual")}><Plus className="mr-2 h-4 w-4" /> Virtual</Button>
          <Button onClick={() => request("Debit")} className="gradient-primary text-primary-foreground"><Plus className="mr-2 h-4 w-4" /> New card</Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((c) => (
          <div key={c.id} className={`relative overflow-hidden rounded-3xl p-6 text-primary-foreground shadow-elevated ${c.frozen ? "bg-muted text-foreground" : "gradient-brand"}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs opacity-80">Nimbus {c.type}</div>
                <div className="mt-1 text-lg font-semibold">{user.firstName} {user.lastName}</div>
              </div>
              <CreditCard className="h-6 w-6 opacity-90" />
            </div>
            <div className="mt-10 font-mono text-lg tracking-widest">•••• •••• •••• {c.last4}</div>
            <div className="mt-4 flex items-end justify-between text-xs">
              <div>
                <div className="opacity-70">Valid thru</div>
                <div className="font-semibold">12/29</div>
              </div>
              <Button size="sm" variant="secondary" onClick={() => toggle(c.id)}>
                <Snowflake className="mr-2 h-3 w-3" /> {c.frozen ? "Unfreeze" : "Freeze"}
              </Button>
            </div>
          </div>
        ))}
      </div>
      <Card className="p-6">
        <h3 className="font-semibold">Recent card requests</h3>
        <p className="mt-1 text-sm text-muted-foreground">All your card requests will appear here.</p>
      </Card>
    </div>
  );
}
