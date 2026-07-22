import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowRight, Shield, Wallet, CreditCard, Send, TrendingUp, Lock, Sparkles, CheckCircle2, Globe2, Smartphone, BarChart3 } from "lucide-react";
import heroImg from "@/assets/hero.png";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <Hero />
      <Services />
      <Features />
      <Security />
      <Testimonials />
      <FAQ />
      <About />
      <Contact />
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 gradient-hero opacity-70" />
      <div className="relative mx-auto grid max-w-7xl gap-10 px-3 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-16 lg:py-28 lg:px-8">
        <div className="flex flex-col justify-center">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Demonstration platform · Not real banking
          </span>
          <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl lg:text-6xl">
            Banking, <span className="text-gradient">reimagined</span> for the modern web.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            Bangue Herutage Bank is a premium digital banking simulation with a full customer portal, admin console, transfers, cards and reporting — built to look and feel like the world's best fintechs.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button asChild size="lg" className="w-full justify-center gradient-primary text-primary-foreground shadow-elevated hover:opacity-95 sm:w-auto">
              <Link to="/register">Open an account <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full justify-center sm:w-auto"><Link to="/login">Sign in</Link></Button>
          </div>
          <div className="mt-10 grid max-w-md grid-cols-1 gap-4 text-sm sm:grid-cols-3 sm:gap-6">
            {[
              { k: "0.00%", v: "Account fees" },
              { k: "24/7", v: "Access" },
              { k: "256-bit", v: "Simulated TLS" },
            ].map((s) => (
              <div key={s.v}>
                <div className="text-2xl font-semibold text-foreground">{s.k}</div>
                <div className="text-muted-foreground">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative">
          <div className="glass-card rounded-3xl p-3">
            <img src={heroImg} alt="Bangue Herutage Bank digital banking" width={1600} height={1000} className="w-full rounded-2xl" />
          </div>
          <FloatingCard className="absolute -bottom-6 -left-6 hidden sm:block" />
        </div>
      </div>
    </section>
  );
}

function FloatingCard({ className = "" }: { className?: string }) {
  return (
    <div className={`glass-card w-64 rounded-2xl p-5 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">Available balance</div>
        <Wallet className="h-4 w-4 text-primary" />
      </div>
      <div className="mt-2 text-2xl font-semibold">$12,450.75</div>
      <div className="mt-3 flex items-center gap-1 text-xs text-success">
        <TrendingUp className="h-3 w-3" /> +2.4% this week
      </div>
    </div>
  );
}

function Services() {
  const items = [
    { icon: Wallet, title: "Everyday accounts", body: "Savings, current, joint, student, business, and premium accounts — created instantly." },
    { icon: Send, title: "Instant transfers", body: "Simulated peer-to-peer transfers between Bangue Herutage Bank customers with real-time updates." },
    { icon: CreditCard, title: "Cards on demand", body: "Request debit, virtual, or replacement cards. Freeze, unfreeze and block in one tap." },
    { icon: BarChart3, title: "Insights & reports", body: "Beautiful monthly summaries, revenue charts and export to PDF or CSV." },
    { icon: Globe2, title: "Global by design", body: "Foreign currency accounts and IBAN-style numbering for a realistic experience." },
    { icon: Smartphone, title: "Mobile-first", body: "Every screen is crafted to feel great on your phone, tablet and desktop." },
  ];
  return (
    <section id="services" className="mx-auto max-w-7xl px-3 py-20 sm:px-6 sm:py-24 lg:px-8">
      <SectionHeading eyebrow="Services" title="Everything you'd expect from a modern bank" subtitle="A complete set of retail banking features, faithfully simulated end-to-end." />
      <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => (
          <Card key={it.title} className="group relative overflow-hidden border-border/60 p-6 transition-all hover:-translate-y-1 hover:shadow-elevated">
            <div className="grid h-11 w-11 place-items-center rounded-xl gradient-primary text-primary-foreground shadow-elevated">
              <it.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-5 text-lg font-semibold">{it.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{it.body}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

function Features() {
  const fxRates = [
    { pair: "CHF / USD", rate: "1.1221", change: "+0.12%", up: true },
    { pair: "CHF / EUR", rate: "1.0434", change: "-0.05%", up: false },
    { pair: "CHF / GBP", rate: "0.8926", change: "+0.21%", up: true },
    { pair: "CHF / JPY", rate: "176.42", change: "-0.08%", up: false },
  ];

  const stocks = [
    { ticker: "NESN", name: "Nestlé SA", price: "CHF 94.18", change: "+0.32%", up: true },
    { ticker: "ROG", name: "Roche Holding", price: "CHF 268.90", change: "+0.55%", up: true },
    { ticker: "NOVN", name: "Novartis AG", price: "CHF 101.44", change: "-0.18%", up: false },
    { ticker: "UBSG", name: "UBS Group", price: "CHF 27.55", change: "-0.41%", up: false },
  ];

  return (
    <section className="border-y border-border/60 bg-muted/30">
      <div className="mx-auto grid max-w-7xl gap-12 px-3 py-20 sm:px-6 sm:py-24 lg:grid-cols-2 lg:px-8">
        <div>
          <SectionHeading eyebrow="Features" title="A dashboard people actually enjoy using." subtitle="Clean information hierarchy, purposeful motion, and the metrics that matter — front and center." align="left" />
          <ul className="mt-8 space-y-4">
            {["Balance & spending at a glance", "One-click transfers with beneficiaries", "Card controls: freeze, unfreeze, virtual", "Notifications & security alerts", "Profile completion & verification status"].map((s) => (
              <li key={s} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" />
                <span className="text-sm">{s}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative">
          <div className="glass-card rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">SIX Swiss Exchange</div>
                <div className="text-lg font-semibold">Live Market Overview</div>
              </div>
              <div className="rounded-full gradient-primary px-3 py-1 text-xs text-primary-foreground">Live</div>
            </div>

            <div className="mt-6">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Currency exchange · CHF base</div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {fxRates.map((f) => (
                  <div key={f.pair} className="rounded-xl bg-background/60 p-3">
                    <div className="text-[10px] uppercase text-muted-foreground">{f.pair}</div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-sm font-semibold">{f.rate}</span>
                      <span className={`text-[10px] font-medium ${f.up ? "text-success" : "text-destructive"}`}>
                        {f.change}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Swiss equities</div>
              <div className="mt-3 space-y-3">
                {stocks.map((s) => (
                  <div key={s.ticker} className="flex items-center justify-between rounded-xl border border-border/60 bg-background/50 p-3 text-sm">
                    <div>
                      <span className="font-medium">{s.ticker}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{s.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{s.price}</div>
                      <div className={`text-[10px] ${s.up ? "text-success" : "text-destructive"}`}>{s.change}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Security() {
  return (
    <section className="mx-auto max-w-7xl px-3 py-20 sm:px-6 sm:py-24 lg:px-8">
      <SectionHeading eyebrow="Security" title="Built with a security-first mindset." subtitle="OTP verification, session controls, masked identity fields, and audit trails — because trust is everything." />
      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {[
          { icon: Shield, t: "OTP verification", b: "Six-digit codes for registration, new devices, and password reset." },
          { icon: Lock, t: "Hashed passwords", b: "Passwords are never stored in plain text — always hashed." },
          { icon: BarChart3, t: "Full audit logs", b: "Every admin action is traceable in the audit log for accountability." },
        ].map((it) => (
          <Card key={it.t} className="p-6">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <it.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-5 font-semibold">{it.t}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{it.b}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

function Testimonials() {
  const t = [
    { q: "The most polished banking demo I've handed to a client. It sold the project in five minutes.", a: "Priya S., Product Designer" },
    { q: "Faster than our own staging environment. It just feels premium.", a: "Marcus L., Fintech Founder" },
    { q: "The admin console is a genuine joy — everything in the right place.", a: "Dana O., Operations Lead" },
  ];
  return (
    <section className="border-y border-border/60 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Testimonials" title="Loved by teams shipping fintech." />
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {t.map((x) => (
            <Card key={x.a} className="p-6">
              <p className="text-sm leading-relaxed">"{x.q}"</p>
              <p className="mt-5 text-xs font-medium text-muted-foreground">— {x.a}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const items = [
    { q: "Is this real banking?", a: "No. Bangue Herutage Bank is an educational and demonstration platform. It does not move real money and is not connected to any bank or card network." },
    { q: "Can I use it as a starting point?", a: "Yes — it's designed as a reference implementation for teams building or prototyping banking experiences." },
    { q: "How do I access the admin portal?", a: "There's a discreet Admin Login link in the footer. Use admin / admin for the demo." },
    { q: "Are my details safe?", a: "Identity fields entered during registration are simulated and masked throughout the UI. No real data should be entered." },
  ];
  return (
    <section className="mx-auto max-w-4xl px-3 py-20 sm:px-6 sm:py-24 lg:px-8">
      <SectionHeading eyebrow="FAQ" title="Answers to common questions." />
      <Accordion type="single" collapsible className="mt-10">
        {items.map((it, i) => (
          <AccordionItem key={i} value={`i${i}`}>
            <AccordionTrigger className="text-left">{it.q}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">{it.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

function About() {
  return (
    <section id="about" className="border-t border-border/60 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="About" title="A reference banking experience — for teams that care about craft." subtitle="Bangue Herutage Bank was built to demonstrate what a delightful, security-conscious digital bank can look like on the modern web." />
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section id="contact" className="mx-auto max-w-7xl px-3 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="glass-card rounded-3xl px-4 py-12 text-center sm:px-8 sm:py-16">
        <h2 className="text-3xl font-bold sm:text-4xl">Ready to explore Bangue Herutage Bank?</h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">Open a simulated account in seconds and experience the full customer portal end-to-end.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
          <Button asChild size="lg" className="w-full justify-center gradient-primary text-primary-foreground shadow-elevated sm:w-auto"><Link to="/register">Get started</Link></Button>
          <Button asChild size="lg" variant="outline" className="w-full justify-center sm:w-auto"><Link to="/login">I have an account</Link></Button>
        </div>
      </div>
    </section>
  );
}

function SectionHeading({ eyebrow, title, subtitle, align = "center" }: { eyebrow: string; title: string; subtitle?: string; align?: "center" | "left" }) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <div className="text-xs font-semibold uppercase tracking-wider text-primary">{eyebrow}</div>
      <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-4 text-muted-foreground">{subtitle}</p>}
    </div>
  );
}