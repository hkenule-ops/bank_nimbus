import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Legacy /admin/login — permanently redirects to the unified /login page.
 * Customer and admin credentials are both handled there.
 */
export const Route = createFileRoute("/admin_/login")({
  beforeLoad: () => {
    throw redirect({ to: "/login" });
  },
  head: () => ({
    meta: [
      { title: "Sign in — Bangue Herutage Bank" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => null,
});
