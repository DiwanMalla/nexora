"use client";

import { useSearchParams } from "next/navigation";
import { OmniAgent } from "@/components/agents/OmniAgent";
import { GenericAgent } from "@/components/agents/GenericAgent";

export default function AgentsPage() {
  const searchParams = useSearchParams();
  const type = searchParams.get("type") || "aichat";

  if (type === "omni") {
    return <OmniAgent />;
  }

  return <GenericAgent />;
}
