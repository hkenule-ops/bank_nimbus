import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/admin/transactions")({
  component: () => <Placeholder title="Transactions" desc="View, approve, reverse and export every simulated transaction." />,
});

export function Placeholder({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      </div>
      <Card className="p-10 text-center text-sm text-muted-foreground">
        This admin module is scaffolded for the demo. Wire it to Lovable Cloud to enable full CRUD.
      </Card>
    </div>
  );
}
