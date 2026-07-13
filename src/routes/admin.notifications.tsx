import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "./admin.transactions";
export const Route = createFileRoute("/admin/notifications")({ component: () => <Placeholder title="Notifications" desc="Broadcast announcements to every customer dashboard." /> });
