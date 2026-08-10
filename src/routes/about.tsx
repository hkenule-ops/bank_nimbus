import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ArrowRight, Sparkles, Award, Target } from "lucide-react";
import { motion } from "framer-motion";

import aboutHero from "@/assets/about_hero.jpg";
import aboutStory from "@/assets/about_story.jpg";
import aboutVision from "@/assets/about_vision.jpg";
import aboutValueCard1 from "@/assets/about_valuecard_1.jpg";
import aboutValueCard2 from "@/assets/about_value_card_2.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Bangue Herutage Bank" },
      { name: "description", content: "Learn about Bangue Herutage Bank and our modern digital banking platform." },
    ],
  }),
  component: About,
});

const GOLD_PRIMARY = "bg-[#c9aa54] text-primary-foreground hover:bg-[#c9a52f]";

const fadeInUp = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease: "easeOut" },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

function FullWidthImage({ src, alt, caption }: { src: string; alt: string; caption?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.9 }}
      className="relative h-[560px] w-full overflow-hidden rounded-3xl"
    >
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {caption && (
        <div className="absolute bottom-8 left-8 right-8 bg-black/60 backdrop-blur-sm px-6 py-4 text-white rounded-2xl">
          <p className="text-sm">{caption}</p>
        </div>
      )}
    </motion.div>
  );
}

function About() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Full-bleed Hero */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${aboutHero})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/70 to-black" />

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="relative z-10 text-center px-6 max-w-5xl"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-5 py-2 text-sm backdrop-blur mb-6"
          >
            <Sparkles className="h-4 w-4" /> Established 2025
          </motion.div>
          <h1 className="text-6xl md:text-7xl font-bold tracking-tighter text-white">
            Trusted digital banking for everyday life and business.
          </h1>
          <p className="mt-6 text-xl text-white/80 max-w-2xl mx-auto">
            Bangue Herutage Bank delivers secure online banking with fast account setup, reliable payment services, and intelligent financial tools.
          </p>
        </motion.div>
      </section>

      {/* Introduction */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-5xl mx-auto px-6 py-20"
      >
        <div className="prose prose-lg dark:prose-invert max-w-none">
          <p className="text-xl leading-relaxed text-muted-foreground">
            Bangue Herutage Bank provides retail and business customers with modern digital banking solutions that prioritize clarity, security, and everyday convenience.
          </p>
        </div>
      </motion.div>

      {/* Image Gallery Strip */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border"
      >
        {[aboutHero, aboutStory, aboutVision, aboutValueCard1].map((src, i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.03 }}
            transition={{ duration: 0.4 }}
            className="aspect-video overflow-hidden"
          >
            <img src={src} alt="" className="h-full w-full object-cover" />
          </motion.div>
        ))}
      </motion.div>

      <div className="max-w-5xl mx-auto px-6 py-20 space-y-24">
        {/* Story Section */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          className="grid lg:grid-cols-2 gap-16 items-center"
        >
          <motion.div variants={fadeInUp}>
            <h2 className="text-4xl font-bold tracking-tight">Our Story</h2>
            <div className="mt-8 space-y-6 text-lg text-muted-foreground">
              <p>
                Bangue Herutage was founded to bring a more reliable and accessible banking experience to customers who expect everyday banking to work without friction.
              </p>
              <p>
                Our team combines rigorous operational standards with modern digital tools to deliver account services, payments, and financial insights people can trust.
              </p>
            </div>
          </motion.div>
          <FullWidthImage
            src={aboutStory}
            alt="Team working on banking interface"
            caption="Crafted with care by people who love beautiful software."
          />
        </motion.div>

        {/* Vision Section */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          className="grid lg:grid-cols-2 gap-16 items-center"
        >
          <FullWidthImage
            src={aboutVision}
            alt="Modern banking dashboard"
            caption="Customer dashboard — clean hierarchy and purposeful design."
          />
          <motion.div variants={fadeInUp}>
            <div className="inline-flex items-center gap-2 text-[#c9aa54]">
              <Target className="h-6 w-6" />
              <span className="font-semibold uppercase tracking-widest">Our Vision</span>
            </div>
            <h2 className="mt-4 text-4xl font-bold tracking-tight">Banking software people enjoy using</h2>
            <p className="mt-8 text-lg text-muted-foreground">
              We believe banking should be straightforward, transparent, and dependable. Our focus is on delivering services that help customers manage money with confidence.
            </p>
          </motion.div>
        </motion.div>

        {/* Values / Highlights */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-center text-4xl font-bold tracking-tight mb-12">What Sets Us Apart</h2>
          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-8"
          >
            {[
              {
                img: aboutValueCard1,
                title: "Premium Service",
                desc: "Thoughtful account features and responsive support built for personal and business customers.",
              },
              {
                img: aboutValueCard2,
                title: "Everyday Banking",
                desc: "Secure balances, transfers, cards, and market insights with reliable operational behavior.",
              },
              {
                img: aboutVision,
                title: "Modern Infrastructure",
                desc: "A clean digital platform designed to scale with customer needs and regulatory expectations.",
              },
            ].map((item, i) => (
              <motion.div key={i} variants={fadeInUp} className="group">
                <div className="overflow-hidden rounded-3xl">
                  <img
                    src={item.img}
                    alt={item.title}
                    className="w-full aspect-[4/3] object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <h3 className="mt-6 text-2xl font-semibold">{item.title}</h3>
                <p className="mt-3 text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Final Full-Width Statement */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="bg-gradient-to-br from-[#1a252f] to-black py-28 text-white"
      >
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ scale: 0.8, rotate: -10 }}
            whileInView={{ scale: 1, rotate: 0 }}
            viewport={{ once: true }}
          >
            <Award className="mx-auto h-16 w-16 text-[#c9aa54]" />
          </motion.div>
          <h2 className="mt-8 text-5xl font-bold tracking-tight">
            Built to deliver dependable digital banking.
          </h2>
          <p className="mt-6 text-xl text-white/70">
            Bangue Herutage Bank offers practical account services, payment tools, and secure online access for individuals and businesses.
          </p>
          <motion.a
            href="/register"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            className={`mt-10 inline-flex items-center gap-3 rounded-full px-10 py-4 text-lg font-semibold transition-all ${GOLD_PRIMARY}`}
          >
            Start Exploring <ArrowRight className="h-5 w-5" />
          </motion.a>
        </div>
      </motion.div>

      <SiteFooter />
    </div>
  );
}