"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { OmniAgent } from "@/components/agents/OmniAgent";
import { GenericAgent } from "@/components/agents/GenericAgent";

function AgentsPageContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get("type") || "aichat";

  if (type === "omni") {
    return <OmniAgent />;
  }

  return <GenericAgent />;
}

export default function AgentsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-text-muted">
          Loading…
        </div>
      }
    >
      <AgentsPageContent />
    </Suspense>
  );
}
