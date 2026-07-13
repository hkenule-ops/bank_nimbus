import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, MapPin } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [{ title: "Contact — Nimbus Bank" }, { name: "description", content: "Get in touch with the Nimbus Bank team." }] }),
  component: Contact,
});

function Contact() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div>
          <h1 className="text-4xl font-bold sm:text-5xl">Contact us</h1>
          <p className="mt-3 text-lg text-muted-foreground">We'd love to hear from you. Fill in the form or reach us directly.</p>
          <ul className="mt-8 space-y-4 text-sm">
            <li className="flex items-center gap-3"><Mail className="h-4 w-4 text-primary" /> support@nimbus.bank</li>
            <li className="flex items-center gap-3"><Phone className="h-4 w-4 text-primary" /> +1 (555) 000-1234</li>
            <li className="flex items-center gap-3"><MapPin className="h-4 w-4 text-primary" /> 500 Market Street, San Francisco, CA</li>
          </ul>
        </div>
        <Card className="p-6">
          <form onSubmit={(e) => { e.preventDefault(); toast.success("Message sent — we'll get back to you soon"); }} className="space-y-4">
            <div><Label>Full name</Label><Input className="mt-1.5" /></div>
            <div><Label>Email</Label><Input type="email" className="mt-1.5" /></div>
            <div><Label>Message</Label><Textarea rows={5} className="mt-1.5" /></div>
            <Button type="submit" className="w-full gradient-primary text-primary-foreground">Send message</Button>
          </form>
        </Card>
      </div>
      <SiteFooter />
    </div>
  );
}
