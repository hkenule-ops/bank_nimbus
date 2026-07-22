import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [{ title: "About — Bangue Herutage Bank" }, { name: "description", content: "Learn about the Bangue Herutage Bank digital banking simulation platform." }] }),
  component: About,
});

function About() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold sm:text-5xl">About Bangue Herutage</h1>
        <div className="prose prose-neutral dark:prose-invert mt-8 space-y-6 text-muted-foreground">
          <p>Bangue Herutage Bank is a digital banking management and simulation platform. It's built to demonstrate the shape of a modern retail bank — from onboarding and dashboards to cards, transfers and admin operations — without connecting to any real financial infrastructure.</p>
          <p>Nothing in this platform issues real cards, moves real money, or interacts with card networks. All balances, transfers, and cards are simulated records stored inside the application's own database, designed to help teams learn, prototype and evaluate.</p>
          <p>Our craft principle is simple: banking software people <em>enjoy</em> using. Clean information hierarchy, purposeful motion, and the metrics that matter — front and center.</p>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
