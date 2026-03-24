"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

import { AIModel, AIAgent } from "@/types";
import { AVAILABLE_MODELS, AVAILABLE_AGENTS } from "@/lib/constants";

interface WorkspaceContextType {
  selectedModel: string;
  setSelectedModel: (id: string) => void;
  selectedAgent: string;
  setSelectedAgent: (id: string) => void;
  isMultiChat: boolean;
  setIsMultiChat: (val: boolean) => void;
  omniProvider: "groq" | "openrouter";
  setOmniProvider: (provider: "groq" | "openrouter") => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0].id);
  const [selectedAgent, setSelectedAgent] = useState(AVAILABLE_AGENTS[0].id);
  const [isMultiChat, setIsMultiChat] = useState(false);
  const [omniProvider, setOmniProvider] = useState<"groq" | "openrouter">(
    "groq",
  );

  return (
    <WorkspaceContext.Provider
      value={{
        selectedModel,
        setSelectedModel,
        selectedAgent,
        setSelectedAgent,
        isMultiChat,
        setIsMultiChat,
        omniProvider,
        setOmniProvider,
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
