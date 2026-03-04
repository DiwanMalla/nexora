"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "How is Nexora different from ChatGPT or Perplexity?",
    a: "Nexora isn't just chat or just search. It combines multi-agent reasoning with verifiable citations AND execution blocks — so you can export results, draft emails, and create reports, not just read answers. Plus, you see WHY a model was chosen for your query.",
  },
  {
    q: "What models are available?",
    a: "Nexora routes to 10+ models via OpenRouter, including Claude Opus 4, GPT-4o, Gemini 2.5, DeepSeek R1, and more. The intelligent router picks the best model for each query based on complexity, cost, and speed.",
  },
  {
    q: "What are Execution Blocks?",
    a: "Execution Blocks are actionable next-steps that appear after every search result. Instead of copy-pasting, you can directly 'Export to Sheets', 'Draft an Email', 'Create a Report', or 'Add to Project' — turning search results into real actions.",
  },
  {
    q: "Is my data safe?",
    a: "Privacy is our top priority. We use Row Level Security on all data, keep API keys server-side only, never sell your data, and log no PII. See our docs for the complete security model.",
  },
  {
    q: "How does pricing work?",
    a: "Free tier: 20 AI messages/day + 5 agent uses/day, no credit card needed. Pro: $12/month for unlimited messages, all models, and all agents. Teams: $29/month per user with shared workspaces.",
  },
  {
    q: "Can I build custom agents?",
    a: "Custom agent builder is on our P2 roadmap (Month 4-6). For now, you get access to our core agents: Researcher, Analyst, Coder, and more — each optimized for their domain with real tool integration.",
  },
];

export function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="relative px-4 py-28 sm:px-6 sm:py-36">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.8fr] lg:gap-20">
          {/* Left header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="pill-badge mb-4">FAQ</span>
            <h2 className="mt-4 font-display text-4xl font-bold text-white/90 sm:text-5xl">
              Got questions?
            </h2>
            <p className="mt-3 text-base text-[var(--text-muted)]">
              Can&apos;t find what you&apos;re looking for? Check our{" "}
              <a
                href="/docs"
                className="text-cyan underline underline-offset-2 transition hover:text-cyan-light"
              >
                docs
              </a>{" "}
              or reach out on Discord.
            </p>
          </motion.div>

          {/* Right: accordion */}
          <div>
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                className="border-b border-white/[0.06] transition-colors hover:border-white/[0.1]"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
              >
                <button
                  type="button"
                  className="flex w-full items-center gap-4 py-5 text-left"
                  onClick={() => setOpen(open === i ? null : i)}
                  aria-expanded={open === i}
                >
                  <span className="text-[0.75rem] font-bold text-white/15">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 text-[1.05rem] font-medium text-white/80">
                    {faq.q}
                  </span>
                  <motion.div
                    animate={{ rotate: open === i ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <ChevronDown className="h-4 w-4 text-white/25" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {open === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{
                        duration: 0.3,
                        ease: [0.16, 1, 0.3, 1] as const,
                      }}
                      className="overflow-hidden"
                    >
                      <p className="pb-5 pl-9 text-base leading-relaxed text-[var(--text-muted)]">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
