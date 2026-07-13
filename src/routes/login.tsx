import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/site/Logo";
import { useAuth } from "@/lib/mock-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Nimbus Bank" }, { name: "description", content: "Sign in to your Nimbus digital banking account." }] }),
  component: LoginPage,
});

function LoginPage() {
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const { login } = useAuth();
  const nav = useNavigate();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(id, pw)) {
      toast.success("Welcome back");
      nav({ to: "/dashboard" });
    } else {
      toast.error("Please enter your credentials");
    }
  };

  return (
    <div className="min-h-screen gradient-hero">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-16">
        <Logo className="mb-8 justify-center" />
        <Card className="glass-card p-8">
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">Access your Nimbus account.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="id">Email or username</Label>
              <Input id="id" value={id} onChange={(e) => setId(e.target.value)} placeholder="alex@demo.nimbus" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="pw">Password</Label>
              <Input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" className="mt-1.5" />
            </div>
            <Button type="submit" className="w-full gradient-primary text-primary-foreground">Sign in</Button>
          </form>
          <div className="mt-6 flex items-center justify-between text-sm">
            <Link to="/register" className="text-primary hover:underline">Create account</Link>
            <span className="text-muted-foreground">Forgot password?</span>
          </div>
        </Card>
        <p className="mt-6 text-center text-xs text-muted-foreground">Demo — any credentials sign you in.</p>
      </div>
    </div>
  );
}
