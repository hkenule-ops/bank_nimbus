import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/mock-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Send } from "lucide-react";

export const Route = createFileRoute("/dashboard/transfer")({
  head: () => ({ meta: [{ title: "Transfer — Bangue Herutage Bank" }] }),
  component: TransferPage,
});

function TransferPage() {
  const { user, updateBalance } = useAuth();
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");

  if (!user) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!to || !amt || amt <= 0) return toast.error("Enter a valid recipient and amount");
    if (amt > user.balance) return toast.error("Insufficient balance");
    await updateBalance(amt, `Transfer to ${to}${desc ? ` — ${desc}` : ""}`, "Debit");
    toast.success(`Sent ${amt.toLocaleString(undefined, { style: "currency", currency: "USD" })}`);
    setTo(""); setAmount(""); setDesc("");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-24 md:pb-8">
      <div>
        <h1 className="text-2xl font-bold">Send money</h1>
        <p className="mt-1 text-sm text-muted-foreground">Instant simulated transfer to another Bangue Herutage customer.</p>
      </div>
      <Card className="p-6">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Recipient account number</Label>
            <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="10-digit account" className="mt-1.5" />
          </div>
          <div>
            <Label>Amount (USD)</Label>
            <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="mt-1.5" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What's this for?" className="mt-1.5" />
          </div>
          <div className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
            Available balance: <span className="font-semibold text-foreground">{user.balance.toLocaleString(undefined, { style: "currency", currency: "USD" })}</span>
          </div>
          <Button type="submit" className="w-full gradient-primary text-primary-foreground">
            <Send className="mr-2 h-4 w-4" /> Send transfer
          </Button>
        </form>
      </Card>
    </div>
  );
}
