import Link from "next/link";
import {
  LayoutGrid,
  SearchCheck,
  GitBranch,
  Zap,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Nav } from "@/components/layout/Nav";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { FeatureCard } from "@/components/home/FeatureCard";

const features = [
  {
    title: "Multi-Model Canvas",
    description:
      "Compare Claude 3.5 and GPT-4o side-by-side in a single workspace. One place for every model.",
    icon: LayoutGrid,
  },
  {
    title: "Verifiable Search",
    description:
      "Every claim is backed by citations with real-time web verification. Trust what you read.",
    icon: SearchCheck,
  },
  {
    title: "Task Orchestration",
    description:
      "Auto-routes complex queries to LangGraph Researcher or Analyst agents. Right agent, right task.",
    icon: GitBranch,
  },
  {
    title: "Local-First Caching",
    description:
      "Next.js 16 \"use cache\" ensures lightning-fast responses for repeated queries. No redundant API calls.",
    icon: Zap,
  },
];

export default function Home() {
  return (
    <>
      <Nav />
      <main className="relative min-h-screen">
        {/* Hero */}
        <section className="relative flex min-h-[90vh] flex-col items-center justify-center px-4 pt-24 pb-16">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(124,58,237,0.15),transparent)]" />
          <div className="relative mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet/30 bg-violet/10 px-4 py-2 text-sm text-violet">
              <Sparkles className="h-4 w-4" />
              AI Agentic Search & Action
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
              One platform.{" "}
              <span className="text-cyan">Every AI.</span>
              <br />
              Search → Action.
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-lg text-gray-400">
              Nexora is a next-era agentic engine. Discover agents, chat with
              10+ models side-by-side, and get Execution Blocks — not just
              answers.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-violet px-6 py-3.5 font-semibold text-white transition hover:bg-violet/90"
              >
                Get started free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/discover"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 font-medium text-white backdrop-blur-sm transition hover:bg-white/10"
              >
                Explore agents
              </Link>
            </div>
            <p className="mt-6 text-sm text-gray-500">
              Free tier: 20 messages/day · 5 agent uses/day · No credit card
            </p>
          </div>
        </section>

        {/* Features */}
        <section className="relative border-t border-white/10 px-4 py-24">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-3xl font-bold text-white sm:text-4xl">
              Why Nexora
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-gray-400">
              Search-to-action with agents, citations, and a unified Canvas.
              Built for trust and speed.
            </p>
            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <FeatureCard key={feature.title} {...feature} />
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative border-t border-white/10 px-4 py-24">
          <div className="mx-auto max-w-3xl">
            <GlassPanel className="flex flex-col items-center gap-6 rounded-2xl p-12 text-center">
              <h2 className="text-2xl font-bold text-white sm:text-3xl">
                Ready to search, then act?
              </h2>
              <p className="text-gray-400">
                Join the waitlist or start building with Nexora. Privacy-first,
                security by design.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  href="/signup"
                  className="rounded-xl bg-cyan px-6 py-3 font-semibold text-[#0A0A0A] transition hover:bg-cyan/90"
                >
                  Start for free
                </Link>
                <Link
                  href="/docs"
                  className="rounded-xl border border-white/20 px-6 py-3 font-medium text-white transition hover:bg-white/10"
                >
                  Read the docs
                </Link>
              </div>
            </GlassPanel>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 px-4 py-8">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
            <span className="text-sm text-gray-500">© Nexora. MIT.</span>
            <div className="flex gap-6 text-sm">
              <Link href="/docs" className="text-gray-400 hover:text-cyan">
                Docs
              </Link>
              <Link href="/privacy" className="text-gray-400 hover:text-cyan">
                Privacy
              </Link>
              <Link href="/terms" className="text-gray-400 hover:text-cyan">
                Terms
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
