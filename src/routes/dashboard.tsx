import { createFileRoute, Outlet } from "@tanstack/react-router";
import { CustomerShell } from "@/components/layouts/CustomerShell";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Bangue Herutage Bank" }] }),
  component: () => <CustomerShell><Outlet /></CustomerShell>,
});
