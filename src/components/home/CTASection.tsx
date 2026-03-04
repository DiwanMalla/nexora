"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Zap } from "lucide-react";

export function CTASection() {
  return (
    <section
      className="relative overflow-hidden px-4 py-28 sm:px-6 sm:py-36"
      aria-labelledby="cta-heading"
    >
      {/* Background accent */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-transparent via-violet/[0.04] to-transparent"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] as const }}
        >
          <span className="pill-badge mb-6 inline-flex">
            <Zap className="h-3.5 w-3.5" />
            Get started today
          </span>
          <h2
            id="cta-heading"
            className="font-display text-4xl font-bold text-white/90 sm:text-5xl lg:text-6xl"
          >
            Stop searching.
            <br />
            <span className="bg-gradient-to-r from-violet-light to-cyan bg-clip-text text-transparent">
              Start acting.
            </span>
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-[var(--text-muted)]">
            Join the next generation of AI workflows. Multi-model reasoning,
            verified citations, and execution blocks — all in one platform.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/sign-up"
              className="group inline-flex items-center gap-2.5 rounded-xl bg-white px-7 py-4 text-base font-semibold text-black transition-all duration-200 hover:bg-white/90 hover:shadow-xl hover:shadow-violet/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
            >
              Start Free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.03] px-7 py-4 text-base font-medium text-white/70 backdrop-blur-sm transition-all duration-200 hover:border-white/[0.18] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
            >
              Read the Docs
            </Link>
          </div>

          <div className="mx-auto mt-8 flex max-w-sm items-center justify-center gap-6 text-sm text-[var(--text-dim)]">
            <span>Free: 20 msgs/day</span>
            <span className="text-white/10">·</span>
            <span>Pro: $12/month</span>
            <span className="text-white/10">·</span>
            <span>No credit card</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
