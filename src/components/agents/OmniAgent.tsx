"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { CommandBar } from "@/components/chat/CommandBar";
import { useWorkspace } from "@/components/dashboard/WorkspaceProvider";
import { getCompetingModelIds } from "@/lib/settings";
import { randomUUID } from "@/lib/utils";
import { ChatMessage } from "@/types";
import { Bot as BotIcon } from "lucide-react";

export function OmniAgent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idFromUrl = searchParams.get("id");

  const { selectedModel, selectedAgent, setSelectedAgent } = useWorkspace();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(0);

  useEffect(() => {
    if (selectedAgent !== "omni") {
      setSelectedAgent("omni");
    }
  }, [selectedAgent, setSelectedAgent]);

  const updateUrl = useCallback(
    (newId: string | null) => {
      const params = new URLSearchParams();
      params.set("type", "omni");
      if (newId) params.set("id", newId);
      router.replace(`/agents?${params.toString()}`, { scroll: false });
    },
    [router],
  );

  useEffect(() => {
    if (!idFromUrl && messages.length > 0) {
      setMessages([]);
    }
  }, [idFromUrl]);

  const handleInputChange = (
    e:
      | React.ChangeEvent<HTMLTextAreaElement>
      | React.ChangeEvent<HTMLInputElement>,
  ) => setInput(e.target.value);

  const submitQuery = async (query: string) => {
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
      const newId = randomUUID();
      updateUrl(newId);
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

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error("Unable to get a response.");

      const payload = (await response.json()) as { text?: string };
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: payload.text?.trim() || "I couldn't generate a response.",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content:
            "Something went wrong while generating the reply. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitQuery(input.trim());
  };

  useEffect(() => {
    const initQ = searchParams.get("q");
    if (initQ && messages.length === 0 && !isLoading) {
      submitQuery(initQ);
      const url = new URL(window.location.href);
      url.searchParams.delete("q");
      window.history.replaceState({}, "", url);
    }
  }, [searchParams, messages.length, isLoading]);

  const isChatting = messages.length > 0;

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
