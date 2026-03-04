"use client";
import { useState } from "react";
import { Greeting } from "@/components/dashboard/Greeting";
import { CommandBar } from "@/components/dashboard/CommandBar";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { AgentTiles } from "@/components/dashboard/AgentTiles";
import { RecentActivity } from "@/components/dashboard/RecentActivity";

import {
  useWorkspace,
  AVAILABLE_MODELS,
} from "@/components/dashboard/WorkspaceProvider";
import { ChatMessages } from "@/components/dashboard/ChatMessages";
import { Brain, Sparkles, MessageSquare, ArrowLeft } from "lucide-react";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export default function WorkspacePage() {
  const { isMultiChat, selectedModel } = useWorkspace();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (
    event:
      | React.ChangeEvent<HTMLTextAreaElement>
      | React.ChangeEvent<HTMLInputElement>,
  ) => {
    setInput(event.target.value);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const query = input.trim();
    if (!query || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: query,
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");

    const greetingPattern = /^(hi|hello|hey)\b/i;
    if (messages.length === 0 && greetingPattern.test(query)) {
      setMessages([
        ...nextMessages,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: "Hey Diwan 👋\n\nWhat are we building or fixing today? 🚀",
        },
      ]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModel,
          messages: nextMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to get a response right now.");
      }

      const payload = (await response.json()) as { text?: string };
      setMessages((previous) => [
        ...previous,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: payload.text?.trim() || "I couldn't generate a response.",
        },
      ]);
    } catch {
      setMessages((previous) => [
        ...previous,
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

  const isChatting = messages.length > 0;

  if (isMultiChat) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center px-6 py-14 animate-in fade-in zoom-in-95 duration-500">
        <div className="mb-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet/20 border border-violet/30 shadow-lg">
            <Brain className="h-8 w-8 text-violet-light" />
          </div>
          <h1 className="text-4xl font-bold text-white">Multi-Chat Mode</h1>
          <p className="mt-2 text-slate-500">
            Compare responses from all selected models simultaneously.
          </p>
        </div>

        <div className="w-full">
          <CommandBar
            input={input}
            handleInputChange={handleInputChange}
            onSubmit={handleSubmit}
          />
        </div>

        <div className="mt-16 grid w-full grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {AVAILABLE_MODELS.map((model) => (
            <div
              key={model.id}
              className="group relative flex flex-col rounded-3xl border border-white/10 bg-[#0E0E12] p-6 transition-all hover:border-violet/30 hover:shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-slate-400">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-bold text-white">
                    {model.name}
                  </span>
                </div>
                <div className="h-2 w-2 rounded-full bg-slate-800" />
              </div>
              <div className="flex-1 space-y-3">
                <div className="h-3 w-3/4 rounded-full bg-white/5" />
                <div className="h-3 w-1/2 rounded-full bg-white/5" />
                <div className="h-3 w-2/3 rounded-full bg-white/5" />
              </div>
              <div className="mt-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                <Sparkles className="h-3 w-3" />
                {model.provider}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex h-full w-full max-w-4xl flex-col px-6 sm:px-10 lg:px-16 animate-in fade-in duration-1000">
      {isChatting ? (
        <div className="flex flex-1 flex-col py-10">
          <button
            onClick={() => setMessages([])}
            className="mb-8 flex w-fit items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-slate-500 transition-colors hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-3 w-3" />
            New Chat
          </button>

          <ChatMessages messages={messages} isLoading={isLoading} />

          {/* Sticky input area */}
          <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/95 to-transparent pb-10 pt-20 lg:pl-60">
            <div className="w-full max-w-3xl px-6">
              <CommandBar
                input={input}
                handleInputChange={handleInputChange}
                onSubmit={handleSubmit}
                placeholder="Message Nexora..."
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center py-14">
          {/* Brand heading */}
          <Greeting />

          {/* Command bar */}
          <div className="mt-10 w-full">
            <CommandBar
              input={input}
              handleInputChange={handleInputChange}
              onSubmit={handleSubmit}
              placeholder="Message Nexora..."
            />
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
      )}
    </div>
  );
}
