"use client";


import { useState, useRef, useEffect } from "react";
import { CommandBar } from "@/components/chat/CommandBar";
import { Bot, User, Presentation, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

type SlideDeck = {
  title: string;
  slides: {
    title: string;
    bullets: string[];
  }[];
};

function extractSlideDeck(content: string): SlideDeck | null {
  const match = content.match(/```json\n([\s\S]*?)\n```/);
  if (match && match[1]) {
    try {
      return JSON.parse(match[1]);
    } catch (e) {
      return null;
    }
  }
  return null;
}

function stripJsonBlock(content: string) {
  return content.replace(/```json\n([\s\S]*?)\n```/g, "").trim();
}

export default function SlidesPage() {
  const [messages, setMessages] = useState<Array<{ id: string, role: string, content: string }>>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (e: any) => setInput(e.target.value);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { id: Date.now().toString(), role: "user", content: input };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages })
      });

      if (!res.body) throw new Error("No body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      const assistantId = (Date.now() + 1).toString();

      setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("0:")) {
            try {
              const text = JSON.parse(line.substring(2));
              assistantContent += text;
              setMessages(prev => {
                const latest = [...prev];
                if (latest[latest.length - 1].id === assistantId) {
                  latest[latest.length - 1].content = assistantContent;
                }
                return latest;
              });
            } catch (err) {}
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  // Find the latest valid slide deck from assistant messages
  let currentDeck: SlideDeck | null = null;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") {
      const deck = extractSlideDeck(messages[i].content);
      if (deck) {
        currentDeck = deck;
        break;
      }
    }
  }

  const isStarted = messages.length > 0;

  return (
    <div className="flex h-full w-full bg-bg">
      {!isStarted ? (
        <div className="flex h-full w-full flex-col items-center justify-center p-4">
          <div className="mb-8 flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-overlay-strong shadow-lg">
              <Presentation className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-text">AI Slides</h1>
            <p className="max-w-md text-text-muted">
              Generate presentation slides to communicate your ideas clearly. Tell us what you want to present.
            </p>
          </div>
          <div className="w-full max-w-2xl">
            <CommandBar
              input={input}
              handleInputChange={handleInputChange}
              onSubmit={handleSubmit}
              placeholder="E.g., 'Make a presentation on climate change' or 'Create 5 slides for a pitch deck'"
              wide
              showModelSelector={false}
            />
          </div>
        </div>
      ) : (
        <div className="flex h-full w-full flex-col lg:flex-row overflow-hidden">
          {/* Left Side: Slide Preview (2/3 width on large screens) */}
          <div className="flex flex-1 flex-col overflow-y-auto bg-surface-overlay-strong/30 border-r border-border p-6 lg:p-8">
            {currentDeck ? (
              <div className="mx-auto w-full max-w-4xl space-y-8 pb-12">
                <div className="mb-6">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-text-muted">Presentation Preview</h2>
                  <h1 className="mt-2 text-2xl font-bold text-text">{currentDeck.title}</h1>
                </div>
                {currentDeck.slides.map((slide, i) => (
                  <div
                    key={i}
                    className="aspect-[16/9] w-full shrink-0 flex flex-col overflow-hidden rounded-2xl border border-border bg-bg-elevated shadow-xl transition-all"
                  >
                    <div className="flex items-center border-b border-border bg-surface-overlay px-6 py-4">
                      <h3 className="text-xl font-bold text-text">{slide.title}</h3>
                    </div>
                    <div className="flex flex-1 flex-col p-8">
                      <ul className="list-disc pl-6 space-y-4 text-lg text-text-muted">
                        {slide.bullets.map((bullet, j) => (
                          <li key={j} className="leading-relaxed">{bullet}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-auto flex items-center justify-between border-t border-border px-6 py-3 text-xs font-semibold text-text-dim">
                      <span>Nexora AI</span>
                      <span>{i + 1}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center text-center">
                <Presentation className="mb-4 h-12 w-12 text-text-muted/50 animate-pulse" />
                <p className="text-text-muted font-medium">Generating slides...</p>
              </div>
            )}
          </div>

          {/* Right Side: Chat Panel (1/3 width) */}
          <div className="flex h-full w-full flex-col lg:w-[400px] xl:w-[480px] bg-bg shrink-0">
            <div className="flex items-center border-b border-border bg-surface-overlay px-4 py-3">
              <h3 className="text-sm font-bold text-text">Refinement Chat</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {messages.map((m) => {
                const text = stripJsonBlock(m.content);
                if (!text && m.role === 'assistant') return null; // Don't render empty messages if all it was was JSON
                
                return (
                  <div
                    key={m.id}
                    className={cn(
                      "flex gap-3 text-sm",
                      m.role === "assistant" ? "flex-row" : "flex-row-reverse"
                    )}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-overlay-strong/50 border border-border">
                      {m.role === "assistant" ? (
                        <Bot className="h-4 w-4 text-primary" />
                      ) : (
                        <User className="h-4 w-4 text-text" />
                      )}
                    </div>
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-2.5 max-w-[85%]",
                        m.role === "assistant"
                          ? "bg-surface-overlay border border-border/50 text-text leading-relaxed"
                          : "bg-surface-invert text-surface-invert-text"
                      )}
                    >
                      <div className="prose prose-invert prose-sm">
                        <ReactMarkdown>{text}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                );
              })}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex gap-3 text-sm">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-overlay-strong/50 border border-border">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="rounded-2xl bg-surface-overlay px-4 py-2.5 border border-border/50">
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: "0ms" }}></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: "150ms" }}></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: "300ms" }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} className="h-px w-full" />
            </div>
            
            <div className="border-t border-border bg-bg-elevated p-3">
              <CommandBar
                input={input}
                handleInputChange={handleInputChange}
                onSubmit={handleSubmit}
                placeholder="E.g. 'Make it shorter' or 'Add a slide on market size'"
                compact
                showModelSelector={false}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
