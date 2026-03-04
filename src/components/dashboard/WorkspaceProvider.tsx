"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

export type AIModel = {
  id: string;
  name: string;
  provider: string;
};

export const AVAILABLE_MODELS: AIModel[] = [
  { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", provider: "Groq" },
  { id: "openai/gpt-oss-120b", name: "GPT-OSS 120B", provider: "OpenRouter" },
  { id: "canopylabs/orpheus-arabic-saudi", name: "Orpheus Arabic", provider: "Canopy" },
  { id: "moonshotai/kimi-k2-instruct-0905", name: "Kimi K2", provider: "Moonshot" },
  { id: "qwen/qwen3-32b", name: "Qwen 3 32B", provider: "Alibaba" },
];

export type AIAgent = {
  id: string;
  name: string;
  icon: string;
};

export const AVAILABLE_AGENTS: AIAgent[] = [
  { id: "ai-chat", name: "AI Chat", icon: "Bot" },
  { id: "researcher", name: "Researcher", icon: "Search" },
  { id: "coder", name: "Developer", icon: "Code2" },
  { id: "analyst", name: "Analyst", icon: "BarChart3" },
];

interface WorkspaceContextType {
  selectedModel: string;
  setSelectedModel: (id: string) => void;
  selectedAgent: string;
  setSelectedAgent: (id: string) => void;
  isMultiChat: boolean;
  setIsMultiChat: (val: boolean) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0].id);
  const [selectedAgent, setSelectedAgent] = useState(AVAILABLE_AGENTS[0].id);
  const [isMultiChat, setIsMultiChat] = useState(false);

  return (
    <WorkspaceContext.Provider
      value={{
        selectedModel,
        setSelectedModel,
        selectedAgent,
        setSelectedAgent,
        isMultiChat,
        setIsMultiChat,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
