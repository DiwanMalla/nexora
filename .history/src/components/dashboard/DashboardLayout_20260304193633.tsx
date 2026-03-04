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
  Hexagon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const mainNav = [
  { href: "/workspace", label: "Home", icon: Home },
  { href: "/inbox", label: "AI Inbox", icon: Inbox },
  { href: "/discover", label: "Discover", icon: LayoutGrid },
  { href: "/drive", label: "AI Drive", icon: FolderOpen },
];

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]";

export function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
      {/* ─── Sidebar ─── */}
      <aside
        className={cn(
          "relative flex shrink-0 flex-col border-r border-white/[0.06] bg-[var(--bg-elevated)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          sidebarOpen ? "w-60" : "w-[68px]"
        )}
        aria-label="Workspace navigation"
      >
        {/* Sidebar header */}
        <div className="flex h-14 items-center gap-2 border-b border-white/[0.06] px-3">
          <Link
            href="/workspace"
            className="flex items-center gap-2.5 overflow-hidden"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet to-cyan/70">
              <Hexagon className="h-4 w-4 text-white" aria-hidden />
            </span>
            {sidebarOpen && (
              <span className="font-display text-[15px] font-bold tracking-tight text-white">
                Nexora
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={cn(
              "ml-auto rounded-md p-1.5 text-[var(--text-dim)] transition hover:bg-white/5 hover:text-white",
              focusRing
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
        <div className="px-3 pt-3">
          <Link
            href="/workspace?new=1"
            className={cn(
              "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition",
              "bg-gradient-to-r from-violet/20 to-cyan/10 text-white",
              "border border-violet/20 hover:border-violet/40 hover:from-violet/30 hover:to-cyan/15",
              focusRing,
              !sidebarOpen && "justify-center px-0"
            )}
          >
            <Plus className="h-4 w-4 shrink-0" />
            {sidebarOpen && <span>New conversation</span>}
          </Link>
        </div>

        {/* Nav links */}
        <nav className="mt-4 flex flex-1 flex-col gap-0.5 px-2">
          {sidebarOpen && (
            <span className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--text-dim)]">
              Workspace
            </span>
          )}
          {mainNav.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition",
                  isActive
                    ? "bg-white/[0.08] text-white"
                    : "text-[var(--text-muted)] hover:bg-white/[0.04] hover:text-white",
                  focusRing,
                  !sidebarOpen && "justify-center px-0"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-violet to-cyan" />
                )}
                <Icon
                  className={cn(
                    "h-[18px] w-[18px] shrink-0 transition",
                    isActive ? "text-violet-light" : "group-hover:text-white"
                  )}
                  aria-hidden
                />
                {sidebarOpen && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Upgrade card (sidebar open only) */}
        {sidebarOpen && (
          <div className="mx-3 mb-3 rounded-xl border border-violet/15 bg-gradient-to-br from-violet/[0.08] to-transparent p-3.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Zap className="h-4 w-4 text-violet-light" />
              Upgrade to Pro
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[var(--text-dim)]">
              Unlimited messages, all models, all agents.
            </p>
            <Link
              href="/pricing"
              className={cn(
                "mt-2.5 flex items-center gap-1 text-xs font-semibold text-violet-light transition hover:text-violet",
                focusRing
              )}
            >
              Learn more
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        )}

        {/* User */}
        <div
          className={cn(
            "flex items-center gap-2.5 border-t border-white/[0.06] px-3 py-3",
            !sidebarOpen && "justify-center"
          )}
        >
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              variables: { colorPrimary: "#7C3AED" },
            }}
          />
          {sidebarOpen && (
            <span className="text-xs font-medium text-[var(--text-muted)]">
              Account
            </span>
          )}
        </div>
      </aside>

      {/* ─── Main area ─── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.06] bg-[var(--bg)]/80 px-5 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <span className="font-display text-sm font-semibold text-white/70">
              {pathname === "/workspace"
                ? "Home"
                : pathname === "/inbox"
                  ? "AI Inbox"
                  : pathname === "/drive"
                    ? "AI Drive"
                    : pathname === "/discover"
                      ? "Discover"
                      : "Workspace"}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className={cn(
                "rounded-lg p-2 text-[var(--text-dim)] transition hover:bg-white/5 hover:text-white",
                focusRing
              )}
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={cn(
                "relative rounded-lg p-2 text-[var(--text-dim)] transition hover:bg-white/5 hover:text-white",
                focusRing
              )}
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-violet" />
            </button>
          </div>
        </header>

        {/* Content area */}
        <main className="relative flex-1 overflow-y-auto">
          {/* Aurora mesh BG */}
          <div className="aurora-mesh pointer-events-none" aria-hidden />
          <div className="relative z-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
