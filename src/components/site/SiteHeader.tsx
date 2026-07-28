import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const nav = [
  { to: "/", label: "Home" },
  { to: "/services", label: "Services" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center px-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex flex-1 justify-start">
          <Logo className="max-w-[180px] sm:max-w-[240px]" />
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden items-center justify-center gap-8 md:flex">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden flex-1 items-center justify-end gap-2 md:flex">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hover:text-[#c9aa54]"
          >
            <Link to="/login">Sign in</Link>
          </Button>

          <Button
            asChild
            size="sm"
            className="bg-[#c9aa54] text-primary-foreground shadow-elevated hover:opacity-95"
          >
            <Link to="/register">Open account</Link>
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="ml-auto grid h-10 w-10 place-items-center rounded-lg touch-manipulation md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="border-t border-border/60 bg-background/95 backdrop-blur md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-3 py-3 sm:px-6">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="min-h-11 rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted active:bg-muted touch-manipulation"
              >
                {n.label}
              </Link>
            ))}

            <div className="mt-3 flex gap-2">
              <Button asChild variant="outline" className="h-11 flex-1">
                <Link to="/login">Sign in</Link>
              </Button>

              <Button
                asChild
                className="h-11 flex-1 bg-[#c9aa54] text-primary-foreground hover:opacity-95"
              >
                <Link to="/register">Open account</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}