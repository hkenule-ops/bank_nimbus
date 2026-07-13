import { createFileRoute, Outlet } from "@tanstack/react-router";
import { CustomerShell } from "@/components/layouts/CustomerShell";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Nimbus Bank" }] }),
  component: () => <CustomerShell><Outlet /></CustomerShell>,
});
