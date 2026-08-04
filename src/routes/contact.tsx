import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, MapPin, ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Bangue Herutage Bank" },
      { name: "description", content: "Get in touch with the Bangue Herutage Bank team." },
    ],
  }),
  component: Contact,
});

const GOLD_PRIMARY = "bg-[#c9aa54] text-primary-foreground hover:bg-[#c9a52f]";

function Contact() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Message received. We'll get back to you shortly.", {
      description: "Thank you for reaching out.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1a252f] to-black py-24 text-white">
        <div className="absolute inset-0 bg-[url('https://picsum.photos/id/1015/2000/1200')] opacity-20 bg-cover bg-center" />
        
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-sm backdrop-blur">
              <Sparkles className="h-4 w-4" /> Client Services
            </div>
            <h1 className="mt-6 text-5xl font-bold tracking-tight sm:text-6xl">
              Contact our support team
            </h1>
            <p className="mt-4 text-xl text-white/70">
              For account inquiries, payment questions, or service support, our team is ready to assist you.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-5 gap-12 lg:gap-16">
          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-2 space-y-10"
          >
            <div>
              <h2 className="text-3xl font-bold">Get in touch</h2>
              <p className="mt-3 text-muted-foreground">
                Our team typically responds within 24 hours during business days.
              </p>
            </div>

            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="mt-1 h-10 w-10 rounded-2xl bg-[#c9aa54]/10 flex items-center justify-center text-[#c9aa54]">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">Email</p>
                  <a href="mailto:support@bangueherutage.bank" className="text-muted-foreground hover:text-[#c9aa54] transition-colors">
                    support@bangueherutage.bank
                  </a>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="mt-1 h-10 w-10 rounded-2xl bg-[#c9aa54]/10 flex items-center justify-center text-[#c9aa54]">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">Phone</p>
                  <a href="tel:+15550001234" className="text-muted-foreground hover:text-[#c9aa54] transition-colors">
                    +1 (555) 000-1234
                  </a>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="mt-1 h-10 w-10 rounded-2xl bg-[#c9aa54]/10 flex items-center justify-center text-[#c9aa54]">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">Visit Us</p>
                  <p className="text-muted-foreground">
                    500 Market Street, Suite 400<br />
                    San Francisco, CA 94105
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-3"
          >
            <div className="rounded-3xl border bg-card p-8 shadow-sm">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" className="mt-1.5" placeholder="John Doe" required />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" className="mt-1.5" placeholder="you@email.com" required />
                  </div>
                </div>

                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" className="mt-1.5" placeholder="How can we help you?" />
                </div>

                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    rows={7}
                    className="mt-1.5 resize-y"
                    placeholder="Tell us more about your inquiry..."
                    required
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className={`w-full text-base ${GOLD_PRIMARY} shadow-elevated flex items-center justify-center gap-2`}
                >
                  Send Message
                  <ArrowRight className="h-4 w-4" />
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  Your message is used only to respond to your inquiry and support your banking needs.
                </p>
              </form>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Optional Map / Visual Element */}
      <div className="h-96 bg-neutral-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://picsum.photos/id/1015/2000/1200')] bg-cover bg-center opacity-40" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            <MapPin className="mx-auto h-12 w-12 text-[#c9aa54] mb-4" />
            <p className="text-lg font-medium">Zermatt, Switzerland</p>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}