import { GlassPanel } from "@/components/layout/GlassPanel";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  className?: string;
}

export function FeatureCard({
  title,
  description,
  icon: Icon,
  className,
}: FeatureCardProps) {
  return (
    <GlassPanel
      className={cn(
        "flex flex-col gap-4 p-6 transition hover:border-violet/30 hover:bg-white/[0.07]",
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-violet/20 text-violet">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="font-semibold text-white">{title}</h3>
      <p className="text-sm leading-relaxed text-gray-400">{description}</p>
    </GlassPanel>
  );
}
