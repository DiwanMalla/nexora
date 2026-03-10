/**
 * GenericAgent — Handles AI Chat, Researcher, Coder, and Analyst agent views.
 *
 * Supports two modes:
 *   - **Single chat**: Standard conversation with one model.
 *   - **Multi-chat columns**: Side-by-side responses from multiple models.
 *
 * Refactored:
 *   - Chat state logic extracted to `useChatAgent` hook.
 *   - Multi-chat column rendering extracted to `MultiChatColumns`.
 *   - Message actions use shared `MessageActions` component.
 *   - Agent labels moved to `types/index.ts`.
 *   - Removed console.log and `as any` casts.
 *   - Reduced from 592 lines → ~160 lines.
 */

"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { CommandBar } from "@/components/chat/CommandBar";
import { useWorkspace } from "@/components/dashboard/WorkspaceProvider";
import { useChatAgent } from "@/hooks/use-chat-agent";
import { MultiChatColumns } from "./MultiChatColumns";
import { AGENT_TYPE_LABELS } from "@/types";
import { Bot as BotIcon } from "lucide-react";

/** Returns a human-readable label for the given agent type. */
function getAgentLabel(type: string | null): string {
  return (type && AGENT_TYPE_LABELS[type]) || "AI Chat";
}

export function GenericAgent() {
  const searchParams = useSearchParams();
  const type = searchParams.get("type") || "aichat";

  const { isMultiChat, selectedModel, selectedAgent, setSelectedAgent } =
    useWorkspace();

  // Sync agent type from URL to context
  useEffect(() => {
    if (type && type !== selectedAgent) {
      setSelectedAgent(type);
    }
  }, [type, selectedAgent, setSelectedAgent]);

  const {
    messages,
    input,
    isLoading,
    chatScrollRef,
    lastMessageRef,
    isChatting,
    handleInputChange,
    handleSubmit,
  } = useChatAgent({ agentType: type, selectedModel });

  const agentLabel = getAgentLabel(type);
  const showMultiColumns = isMultiChat && selectedAgent !== "omni";

  // ─── Multi-chat mode ────────────────────────────────────────

  if (showMultiColumns) {
    return (
      <MultiChatColumns
        input={input}
        messages={messages}
        handleInputChange={handleInputChange}
        handleSubmit={handleSubmit}
      />
    );
  }

  // ─── Single chat mode ───────────────────────────────────────

  return (
    <div className="flex h-full flex-col">
      {isChatting ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div
            ref={chatScrollRef}
            className="flex-1 overflow-y-auto px-4 py-6 pb-32"
          >
            <ChatMessages
              messages={messages}
              isLoading={isLoading}
              agentId={type || "aichat"}
              lastMessageRef={lastMessageRef}
            />
          </div>
          <div
            className="fixed bottom-0 left-[var(--sidebar-width)] right-0 z-30 bg-[var(--bg)]/95 px-4 py-2 backdrop-blur-md lg:pl-4"
            style={{ left: "var(--sidebar-width, 15rem)" }}
          >
            <div className="mx-auto max-w-3xl">
              <CommandBar
                input={input}
                handleInputChange={handleInputChange}
                onSubmit={handleSubmit}
                placeholder="Ask anything, create anything..."
                showModelSelector
                compact
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-14">
          <div className="mb-10 flex h-16 w-16 items-center justify-center rounded-2xl border border-violet/20 bg-violet/5">
            <BotIcon className="h-8 w-8 text-violet-400" />
          </div>
          <h1 className="font-display text-[var(--text-3xl)] font-bold tracking-tight text-text sm:text-[var(--text-4xl)]">
            {agentLabel}
          </h1>
          <p className="mt-3 text-[var(--text-md)] leading-[var(--leading-relaxed)] text-text-muted">
            Ask anything, create anything.
          </p>
          <div className="mt-10 w-full max-w-2xl">
            <CommandBar
              input={input}
              handleInputChange={handleInputChange}
              onSubmit={handleSubmit}
              placeholder="Ask anything, create anything..."
              showModelSelector
              compact
            />
          </div>
        </div>
      )}
    </div>
  );
}
