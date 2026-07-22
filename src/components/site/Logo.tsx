import { Link } from "@tanstack/react-router";
import { Landmark } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span className="grid h-8 w-8 place-items-center rounded-lg gradient-primary text-primary-foreground shadow-elevated">
        <Landmark className="h-4 w-4" />
      </span>
      <span className="text-lg">Bangue Herutage</span>
      <span className="text-xs font-medium text-muted-foreground -ml-1 mt-1">Bank</span>
    </Link>
  );
}
