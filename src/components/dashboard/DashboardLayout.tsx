"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { UserButton } from "@clerk/nextjs";
import {
  PanelLeftClose,
  PanelLeft,
  Plus,
  Home,
  Inbox,
  LayoutGrid,
  FolderOpen,
  Search,
  Bell,
  Zap,
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AccountSettingsModal } from "@/components/dashboard/AccountSettingsModal";
import { ModelPreferenceModal } from "@/components/dashboard/ModelPreferenceModal";
import { useWorkspace } from "./WorkspaceProvider";
import { AVAILABLE_MODELS, AVAILABLE_AGENTS } from "@/lib/constants";

const mainNav = [
  { href: "/workspace", label: "Home", icon: Home },
  { href: "/agents?type=aichat", label: "AI Chat", icon: MessageSquare },
  { href: "/inbox", label: "AI Inbox", icon: Inbox },
  { href: "/discover", label: "Discover", icon: LayoutGrid },
  { href: "/drive", label: "AI Drive", icon: FolderOpen },
];

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [modelModalOpen, setModelModalOpen] = useState(false);
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false);
  
  const { selectedModel, selectedAgent, setSelectedAgent } = useWorkspace();
  
  const activeModelObj = AVAILABLE_MODELS.find(m => m.id === selectedModel);
  const activeAgentObj = AVAILABLE_AGENTS.find(a => a.id === selectedAgent);

  const getAgentIcon = (id: string) => {
    switch (id) {
      case "ai-chat": return BotIcon;
      case "researcher": return Search;
      case "coder": return Code2;
      case "analyst": return BarChart3;
      default: return BotIcon;
    }
  };

  const ActiveAgentIcon = getAgentIcon(selectedAgent);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
      {/* ─── Sidebar ─── */}
      <aside
        className={cn(
          "relative flex shrink-0 flex-col border-r border-white/[0.06] bg-[var(--bg-elevated)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          sidebarOpen ? "w-60" : "w-[68px]",
        )}
        aria-label="Workspace navigation"
      >
        {/* Sidebar header */}
        <div className="flex h-16 items-center gap-3 border-b border-white/[0.04] bg-white/[0.01] px-4">
          <Link
            href="/workspace"
            className="flex items-center gap-3 overflow-hidden"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.08] border border-white/10 shadow-sm">
              <Hexagon
                className="h-4.5 w-4.5 text-white"
                aria-hidden
              />
            </div>
            {sidebarOpen && (
              <span className="font-sans text-lg font-bold tracking-tight text-white">
                Nexora
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={cn(
              "ml-auto rounded-lg p-1.5 text-text-muted transition-all hover:bg-white/5 hover:text-text active:scale-90",
              focusRing,
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
              "bg-white text-black",
              "shadow-sm hover:bg-gray-200 active:scale-95",
              focusRing,
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
            "flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 transition-all",
            !sidebarOpen && "justify-center px-0"
          )}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 border border-white/10">
              <ActiveAgentIcon className="h-4 w-4 text-white" />
            </div>
            {sidebarOpen && (
              <div className="flex min-w-0 flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-dim">Active Agent</span>
                <span className="truncate text-xs font-bold text-white">{activeAgentObj?.name}</span>
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
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all duration-200 text-text-muted hover:bg-white/[0.04] hover:text-white",
              focusRing,
              !sidebarOpen && "justify-center px-0"
            )}
          >
            <Brain className="h-4 w-4 shrink-0 transition-colors group-hover:text-white" />
            {sidebarOpen && (
              <div className="flex flex-1 items-center justify-between">
                <span>Model Selection</span>
                <div className="rounded-md bg-white/5 px-1.5 py-0.5 text-[9px] font-bold text-text-dim">{activeModelObj?.name.split(' ')[0]}</div>
              </div>
            )}
          </button>

          {/* AI Agent Selector Tab */}
          <div className="relative">
            <button
              onClick={() => setAgentDropdownOpen(!agentDropdownOpen)}
              className={cn(
                "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all duration-200 text-[var(--text-muted)] hover:bg-white/[0.04] hover:text-white",
                focusRing,
                !sidebarOpen && "justify-center px-0"
              )}
            >
              <SparklesIcon className="h-4 w-4 shrink-0 transition-colors group-hover:text-white" />
              {sidebarOpen && (
                <div className="flex flex-1 items-center justify-between">
                  <span>Switch Agent</span>
                  <ChevronDown className={cn("h-3 w-3 transition-transform", agentDropdownOpen && "rotate-180")} />
                </div>
              )}
            </button>
            
            {agentDropdownOpen && sidebarOpen && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-white/10 bg-[#121212] shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                {AVAILABLE_AGENTS.map((agent) => {
                  const AgentIcon = getAgentIcon(agent.id);
                  return (
                    <button
                      key={agent.id}
                      onClick={() => {
                        setSelectedAgent(agent.id);
                        setAgentDropdownOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-3 text-xs font-bold transition-all",
                        selectedAgent === agent.id ? "bg-white/5 text-white" : "text-text-muted hover:bg-white/[0.02] hover:text-white"
                      )}
                    >
                      <AgentIcon className={cn("h-4 w-4", selectedAgent === agent.id ? "text-white" : "text-text-dim")} />
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
            const isActive =
              pathname === href ||
              (href.startsWith("/agents") && pathname === "/agents");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-semibold transition-all duration-200",
                  isActive
                    ? "bg-white/[0.06] text-white shadow-sm"
                    : "text-text-muted hover:bg-white/[0.04] hover:text-white",
                  focusRing,
                  !sidebarOpen && "justify-center px-0",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r-full bg-white shadow-sm" />
                )}
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    isActive ? "text-white" : "group-hover:text-white",
                  )}
                  aria-hidden
                />
                {sidebarOpen && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* System status card (sidebar open only) */}
        {sidebarOpen && (
          <div className="mx-3.5 mb-4 rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
              <Zap className="h-3 w-3 text-white" />
              Compute Nodes
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-bold text-text-dim uppercase tracking-widest">
                <span>Usage</span>
                <span>82%</span>
              </div>
              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full w-[82%] bg-white" />
              </div>
            </div>
          </div>
        )}

        {/* User */}
        <div
          className={cn(
            "flex items-center gap-3 border-t border-white/[0.04] bg-white/[0.01] px-4 py-4",
            !sidebarOpen && "justify-center",
          )}
        >
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-white/10">
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
                <span className="truncate text-[11px] font-bold text-white">
                  {/* @ts-ignore */}
                  Diwan Malla
                </span>
                <span className="truncate text-[9px] font-bold text-text-dim uppercase tracking-widest">
                  Personal Account
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className={cn(
                  "rounded-lg p-1.5 text-text-muted transition-all hover:bg-white/5 hover:text-text",
                  focusRing,
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
