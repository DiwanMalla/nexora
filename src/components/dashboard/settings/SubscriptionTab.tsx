/**
 * SubscriptionTab — Handles billing and plan management.
 *
 * Extracted from AccountSettingsModal.
 */

"use client";

import { CreditCard, Zap, Crown, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SubscriptionTabProps {
  currentPlan: "free" | "pro" | "enterprise";
  onUpgrade: () => void;
}

export function SubscriptionTab({
  currentPlan,
  onUpgrade,
}: SubscriptionTabProps) {
  const isPro = currentPlan === "pro";

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Current Plan Card */}
      <section className="relative overflow-hidden rounded-[2rem] border border-violet/30 bg-violet/5 p-8">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet/10 blur-3xl" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet/20 border border-violet/30 text-violet-light">
              <Crown className="h-8 w-8" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-light/70">
                Current Active Plan
              </span>
              <h3 className="text-2xl font-black text-white uppercase tracking-wider">
                Nexora {currentPlan === "free" ? "Core" : "Premium"}
              </h3>
            </div>
          </div>
          <button
            onClick={onUpgrade}
            disabled={isPro}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-xs font-black uppercase tracking-widest transition-all active:scale-95",
              isPro
                ? "bg-white/10 text-white cursor-default"
                : "bg-white text-black hover:bg-white/90 shadow-xl shadow-violet/20"
            )}
          >
            {isPro ? "Current Plan" : "Upgrade to Pro"}
          </button>
        </div>
      </section>

      {/* Features List */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { label: "Unlimited Model Switching", icon: Zap },
          { label: "Advanced Researcher Access", icon: CheckCircle2 },
          { label: "Priority Response Time", icon: CheckCircle2 },
          { label: "Collaborative Workspaces", icon: CheckCircle2 },
        ].map((feature, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface-overlay/30 px-5 py-4"
          >
            <feature.icon className="h-4 w-4 text-violet-light" />
            <span className="text-[11px] font-bold text-text uppercase tracking-tight">
              {feature.label}
            </span>
          </div>
        ))}
      </section>

      {/* Billing Info */}
      <section className="flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-5">
        <CreditCard className="h-5 w-5 text-text-dim" />
        <div className="flex-1">
          <h4 className="text-[11px] font-bold text-text uppercase tracking-wider">
            Billing & Invoices
          </h4>
          <p className="text-[10px] text-text-dim font-medium uppercase tracking-tight">
            Manage payment methods and view history via Stripe
          </p>
        </div>
        <button className="text-[10px] font-bold uppercase tracking-widest text-text hover:text-white transition-colors">
          Manage
        </button>
      </section>
    </div>
  );
}
