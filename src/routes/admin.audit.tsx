import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "./admin.transactions";
export const Route = createFileRoute("/admin/audit")({ component: () => <Placeholder title="Audit logs" desc="Every admin action is traceable here for accountability." /> });
