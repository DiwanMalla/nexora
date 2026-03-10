/**
 * AccountSettingsModal — The centralized control panel for user preferences.
 *
 * Refactored to decompose its massive 714-line structure into manageable
 * tab components. Now handles global settings state and persistence only.
 *
 * Tabs:
 *   - General (Appearance)
 *   - AI Preferences
 *   - Memory
 *   - Subscription
 *   - Profile
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { X, Settings, SlidersHorizontal, Brain, Crown, User, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";

// Tab Components
import { AppearanceTab } from "./settings/AppearanceTab";
import { AIPreferencesTab } from "./settings/AIPreferencesTab";
import { MemoryTab } from "./settings/MemoryTab";
import { SubscriptionTab } from "./settings/SubscriptionTab";
import { ProfileTab } from "./settings/ProfileTab";

// Types
type SettingsTab = "general" | "ai" | "memory" | "subscription" | "profile";
type ThemeMode = "system" | "light" | "dark";

interface AIProviderPref {
  enabled: boolean;
  modelId: string;
}

interface UserSettings {
  tab: SettingsTab;
  theme: ThemeMode;
  memoryEnabled: boolean;
  personalization: string;
  profileName: string;
  profileEmail: string;
  aiProviderPrefs: Record<string, AIProviderPref>;
  competingModelIds: string[];
  showSidebar: boolean;
  animationsEnabled: boolean;
}

const STORAGE_KEY = "nexora.account.settings.v3";

const navItems = [
  { key: "general" as const, label: "Appearance", icon: Settings },
  { key: "ai" as const, label: "AI & Models", icon: SlidersHorizontal },
  { key: "memory" as const, label: "Memory", icon: Brain },
  { key: "subscription" as const, label: "Subscription", icon: Crown },
  { key: "profile" as const, label: "Account", icon: User },
];

const defaultSettings: UserSettings = {
  tab: "general",
  theme: "system",
  memoryEnabled: true,
  personalization: "",
  profileName: "",
  profileEmail: "",
  aiProviderPrefs: {},
  competingModelIds: [],
  showSidebar: true,
  animationsEnabled: true,
};

// ─── Utilities ──────────────────────────────────────────────────

function applyTheme(theme: ThemeMode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "system") {
    root.removeAttribute("data-theme");
    return;
  }
  root.setAttribute("data-theme", theme);
}

// ─── Component ──────────────────────────────────────────────────

interface AccountSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function AccountSettingsModal({ open, onClose }: AccountSettingsModalProps) {
  const { user } = useUser();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [savePulse, setSavePulse] = useState(false);

  // Close on ESC
  useKeyboardShortcut("Escape", onClose, open);

  // ─── Load / Save ──────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setSettings((prev) => ({ ...prev, ...parsed }));
        if (parsed.theme) applyTheme(parsed.theme);
      }
    } catch {
      setSettings(defaultSettings);
    }
  }, [open]);

  const handleSave = useCallback(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    applyTheme(settings.theme);
    setSavePulse(true);
    setTimeout(() => setSavePulse(false), 900);
  }, [settings]);

  // Apply theme immediately when changed
  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  // Sync Clerk user name if empty
  useEffect(() => {
    if (open && user && !settings.profileName) {
      setSettings((prev) => ({
        ...prev,
        profileName: user.fullName || "",
        profileEmail: user.primaryEmailAddress?.emailAddress || "",
      }));
    }
  }, [open, user, settings.profileName]);

  if (!open) return null;

  // ─── Actions ──────────────────────────────────────────────────

  const updateSettings = (update: Partial<UserSettings>) => {
    setSettings((prev) => ({ ...prev, ...update }));
  };

  const handleProviderPrefChange = (id: string, update: Partial<AIProviderPref>) => {
    setSettings((prev) => ({
      ...prev,
      aiProviderPrefs: {
        ...prev.aiProviderPrefs,
        [id]: { ...(prev.aiProviderPrefs[id] || { enabled: true, modelId: "" }), ...update },
      },
    }));
  };

  const toggleCompetingModel = (modelId: string) => {
    setSettings((prev) => {
      const current = prev.competingModelIds || [];
      const has = current.includes(modelId);
      return {
        ...prev,
        competingModelIds: has ? current.filter((id) => id !== modelId) : [...current, modelId],
      };
    });
  };

  // ─── Render ───────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-500"
        onClick={onClose}
      />

      {/* Modal Card */}
      <section className="relative flex h-[680px] w-full max-w-5xl overflow-hidden rounded-[2.5rem] border border-white/10 bg-bg-elevated shadow-[0_32px_64px_rgba(0,0,0,0.5)] animate-in zoom-in-[0.95] fade-in duration-300">
        <button
          onClick={onClose}
          className="absolute right-8 top-8 z-20 rounded-full p-2 text-text-dim transition-all hover:bg-surface-overlay hover:text-text active:scale-90"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Sidebar Navigation */}
        <aside className="hidden w-[300px] flex-col border-r border-white/5 bg-surface-overlay/30 p-8 md:flex">
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet/20 border border-violet/30">
              <Settings className="h-5 w-5 text-violet-light" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-widest text-white">
              System
            </h2>
          </div>

          <nav className="space-y-2">
            {navItems.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => updateSettings({ tab: key })}
                className={cn(
                  "flex w-full items-center gap-4 rounded-2xl px-5 py-4 text-left transition-all duration-300",
                  settings.tab === key
                    ? "bg-violet text-white shadow-lg shadow-violet/20"
                    : "text-text-muted hover:bg-surface-overlay hover:text-text",
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  {label}
                </span>
              </button>
            ))}
          </nav>

          <p className="mt-auto text-center text-[10px] font-bold uppercase tracking-widest text-slate-600">
            Nexora v0.1.0-alpha
          </p>
        </aside>

        {/* Tab Content */}
        <div className="flex flex-1 flex-col overflow-hidden bg-bg-elevated p-10 lg:p-14">
          <div className="flex-1 overflow-y-auto pr-4 scrollbar-thin">
            {settings.tab === "general" && (
              <AppearanceTab
                theme={settings.theme}
                onThemeChange={(theme) => updateSettings({ theme })}
                showSidebar={settings.showSidebar}
                onShowSidebarChange={(showSidebar) => updateSettings({ showSidebar })}
                animationsEnabled={settings.animationsEnabled}
                onAnimationsEnabledChange={(animationsEnabled) => updateSettings({ animationsEnabled })}
              />
            )}

            {settings.tab === "ai" && (
              <AIPreferencesTab
                prefs={settings.aiProviderPrefs}
                onProviderPrefChange={handleProviderPrefChange}
                competingModelIds={settings.competingModelIds}
                onToggleCompetingModel={toggleCompetingModel}
              />
            )}

            {settings.tab === "memory" && (
              <MemoryTab
                personalization={settings.personalization}
                onPersonalizationChange={(personalization) => updateSettings({ personalization })}
                onClearMemory={() => updateSettings({ personalization: "" })}
              />
            )}

            {settings.tab === "subscription" && (
              <SubscriptionTab
                currentPlan="free"
                onUpgrade={() => {}}
              />
            )}

            {settings.tab === "profile" && (
              <ProfileTab
                displayName={settings.profileName}
                onDisplayNameChange={(profileName) => updateSettings({ profileName })}
                email={settings.profileEmail}
                onEmailChange={(profileEmail) => updateSettings({ profileEmail })}
              />
            )}
          </div>

          {/* Footer Save Button */}
          <div className="mt-8 border-t border-white/5 pt-8">
            <button
              onClick={handleSave}
              className={cn(
                "group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-[1.25rem] py-4 transition-all duration-500 active:scale-[0.98]",
                savePulse
                  ? "bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                  : "bg-surface-invert text-surface-invert-text hover:shadow-[0_10px_20px_rgba(255,255,255,0.05)]",
              )}
            >
              <div
                className={cn(
                  "flex items-center gap-3 transition-transform duration-500",
                  savePulse ? "scale-105" : "group-hover:translate-x-1",
                )}
              >
                <Check className={cn("h-5 w-5 stroke-[3px]", savePulse ? "animate-bounce" : "")} />
                <span className="text-xs font-black uppercase tracking-widest">
                  {savePulse ? "Config Sync Success" : "Apply Changes"}
                </span>
              </div>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
