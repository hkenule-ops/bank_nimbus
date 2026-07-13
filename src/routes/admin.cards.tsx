import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "./admin.transactions";
export const Route = createFileRoute("/admin/cards")({ component: () => <Placeholder title="Cards" desc="Approve, reject and manage every card request." /> });
