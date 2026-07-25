import { createFileRoute, Outlet } from "@tanstack/react-router";
import { CustomerShell } from "@/components/layouts/CustomerShell";
import { CurrencyProvider } from "@/lib/currency";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Bangue Herutage Bank" }] }),
  component: () => (
    <CurrencyProvider>
      <CustomerShell><Outlet /></CustomerShell>
    </CurrencyProvider>
  ),
});