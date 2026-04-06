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
import type { ChatAttachmentRef, ChatMessage } from "@/types";
import {
  useComposerAttachment,
  type ComposerAttachment,
} from "@/hooks/use-composer-attachment";
import { parseAttachmentNote } from "@/lib/attachments/note";

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
  /** Multi-chat: append user bubble + clear input + URL; no API (API runs in MultiChatColumns). */
  flushMultiRoundLocal: (
    userLine: string,
    attachmentRefs?: ChatAttachmentRef[],
  ) => void;
  clearComposerAttachment: () => void;
  composerAttachment: ComposerAttachment | null;
  openAttachmentPicker: () => void;
  onAttachmentFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  attachmentFileInputRef: React.RefObject<HTMLInputElement | null>;
  /** Stable thread id aligned with URL (allocates UUID before first API if needed). */
  resolveConversationId: () => string;
}

export function useChatAgent({
  agentType,
  selectedModel,
}: UseChatAgentOptions): UseChatAgentReturn {
  const { chatWebSearchEnabled } = useWorkspace();
  const router = useRouter();
  const searchParams = useSearchParams();
  const idFromUrl = searchParams.get("id");

  const conversationIdRef = useRef<string | null>(null);

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

  const resolveConversationId = useCallback((): string => {
    if (idFromUrl) {
      conversationIdRef.current = idFromUrl;
      return idFromUrl;
    }
    if (conversationIdRef.current) {
      updateUrl(conversationIdRef.current);
      return conversationIdRef.current;
    }
    const id = randomUUID();
    conversationIdRef.current = id;
    updateUrl(id);
    return id;
  }, [idFromUrl, updateUrl]);

  useEffect(() => {
    if (idFromUrl) {
      conversationIdRef.current = idFromUrl;
    }
  }, [idFromUrl]);

  const {
    attachment: composerAttachment,
    clearAttachment: clearComposerAttachment,
    openFilePicker: openAttachmentPicker,
    onFileSelected: onAttachmentFileChange,
    fileInputRef: attachmentFileInputRef,
  } = useComposerAttachment(idFromUrl, {
    ensureConversationId: resolveConversationId,
    agentType: agentType || "aichat",
  });

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
          attachments?: Array<{
            id: string;
            message_id: string | null;
            original_name: string;
            mime_type: string;
            size_bytes: number;
            status: string;
            metadata?: unknown;
          }>;
        };
        if (!active) return;
        if (!res.ok) return;
        const attByMsg = new Map<string, ChatAttachmentRef[]>();
        for (const a of payload.attachments ?? []) {
          if (!a.message_id) continue;
          const list = attByMsg.get(a.message_id) ?? [];
          list.push({
            id: a.id,
            originalName: a.original_name,
            mimeType: a.mime_type,
            sizeBytes: a.size_bytes,
            note: parseAttachmentNote(
              a.metadata &&
                typeof a.metadata === "object" &&
                a.metadata !== null &&
                "note" in a.metadata
                ? (a.metadata as Record<string, unknown>).note
                : undefined,
            ),
          });
          attByMsg.set(a.message_id, list);
        }
        const loaded = (payload.messages ?? [])
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
            model: m.model ?? undefined,
            attachments:
              m.role === "user" ? attByMsg.get(m.id) : undefined,
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

  const flushMultiRoundLocal = useCallback(
    (userLine: string, attachmentRefs?: ChatAttachmentRef[]) => {
      resolveConversationId();
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: userLine,
        attachments: attachmentRefs,
      };
      setMessages((prev) => [...prev, userMessage]);
      setInput("");
    },
    [resolveConversationId],
  );

  // ─── Submit ────────────────────────────────────────────────────

  const submitQuery = useCallback(
    async (query: string) => {
      const att = composerAttachment;
      const attachmentIds =
        att?.phase === "ready" &&
        att.id !== "pending" &&
        att.id !== "local"
          ? [att.id]
          : [];
      const userContent =
        query.trim() ||
        (attachmentIds.length > 0 ? `📎 ${att!.originalName}` : "");

      if (!userContent.trim() && attachmentIds.length === 0) return;
      if (isLoading) return;

      const userAttachments: ChatAttachmentRef[] | undefined =
        attachmentIds.length > 0
          ? [
              {
                id: att!.id,
                originalName: att!.originalName,
                mimeType: att!.mimeType,
                sizeBytes: att!.sizeBytes,
                note: att!.note,
              },
            ]
          : undefined;

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: userContent,
        attachments: userAttachments,
      };

      const nextMessages = [...messages, userMessage];
      setMessages(nextMessages);
      setInput("");

      const activeConversationId = resolveConversationId();

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
          attachmentIds?: string[];
        } = {
          model: selectedModel,
          messages: nextMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          webSearch: chatWebSearchEnabled,
          conversationId: activeConversationId,
          agentType: agentType || "aichat",
        };
        if (enabledModels.length > 0) body.enabledModels = enabledModels;
        if (attachmentIds.length > 0) body.attachmentIds = attachmentIds;

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
        if (attachmentIds.length > 0) {
          clearComposerAttachment();
        }
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
    [
      isLoading,
      messages,
      idFromUrl,
      selectedModel,
      resolveConversationId,
      chatWebSearchEnabled,
      composerAttachment,
      clearComposerAttachment,
    ],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      await submitQuery(input.trim());
    },
    [input, submitQuery],
  );

  const handleNewChat = useCallback(() => {
    conversationIdRef.current = null;
    setMessages([]);
    setInput("");
    clearComposerAttachment();
    updateUrl(null);
  }, [updateUrl, clearComposerAttachment]);

  // ─── Auto-submit from ?q= param ───────────────────────────────

  useEffect(() => {
    const initQ = searchParams.get("q");
    if (initQ?.trim() && messages.length === 0 && !isLoading) {
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
    flushMultiRoundLocal,
    clearComposerAttachment,
    composerAttachment,
    openAttachmentPicker,
    onAttachmentFileChange,
    attachmentFileInputRef,
    resolveConversationId,
  };
}
