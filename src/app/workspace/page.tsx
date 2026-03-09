"use client";
import { useState } from "react";
import { Greeting } from "@/components/ui/Greeting";
import { CommandBar } from "@/components/chat/CommandBar";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { AgentTiles } from "@/components/ui/AgentTiles";
import { RecentActivity } from "@/components/dashboard/RecentActivity";

import { useWorkspace } from "@/components/dashboard/WorkspaceProvider";
import { AVAILABLE_MODELS } from "@/lib/constants";
import { getCompetingModelIds } from "@/lib/settings";
import { ChatMessage } from "@/types";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { MultiChatMode } from "@/components/chat/MultiChatMode";
import {
  Brain,
  Sparkles,
  MessageSquare,
  ArrowLeft,
  Bot as BotIcon,
} from "lucide-react";

export default function WorkspacePage() {
  const { isMultiChat, selectedModel, selectedAgent } = useWorkspace();
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

    // Redirect to omni agent with the user's query
    const encodedQuery = encodeURIComponent(query);
    window.location.href = `/agents?type=omni&q=${encodedQuery}`;
  };

  const isChatting = messages.length > 0;

  if (isMultiChat) {
    return (
      <div className="flex h-[calc(100vh-4rem)] w-full flex-col animate-in fade-in duration-500">
        <MultiChatMode
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
        />
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex h-full w-full max-w-6xl flex-col px-6 sm:px-10 lg:px-16">
      {isChatting ? (
        <div className="flex flex-1 flex-col py-10 animate-in fade-in duration-500">
          <ChatMessages
            messages={messages}
            isLoading={isLoading}
            agentId={selectedAgent}
          />

          {/* Command bar - Fixed at bottom */}
          <div className="sticky bottom-0 z-20 mt-auto bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/95 to-transparent pt-12 pb-10 -mx-6 sm:-mx-10 lg:-mx-16 px-6 sm:px-10 lg:px-16 flex justify-center">
            <div className="w-full max-w-4xl">
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
            <h1 className="font-display text-[var(--text-4xl)] font-bold tracking-tight text-text sm:text-[var(--text-5xl)]">
              What can I help with?
            </h1>
          </div>

          <div className="w-full max-w-4xl animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-150">
            <CommandBar
              input={input}
              handleInputChange={handleInputChange}
              onSubmit={handleSubmit}
              placeholder="Message Nexora..."
            />
          </div>
        </div>
      )}
    </div>
  );
}
