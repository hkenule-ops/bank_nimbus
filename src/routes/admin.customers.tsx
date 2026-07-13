import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export const Route = createFileRoute("/admin/customers")({
  component: CustomersPage,
});

const CUSTOMERS = Array.from({ length: 24 }).map((_, i) => ({
  id: "CUS-" + (10000 + i),
  name: ["Alex Morgan", "Priya Shah", "Marcus Lee", "Dana Owens", "Sofia García", "Jamal Rivers", "Yuki Tanaka", "Lena Fischer"][i % 8],
  email: `user${i + 1}@demo.nimbus`,
  type: ["Savings", "Current", "Business", "Premium"][i % 4],
  balance: Math.round((Math.random() * 50000 + 500) * 100) / 100,
  status: (["Active", "Active", "Active", "Pending Verification", "Suspended"] as const)[i % 5],
}));

function CustomersPage() {
  const [q, setQ] = useState("");
  const filtered = CUSTOMERS.filter((c) => (c.name + c.email + c.id).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage every customer account.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search customers…" value={q} onChange={(e) => setQ(e.target.value)} className="w-72 pl-9" />
        </div>
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-border/60 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.email}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{c.id}</td>
                  <td className="px-4 py-3">{c.type}</td>
                  <td className="px-4 py-3 text-right font-semibold">{c.balance.toLocaleString(undefined, { style: "currency", currency: "USD" })}</td>
                  <td className="px-4 py-3">
                    <Badge variant={c.status === "Active" ? "default" : c.status === "Suspended" ? "destructive" : "secondary"} className={c.status === "Active" ? "bg-success/15 text-success hover:bg-success/20" : ""}>{c.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right"><Button size="sm" variant="ghost">Manage</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
