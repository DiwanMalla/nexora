"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Brain,
  Route,
  Shield,
  Zap,
  Search,
  BarChart3,
  Code2,
  ArrowDownRight,
  CheckCircle2,
  Layers3,
  Eye,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
  },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

/* ─── Agent flow steps (visual) ─── */
const agentFlowSteps = [
  { label: "User Query", icon: Search, status: "done" },
  { label: "Router Analysis", icon: Route, status: "done" },
  { label: "Researcher Agent", icon: Brain, status: "active" },
  { label: "Verify Citations", icon: CheckCircle2, status: "pending" },
  { label: "Execution Blocks", icon: Zap, status: "pending" },
];

/* ─── Why Nexora grid items ─── */
const features = [
  {
    icon: Brain,
    title: "Multi-Model Canvas",
    desc: "Compare Claude, GPT-4o, and Gemini side-by-side. See how each model reasons differently.",
    accent: "violet",
  },
  {
    icon: Search,
    title: "Verifiable Search",
    desc: "Every claim backed by citations. Real-time web verification via Tavily + Firecrawl.",
    accent: "cyan",
  },
  {
    icon: Route,
    title: "Intelligent Routing",
    desc: "Auto-routes your query to the right agent and model. Cost-aware, capability-optimized.",
    accent: "violet",
  },
  {
    icon: Zap,
    title: "Execution Blocks",
    desc: "Don't just get answers — export to Sheets, draft emails, create reports. Search → Action.",
    accent: "cyan",
  },
  {
    icon: Eye,
    title: "Model Transparency",
    desc: "See WHY a model was chosen. Cost, capability, and latency — all visible to you.",
    accent: "violet",
  },
  {
    icon: Shield,
    title: "Privacy by Design",
    desc: "Your data stays yours. No selling, no ad targeting. Row Level Security on every query.",
    accent: "cyan",
  },
];

export function FeaturesSection() {
  const flowRef = useRef(null);
  const flowInView = useInView(flowRef, { once: true, margin: "-100px" });

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════
          SECTION 1 — Agent Flow Visualization
          (Inspired by: kumari.ai's agentic section, but shows our UNIQUE
           Search→Understand→Act pipeline, not just "agentic intelligence")
      ═══════════════════════════════════════════════════════════════ */}
      <section className="relative px-4 py-28 sm:px-6 sm:py-36">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            {/* Left: Visual pipeline */}
            <motion.div
              ref={flowRef}
              className="relative"
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as const }}
            >
              <div className="space-y-3">
                {agentFlowSteps.map((step, i) => (
                  <motion.div
                    key={step.label}
                    className={`flex items-center gap-4 rounded-xl border p-4 transition ${
                      step.status === "active"
                        ? "border-violet/30 bg-violet/[0.06]"
                        : step.status === "done"
                        ? "border-white/[0.08] bg-white/[0.02]"
                        : "border-white/[0.04] bg-white/[0.01] opacity-50"
                    }`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={
                      flowInView
                        ? { opacity: step.status === "pending" ? 0.5 : 1, x: 0 }
                        : {}
                    }
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        step.status === "active"
                          ? "bg-violet/20 text-violet-light"
                          : step.status === "done"
                          ? "bg-cyan/10 text-cyan"
                          : "bg-white/[0.04] text-white/20"
                      }`}
                    >
                      <step.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <span
                        className={`text-sm font-medium ${
                          step.status === "active"
                            ? "text-white/90"
                            : step.status === "done"
                            ? "text-white/60"
                            : "text-white/25"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    {step.status === "done" && (
                      <CheckCircle2 className="h-4 w-4 text-cyan/50" />
                    )}
                    {step.status === "active" && (
                      <div className="h-2 w-2 animate-pulse rounded-full bg-violet-light" />
                    )}
                    {i < agentFlowSteps.length - 1 && (
                      <ArrowDownRight className="absolute -bottom-3 left-6 hidden h-3 w-3 text-white/10 sm:hidden" />
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Connection lines */}
              <div className="absolute left-[29px] top-[52px] w-px" style={{ height: "calc(100% - 70px)" }}>
                <div className="h-full w-full bg-gradient-to-b from-cyan/20 via-violet/15 to-transparent" />
              </div>
            </motion.div>

            {/* Right: Text */}
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
            >
              <motion.span
                variants={fadeUp}
                className="pill-badge mb-6"
              >
                How it works
              </motion.span>
              <motion.h2
                variants={fadeUp}
                className="font-display text-4xl font-bold leading-tight sm:text-5xl"
              >
                <span className="text-white/90">From question</span>
                <br />
                <span className="bg-gradient-to-r from-violet-light to-cyan bg-clip-text text-transparent">
                  to action
                </span>
                <span className="text-white/90">, autonomously</span>
              </motion.h2>
              <motion.p
                variants={fadeUp}
                className="mt-6 max-w-md text-lg leading-relaxed text-[var(--text-muted)]"
              >
                Nexora&apos;s agentic pipeline routes your query through the right 
                agents, verifies every claim with citations, then surfaces 
                execution blocks so you can act on the results — not just read them.
              </motion.p>
              <motion.div variants={fadeUp} className="mt-6 flex flex-wrap gap-3">
                <span className="rounded-full bg-cyan/10 px-3 py-1 text-xs font-medium text-cyan/80">
                  Tavily Search
                </span>
                <span className="rounded-full bg-violet/10 px-3 py-1 text-xs font-medium text-violet-light/80">
                  LangGraph
                </span>
                <span className="rounded-full bg-cyan/10 px-3 py-1 text-xs font-medium text-cyan/80">
                  Firecrawl
                </span>
                <span className="rounded-full bg-violet/10 px-3 py-1 text-xs font-medium text-violet-light/80">
                  OpenRouter
                </span>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 2 — Model Comparison + Transparency
          (Inspired by: AI Fiesta's side-by-side, but with Nexora's
           "why this model" transparency angle)
      ═══════════════════════════════════════════════════════════════ */}
      <section className="relative px-4 py-28 sm:px-6 sm:py-36">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            {/* Left: Text */}
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
            >
              <motion.span variants={fadeUp} className="pill-badge mb-6">
                Transparency
              </motion.span>
              <motion.h2
                variants={fadeUp}
                className="font-display text-4xl font-bold leading-tight sm:text-5xl"
              >
                <span className="text-white/90">Know </span>
                <span className="bg-gradient-to-r from-cyan to-violet-light bg-clip-text text-transparent italic">
                  why
                </span>
                <br />
                <span className="text-white/90">
                  your model was chosen
                </span>
              </motion.h2>
              <motion.p
                variants={fadeUp}
                className="mt-6 max-w-md text-lg leading-relaxed text-[var(--text-muted)]"
              >
                Unlike other platforms that hide routing decisions, Nexora shows 
                you exactly why a model was selected — cost, capability, and 
                latency scores for full transparency.
              </motion.p>
            </motion.div>

            {/* Right: Model comparison cards */}
            <motion.div
              className="space-y-3"
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as const }}
            >
              {[
                {
                  name: "Claude Opus 4",
                  provider: "Anthropic",
                  selected: true,
                  reason: "Best for complex reasoning + citations",
                  scores: { capability: 96, cost: 62, speed: 71 },
                },
                {
                  name: "GPT-4o",
                  provider: "OpenAI",
                  selected: false,
                  reason: "Strong general + multimodal",
                  scores: { capability: 91, cost: 68, speed: 85 },
                },
                {
                  name: "Gemini 2.5 Pro",
                  provider: "Google",
                  selected: false,
                  reason: "Great for long context analysis",
                  scores: { capability: 88, cost: 75, speed: 82 },
                },
              ].map((model) => (
                <div
                  key={model.name}
                  className={`rounded-xl border p-4 transition ${
                    model.selected
                      ? "gradient-border"
                      : "border-white/[0.06] bg-white/[0.02] opacity-60 hover:opacity-80"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Layers3
                        className={`h-5 w-5 ${
                          model.selected ? "text-violet-light" : "text-white/30"
                        }`}
                      />
                      <div>
                        <div className="text-sm font-semibold text-white/80">
                          {model.name}
                        </div>
                        <div className="text-xs text-white/30">
                          {model.provider}
                        </div>
                      </div>
                    </div>
                    {model.selected && (
                      <span className="rounded-full bg-green-500/15 px-2.5 py-0.5 text-[0.65rem] font-semibold text-green-400/80">
                        SELECTED
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-white/40">{model.reason}</p>
                  {/* Score bars */}
                  <div className="mt-3 grid grid-cols-3 gap-3">
                    {(["capability", "cost", "speed"] as const).map((key) => (
                      <div key={key}>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-[0.6rem] font-semibold uppercase tracking-wider text-white/25">
                            {key}
                          </span>
                          <span className="text-[0.6rem] font-bold text-white/40">
                            {model.scores[key]}
                          </span>
                        </div>
                        <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
                          <motion.div
                            className={`h-full rounded-full ${
                              model.selected
                                ? "bg-gradient-to-r from-violet to-cyan"
                                : "bg-white/15"
                            }`}
                            initial={{ width: 0 }}
                            whileInView={{ width: `${model.scores[key]}%` }}
                            viewport={{ once: true }}
                            transition={{
                              duration: 0.8,
                              delay: 0.2,
                              ease: [0.16, 1, 0.3, 1] as const,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 3 — Feature Grid
          (Inspired by: kumari.ai's cards but with our own content
           and visual treatment — gradient icons, Nexora-specific copy)
      ═══════════════════════════════════════════════════════════════ */}
      <section className="relative px-4 py-28 sm:px-6 sm:py-36">
        <div className="mx-auto max-w-7xl">
          <motion.div
            className="mb-16 max-w-xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="pill-badge mb-4">Platform</span>
            <h2 className="mt-4 font-display text-3xl font-bold text-white/90 sm:text-4xl">
              Everything you need,
              <br />
              nothing you don&apos;t
            </h2>
            <p className="mt-4 text-[var(--text-muted)]">
              Built from the ground up for search-to-action workflows.
            </p>
          </motion.div>

          <motion.div
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
          >
            {features.map((f) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                className="glass-card glass-card-hover group p-6 transition-all duration-300"
              >
                <div
                  className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${
                    f.accent === "violet"
                      ? "bg-violet/10 text-violet-light"
                      : "bg-cyan/10 text-cyan"
                  } transition group-hover:scale-110`}
                >
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 font-display text-sm font-semibold text-white/85">
                  {f.title}
                </h3>
                <p className="text-sm leading-relaxed text-[var(--text-muted)]">
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    </>
  );
}
