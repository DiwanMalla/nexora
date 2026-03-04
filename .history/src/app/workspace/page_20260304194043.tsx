import { Greeting } from "@/components/dashboard/Greeting";
import { CommandBar } from "@/components/dashboard/CommandBar";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { AgentTiles } from "@/components/dashboard/AgentTiles";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { IntegrationsRow } from "@/components/dashboard/IntegrationsRow";
import { UsageStats } from "@/components/dashboard/UsageStats";
import { PromoCard } from "@/components/dashboard/PromoCard";

export default function WorkspacePage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8 sm:px-8 lg:px-10">
      {/* Greeting */}
      <Greeting />

      {/* Command bar */}
      <div className="mt-8">
        <CommandBar />
      </div>

      {/* Quick actions */}
      <div className="mt-6 flex justify-center">
        <QuickActions />
      </div>

      {/* Main grid: content + sidebar */}
      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        {/* Left column */}
        <div className="space-y-6">
          {/* Agent tiles */}
          <AgentTiles />

          {/* Recent activity */}
          <RecentActivity />
        </div>

        {/* Right column (sidebar widgets) */}
        <div className="space-y-4">
          {/* Usage stats */}
          <UsageStats />

          {/* Integrations */}
          <IntegrationsRow />

          {/* Promo card */}
          <PromoCard />
        </div>
      </div>
    </div>
  );
}
