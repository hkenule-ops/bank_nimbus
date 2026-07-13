import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/mock-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/profile")({
  head: () => ({ meta: [{ title: "Profile — Nimbus Bank" }] }),
  component: Profile,
});

function Profile() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <div className="space-y-6 pb-24 md:pb-8">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Update your personal information and security preferences.</p>
      </div>
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-full gradient-primary text-lg font-semibold text-primary-foreground">
            {user.firstName[0]}{user.lastName[0]}
          </div>
          <div>
            <div className="font-semibold">{user.firstName} {user.lastName}</div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
          </div>
        </div>
      </Card>
      <Card className="p-6">
        <h3 className="font-semibold">Personal details</h3>
        <form onSubmit={(e) => { e.preventDefault(); toast.success("Profile updated"); }} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div><Label>Phone</Label><Input defaultValue={user.phone} className="mt-1.5" /></div>
          <div><Label>Email</Label><Input defaultValue={user.email} className="mt-1.5" /></div>
          <div className="sm:col-span-2"><Label>Address</Label><Input placeholder="123 Market St, San Francisco, CA" className="mt-1.5" /></div>
          <div className="sm:col-span-2"><Button type="submit" className="gradient-primary text-primary-foreground">Save changes</Button></div>
        </form>
      </Card>
      <Card className="p-6">
        <h3 className="font-semibold">Security</h3>
        <div className="mt-4 space-y-2 text-sm">
          <Row k="Two-factor auth" v="Disabled" />
          <Row k="Security question" v="Set" />
          <Row k="Active sessions" v="1 device" />
        </div>
      </Card>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex items-center justify-between border-b border-border/60 py-2 last:border-0"><span className="text-muted-foreground">{k}</span><span className="font-medium">{v}</span></div>;
}
