import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdminShell } from "@/components/layouts/AdminShell";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Bangue Herutage Bank" }, { name: "robots", content: "noindex" }] }),
  component: () => <AdminShell><Outlet /></AdminShell>,
});
