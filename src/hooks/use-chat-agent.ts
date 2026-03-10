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
    e: React.ChangeEvent<HTMLTextAreaElement> | React.ChangeEvent<HTMLInputElement>,
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
        const enabledModels = getCompetingModelIds();
        const body: {
          model: string;
          messages: { role: string; content: string }[];
          enabledModels?: string[];
        } = {
          model: selectedModel,
          messages: nextMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        };
        if (enabledModels.length > 0) body.enabledModels = enabledModels;

        const payload = await sendChatMessage(body);

        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content:
              payload.text?.trim() || "I couldn't generate a response.",
            model: selectedModel,
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
    [isLoading, messages, idFromUrl, selectedModel, updateUrl],
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
