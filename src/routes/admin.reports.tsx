import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "./admin.transactions";
export const Route = createFileRoute("/admin/reports")({ component: () => <Placeholder title="Reports" desc="Generate customer, transaction, deposit, monthly and revenue reports." /> });
