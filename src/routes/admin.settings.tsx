import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "./admin.transactions";
export const Route = createFileRoute("/admin/settings")({ component: () => <Placeholder title="Settings" desc="Bank name, logo, currency, theme, and system messages." /> });
