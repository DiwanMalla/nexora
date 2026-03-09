"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown, ExternalLink, Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { CommandBar } from "@/components/chat/CommandBar";

interface MultiChatTopBarProps {
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement> | React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
}

export function MultiChatMode({ input, handleInputChange, handleSubmit }: MultiChatTopBarProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>("gemini");
  
  const [gptSearch, setGptSearch] = useState(true);
  const [geminiSearch, setGeminiSearch] = useState(true);
  const [deepseekSearch, setDeepseekSearch] = useState(true);

  const toggleDropdown = (id: string) => {
    setOpenDropdown(openDropdown === id ? null : id);
  };

  return (
    <div className="flex h-full w-full flex-col bg-[#0A0A0A]">
      {/* Top Bar with 3 Model Selectors */}
      <div className="grid w-full grid-cols-3 gap-px bg-white/5 border-b border-white/10">
        
        {/* Column 1: GPT */}
        <div className="flex items-center justify-between bg-[#0A0A0A] px-4 py-3 relative">
          <button 
            onClick={() => toggleDropdown("gpt")}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-[#141414] px-3 py-1.5 transition-colors hover:bg-white/5"
          >
            <div className="relative h-4 w-4 overflow-hidden rounded-sm bg-white p-0.5">
              <Image 
                src="/ai-provider logo/openai.png" 
                alt="OpenAI" 
                fill 
                className="object-cover invert" 
              />
            </div>
            <span className="text-sm font-medium text-white/90">GPT-5 mini</span>
            <ChevronDown className="h-3.5 w-3.5 text-white/50" />
          </button>
          
          <div className="flex items-center gap-3">
            <button className="text-white/50 hover:text-white/80 transition-colors">
              <ExternalLink className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setGptSearch(!gptSearch)}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
                gptSearch ? "bg-[#10A37F]" : "bg-white/10"
              )}
            >
              <span className={cn(
                "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                gptSearch ? "translate-x-4" : "translate-x-0"
              )} />
            </button>
          </div>
        </div>

        {/* Column 2: Gemini */}
        <div className="flex items-center justify-between bg-[#0A0A0A] px-4 py-3 relative border-l border-white/5">
          <button 
            onClick={() => toggleDropdown("gemini")}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-[#141414] px-3 py-1.5 transition-colors hover:bg-white/5 relative"
          >
            <div className="relative h-4 w-4 flex items-center justify-center text-blue-400">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M12 2L15.09 8.09L22 12L15.09 15.91L12 22L8.91 15.91L2 12L8.91 8.09L12 2Z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-white/90">Gemini 2.5 Lite</span>
            <ChevronDown className="h-3.5 w-3.5 text-white/50" />
            
            {/* Gemini Dropdown */}
            {openDropdown === "gemini" && (
              <div className="absolute top-12 left-0 z-50 w-56 rounded-xl border border-white/10 bg-[#1E1E24] shadow-2xl overflow-hidden py-1">
                <div className="px-3 py-2">
                  <span className="text-xs font-bold text-white/50 tracking-wider">Standard</span>
                </div>
                <div className="flex flex-col">
                  <button className="flex items-center justify-between px-3 py-2 text-sm text-white/80 hover:bg-white/5 transition-colors">
                    <span>Gemini 3 Flash</span>
                  </button>
                  <button className="flex items-center justify-between px-3 py-2 text-sm text-white/90 hover:bg-white/5 transition-colors">
                    <span className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-white" />
                      Gemini 2.5 Lite
                    </span>
                  </button>
                  <button className="flex items-center justify-between px-3 py-2 text-sm text-white/80 hover:bg-white/5 transition-colors">
                    <span>Gemini 2.5 Flash</span>
                  </button>
                </div>
                
                <div className="px-3 pt-3 pb-2 mt-1 border-t border-white/5">
                  <span className="text-xs font-bold text-white/50 tracking-wider">Premium</span>
                </div>
                <div className="flex flex-col">
                  <button className="flex items-center justify-between px-3 py-2 text-sm text-white/40 cursor-not-allowed">
                    <span className="flex items-center gap-2">
                      <Lock className="h-3.5 w-3.5" />
                      Gemini 3 Pro
                    </span>
                    <span className="rounded bg-white/10 px-1 py-0.5 text-[10px]">PRO</span>
                  </button>
                  <button className="flex items-center justify-between px-3 py-2 text-sm text-white/40 cursor-not-allowed">
                    <span className="flex items-center gap-2">
                      <Lock className="h-3.5 w-3.5" />
                      Gemini 2.5 Pro
                    </span>
                    <span className="rounded bg-white/10 px-1 py-0.5 text-[10px]">PRO</span>
                  </button>
                </div>
              </div>
            )}
          </button>
          
          <div className="flex items-center gap-3">
            <button className="text-white/50 hover:text-white/80 transition-colors">
              <ExternalLink className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setGeminiSearch(!geminiSearch)}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
                geminiSearch ? "bg-[#10A37F]" : "bg-white/10"
              )}
            >
              <span className={cn(
                "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                geminiSearch ? "translate-x-4" : "translate-x-0"
              )} />
            </button>
          </div>
        </div>

        {/* Column 3: DeepSeek */}
        <div className="flex items-center justify-between bg-[#0A0A0A] px-4 py-3 relative border-l border-white/5">
          <button 
            onClick={() => toggleDropdown("deepseek")}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-[#141414] px-3 py-1.5 transition-colors hover:bg-white/5"
          >
            <div className="relative h-4 w-4 overflow-hidden rounded-sm bg-blue-600">
              <Image 
                src="/ai-provider logo/deepseek.jpg" 
                alt="DeepSeek" 
                fill 
                className="object-cover"
              />
            </div>
            <span className="text-sm font-medium text-white/90">DeepSeek Chat</span>
            <ChevronDown className="h-3.5 w-3.5 text-white/50" />
          </button>
          
          <div className="flex items-center gap-3">
            <button className="text-white/50 hover:text-white/80 transition-colors">
              <ExternalLink className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setDeepseekSearch(!deepseekSearch)}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
                deepseekSearch ? "bg-[#10A37F]" : "bg-white/10"
              )}
            >
              <span className={cn(
                "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                deepseekSearch ? "translate-x-4" : "translate-x-0"
              )} />
            </button>
          </div>
        </div>

      </div>

      {/* Chat Area - 3 Columns */}
      <div className="flex-1 grid grid-cols-3 gap-px bg-white/5">
        <div className="bg-[#0A0A0A] flex flex-col h-full relative">
          <div className="flex-1 overflow-y-auto p-4">
             {/* Chat messages would go here */}
          </div>
        </div>
        
        <div className="bg-[#0A0A0A] flex flex-col h-full relative border-l border-white/5">
          <div className="flex-1 overflow-y-auto p-4">
             {/* Chat messages would go here */}
          </div>
        </div>
        
        <div className="bg-[#0A0A0A] flex flex-col h-full relative border-l border-white/5">
          <div className="flex-1 overflow-y-auto p-4">
             {/* Chat messages would go here */}
          </div>
        </div>
      </div>

      {/* Shared Command Bar at Bottom */}
      <div className="border-t border-white/5 bg-[#0A0A0A] p-4 flex justify-center pb-10">
        <div className="w-full max-w-3xl">
          <CommandBar
            input={input}
            handleInputChange={handleInputChange}
            onSubmit={handleSubmit}
            compact
            placeholder="Ask all models..."
          />
        </div>
      </div>
    </div>
  );
}
