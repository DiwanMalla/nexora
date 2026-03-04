import { Greeting } from "@/components/dashboard/Greeting";
import { CommandBar } from "@/components/dashboard/CommandBar";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { AgentTiles } from "@/components/dashboard/AgentTiles";
import { RecentActivity } from "@/components/dashboard/RecentActivity";

export default function WorkspacePage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col items-center px-6 py-14 sm:px-10 lg:px-16 animate-in fade-in duration-1000">
      {/* Brand heading */}
      <Greeting />

      {/* Command bar */}
      <div className="mt-10 w-full">
        <CommandBar />
      </div>

      {/* Quick action icons */}
      <div className="mt-12 w-full">
        <QuickActions />
      </div>

      {/* Divider */}
      <div className="my-16 h-px w-full max-w-lg bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Explore agents */}
      <div className="w-full max-w-6xl">
        <AgentTiles />
      </div>

      {/* Recent activity */}
      <div className="mt-16 w-full max-w-6xl">
        <RecentActivity />
      </div>
    </div>
  );
}
