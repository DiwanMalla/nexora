"use client";
import { useState } from "react";
import { Greeting } from "@/components/dashboard/Greeting";
import { CommandBar } from "@/components/dashboard/CommandBar";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { AgentTiles } from "@/components/dashboard/AgentTiles";
import { RecentActivity } from "@/components/dashboard/RecentActivity";

import { useWorkspace } from "@/components/dashboard/WorkspaceProvider";
import { AVAILABLE_MODELS } from "@/lib/constants";
import { ChatMessage } from "@/types";
import { ChatMessages } from "@/components/dashboard/ChatMessages";
import { Brain, Sparkles, MessageSquare, ArrowLeft, Bot as BotIcon } from "lucide-react";

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
          <h1 className="text-4xl font-bold text-text">Multi-Chat Mode</h1>
          <p className="mt-2 text-text-muted">
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
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-text-muted">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-bold text-text">
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
              <div className="mt-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-text-dim">
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
    <div className="relative mx-auto flex h-full w-full max-w-5xl flex-col px-6 sm:px-10 lg:px-16">
      {isChatting ? (
        <div className="flex flex-1 flex-col py-10 animate-in fade-in duration-500">
          <div className="mb-6 flex items-center justify-between">
            <button
              onClick={() => setMessages([])}
              className="group flex items-center gap-2.5 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-2 text-xs font-bold uppercase tracking-widest text-text-muted transition-all hover:bg-white/10 hover:text-text"
            >
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
              New session
            </button>
            
            <div className="flex items-center gap-2 rounded-full border border-violet/20 bg-violet/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-violet-light">
              <Sparkles className="h-3 w-3" />
              Conversation Active
            </div>
          </div>

          <ChatMessages messages={messages} isLoading={isLoading} />

          {/* Sticky input area */}
          <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center bg-gradient-to-t from-[#050505] via-[#050505]/95 to-transparent pb-10 pt-20 lg:pl-64">
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
        <div className="flex flex-1 flex-col items-center justify-center py-20 animate-in fade-in zoom-in-[0.98] duration-1000">
          <div className="mb-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-3xl border border-violet/20 bg-violet/5 shadow-[0_20px_40px_rgba(0,0,0,0.4),inset_0_2px_4px_rgba(255,255,255,0.05)]">
               <BotIcon className="h-10 w-10 text-violet-light" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-text sm:text-5xl">
              What can I help with?
            </h1>
          </div>

          <div className="w-full max-w-3xl animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-150">
            <CommandBar
              input={input}
              handleInputChange={handleInputChange}
              onSubmit={handleSubmit}
              placeholder="Message Nexora..."
            />
          </div>

          {/* Feature Grid */}
          <div className="mt-24 grid w-full max-w-5xl grid-cols-1 gap-6 md:grid-cols-3 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
             <div className="group rounded-3xl border border-white/5 bg-white/[0.02] p-6 transition-all hover:bg-white/[0.04] hover:border-violet/20">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-violet/10 text-violet-light">
                   <Brain className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-sm font-bold text-text uppercase tracking-wider">Expert Agents</h3>
                <p className="text-xs leading-relaxed text-text-muted font-medium">Switch between Researcher, Developer, or Analyst for specialized workflows.</p>
             </div>
             <div className="group rounded-3xl border border-white/5 bg-white/[0.02] p-6 transition-all hover:bg-white/[0.04] hover:border-violet/20">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                   <MessageSquare className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-sm font-bold text-text uppercase tracking-wider">Multi-Chat</h3>
                <p className="text-xs leading-relaxed text-text-muted font-medium">Enable Multi-Chat to compare outputs from Llama 3, GPT-4, and Gemini side-by-side.</p>
             </div>
             <div className="group rounded-3xl border border-white/5 bg-white/[0.02] p-6 transition-all hover:bg-white/[0.04] hover:border-violet/20">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                   <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-sm font-bold text-text uppercase tracking-wider">Smart Search</h3>
                <p className="text-xs leading-relaxed text-text-muted font-medium">Use AI Agent mode for deep research and real-time knowledge discovery.</p>
             </div>
          </div>
          
          <div className="mt-20 w-full animate-in fade-in duration-1000 delay-500">
             <RecentActivity />
          </div>
        </div>
      )}
    </div>
  );
}
