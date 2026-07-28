import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/site/Logo";
import { useAuth } from "@/lib/mock-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Bangue Herutage Bank" },
      { name: "description", content: "Sign in to your Bangue Herutage digital banking account." },
    ],
  }),
  component: LoginPage,
});

/** Ambient drifting background blobs, matching the hero treatment */
function AmbientBlobs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute -left-20 top-0 h-72 w-72 animate-float-slow rounded-full bg-[#c9aa54]/25 blur-3xl" />
      <div className="absolute -right-16 top-1/3 h-80 w-80 animate-float-slower rounded-full bg-primary/25 blur-3xl" />
      <div className="absolute bottom-0 left-1/4 h-64 w-64 animate-float-slow rounded-full bg-[#c9aa54]/15 blur-3xl" style={{ animationDelay: "2s" }} />
    </div>
  );
}

function LoginPage() {
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    // trigger entrance animation on mount
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const ok = await login(id, pw);
      if (ok) {
        toast.success("Welcome back");
        nav({ to: "/dashboard" });
      } else {
        toast.error("Please enter your credentials");
        setShake(true);
        setTimeout(() => setShake(false), 400);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    /* Strict h-screen with overflow-hidden disables page scrolling entirely */
    <div className="relative min-h-[100dvh] w-full overflow-y-auto overflow-x-hidden gradient-hero flex flex-col justify-center items-center px-3 py-6 sm:px-4">
      <div className="absolute inset-0 animate-gradient-shift opacity-60" />
      <AmbientBlobs />

      {/* Container with tight vertical gaps to ensure 100% fit */}
      <div className="relative z-10 flex w-full max-w-md flex-col justify-center py-2 safe-bottom">
        <Link
          to="/"
          className={`mb-3 inline-flex w-fit items-center gap-1.5 text-xs sm:text-sm text-muted-foreground transition-all duration-500 hover:text-foreground hover:-translate-x-0.5 ${
            mounted ? "opacity-100" : "opacity-0 -translate-x-2"
          }`}
        >
          <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          Back to home
        </Link>

        {/* Scaled down logo slightly on short viewports */}
        <div
          className={`mb-4 flex justify-center transition-all duration-700 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3"
          }`}
        >
          <Logo className="animate-float scale-90 sm:scale-100" />
        </div>

        {/* Card padding reduced to p-5 sm:p-6 for vertical compacting */}
        <Card
          className={`glass-card relative overflow-hidden p-5 sm:p-6 transition-all duration-700 ease-out ${
            mounted ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-6 scale-[0.97]"
          } ${shake ? "animate-shake" : ""}`}
          style={{ transitionDelay: "120ms" }}
        >
          <h1 className="text-xl sm:text-2xl font-semibold">Sign in</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">Access your Bangue Herutage account.</p>

          <form onSubmit={submit} className="mt-4 space-y-3 sm:space-y-4">
            <div
              className={`transition-all duration-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}
              style={{ transitionDelay: "220ms" }}
            >
              <Label htmlFor="id" className="text-xs sm:text-sm">Email or username</Label>
              <Input
                id="id"
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder="alex@demo.bangueherutage"
                className="mt-1 h-11 text-sm transition-shadow duration-300 focus:shadow-[0_0_0_4px_rgba(201,170,84,0.15)]"
              />
            </div>
            <div
              className={`transition-all duration-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}
              style={{ transitionDelay: "300ms" }}
            >
              <Label htmlFor="pw" className="text-xs sm:text-sm">Password</Label>
              <Input
                id="pw"
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="••••••••"
                className="mt-1 h-11 text-sm transition-shadow duration-300 focus:shadow-[0_0_0_4px_rgba(201,170,84,0.15)]"
              />
            </div>

            <div
              className={`transition-all duration-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}
              style={{ transitionDelay: "380ms" }}
            >
              <Button
                type="submit"
                disabled={loading}
                className={`shimmer-sweep w-full h-11 gradient-primary text-primary-foreground transition-transform duration-200 active:scale-95 ${
                  !loading ? "animate-cta-pulse animate-glow-pulse hover:scale-[1.02]" : ""
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in…
                  </span>
                ) : (
                  "Sign in"
                )}
              </Button>
            </div>
          </form>

          <div
            className={`mt-4 flex items-center justify-between text-xs sm:text-sm transition-all duration-500 ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
            }`}
            style={{ transitionDelay: "460ms" }}
          >
            <Link to="/register" className="text-primary transition-colors hover:underline">Create account</Link>
            <span className="text-muted-foreground cursor-pointer hover:underline">Forgot password?</span>
          </div>

          <ShieldCheck className="pointer-events-none absolute -right-3 -top-3 h-14 w-14 sm:h-16 sm:w-16 animate-spin-slow text-[#c9aa54]/10" />
        </Card>

        <p
          className={`mt-3 sm:mt-4 text-center text-[11px] sm:text-xs text-muted-foreground transition-opacity duration-700 ${
            mounted ? "opacity-100" : "opacity-0"
          }`}
          style={{ transitionDelay: "540ms" }}
        >
          Demo — any credentials sign you in.
        </p>
      </div>
    </div>
  );
}