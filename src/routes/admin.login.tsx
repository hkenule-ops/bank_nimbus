import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/site/Logo";
import { useAuth } from "@/lib/mock-auth";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta: [{ title: "Admin Login — Bangue Herutage Bank" }, { name: "robots", content: "noindex" }] }),
  component: AdminLogin,
});

function AdminLogin() {
  const { loginAdmin } = useAuth();
  const nav = useNavigate();
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-screen gradient-hero">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-16">
        <Logo className="mb-8 justify-center" />
        <Card className="glass-card p-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <ShieldAlert className="h-3.5 w-3.5" /> Restricted access
          </div>
          <h1 className="text-2xl font-semibold">Admin console</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in with your administrator credentials.</p>
          <form onSubmit={async (e) => { e.preventDefault(); setLoading(true); try { const ok = await loginAdmin(u, p); if (ok) { toast.success("Admin session started"); nav({ to: "/admin" }); } else toast.error("Invalid credentials"); } finally { setLoading(false); } }} className="mt-6 space-y-4">
            <div><Label>Username</Label><Input value={u} onChange={(e) => setU(e.target.value)} className="mt-1.5" /></div>
            <div><Label>Password</Label><Input type="password" value={p} onChange={(e) => setP(e.target.value)} className="mt-1.5" /></div>
            <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</Button>
          </form>
          <p className="mt-6 text-center text-xs text-muted-foreground">Demo credentials: admin / admin</p>
        </Card>
      </div>
    </div>
  );
}
