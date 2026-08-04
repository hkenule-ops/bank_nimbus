import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  ArrowRight,
  Shield,
  Wallet,
  CreditCard,
  Send,
  TrendingUp,
  Lock,
  Sparkles,
  CheckCircle2,
  Globe2,
  Smartphone,
  BarChart3,
  Quote,
} from "lucide-react";
import heroImg from "@/assets/hero.png";

export const Route = createFileRoute("/")({
  component: Landing,
});

const GOLD_PRIMARY = "bg-[#c9aa54] text-primary-foreground hover:bg-[#c9a52f]";

/* ---------- Scroll-reveal primitives ---------- */

function useReveal<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.unobserve(el);
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`reveal ${visible ? "reveal-visible" : ""} ${className}`}
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}

/* ---------- Decorative motion primitives ---------- */

function FloatingBlobs() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const handleMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      setPos({
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      });
    };
    el.addEventListener("mousemove", handleMove);
    return () => el.removeEventListener("mousemove", handleMove);
  }, []);

  const parallax = (strength: number): CSSProperties =>
    ({
      "--px": `${(pos.x - 0.5) * strength}px`,
      "--py": `${(pos.y - 0.5) * strength}px`,
    }) as CSSProperties;

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <div
        className="hero-blob absolute -left-16 top-10 h-80 w-80 animate-float-slow rounded-full bg-[#c9aa54]/30 blur-3xl transition-transform duration-700 ease-out"
        style={{ ...parallax(35), transform: "translate(var(--px), var(--py))" }}
      />
      <div
        className="hero-blob absolute right-0 top-1/3 h-[28rem] w-[28rem] animate-float-slower rounded-full bg-primary/30 blur-3xl transition-transform duration-700 ease-out"
        style={{ ...parallax(-50), transform: "translate(var(--px), var(--py))" }}
      />
      <div
        className="hero-blob absolute bottom-0 left-1/3 h-72 w-72 animate-float-slow rounded-full bg-[#c9aa54]/20 blur-3xl transition-transform duration-700 ease-out"
        style={{ ...parallax(25), transform: "translate(var(--px), var(--py))", animationDelay: "1.5s" }}
      />
      <div
        className="hero-blob absolute -right-20 bottom-0 h-64 w-64 animate-float-slower rounded-full bg-primary/20 blur-3xl transition-transform duration-700 ease-out"
        style={{ ...parallax(-30), transform: "translate(var(--px), var(--py))", animationDelay: "3s" }}
      />
      <div
        className="hero-blob absolute left-1/4 top-0 h-56 w-56 animate-float-slow rounded-full bg-[#c9aa54]/15 blur-2xl transition-transform duration-700 ease-out"
        style={{ ...parallax(20), transform: "translate(var(--px), var(--py))", animationDelay: "4.5s" }}
      />
    </div>
  );
}

function AmbientBlobs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute -left-16 top-10 h-72 w-72 animate-float-slow rounded-full bg-[#c9aa54]/20 blur-3xl" />
      <div className="absolute right-0 top-1/3 h-96 w-96 animate-float-slower rounded-full bg-primary/20 blur-3xl" />
      <div
        className="absolute bottom-0 left-1/3 h-64 w-64 animate-float-slow rounded-full bg-[#c9aa54]/10 blur-3xl"
        style={{ animationDelay: "2s" }}
      />
    </div>
  );
}

function MarqueeTicker() {
  const items = [
    "No monthly maintenance fees (standard accounts)",
    "Deposits insured where applicable",
    "Two‑factor authentication (2FA)",
    "Real‑time fraud monitoring",
    "24/7 customer support",
    "Instant bank transfers",
    "Global ATM access",
    "Mobile check deposit",
    "Contactless & virtual cards",
    "Card controls: freeze, limits & alerts",
    "Paperless statements & eStatements",
    "Competitive savings rates",
    "Secure TLS encryption and data protection",
    "Biometric login (Face ID / Touch ID)",
    "Easy online account opening",
  ];

  const track = [...items, ...items];

  return (
    <div className="overflow-hidden border-y border-border/60 bg-muted/40 py-3">
      <div className="flex w-max animate-marquee gap-10">
        {track.map((t, i) => (
          <span
            key={i}
            className="flex items-center gap-2 whitespace-nowrap text-sm font-medium text-muted-foreground"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#c9aa54]" />
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function MovingButton({
  to,
  children,
  variant = "primary",
}: {
  to: string;
  children: ReactNode;
  variant?: "primary" | "outline";
}) {
  const base = "w-full justify-center transition-transform duration-200 active:scale-95 sm:w-auto";
  if (variant === "primary") {
    return (
      <Button
        asChild
        size="lg"
        className={`${base} shimmer-sweep animate-cta-pulse animate-glow-pulse hover:scale-[1.05] ${GOLD_PRIMARY} shadow-elevated`}
      >
        <Link to={to} className="flex items-center">
          {children}
          <ArrowRight className="ml-2 h-4 w-4 animate-bounce-x" />
        </Link>
      </Button>
    );
  }
  return (
    <Button asChild size="lg" variant="outline" className={`${base} hover:scale-[1.05] hover:text-[#c9aa54]`}>
      <Link to={to}>{children}</Link>
    </Button>
  );
}

function IconBadge({ icon: Icon }: { icon: ElementType }) {
  return (
    <div
      className={`relative grid h-11 w-11 place-items-center rounded-xl ${GOLD_PRIMARY} shadow-elevated transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6`}
    >
      <span className="absolute inset-0 animate-ping rounded-xl bg-[#c9aa54]/40" />
      <Icon className="relative h-5 w-5" />
    </div>
  );
}

/* ---------- Page ---------- */

function Landing() {
  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-background">
      <SiteHeader />
      <Hero />
      <MarqueeTicker />
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
      <div className="absolute inset-0 gradient-hero opacity-70 animate-gradient-shift" />
      <FloatingBlobs />
      <div className="relative mx-auto grid max-w-7xl gap-10 px-3 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-28">
        <div className="flex flex-col justify-center">
          <Reveal>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 animate-spin-slow text-primary" />
              Premium internet-banking
            </span>
          </Reveal>
          <Reveal delay={100}>
            <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl lg:text-6xl">
              Banking,{" "}
              <span className="text-gradient bg-[length:200%_auto] animate-gradient-shift">reimagined</span> for
              everyday life.
            </h1>
          </Reveal>
          <Reveal delay={200}>
            <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              Bangue Herutage Bank gives you everyday accounts, instant transfers, debit and virtual cards,
              foreign currency holdings and clear reporting — all designed around how you actually manage money.
            </p>
          </Reveal>
          <Reveal delay={300}>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <MovingButton to="/register">Open an account</MovingButton>
              <MovingButton to="/login" variant="outline">
                Sign in
              </MovingButton>
            </div>
          </Reveal>
          <Reveal delay={400}>
            <div className="mt-10 grid max-w-md grid-cols-1 gap-4 text-sm sm:grid-cols-3 sm:gap-6">
              {[
                { k: "0.00%", v: "Account fees" },
                { k: "24/7", v: "Access" },
                { k: "256-bit", v: "Encryption" },
              ].map((s, i) => (
                <Reveal key={s.v} delay={450 + i * 80}>
                  <div className="transition-transform duration-300 hover:-translate-y-1">
                    <div className="text-2xl font-semibold text-foreground">{s.k}</div>
                    <div className="text-muted-foreground">{s.v}</div>
                  </div>
                </Reveal>
              ))}
            </div>
          </Reveal>
        </div>
        <Reveal delay={150} className="relative">
          <div className="glass-card rounded-2xl p-2 transition-transform duration-500 ease-out hover:-translate-y-1 hover:shadow-elevated sm:rounded-3xl sm:p-3">
            <img
              src={heroImg}
              alt="Bangue Herutage Bank digital banking"
              width={1600}
              height={1000}
              className="h-auto w-full rounded-xl sm:rounded-2xl"
            />
          </div>
          <FloatingCard className="absolute -bottom-6 -left-6 hidden animate-float sm:block" />
        </Reveal>
      </div>
    </section>
  );
}

function FloatingCard({ className = "" }: { className?: string }) {
  return (
    <div className={`glass-card w-64 rounded-2xl p-5 transition-shadow duration-300 hover:shadow-elevated ${className}`}>
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">Available balance</div>
        <Wallet className="h-4 w-4 animate-pulse text-primary" />
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
    {
      icon: Wallet,
      title: "Everyday accounts",
      body: "Savings, current, joint, student, business and premium accounts — opened quickly and ready to use.",
    },
    {
      icon: Send,
      title: "Instant transfers",
      body: "Send money between Bangue Herutage Bank accounts instantly, with clear confirmation and history.",
    },
    {
      icon: CreditCard,
      title: "Cards when you need them",
      body: "Request debit or virtual cards. Freeze, unfreeze or replace a card in a few taps.",
    },
    {
      icon: BarChart3,
      title: "Spending insights",
      body: "Clear monthly summaries and spending breakdowns so you always know where your money goes.",
    },
    {
      icon: Globe2,
      title: "International banking",
      body: "Hold foreign currency accounts and use IBAN-style details for cross-border payments.",
    },
    {
      icon: Smartphone,
      title: "Bank anywhere",
      body: "Manage your accounts, cards and transfers from your phone, tablet or computer.",
    },
  ];
  return (
    <section id="services" className="mx-auto max-w-7xl px-3 py-16 sm:px-6 sm:py-24 lg:px-8">
      <Reveal>
        <SectionHeading
          eyebrow="Services"
          title="Everything you need from a modern bank"
          subtitle="Clear accounts, fast transfers, cards and reporting — built around everyday banking."
        />
      </Reveal>
      <div className="mt-10 grid gap-4 sm:mt-14 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        {items.map((it, i) => (
          <Reveal key={it.title} delay={i * 90}>
            <Card className="group relative h-full overflow-hidden border-border/60 p-5 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-elevated sm:p-6">
              <IconBadge icon={it.icon} />
              <h3 className="mt-5 text-lg font-semibold">{it.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{it.body}</p>
            </Card>
          </Reveal>
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
      <div className="mx-auto grid max-w-7xl gap-10 px-3 py-16 sm:gap-12 sm:px-6 sm:py-24 lg:grid-cols-2 lg:px-8">
        <div>
          <Reveal>
            <SectionHeading
              eyebrow="Your money, clearly"
              title="See balances, spending and activity at a glance."
              subtitle="Know exactly where you stand — available funds, recent transactions and card status — without hunting through menus."
              align="left"
            />
          </Reveal>
          <ul className="mt-8 space-y-4">
            {[
              "Balances and recent activity in one place",
              "Quick transfers to saved beneficiaries",
              "Card controls: freeze, unfreeze, virtual cards",
              "Alerts for payments and security events",
              "Clear verification and account status",
            ].map((s, i) => (
              <Reveal key={s} delay={i * 90} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                <span className="text-sm">{s}</span>
              </Reveal>
            ))}
          </ul>
        </div>
        <Reveal delay={150} className="relative min-w-0">
          <div className="glass-card rounded-2xl p-4 transition-shadow duration-300 hover:shadow-elevated sm:rounded-3xl sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">SIX Swiss Exchange</div>
                <div className="truncate text-base font-semibold sm:text-lg">Live Market Overview</div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-red-500 px-3 py-1 text-xs text-white">
                <span className="h-1.5 w-1.5 animate-ping rounded-full bg-white" />
                Live
              </div>
            </div>

            <div className="mt-6">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Currency exchange · CHF base
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3">
                {fxRates.map((f, i) => (
                  <Reveal key={f.pair} delay={200 + i * 70}>
                    <div className="rounded-xl bg-background/60 p-3 transition-transform duration-200 hover:-translate-y-0.5 hover:scale-[1.03]">
                      <div className="text-[10px] uppercase text-muted-foreground">{f.pair}</div>
                      <div className="mt-1 flex items-center justify-between gap-1">
                        <span className="text-sm font-semibold">{f.rate}</span>
                        <span className={`text-[10px] font-medium ${f.up ? "text-success" : "text-destructive"}`}>
                          {f.change}
                        </span>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Swiss equities
              </div>
              <div className="mt-3 space-y-2 sm:space-y-3">
                {stocks.map((s, i) => (
                  <Reveal key={s.ticker} delay={450 + i * 70}>
                    <div className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/50 p-3 text-sm transition-transform duration-200 hover:-translate-y-0.5 hover:scale-[1.02]">
                      <div className="min-w-0">
                        <span className="font-medium">{s.ticker}</span>
                        <span className="ml-2 hidden text-xs text-muted-foreground sm:inline">{s.name}</span>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-medium">{s.price}</div>
                        <div className={`text-[10px] ${s.up ? "text-success" : "text-destructive"}`}>{s.change}</div>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Security() {
  return (
    <section className="mx-auto max-w-7xl px-3 py-16 sm:px-6 sm:py-24 lg:px-8">
      <Reveal>
        <SectionHeading
          eyebrow="Security"
          title="Your money and data protected."
          subtitle="Strong verification, encrypted credentials and full records of important actions — so you can bank with confidence."
        />
      </Reveal>
      <div className="mt-10 grid gap-4 sm:mt-14 sm:gap-6 md:grid-cols-3">
        {[
          {
            icon: Shield,
            t: "OTP verification",
            b: "One-time codes for new devices, password changes and sensitive actions.",
          },
          {
            icon: Lock,
            t: "Protected credentials",
            b: "Passwords are never stored in plain text. Access is tightly controlled.",
          },
          {
            icon: BarChart3,
            t: "Full activity records",
            b: "Important account and administrative actions are logged for accountability.",
          },
        ].map((it, i) => (
          <Reveal key={it.t} delay={i * 100}>
            <Card className="group h-full p-5 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-elevated sm:p-6">
              <IconBadge icon={it.icon} />
              <h3 className="mt-5 font-semibold">{it.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{it.b}</p>
            </Card>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Testimonials() {
  const t = [
    {
      q: "Opening the account was straightforward and transfers land immediately. Exactly what I needed.",
      a: "Priya S.",
    },
    {
      q: "Cards, balances and payments are all easy to manage. It feels reliable every day.",
      a: "Marcus L.",
    },
    {
      q: "Clear statements and quick support when I needed it. Banking without the friction.",
      a: "Dana O.",
    },
  ];
  return (
    <section className="border-y border-border/60 bg-muted/30">
      <div className="mx-auto max-w-7xl px-3 py-16 sm:px-6 sm:py-24 lg:px-8">
        <Reveal>
          <SectionHeading eyebrow="Customers" title="Trusted for everyday banking." />
        </Reveal>
        <div className="mt-10 grid gap-4 sm:mt-14 sm:gap-6 md:grid-cols-3">
          {t.map((x, i) => (
            <Reveal key={x.a} delay={i * 110}>
              <Card className="relative h-full overflow-hidden p-5 transition-transform duration-300 hover:-translate-y-1.5 hover:shadow-elevated sm:p-6">
                <Quote className="absolute -right-2 -top-2 h-14 w-14 animate-spin-slow text-[#c9aa54]/10" />
                <p className="relative text-sm leading-relaxed">&ldquo;{x.q}&rdquo;</p>
                <p className="relative mt-5 text-xs font-medium text-muted-foreground">— {x.a}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const items = [
    {
      q: "How quickly can I open an account?",
      a: "Most accounts can be opened in minutes. Complete the application and verify your identity to start using your account.",
    },
    {
      q: "How do I manage cards and transfers?",
      a: "Once signed in you can request cards, freeze or replace them, add beneficiaries and send money directly from your accounts.",
    },
    {
      q: "How is my information protected?",
      a: "We use encryption, one-time verification codes and controlled access so your credentials and transactions stay protected.",
    },
  ];
  return (
    <section className="mx-auto max-w-4xl px-3 py-16 sm:px-6 sm:py-24 lg:px-8">
      <Reveal>
        <SectionHeading eyebrow="FAQ" title="Common questions." />
      </Reveal>
      <Reveal delay={100}>
        <Accordion type="single" collapsible className="mt-10">
          {items.map((it, i) => (
            <AccordionItem key={i} value={`i${i}`}>
              <AccordionTrigger className="text-left">{it.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{it.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Reveal>
    </section>
  );
}

function About() {
  return (
    <section id="about" className="border-t border-border/60 bg-muted/30">
      <div className="mx-auto max-w-7xl px-3 py-16 sm:px-6 sm:py-24 lg:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="About"
            title="Banking built around how people use money."
            subtitle="Bangue Herutage Bank focuses on clear accounts, reliable transfers, practical card controls and straightforward reporting — so managing your money stays simple."
          />
        </Reveal>
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section id="contact" className="mx-auto max-w-7xl px-3 py-16 sm:px-6 sm:py-24 lg:px-8">
      <Reveal className="relative overflow-hidden rounded-2xl px-4 py-12 text-center sm:rounded-3xl sm:px-8 sm:py-16">
        <div className="glass-card absolute inset-0 -z-10 transition-shadow duration-300" />
        <AmbientBlobs />
        <h2 className="text-2xl font-bold sm:text-3xl md:text-4xl">Ready to open an account?</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
          Open an account in minutes and start managing transfers, cards and balances right away.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
          <MovingButton to="/register">Get started</MovingButton>
          <MovingButton to="/login" variant="outline">
            I have an account
          </MovingButton>
        </div>
      </Reveal>
    </section>
  );
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <div className="text-xs font-semibold uppercase tracking-wider text-primary">{eyebrow}</div>
      <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">{title}</h2>
      {subtitle && <p className="mt-4 text-sm text-muted-foreground sm:text-base">{subtitle}</p>}
    </div>
  );
}