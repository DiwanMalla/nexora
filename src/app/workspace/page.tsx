/**
 * WorkspacePage — The main landing page after login.
 *
 * Shows an empty state with a command bar. Typing a query redirects
 * to the Omni agent. Multi-chat mode is also handled here.
 *
 * Refactored: Removed unused imports and dead code paths.
 */

"use client";

import { useState } from "react";
import { CommandBar } from "@/components/chat/CommandBar";
import { MultiChatMode } from "@/components/chat/MultiChatMode";
import { useWorkspace } from "@/components/dashboard/WorkspaceProvider";
import type { ChatMessage } from "@/types";
import { Bot as BotIcon } from "lucide-react";

export default function WorkspacePage() {
  const { isMultiChat } = useWorkspace();
  const [messages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading] = useState(false);

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

  // ─── Multi-chat mode ──────────────────────────────────

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

  // ─── Default workspace view ────────────────────────────

  return (
    <div className="relative mx-auto flex h-full w-full max-w-6xl flex-col px-6 sm:px-10 lg:px-16">
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
    </div>
  );
}
