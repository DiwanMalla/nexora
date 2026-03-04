"use client";

import { motion } from "framer-motion";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  className?: string;
  index?: number;
}

export function FeatureCard({
  title,
  description,
  icon: Icon,
  className,
  index = 0,
}: FeatureCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="h-full"
    >
      <GlassPanel
        className={cn(
          "flex h-full flex-col gap-4 p-6 transition hover:border-violet/30 hover:bg-white/[0.07]",
          index === 0 && "border-cyan/20 hover:border-cyan/40",
          className
        )}
      >
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-lg text-violet",
            index === 0 ? "bg-cyan/20 text-cyan" : "bg-violet/20"
          )}
        >
          <Icon className="h-6 w-6" aria-hidden />
        </div>
        <h3 className="font-display font-semibold text-white">{title}</h3>
        <p className="text-sm leading-relaxed text-[var(--text-muted)]">
          {description}
        </p>
      </GlassPanel>
    </motion.div>
  );
}
