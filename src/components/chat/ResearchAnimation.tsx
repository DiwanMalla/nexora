/**
 * ResearchAnimation — Animated loading state shown while an AI response
 * is being generated. Displays sequential research steps with progress.
 *
 * Extracted from ChatMessages to improve separation of concerns
 * and keep the message renderer focused on displaying messages.
 */

"use client";

import { useEffect, useState } from "react";
import {
  Hexagon,
  Search,
  Globe,
  Database,
  ShieldCheck,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** A single step in the research animation pipeline. */
interface ResearchStep {
  id: string;
  label: string;
  sub: string;
  icon: LucideIcon;
}

interface ResearchAnimationProps {
  /** The user's query — displayed in the search step subtitle. */
  query: string;
}

/** Milliseconds between each step transition. */
const STEP_INTERVAL_MS = 2500;

/**
 * Builds the list of research steps, personalised with the user's query.
 */
function getResearchSteps(query: string): ResearchStep[] {
  return [
    { id: "query", label: "Query Analysis", sub: "Understanding search intent...", icon: Search },
    { id: "search", label: "Web Search", sub: `Searching for '${query}'...`, icon: Globe },
    { id: "analysis", label: "Deep Analysis", sub: "Reading and analyzing top results...", icon: Database },
    { id: "fact-check", label: "Fact Checking", sub: "Verifying information across sources...", icon: ShieldCheck },
    { id: "synthesize", label: "Researcher", sub: "Synthesizing findings into a summary...", icon: Hexagon },
  ];
}

export function ResearchAnimation({ query }: ResearchAnimationProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const researchSteps = getResearchSteps(query);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) =>
        prev < researchSteps.length - 1 ? prev + 1 : prev,
      );
    }, STEP_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      setCurrentStep(0);
    };
  }, [researchSteps.length]);

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-overlay-strong border border-border shadow-lg animate-pulse">
          <Hexagon className="h-4 w-4 text-text" />
        </div>
        <span className="text-[var(--text-base)] font-bold text-text tracking-[0.2em] uppercase">
          Nexora Search
        </span>
      </div>

      {/* Steps */}
      <div className="flex flex-col gap-5 pl-4 border-l border-border ml-4">
        {researchSteps.map((step, i) => {
          const Icon = step.icon;
          const isCompleted = i < currentStep;
          const isActive = i === currentStep;
          const isPending = i > currentStep;

          return (
            <div
              key={step.id}
              className={cn(
                "flex items-start gap-4 transition-all duration-500",
                isPending ? "opacity-20 grayscale" : "opacity-100",
              )}
            >
              <div
                className={cn(
                  "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all duration-500",
                  isCompleted
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-500"
                    : isActive
                      ? "border-border-hover bg-surface-overlay-strong text-text animate-pulse"
                      : "border-border text-text-dim",
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <Icon className="h-3 w-3" />
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                <span
                  className={cn(
                    "text-[var(--text-sm)] font-semibold uppercase tracking-wide transition-colors",
                    isActive ? "text-text" : "text-text-muted",
                  )}
                >
                  {step.label}
                </span>
                {isActive && (
                  <span className="text-[var(--text-sm)] text-text-dim animate-in fade-in slide-in-from-left-2 duration-700">
                    {step.sub}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
