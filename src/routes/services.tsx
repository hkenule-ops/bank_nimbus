import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Services — Bangue Herutage Bank" },
      { name: "description", content: "Explore Bangue Herutage banking services: accounts, transfers, cards and more." },
    ],
  }),
  component: Services,
});

// Gold primary theme (matching homepage)
const GOLD_PRIMARY = "bg-[#c9aa54] text-primary-foreground hover:bg-[#c9a52f]";

function AccentHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-3 text-3xl font-bold tracking-tight sm:text-4xl">
      <span className="h-7 w-1.5 shrink-0 rounded-sm bg-[#c9aa54]" aria-hidden="true" />
      {children}
    </h2>
  );
}

function PillButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      className={`mt-6 inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-semibold uppercase tracking-wide transition-all ${GOLD_PRIMARY} shadow-elevated hover:shadow-xl active:scale-[0.985]`}
    >
      {children}
      <ArrowRight className="h-4 w-4" />
    </button>
  );
}

/** Image Panel - Clean & Premium */
function ImagePanel({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative overflow-hidden rounded-3xl shadow-2xl">
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
    </div>
  );
}

/** Alternating Section */
function AltSection({
  eyebrow,
  title,
  description,
  cta,
  imageSrc,
  imageAlt,
  reverse,
}: {
  eyebrow: string;
  title: string;
  description: string;
  cta: string;
  imageSrc: string;
  imageAlt: string;
  reverse?: boolean;
}) {
  return (
    <section className="py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className={reverse ? "lg:order-2" : ""}>
          <ImagePanel src={imageSrc} alt={imageAlt} />
        </div>
        <div className={reverse ? "lg:order-1" : ""}>
          <div className="text-xs font-semibold uppercase tracking-wider text-[#c9aa54]">
            {eyebrow}
          </div>
          <div className="mt-3">
            <AccentHeading>{title}</AccentHeading>
          </div>
          <p className="mt-5 max-w-md text-lg text-muted-foreground">{description}</p>

          <ul className="mt-8 space-y-4">
            {[
              { title: "Instant activation", desc: "Accounts ready in seconds" },
              { title: "Full transparency", desc: "Real-time balances & history" },
              { title: "Premium experience", desc: "Designed for clarity and delight" },
            ].map((item) => (
              <li key={item.title} className="flex items-start gap-3">
                <div className="mt-1.5 h-2 w-2 rounded-full bg-[#c9aa54] flex-shrink-0" />
                <div>
                  <span className="font-medium">{item.title}</span>
                  <span className="text-muted-foreground"> — {item.desc}</span>
                </div>
              </li>
            ))}
          </ul>

          <PillButton>{cta}</PillButton>
        </div>
      </div>
    </section>
  );
}

function Services() {
  // Placeholder images - replace with your own
  const PLACEHOLDERS = {
    hero: "https://picsum.photos/id/1015/1200/800",
    accounts: "https://picsum.photos/id/201/800/600",
    payments: "https://picsum.photos/id/106/800/600",
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1a252f] via-[#0f1a24] to-[#1a252f] py-24 text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
              Digital Banking Services
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Comprehensive accounts and payments<br />within one secure platform.
            </h1>
            <p className="mt-6 max-w-md text-lg text-white/80">
              Explore the full range of retail banking services, built for reliability, transparency, and modern account management.
            </p>
            <PillButton>Explore accounts</PillButton>
          </div>

          <div>
            <ImagePanel src={PLACEHOLDERS.hero} alt="Bangue Herutage banking platform" />
          </div>
        </div>
      </section>

      {/* Accounts Section */}
      <AltSection
        eyebrow="Accounts"
        title="Built for however you bank"
        description="Savings, checking, business, joint, student, and premium accounts — each crafted with purpose and ready in moments."
        cta="Compare all accounts"
        imageSrc={PLACEHOLDERS.accounts}
        imageAlt="Banking account options"
      />

      {/* Payments Section */}
      <AltSection
        eyebrow="Payments & Transfers"
        title="Move money effortlessly"
        description="Instant transfers, multi-currency support, card management, and clear financial reporting — all in one beautiful interface."
        cta="Discover payment tools"
        imageSrc={PLACEHOLDERS.payments}
        imageAlt="Seamless payments"
        reverse
      />

      {/* Trust Bar */}
      <section className="bg-muted/50 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 rounded-3xl border border-border bg-card p-10 md:grid-cols-2">
            <div className="flex items-center gap-6">
              <div className="rounded-2xl bg-[#c9aa54] p-4 text-primary-foreground">
                <span className="text-4xl">🏆</span>
              </div>
              <div>
                <div className="text-3xl font-bold">12 Products</div>
                <div className="text-sm text-muted-foreground">Complete retail banking suite</div>
              </div>
            </div>

            <div>
              <p className="text-lg font-medium">
                Everything runs on a single ledger — your balances, transactions, and reports stay perfectly in sync across all services.
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <span className="text-[#c9aa54]">●</span>
                Secure environment for managing accounts, payments, and card services
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-r from-[#1a252f] to-[#0f1a24] py-24 text-white">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold sm:text-5xl">Ready to open an account?</h2>
          <p className="mt-4 text-lg text-white/80">
            Open an account and start managing your finances with secure digital banking tools.
          </p>
          <PillButton>Open an account</PillButton>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}