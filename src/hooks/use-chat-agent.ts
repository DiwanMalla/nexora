/**
 * useChatAgent — Encapsulates all chat state management logic.
 *
 * This hook was extracted from the near-identical logic that existed in both
 * `OmniAgent` and `GenericAgent`. It handles:
 *   - Message state (add user/assistant messages)
 *   - Input state (controlled input value)
 *   - Loading state
 *   - URL management (chat ID in search params)
 *   - Auto-scroll on new messages
 *   - Initial query from `?q=` parameter
 *   - Single-model and multi-model (consensus) chat submission
 */

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { randomUUID } from "@/lib/utils";
import { getCompetingModelIds } from "@/lib/settings";
import { sendChatMessage } from "@/lib/api";
import { useWorkspace } from "@/components/dashboard/WorkspaceProvider";
import { AI_CHAT_CONSENSUS_ENABLED } from "@/lib/constants";
import type { ChatMessage } from "@/types";

export interface UseChatAgentOptions {
  /** The agent `type` value for URL params (e.g. "omni", "aichat"). */
  agentType: string;
  /** The currently selected model ID from `WorkspaceProvider`. */
  selectedModel: string;
}

export interface UseChatAgentReturn {
  messages: ChatMessage[];
  input: string;
  isLoading: boolean;
  chatScrollRef: React.RefObject<HTMLDivElement | null>;
  lastMessageRef: React.RefObject<HTMLDivElement | null>;
  isChatting: boolean;
  handleInputChange: (
    e:
      | React.ChangeEvent<HTMLTextAreaElement>
      | React.ChangeEvent<HTMLInputElement>,
  ) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleNewChat: () => void;
  /** Reset messages when URL id changes (navigate away). */
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

export function useChatAgent({
  agentType,
  selectedModel,
}: UseChatAgentOptions): UseChatAgentReturn {
  const { chatWebSearchEnabled } = useWorkspace();
  const router = useRouter();
  const searchParams = useSearchParams();
  const idFromUrl = searchParams.get("id");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(0);

  // ─── URL management ────────────────────────────────────────────

  const updateUrl = useCallback(
    (newId: string | null) => {
      const params = new URLSearchParams();
      params.set("type", agentType);
      if (newId) params.set("id", newId);
      router.replace(`/agents?${params.toString()}`, { scroll: false });
    },
    [router, agentType],
  );

  /** Clear messages when navigating to a URL without an ID. */
  useEffect(() => {
    if (!idFromUrl && messages.length > 0) {
      setMessages([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idFromUrl]);

  /** Load an existing persisted conversation when URL has ?id=... */
  useEffect(() => {
    if (!idFromUrl) return;
    let active = true;
    void fetch(`/api/history/${encodeURIComponent(idFromUrl)}`, {
      cache: "no-store",
    })
      .then(async (res) => {
        const payload = (await res.json()) as {
          messages?: Array<{
            id: string;
            role: "user" | "assistant" | "system" | "tool";
            content: string;
            model: string | null;
          }>;
        };
        if (!active) return;
        if (!res.ok) return;
        const loaded = (payload.messages ?? [])
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
            model: m.model ?? undefined,
          }));
        setMessages(loaded);
      })
      .catch(() => {
        // Non-blocking fallback: UI stays usable even if history load fails.
      });
    return () => {
      active = false;
    };
  }, [idFromUrl]);

  // ─── Input handler ─────────────────────────────────────────────

  const handleInputChange = useCallback(
    (
      e:
        | React.ChangeEvent<HTMLTextAreaElement>
        | React.ChangeEvent<HTMLInputElement>,
    ) => {
      setInput(e.target.value);
    },
    [],
  );

  // ─── Submit ────────────────────────────────────────────────────

  const submitQuery = useCallback(
    async (query: string) => {
      if (!query || isLoading) return;

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: query,
      };

      const nextMessages = [...messages, userMessage];
      setMessages(nextMessages);
      setInput("");

      if (!idFromUrl) {
        updateUrl(randomUUID());
      }

      setIsLoading(true);
      try {
        const enabledModels = AI_CHAT_CONSENSUS_ENABLED
          ? getCompetingModelIds()
          : [];
        const body: {
          model: string;
          messages: { role: string; content: string }[];
          enabledModels?: string[];
          webSearch?: boolean;
          conversationId?: string;
          agentType?: string;
        } = {
          model: selectedModel,
          messages: nextMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          webSearch: chatWebSearchEnabled,
          conversationId: idFromUrl ?? undefined,
          agentType: agentType || "aichat",
        };
        if (enabledModels.length > 0) body.enabledModels = enabledModels;

        const payload = await sendChatMessage(body);

        if (payload.meta) {
          const {
            displayName,
            modelId,
            provider,
            webSearchCalls,
            currentFactIntent,
            preflightTavily,
            preflightSubstantive,
          } = payload.meta;
          console.log(
            `[Nexora chat] Response from ${displayName ?? payload.model ?? selectedModel}` +
              (provider && modelId ? ` (${provider} / ${modelId})` : "") +
              (typeof webSearchCalls === "number"
                ? ` · webSearch tool calls: ${webSearchCalls}`
                : "") +
              (currentFactIntent
                ? ` · currentFact=true preflight=${preflightTavily} substantive=${preflightSubstantive}`
                : ""),
            payload.meta,
          );
        } else if (payload.model) {
          console.log(`[Nexora chat] Response from ${payload.model}`);
        }

        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: payload.text?.trim() || "I couldn't generate a response.",
            model: payload.model ?? payload.meta?.modelId ?? selectedModel,
          },
        ]);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Something went wrong.";
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: `Something went wrong. ${message} Try another model or try again.`,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isLoading, messages, idFromUrl, selectedModel, updateUrl, chatWebSearchEnabled],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      await submitQuery(input.trim());
    },
    [input, submitQuery],
  );

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setInput("");
    updateUrl(null);
  }, [updateUrl]);

  // ─── Auto-submit from ?q= param ───────────────────────────────

  useEffect(() => {
    const initQ = searchParams.get("q");
    if (initQ && messages.length === 0 && !isLoading) {
      submitQuery(initQ);
      // Remove ?q= so it doesn't re-trigger on refresh
      const url = new URL(window.location.href);
      url.searchParams.delete("q");
      window.history.replaceState({}, "", url);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, messages.length, isLoading]);

  // ─── Auto-scroll on new user message ──────────────────────────

  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.role === "user") {
        lastMessageRef.current?.scrollIntoView({
          block: "start",
          behavior: "smooth",
        });
      }
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages]);

  return {
    messages,
    input,
    isLoading,
    chatScrollRef,
    lastMessageRef,
    isChatting: messages.length > 0,
    handleInputChange,
    handleSubmit,
    handleNewChat,
    setMessages,
  };
}
