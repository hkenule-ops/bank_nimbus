import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Users, Trash2 } from "lucide-react";

export const Route = createFileRoute("/dashboard/beneficiaries")({
  head: () => ({ meta: [{ title: "Beneficiaries — Bangue Herutage Bank" }] }),
  component: BenPage,
});

interface Ben { id: string; name: string; account: string; bank: string; }

function BenPage() {
  const [list, setList] = useState<Ben[]>([
    { id: "b1", name: "Jamie Rivera", account: "8823 4471 22", bank: "Bangue Herutage Bank" },
    { id: "b2", name: "Priya Shah", account: "4409 1230 88", bank: "Bangue Herutage Bank" },
  ]);
  const [f, setF] = useState({ name: "", account: "", bank: "Bangue Herutage Bank" });

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name || !f.account) return toast.error("Fill in the beneficiary details");
    setList((l) => [...l, { id: "b" + Date.now(), ...f }]);
    setF({ name: "", account: "", bank: "Bangue Herutage Bank" });
    toast.success("Beneficiary added");
  };

  return (
    <div className="grid gap-6 pb-24 lg:grid-cols-3 md:pb-8">
      <div className="lg:col-span-2 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Beneficiaries</h1>
          <p className="mt-1 text-sm text-muted-foreground">Saved recipients for faster transfers.</p>
        </div>
        <Card className="divide-y divide-border">
          {list.map((b) => (
            <div key={b.id} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary"><Users className="h-4 w-4" /></div>
                <div>
                  <div className="text-sm font-medium">{b.name}</div>
                  <div className="text-xs text-muted-foreground">{b.bank} • {b.account}</div>
                </div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setList((l) => l.filter((x) => x.id !== b.id))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </Card>
      </div>
      <Card className="h-fit p-6">
        <h3 className="font-semibold">Add beneficiary</h3>
        <form onSubmit={add} className="mt-4 space-y-3">
          <div><Label>Full name</Label><Input className="mt-1.5" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div><Label>Account number</Label><Input className="mt-1.5" value={f.account} onChange={(e) => setF({ ...f, account: e.target.value })} /></div>
          <div><Label>Bank</Label><Input className="mt-1.5" value={f.bank} onChange={(e) => setF({ ...f, bank: e.target.value })} /></div>
          <Button type="submit" className="w-full gradient-primary text-primary-foreground">Save beneficiary</Button>
        </form>
      </Card>
    </div>
  );
}
