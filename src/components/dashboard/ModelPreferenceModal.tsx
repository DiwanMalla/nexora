"use client";

import React from "react";
import { X, Check, Brain, Zap, Globe, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import { AVAILABLE_MODELS } from "@/lib/constants";
import { AIModel } from "@/types";
import { useWorkspace } from "./WorkspaceProvider";

interface ModelPreferenceModalProps {
  open: boolean;
  onClose: () => void;
}

export function ModelPreferenceModal({ open, onClose }: ModelPreferenceModalProps) {
  const { selectedModel, setSelectedModel } = useWorkspace();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-border bg-bg-elevated shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-surface-overlay px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet/20 border border-violet/30">
              <Brain className="h-5 w-5 text-violet-light" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text">Model Preference</h2>
              <p className="text-xs font-semibold text-text-dim uppercase tracking-widest">Select your active LLM</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-text-dim transition-colors hover:bg-surface-overlay hover:text-text"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* List */}
        <div className="p-6">
          <div className="space-y-3">
            {AVAILABLE_MODELS.map((model: AIModel) => {
              const isActive = selectedModel === model.id;
              return (
                <button
                  key={model.id}
                  onClick={() => {
                    setSelectedModel(model.id);
                    onClose();
                  }}
                  className={cn(
                    "group relative flex w-full items-center justify-between rounded-2xl border p-4 transition-all duration-300",
                    isActive
                      ? "border-violet/40 bg-violet/10"
                      : "border-border bg-surface-overlay hover:border-border-hover hover:bg-surface-overlay-strong"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-xl border transition-all duration-300",
                      isActive ? "bg-violet text-white border-violet-light shadow-lg" : "bg-bg-card border-border text-text-muted group-hover:text-text"
                    )}>
                      {model.id.includes('llama') && <Cpu className="h-6 w-6" />}
                      {model.id.includes('gpt') && <Zap className="h-6 w-6" />}
                      {model.id.includes('arabic') && <Globe className="h-6 w-6" />}
                      {!model.id.includes('llama') && !model.id.includes('gpt') && !model.id.includes('arabic') && <Brain className="h-6 w-6" />}
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-bold text-text">{model.name}</div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-text-dim">{model.provider}</div>
                    </div>
                  </div>
                  {isActive && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet shadow-lg">
                      <Check className="h-3.5 w-3.5 text-white stroke-[3px]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/5 bg-white/[0.02] px-8 py-4">
          <p className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-600">
            Powered by Groq & OpenRouter
          </p>
        </div>
      </div>
    </div>
  );
}
