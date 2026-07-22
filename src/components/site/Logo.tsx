import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-md px-1 py-1.5 sm:gap-2.5 sm:px-2 sm:py-1.5 shrink-0",
        className
      )}
    >
      {/* Shield emblem */}
      <svg
        viewBox="0 0 100 120"
        className="h-8 w-auto shrink-0 sm:h-10"
        aria-hidden="true"
      >
        <path
          d="M50 4 L92 18 V56 C92 86 74 106 50 116 C26 106 8 86 8 56 V18 Z"
          fill="none"
          stroke="#B8901F"
          strokeWidth="3.5"
        />
        <text
          x="50"
          y="80"
          textAnchor="middle"
          fontFamily="'Times New Roman', Georgia, serif"
          fontWeight="700"
          fontSize="63"
          fill="#B8901F"
        >
          H
        </text>
      </svg>

      {/* Divider */}
      <div className="hidden h-6 w-px bg-[#0B1E3E]/25 sm:block" />

      {/* Wordmark */}
      <div className="flex min-w-0 flex-col leading-none">
        <span
          className="text-[14px] font-normal tracking-[0.16em] text-[#0B1E3E] sm:text-[20px] sm:tracking-[0.22em]"
          style={{ fontFamily: "'Times New Roman', Georgia, serif" }}
        >
          BANGUE
        </span>
        <span
          className="mt-0.5 text-[10px] font-normal tracking-[0.12em] text-[#B8901F] sm:text-[15px] sm:tracking-[0.18em]"
          style={{ fontFamily: "'Times New Roman', Georgia, serif" }}
        >
          HERUTAGE BANK
        </span>
        <span className="mt-1 hidden text-[9px] font-sans font-medium tracking-[0.12em] text-[#0B1E3E]/60 whitespace-nowrap sm:block">
          PRIVATE BANKING&nbsp;&nbsp;+&nbsp;&nbsp;TIMELESS TRUST
        </span>
      </div>
    </Link>
  );
}