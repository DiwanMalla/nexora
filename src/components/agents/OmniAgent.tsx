/**
 * OmniAgent — The "best answer" agent that uses the Omni router to select
 * a Groq model by prompt intent, streams the response via useChat, and
 * displays routing metadata (model + reason) from response headers.
 */

"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ChatMessages, type RoutingMetadata } from "@/components/chat/ChatMessages";
import { CommandBar } from "@/components/chat/CommandBar";
import { useWorkspace } from "@/components/dashboard/WorkspaceProvider";
import type { ChatMessage } from "@/types";
import { Bot as BotIcon } from "lucide-react";

function getTextFromParts(
  parts: Array<{ type: string; text?: string }>,
): string {
  return parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

function uiMessagesToChatMessages(
  messages: Array<{ id: string; role: string; parts: Array<{ type: string; text?: string }> }>,
): ChatMessage[] {
  return messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: getTextFromParts(m.parts),
    }));
}

export function OmniAgent() {
  const { selectedAgent, setSelectedAgent } = useWorkspace();
  const searchParams = useSearchParams();
  const [input, setInput] = useState("");
  const [routedModel, setRoutedModel] = useState<string | null>(null);
  const [routedReason, setRoutedReason] = useState<string | null>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/omni-agent",
        fetch: async (url, init) => {
          const res = await fetch(url, init);
          if (res.ok) {
            setRoutedModel(res.headers.get("X-Omni-Model"));
            setRoutedReason(res.headers.get("X-Omni-Reason"));
          }
          return res;
        },
      }),
    [],
  );

  const { messages: uiMessages, sendMessage, status } = useChat({ transport });

  const messages = useMemo(
    () => uiMessagesToChatMessages(uiMessages),
    [uiMessages],
  );
  const isLoading = status === "submitted" || status === "streaming";
  const isChatting = messages.length > 0 || isLoading;

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);

  // Auto-submit initial query from ?q= when opening /agents?type=omni&q=...
  useEffect(() => {
    const initQ = searchParams.get("q");
    if (!initQ) return;
    if (uiMessages.length > 0) return;

    // Fire-and-forget; errors are handled inside useChat.
    void sendMessage({ text: initQ });

    // Remove ?q= so it doesn't re-trigger on refresh.
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("q");
      window.history.replaceState({}, "", url.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, uiMessages.length, sendMessage]);

  useEffect(() => {
    if (selectedAgent !== "omni") {
      setSelectedAgent("omni");
    }
  }, [selectedAgent, setSelectedAgent]);

  const handleInputChange = useCallback(
    (
      e: React.ChangeEvent<HTMLTextAreaElement> | React.ChangeEvent<HTMLInputElement>,
    ) => {
      setInput(e.target.value);
    },
    [],
  );

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault?.();
      const text = input.trim();
      if (!text || isLoading) return;
      setInput("");
      await sendMessage({ text });
    },
    [input, isLoading, sendMessage],
  );

  const routingMetadata: RoutingMetadata | null =
    routedModel != null && routedReason != null
      ? { model: routedModel, reason: routedReason }
      : null;

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
              agentId="omni"
              lastMessageRef={lastMessageRef}
              routingMetadata={routingMetadata}
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
                placeholder="Ask Omni anything..."
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
            Omni Agent
          </h1>
          <p className="mt-3 text-[var(--text-md)] leading-[var(--leading-relaxed)] text-text-muted">
            Ask anything, create anything.
          </p>
          <div className="mt-10 w-full max-w-2xl">
            <CommandBar
              input={input}
              handleInputChange={handleInputChange}
              onSubmit={handleSubmit}
              placeholder="Ask Omni anything..."
            />
          </div>
        </div>
      )}
    </div>
  );
}
