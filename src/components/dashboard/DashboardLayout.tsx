"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { UserButton, useUser } from "@clerk/nextjs";
import {
  PanelLeftClose,
  PanelLeft,
  Plus,
  Home,
  Search,
  Bell,
  ChevronRight,
  ArrowRight,
  Hexagon,
  Settings,
  Brain,
  Bot as BotIcon,
  ChevronDown,
  Sparkles as SparklesIcon,
  BarChart3,
  Code2,
  MessageSquare,
  Clock,
  Presentation,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AccountSettingsModal } from "@/components/dashboard/AccountSettingsModal";
import { ModelPreferenceModal } from "@/components/dashboard/ModelPreferenceModal";
import { useWorkspace } from "./WorkspaceProvider";
import { AVAILABLE_MODELS, AVAILABLE_AGENTS } from "@/lib/constants";

const mainNav = [
  { href: "/workspace", label: "Home", icon: Home },
  { href: "/agents?type=aichat", label: "AI Chat", icon: SparklesIcon },
  { href: "/slides", label: "AI Slide", icon: Presentation },
];

import { FOCUS_RING } from "@/lib/styles";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [modelModalOpen, setModelModalOpen] = useState(false);
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false);
  const [historyDropdownOpen, setHistoryDropdownOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<
    Array<{
      id: string;
      title: string;
      agent_type: string | null;
      updated_at: string;
      last_message_at: string | null;
    }>
  >([]);

  const displayName =
    user?.fullName?.trim() ||
    (user?.firstName || user?.lastName
      ? [user.firstName, user.lastName].filter(Boolean).join(" ")
      : null) ||
    user?.primaryEmailAddress?.emailAddress ||
    user?.username ||
    "Account";

  const { selectedModel, selectedAgent, setSelectedAgent } = useWorkspace();
  
  const activeModelObj = AVAILABLE_MODELS.find(m => m.id === selectedModel);
  const activeAgentObj = AVAILABLE_AGENTS.find(a => a.id === selectedAgent);

  const getAgentIcon = (id: string) => {
    switch (id) {
      case "omni": return BotIcon;
      case "aichat": return SparklesIcon;
      case "researcher": return Search;
      case "coder": return Code2;
      case "analyst": return BarChart3;
      default: return BotIcon;
    }
  };

  const ActiveAgentIcon = getAgentIcon(selectedAgent);

  useEffect(() => {
    if (!historyDropdownOpen || !sidebarOpen) return;
    let active = true;
    setHistoryLoading(true);
    setHistoryError(null);

    void fetch("/api/history?limit=12", { cache: "no-store" })
      .then(async (res) => {
        const payload = (await res.json()) as {
          items?: Array<{
            id: string;
            title: string;
            agent_type: string | null;
            updated_at: string;
            last_message_at: string | null;
          }>;
          error?: string;
          details?: string;
        };
        if (!active) return;
        if (!res.ok) {
          throw new Error(payload.details || payload.error || "Unable to load history.");
        }
        setHistoryItems(payload.items ?? []);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setHistoryError(err instanceof Error ? err.message : "Unable to load history.");
      })
      .finally(() => {
        if (!active) return;
        setHistoryLoading(false);
      });

    return () => {
      active = false;
    };
  }, [historyDropdownOpen, sidebarOpen]);

  return (
    <div
      className="flex h-screen overflow-hidden bg-[var(--bg)]"
      style={
        {
          "--sidebar-width": sidebarOpen ? "15rem" : "68px",
        } as React.CSSProperties
      }
    >
      {/* ─── Sidebar ─── */}
      <aside
        className={cn(
          "relative flex shrink-0 flex-col border-r border-border bg-bg-elevated transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          sidebarOpen ? "w-60" : "w-[68px]",
        )}
        aria-label="Workspace navigation"
      >
        {/* Sidebar header */}
        <div className="flex h-16 items-center gap-3 border-b border-border bg-surface-overlay px-4">
          <Link
            href="/workspace"
            className="flex items-center gap-3 overflow-hidden"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-overlay-strong border border-border shadow-sm">
              <Hexagon
                className="h-4.5 w-4.5 text-text"
                aria-hidden
              />
            </div>
            {sidebarOpen && (
              <span className="font-sans text-lg font-bold tracking-tight text-text">
                Nexora
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={cn(
              "ml-auto rounded-lg p-1.5 text-text-muted transition-all hover:bg-surface-overlay hover:text-text active:scale-90",
              FOCUS_RING,
            )}
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* New button */}
        <div className="px-3.5 pt-4">
          <Link
            href="/agents?type=aichat"
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-bold transition-all duration-200",
              "bg-surface-invert text-surface-invert-text",
              "shadow-sm hover:opacity-90 active:scale-95",
              FOCUS_RING,
              !sidebarOpen && "justify-center px-0",
            )}
          >
            <Plus className="h-4 w-4 shrink-0 stroke-[2.5px]" />
            {sidebarOpen && <span>New chat</span>}
          </Link>
        </div>

        {/* Active Agent Section */}
        <div className="px-3.5 pt-4">
          <div className={cn(
            "flex items-center gap-3 rounded-xl border border-border bg-surface-overlay p-3 transition-all",
            !sidebarOpen && "justify-center px-0"
          )}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-overlay-strong border border-border">
              <ActiveAgentIcon className="h-4 w-4 text-text" />
            </div>
            {sidebarOpen && (
              <div className="flex min-w-0 flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-dim">Active Agent</span>
                <span className="truncate text-xs font-bold text-text">{activeAgentObj?.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Preference Tabs */}
        <div className="mt-4 flex flex-col gap-1 px-2.5">
          {/* Model Preference Tab */}
          <button
            onClick={() => setModelModalOpen(true)}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all duration-200 text-text-muted hover:bg-surface-overlay hover:text-text",
              FOCUS_RING,
              !sidebarOpen && "justify-center px-0"
            )}
          >
            <Brain className="h-4 w-4 shrink-0 transition-colors group-hover:text-text" />
            {sidebarOpen && (
              <div className="flex flex-1 items-center justify-between">
                <span>Model Selection</span>
                <div className="rounded-md bg-surface-overlay px-1.5 py-0.5 text-[9px] font-bold text-text-dim">{activeModelObj?.name.split(' ')[0]}</div>
              </div>
            )}
          </button>

          {/* AI Agent Selector Tab */}
          <div className="relative">
            <button
              onClick={() => setAgentDropdownOpen(!agentDropdownOpen)}
              className={cn(
                "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all duration-200 text-[var(--text-muted)] hover:bg-surface-overlay hover:text-text",
                FOCUS_RING,
                !sidebarOpen && "justify-center px-0"
              )}
            >
              <SparklesIcon className="h-4 w-4 shrink-0 transition-colors group-hover:text-text" />
              {sidebarOpen && (
                <div className="flex flex-1 items-center justify-between">
                  <span>Switch Agent</span>
                  <ChevronDown className={cn("h-3 w-3 transition-transform", agentDropdownOpen && "rotate-180")} />
                </div>
              )}
            </button>
            
            {agentDropdownOpen && sidebarOpen && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-border bg-bg-elevated shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                {AVAILABLE_AGENTS.filter(a => a.id !== 'omni').map((agent) => {
                  const AgentIcon = getAgentIcon(agent.id);
                  const disableHoverForAiChatInOmni =
                    selectedAgent === "omni" && agent.id === "aichat";
                  return (
                    <button
                      key={agent.id}
                      onClick={() => {
                        setSelectedAgent(agent.id);
                        setAgentDropdownOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-3 text-xs font-bold transition-all",
                        selectedAgent === agent.id
                          ? "bg-surface-overlay-strong text-text"
                          : disableHoverForAiChatInOmni
                            ? "text-text-muted"
                            : "text-text-muted hover:bg-surface-overlay hover:text-text"
                      )}
                    >
                      <AgentIcon className={cn("h-4 w-4", selectedAgent === agent.id ? "text-text" : "text-text-dim")} />
                      {agent.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Nav links */}
        <nav className="mt-5 flex flex-1 flex-col gap-1 px-2.5">
          {sidebarOpen && (
            <span className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-text-dim">
              Platform
            </span>
          )}
          {mainNav.map(({ href, label, icon: Icon }) => {
            const navType = href.startsWith("/agents")
              ? new URLSearchParams(href.split("?")[1] ?? "").get("type")
              : null;
            const currentType = searchParams.get("type");
            const isAgentRoute = pathname.startsWith("/agents");
            const isActive = href.startsWith("/agents")
              ? isAgentRoute &&
                (currentType ?? "aichat") === (navType ?? "aichat")
              : pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-semibold transition-all duration-200",
                  isActive
                    ? "bg-surface-overlay-strong text-text shadow-sm"
                    : "text-text-muted hover:bg-surface-overlay hover:text-text",
                  FOCUS_RING,
                  !sidebarOpen && "justify-center px-0",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r-full bg-surface-invert shadow-sm" />
                )}
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    isActive ? "text-text" : "group-hover:text-text",
                  )}
                  aria-hidden
                />
                {sidebarOpen && <span>{label}</span>}
              </Link>
            );
          })}

          {/* History tab (below AI Chat) */}
          <div className="relative">
            <button
              onClick={() => setHistoryDropdownOpen((v) => !v)}
              className={cn(
                "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-semibold transition-all duration-200",
                historyDropdownOpen
                  ? "bg-surface-overlay-strong text-text shadow-sm"
                  : "text-text-muted hover:bg-surface-overlay hover:text-text",
                FOCUS_RING,
                !sidebarOpen && "justify-center px-0",
              )}
            >
              <Clock
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  historyDropdownOpen ? "text-text" : "group-hover:text-text",
                )}
              />
              {sidebarOpen && (
                <div className="flex flex-1 items-center justify-between">
                  <span>History</span>
                  <ChevronDown
                    className={cn(
                      "h-3 w-3 transition-transform",
                      historyDropdownOpen && "rotate-180",
                    )}
                  />
                </div>
              )}
            </button>

            {historyDropdownOpen && sidebarOpen && (
              <div className="mt-1 overflow-hidden rounded-xl border border-border bg-bg-elevated shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                  {historyLoading && (
                    <div className="px-2 py-2 text-[11px] font-semibold text-text-muted">
                      Loading history...
                    </div>
                  )}
                  {historyError && !historyLoading && (
                    <div className="px-2 py-2 text-[11px] font-semibold text-red-300">
                      {historyError}
                    </div>
                  )}
                  {!historyLoading && !historyError && historyItems.length === 0 && (
                    <div className="px-2 py-2 text-[11px] font-semibold text-text-muted">
                      No conversations yet.
                    </div>
                  )}
                  {!historyLoading &&
                    !historyError &&
                    historyItems.map((item) => {
                      const type = item.agent_type || "aichat";
                      return (
                        <Link
                          key={item.id}
                          href={`/agents?type=${encodeURIComponent(type)}&id=${encodeURIComponent(item.id)}`}
                          onClick={() => setHistoryDropdownOpen(false)}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[11px] font-semibold text-text-muted hover:bg-surface-overlay hover:text-text transition-colors"
                          title={item.title || "Untitled conversation"}
                        >
                          <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">
                            {item.title?.trim() || "Untitled conversation"}
                          </span>
                        </Link>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* User */}
        <div
          className={cn(
            "flex items-center gap-3 border-t border-border bg-surface-overlay px-4 py-4",
            !sidebarOpen && "justify-center",
          )}
        >
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-border">
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                variables: { colorPrimary: "#ffffff" },
                elements: { avatarBox: "h-8 w-8" },
              }}
            />
          </div>
          {sidebarOpen && (
            <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-[11px] font-bold text-text">
                  {displayName}
                </span>
                <span className="truncate text-[9px] font-bold text-text-dim uppercase tracking-widest">
                  Personal Account
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className={cn(
                  "rounded-lg p-1.5 text-text-muted transition-all hover:bg-surface-overlay hover:text-text",
                  FOCUS_RING,
                )}
                aria-label="Open account settings"
              >
                <Settings className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ─── Main area ─── */}
      <div className="flex flex-1 flex-col overflow-hidden">


        {/* Content area */}
        <main className="relative flex-1 overflow-y-auto">
          <div className="relative z-10 min-h-full px-4 py-6 sm:px-6 lg:px-8 font-sans">{children}</div>
        </main>
      </div>

      <AccountSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
      <ModelPreferenceModal
        open={modelModalOpen}
        onClose={() => setModelModalOpen(false)}
      />
    </div>
  );
}
