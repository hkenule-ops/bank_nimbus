import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Card } from "@/components/ui/card";
import { Wallet, CreditCard, Send, BarChart3, Globe2, Smartphone, PiggyBank, Building2, GraduationCap, Briefcase, Users, Coins } from "lucide-react";

export const Route = createFileRoute("/services")({
  head: () => ({ meta: [{ title: "Services — Nimbus Bank" }, { name: "description", content: "Explore Nimbus banking services: accounts, transfers, cards and more." }] }),
  component: Services,
});

const groups = [
  { title: "Accounts", items: [
    { icon: PiggyBank, t: "Savings", d: "Grow your simulated balance." },
    { icon: Wallet, t: "Checking", d: "For everyday spending." },
    { icon: Building2, t: "Business", d: "For companies and teams." },
    { icon: Users, t: "Joint", d: "Shared with a partner." },
    { icon: GraduationCap, t: "Student", d: "Perks for learners." },
    { icon: Briefcase, t: "Premium", d: "White-glove experience." },
  ]},
  { title: "Payments", items: [
    { icon: Send, t: "Transfers", d: "Instant peer-to-peer." },
    { icon: CreditCard, t: "Cards", d: "Debit, virtual and replacement." },
    { icon: Globe2, t: "Foreign currency", d: "Multi-currency accounts." },
    { icon: Coins, t: "Fixed deposits", d: "Lock away funds and earn." },
    { icon: BarChart3, t: "Reports", d: "Monthly summaries." },
    { icon: Smartphone, t: "Mobile", d: "Beautiful on every device." },
  ]},
];

function Services() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold sm:text-5xl">Services</h1>
        <p className="mt-3 max-w-2xl text-lg text-muted-foreground">A complete range of simulated retail banking products.</p>
        <div className="mt-14 space-y-14">
          {groups.map((g) => (
            <section key={g.title}>
              <h2 className="text-xl font-semibold">{g.title}</h2>
              <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {g.items.map((it) => (
                  <Card key={it.t} className="p-6">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><it.icon className="h-5 w-5" /></div>
                    <h3 className="mt-4 font-semibold">{it.t}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{it.d}</p>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
