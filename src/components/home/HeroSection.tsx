"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  FileSpreadsheet,
  Mail,
  FileText,
  FolderPlus,
  Sparkles,
  Quote,
  ExternalLink,
} from "lucide-react";

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.15 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
  },
};

const slideIn = {
  hidden: { opacity: 0, x: 80, scale: 0.95 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] as const, delay: 0.3 },
  },
};

// Simulated citations for the product preview
const citations = [
  { id: 1, domain: "nature.com" },
  { id: 2, domain: "arxiv.org" },
  { id: 3, domain: "ieee.org" },
];

export function HeroSection() {
  return (
    <section
      className="relative flex min-h-screen items-center overflow-hidden px-4 pt-20 sm:px-6"
      aria-labelledby="hero-heading"
    >
      {/* Aurora gradient mesh */}
      <div className="aurora-mesh" aria-hidden="true" />
      {/* Grain */}
      <div className="grain absolute inset-0" aria-hidden="true" />
      {/* Dot grid */}
      <div className="dot-grid absolute inset-0 opacity-40" aria-hidden="true" />

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
        {/* ─── LEFT: Text content ─── */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={fadeUp}>
            <span className="pill-badge">
              <Sparkles className="h-3.5 w-3.5" />
              Introducing Nexora v1.0
            </span>
          </motion.div>

          <motion.h1
            id="hero-heading"
            variants={fadeUp}
            className="mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl"
          >
            <span className="text-white">Search.</span>
            <br />
            <span className="bg-gradient-to-r from-violet-light to-cyan bg-clip-text text-transparent">
              Understand.
            </span>
            <br />
            <span className="text-white">Act.</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mt-6 max-w-lg text-lg leading-relaxed text-[var(--text-muted)]"
          >
            Nexora is your intelligent command center. Multi-agent reasoning on 
            10+ models, verifiable citations, and execution blocks that turn 
            search results into real actions.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/sign-up"
              className="group inline-flex items-center gap-2.5 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-black transition-all duration-200 hover:bg-white/90 hover:shadow-xl hover:shadow-violet/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
            >
              Start Free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.03] px-6 py-3.5 text-sm font-medium text-white/70 backdrop-blur-sm transition-all duration-200 hover:border-white/[0.18] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
            >
              Watch Demo
            </Link>
          </motion.div>

          <motion.p
            variants={fadeUp}
            className="mt-4 text-xs text-[var(--text-dim)]"
          >
            Free tier · 20 messages/day · 5 agent uses · No credit card
          </motion.p>
        </motion.div>

        {/* ─── RIGHT: Product preview card ─── */}
        <motion.div
          variants={slideIn}
          initial="hidden"
          animate="visible"
          className="relative hidden lg:block"
        >
          <div className="gradient-border rounded-2xl p-5">
            {/* Chat header */}
            <div className="mb-4 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-400/70" />
              <span className="text-xs font-medium text-white/40">
                Nexora AI · Research Mode
              </span>
            </div>

            {/* User query */}
            <div className="mb-4 flex justify-end">
              <div className="rounded-xl rounded-br-md bg-violet/20 px-4 py-2.5">
                <p className="text-sm text-white/80">
                  What is the projected impact of renewable energy storage on
                  grid stability in California?
                </p>
              </div>
            </div>

            {/* AI response with citations */}
            <div className="mb-4 rounded-xl bg-white/[0.03] px-4 py-3 border border-white/[0.05]">
              <p className="text-sm leading-relaxed text-white/60">
                The adoption of lithium-ion and flow batteries is expected to 
                significantly enhance grid stability by providing rapid frequency 
                response and absorbing excess solar generation during the day for 
                use at night.{" "}
                <sup className="text-cyan/70">[1]</sup>{" "}
                California&apos;s SB 100 mandate aims for 100% clean energy by 2045, with 
                storage playing a critical role.{" "}
                <sup className="text-cyan/70">[2]</sup>
              </p>

              {/* Citations */}
              <div className="mt-3 flex flex-wrap gap-2">
                {citations.map((c) => (
                  <span
                    key={c.id}
                    className="inline-flex items-center gap-1 rounded-md bg-white/[0.04] px-2 py-1 text-[0.65rem] text-white/40"
                  >
                    <ExternalLink className="h-2.5 w-2.5" />
                    {c.domain}
                    <sup className="text-cyan/60">[{c.id}]</sup>
                  </span>
                ))}
              </div>
            </div>

            {/* ─── Execution Blocks — Nexora's unique feature ─── */}
            <div className="mb-3">
              <span className="mb-2 block text-[0.65rem] font-semibold uppercase tracking-widest text-white/25">
                Execution Blocks
              </span>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="exec-block">
                  <FileSpreadsheet className="h-3 w-3" />
                  Export to Sheets
                </button>
                <button type="button" className="exec-block">
                  <Mail className="h-3 w-3" />
                  Draft Email
                </button>
                <button type="button" className="exec-block">
                  <FileText className="h-3 w-3" />
                  Create Report
                </button>
                <button type="button" className="exec-block">
                  <FolderPlus className="h-3 w-3" />
                  Add to Project
                </button>
              </div>
            </div>

            {/* Model transparency — unique to Nexora */}
            <div className="mt-4 border-t border-white/[0.05] pt-3">
              <div className="model-badge">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan" />
                Model: Claude Opus 4 — selected for reasoning depth
              </div>
            </div>
          </div>

          {/* Floating glow behind the card */}
          <div
            className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-violet/[0.08] via-transparent to-cyan/[0.06] blur-2xl"
            aria-hidden="true"
          />
        </motion.div>
      </div>

      {/* Bottom gradient divider */}
      <div className="section-divider absolute bottom-0 left-0 right-0" />
    </section>
  );
}
