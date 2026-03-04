"use client";

import { motion } from "framer-motion";
import {
  Search,
  Calculator,
  PenTool,
  Image,
  Video,
  Music,
  Mic2,
  Code2,
  Mail,
  FileText,
  Globe,
  Lightbulb,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

/* Agent data — organized by Nexora's actual value prop */
const agentRows = [
  {
    category: "CORE AGENTS",
    agents: [
      {
        name: "Deep Researcher",
        icon: Search,
        desc: "Cited, fact-checked answers",
      },
      { name: "Data Analyst", icon: Calculator, desc: "CSV, charts, insights" },
      { name: "Coding Agent", icon: Code2, desc: "Sandboxed code execution" },
    ],
  },
  {
    category: "CREATIVE",
    agents: [
      { name: "Content Writer", icon: PenTool, desc: "SEO-optimized content" },
      { name: "Image Generator", icon: Image, desc: "DALL-E & Flux models" },
      { name: "Designer", icon: Lightbulb, desc: "UI and visual concepts" },
    ],
  },
  {
    category: "MEDIA",
    agents: [
      { name: "Video Gen", icon: Video, desc: "Sora & Veo3 cinematics" },
      { name: "Music AI", icon: Music, desc: "Suno-powered soundtracks" },
      { name: "Voice Synth", icon: Mic2, desc: "ElevenLabs HD voices" },
    ],
  },
  {
    category: "PRODUCTIVITY",
    agents: [
      { name: "Email Drafter", icon: Mail, desc: "Context-aware emails" },
      { name: "Report Builder", icon: FileText, desc: "Structured summaries" },
      {
        name: "Web Scraper",
        icon: Globe,
        desc: "Firecrawl-powered extraction",
      },
    ],
  },
];

export function AgentsShowcase() {
  return (
    <section className="relative px-4 py-28 sm:px-6 sm:py-36">
      <div className="mx-auto max-w-7xl">
        {/* Header — asymmetric, not centered */}
        <div className="mb-16 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="pill-badge mb-4">Agents</span>
            <h2 className="mt-4 font-display text-5xl font-bold sm:text-6xl">
              <span className="text-white/90">Specialized agents.</span>
              <br />
              <span className="text-[var(--text-muted)]">
                Infinite possibilities.
              </span>
            </h2>
          </motion.div>
          <motion.div
            className="flex items-end"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <p className="text-base leading-relaxed text-[var(--text-muted)] lg:text-right">
              Chain purpose-built agents into fully automated workflows. Each
              agent is optimized for its domain and routes through the best
              model for the task.
            </p>
          </motion.div>
        </div>

        {/* Agent grid by category */}
        <div className="space-y-8">
          {agentRows.map((row) => (
            <motion.div
              key={row.category}
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
            >
              {/* Category label with line */}
              <div className="category-label mb-4">
                <span>{row.category}</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {row.agents.map((agent) => (
                  <motion.div
                    key={agent.name}
                    variants={fadeUp}
                    className="glass-card glass-card-hover group flex items-center gap-4 p-4 transition-all duration-300"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] transition group-hover:bg-violet/10">
                      <agent.icon className="h-5 w-5 text-white/35 transition group-hover:text-violet-light" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white/80">
                        {agent.name}
                      </h3>
                      <p className="text-sm text-[var(--text-muted)]">
                        {agent.desc}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom stat */}
        <motion.div
          className="mt-12 flex items-center justify-center gap-4"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-baseline gap-2">
            <span className="font-display text-4xl font-bold text-white/80">
              12
            </span>
            <span className="text-base font-medium uppercase tracking-wider text-[var(--text-dim)]">
              agents at launch
            </span>
          </div>
          <span className="text-white/15">·</span>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-4xl font-bold text-white/80">
              50+
            </span>
            <span className="text-base font-medium uppercase tracking-wider text-[var(--text-dim)]">
              by year end
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
