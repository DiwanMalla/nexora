"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  X,
  Settings,
  SlidersHorizontal,
  Brain,
  Crown,
  User,
  Monitor,
  Sun,
  Moon,
  Check,
  ChevronDown,
  ChevronUp,
  UserCircle2,
  Mail,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";

type AccountSettingsModalProps = {
  open: boolean;
  onClose: () => void;
};

type SettingsTab = "general" | "ai" | "memory" | "subscription" | "profile";
type ThemeMode = "system" | "light" | "dark";

type AIProviderPref = {
  enabled: boolean;
  modelId: string;
};

type UserSettings = {
  tab: SettingsTab;
  theme: ThemeMode;
  language: "English";
  memoryEnabled: boolean;
  profileName: string;
  profilePhoneCountry: string;
  profilePhoneNumber: string;
  modelOrder: string[];
  aiProviderPrefs: Record<string, AIProviderPref>;
};

const STORAGE_KEY = "nexora.account.settings.v2";

const navItems = [
  { key: "general" as const, label: "General", icon: Settings },
  { key: "ai" as const, label: "AI Preferences", icon: SlidersHorizontal },
  { key: "memory" as const, label: "Memory", icon: Brain },
  { key: "subscription" as const, label: "Subscription", icon: Crown },
  { key: "profile" as const, label: "Profile", icon: User },
];

// Providers with logo (letter/emoji) and their selectable models
const AI_PROVIDERS: {
  id: string;
  name: string;
  logo: string; // emoji or single char for logo circle
  accent: string; // tailwind bg/ring for logo
  models: { id: string; name: string }[];
}[] = [
  {
    id: "chatgpt",
    name: "ChatGPT",
    logo: "C",
    accent: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    models: [
      { id: "gpt-5-mini", name: "GPT-5 mini" },
      { id: "gpt-4o", name: "GPT-4o" },
      { id: "gpt-4o-mini", name: "GPT-4o mini" },
    ],
  },
  {
    id: "groq",
    name: "Groq",
    logo: "G",
    accent: "bg-violet-500/20 text-violet-400 border-violet-500/30",
    models: [
      { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B" },
      { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B" },
      { id: "openai/gpt-oss-120b", name: "GPT-OSS 120B" },
      { id: "openai/gpt-oss-20b", name: "GPT-OSS 20B" },
      { id: "groq/compound", name: "Groq Compound" },
      { id: "groq/compound-mini", name: "Groq Compound Mini" },
    ],
  },
  {
    id: "gemini",
    name: "Gemini",
    logo: "G",
    accent: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    models: [
      { id: "gemini-2.5-lite", name: "Gemini 2.5 Lite" },
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    logo: "A",
    accent: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    models: [
      { id: "claude-haiku-4.5", name: "Claude Haiku 4.5" },
      { id: "claude-sonnet-4", name: "Claude Sonnet 4" },
      { id: "claude-opus-4", name: "Claude Opus 4" },
    ],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    logo: "D",
    accent: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    models: [
      { id: "deepseek-chat", name: "DeepSeek Chat" },
      { id: "deepseek-coder", name: "DeepSeek Coder" },
    ],
  },
  {
    id: "perplexity",
    name: "Perplexity",
    logo: "P",
    accent: "bg-sky-500/20 text-sky-400 border-sky-500/30",
    models: [
      { id: "sonar", name: "Perplexity Sonar" },
      { id: "sonar-pro", name: "Sonar Pro" },
    ],
  },
  {
    id: "xai",
    name: "xAI",
    logo: "x",
    accent: "bg-slate-400/20 text-slate-300 border-slate-400/30",
    models: [
      { id: "grok-3-mini", name: "Grok 3 Mini" },
      { id: "grok-3", name: "Grok 3" },
    ],
  },
  {
    id: "meta",
    name: "Meta",
    logo: "M",
    accent: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
    models: [
      { id: "llama-4-scout", name: "Llama 4 Scout" },
      { id: "llama-3.1-70b", name: "Llama 3.1 70B" },
    ],
  },
  {
    id: "moonshot",
    name: "Moonshot",
    logo: "K",
    accent: "bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30",
    models: [
      { id: "kimi-k2", name: "Kimi K2" },
    ],
  },
  {
    id: "qwen",
    name: "Qwen",
    logo: "Q",
    accent: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    models: [
      { id: "qwen-flash", name: "Qwen Flash" },
      { id: "qwen3-32b", name: "Qwen3-32B" },
    ],
  },
];

const defaultProviderPref = (provider: (typeof AI_PROVIDERS)[0]): AIProviderPref => ({
  enabled: provider.id === "groq",
  modelId: provider.models[0]?.id ?? "",
});

const defaultSettings: UserSettings = {
  tab: "general",
  theme: "system",
  language: "English",
  memoryEnabled: false,
  profileName: "",
  profilePhoneCountry: "+61",
  profilePhoneNumber: "",
  modelOrder: [],
  aiProviderPrefs: Object.fromEntries(
    AI_PROVIDERS.map((p) => [p.id, defaultProviderPref(p)]),
  ),
};

function applyTheme(theme: ThemeMode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "system") {
    root.removeAttribute("data-theme");
    return;
  }
  root.setAttribute("data-theme", theme);
}

export function AccountSettingsModal({
  open,
  onClose,
}: AccountSettingsModalProps) {
  const { user } = useUser();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [savePulse, setSavePulse] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const profileEmail = user?.primaryEmailAddress?.emailAddress || "";
  const profileName = settings.profileName;

  const prefs = settings.aiProviderPrefs ?? defaultSettings.aiProviderPrefs;

  const setProviderPref = (providerId: string, update: Partial<AIProviderPref>) => {
    setSettings((prev) => ({
      ...prev,
      aiProviderPrefs: {
        ...prev.aiProviderPrefs,
        [providerId]: {
          ...prev.aiProviderPrefs[providerId],
          ...update,
        },
      },
    }));
  };

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    try {
      const raw =
        window.localStorage.getItem(STORAGE_KEY) ??
        window.localStorage.getItem("nexora.account.settings.v1");
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<UserSettings>;
      const merged: Partial<UserSettings> = { ...parsed };
      if (!merged.aiProviderPrefs && "modelOrder" in parsed) {
        merged.aiProviderPrefs = defaultSettings.aiProviderPrefs;
      }
      setSettings((prev) => ({ ...defaultSettings, ...prev, ...merged }));
      if (parsed.theme) applyTheme(parsed.theme);
    } catch {
      setSettings(defaultSettings);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setSettings((prev) => {
      if (prev.profileName.trim().length > 0) return prev;
      const fallbackName =
        user?.fullName ||
        [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
        "Diwan Malla";
      return { ...prev, profileName: fallbackName };
    });
  }, [open, user?.fullName, user?.firstName, user?.lastName]);

  useEffect(() => {
    if (!open) return;
    applyTheme(settings.theme);
  }, [open, settings.theme]);

  const handleSave = () => {
    const payload: UserSettings = {
      ...settings,
      aiProviderPrefs: prefs,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    applyTheme(settings.theme);
    setSavePulse(true);
    window.setTimeout(() => setSavePulse(false), 900);
  };

  const titleByTab: Record<SettingsTab, { title: string; subtitle: string }> = {
    general: {
      title: "General",
      subtitle: "Manage the look and feel of the platform",
    },
    ai: {
      title: "AI model preferences",
      subtitle: "Manage and reorder your AI models",
    },
    memory: {
      title: "Memory",
      subtitle:
        "Let the assistant remember important details across chats when available",
    },
    subscription: {
      title: "Subscription",
      subtitle: "Subscription management will be added in a later update",
    },
    profile: {
      title: "Profile information",
      subtitle: "Manage your basic profile details",
    },
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Close settings"
        onClick={onClose}
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label="Account settings"
        className="relative grid h-[620px] w-full max-w-4xl grid-cols-1 overflow-hidden rounded-3xl border border-white/[0.08] bg-[linear-gradient(140deg,rgba(24,27,35,0.95)_0%,rgba(14,16,22,0.96)_100%)] shadow-[0_30px_80px_rgba(0,0,0,0.65)] md:grid-cols-[280px_1fr]"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 z-10 rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <aside className="border-b border-white/[0.06] bg-black/15 p-6 md:border-b-0 md:border-r">
          <h2 className="text-3xl font-semibold tracking-tight text-white">
            Settings
          </h2>

          <nav className="mt-6 space-y-2">
            {navItems.map(({ key, label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                onClick={() => setSettings((prev) => ({ ...prev, tab: key }))}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-base font-medium transition",
                  settings.tab === key
                    ? "bg-white/[0.06] text-white"
                    : "text-white/75 hover:bg-white/[0.04] hover:text-white",
                )}
              >
                <Icon className="h-4.5 w-4.5" />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        <div className="flex h-full flex-col p-7 sm:p-8">
          <div>
            <h3 className="text-3xl font-semibold tracking-tight text-white">
              {titleByTab[settings.tab].title}
            </h3>
            <p className="mt-1 text-lg text-white/60">
              {titleByTab[settings.tab].subtitle}
            </p>
          </div>

          <div className="mt-9 flex-1 overflow-y-auto pr-1">
            {settings.tab === "general" && (
              <div className="space-y-8">
                <div>
                  <p className="mb-3 text-xl font-medium text-white">
                    Appearance
                  </p>
                  <div className="grid grid-cols-3 rounded-full border border-white/15 bg-black/20 p-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setSettings((prev) => ({ ...prev, theme: "system" }))
                      }
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-full px-3 py-2 text-base transition",
                        settings.theme === "system"
                          ? "bg-white font-semibold text-[#0b0d13]"
                          : "font-medium text-white/70",
                      )}
                    >
                      <Monitor className="h-4 w-4" />
                      System
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSettings((prev) => ({ ...prev, theme: "light" }))
                      }
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-full px-3 py-2 text-base transition",
                        settings.theme === "light"
                          ? "bg-white font-semibold text-[#0b0d13]"
                          : "font-medium text-white/70",
                      )}
                    >
                      <Sun className="h-4 w-4" />
                      Light
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSettings((prev) => ({ ...prev, theme: "dark" }))
                      }
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-full px-3 py-2 text-base transition",
                        settings.theme === "dark"
                          ? "bg-white font-semibold text-[#0b0d13]"
                          : "font-medium text-white/70",
                      )}
                    >
                      <Moon className="h-4 w-4" />
                      Dark
                    </button>
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-xl font-medium text-white">
                    Language Preferences
                  </p>
                  <div className="rounded-2xl border border-white/15 bg-black/20 px-5 py-4">
                    <button
                      type="button"
                      onClick={() => setLanguageOpen((prev) => !prev)}
                      className="flex w-full items-center justify-between text-left"
                    >
                      <span className="text-xl text-white/90">
                        {settings.language}
                      </span>
                      {languageOpen ? (
                        <ChevronUp className="h-5 w-5 text-white/55" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-white/55" />
                      )}
                    </button>
                    {languageOpen && (
                      <button
                        type="button"
                        onClick={() => {
                          setSettings((prev) => ({
                            ...prev,
                            language: "English",
                          }));
                          setLanguageOpen(false);
                        }}
                        className="mt-3 flex w-full items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2 text-left text-base font-medium text-white"
                      >
                        English
                        <Check className="h-4 w-4 text-violet-light" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {settings.tab === "ai" && (
              <div className="space-y-4">
                <p className="text-sm text-white/60">
                  Turn providers on or off and choose which model to use for each.
                </p>
                <div className="space-y-2">
                  {AI_PROVIDERS.map((provider) => {
                    const pref = prefs[provider.id] ?? defaultProviderPref(provider);
                    const selectedModel = provider.models.find((m) => m.id === pref.modelId) ?? provider.models[0];
                    const isOpen = openDropdownId === provider.id;
                    return (
                      <div
                        key={provider.id}
                        className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3"
                      >
                        {/* Logo */}
                        <div
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-lg font-bold",
                            provider.accent,
                          )}
                        >
                          {provider.logo}
                        </div>
                        {/* Provider name */}
                        <span className="min-w-[100px] text-base font-semibold text-white/90">
                          {provider.name}
                        </span>
                        {/* On/off toggle */}
                        <button
                          type="button"
                          role="switch"
                          aria-checked={pref.enabled}
                          onClick={() =>
                            setProviderPref(provider.id, {
                              enabled: !pref.enabled,
                            })
                          }
                          className={cn(
                            "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#12121A]",
                            pref.enabled ? "bg-violet-500" : "bg-white/20",
                          )}
                        >
                          <span
                            className={cn(
                              "inline-block h-5 w-5 rounded-full bg-white transition-transform",
                              pref.enabled ? "translate-x-5" : "translate-x-0.5",
                            )}
                          />
                        </button>
                        {/* Model dropdown (when enabled) */}
                        {pref.enabled && (
                          <div className="relative ml-auto">
                            <button
                              type="button"
                              onClick={() =>
                                setOpenDropdownId(isOpen ? null : provider.id)
                              }
                              className="flex min-w-[160px] items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-left text-sm font-medium text-white/90 transition hover:bg-white/10"
                            >
                              <span className="truncate">
                                {selectedModel?.name ?? "Select model"}
                              </span>
                              <ChevronDown
                                className={cn(
                                  "h-4 w-4 shrink-0 text-white/50 transition-transform",
                                  isOpen && "rotate-180",
                                )}
                              />
                            </button>
                            {isOpen && (
                              <>
                                <div
                                  className="fixed inset-0 z-0"
                                  aria-hidden
                                  onClick={() => setOpenDropdownId(null)}
                                />
                                <div className="absolute right-0 top-full z-10 mt-1 min-w-[200px] overflow-hidden rounded-xl border border-white/10 bg-[#0E0E12] shadow-xl">
                                  {provider.models.map((model) => (
                                    <button
                                      key={model.id}
                                      type="button"
                                      onClick={() => {
                                        setProviderPref(provider.id, {
                                          modelId: model.id,
                                        });
                                        setOpenDropdownId(null);
                                      }}
                                      className={cn(
                                        "flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition",
                                        pref.modelId === model.id
                                          ? "bg-violet-500/20 text-violet-200"
                                          : "text-white/80 hover:bg-white/5 hover:text-white",
                                      )}
                                    >
                                      {model.name}
                                      {pref.modelId === model.id && (
                                        <Check className="h-4 w-4 shrink-0" />
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {settings.tab === "memory" && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-lg font-semibold text-white">
                    Enable account memory
                  </p>
                  <p className="mt-1 text-sm text-white/60">
                    When enabled, Nexora can remember useful context for better
                    responses.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      setSettings((prev) => ({
                        ...prev,
                        memoryEnabled: !prev.memoryEnabled,
                      }))
                    }
                    className={cn(
                      "mt-5 flex w-14 items-center rounded-full p-1 transition",
                      settings.memoryEnabled ? "bg-violet" : "bg-white/20",
                    )}
                    aria-pressed={settings.memoryEnabled}
                    aria-label="Enable account memory"
                  >
                    <span
                      className={cn(
                        "h-5 w-5 rounded-full bg-white transition-transform",
                        settings.memoryEnabled
                          ? "translate-x-7"
                          : "translate-x-0",
                      )}
                    />
                  </button>
                </div>
              </div>
            )}

            {settings.tab === "profile" && (
              <div className="space-y-5">
                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-white/70">
                    <UserCircle2 className="h-4 w-4" />
                    Full name
                  </span>
                  <input
                    value={profileName}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        profileName: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-black/25 px-4 py-3 text-base text-white outline-none transition focus:border-violet"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-white/70">
                    <Phone className="h-4 w-4" />
                    Phone
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      value={settings.profilePhoneCountry}
                      onChange={(event) =>
                        setSettings((prev) => ({
                          ...prev,
                          profilePhoneCountry: event.target.value,
                        }))
                      }
                      className="w-20 rounded-xl border border-white/15 bg-black/25 px-3 py-3 text-base text-white outline-none transition focus:border-violet"
                    />
                    <input
                      value={settings.profilePhoneNumber}
                      onChange={(event) =>
                        setSettings((prev) => ({
                          ...prev,
                          profilePhoneNumber: event.target.value,
                        }))
                      }
                      placeholder="e.g. 98765 43210"
                      className="flex-1 rounded-xl border border-white/15 bg-black/25 px-4 py-3 text-base text-white outline-none transition placeholder:text-white/35 focus:border-violet"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-white/70">
                    <Mail className="h-4 w-4" />
                    Email
                  </span>
                  <input
                    readOnly
                    value={profileEmail}
                    className="w-full rounded-xl border border-white/15 bg-black/35 px-4 py-3 text-base text-white/80 outline-none"
                  />
                </label>
              </div>
            )}

            {settings.tab === "subscription" && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
                <p className="text-lg font-semibold text-white">
                  Subscription settings coming soon
                </p>
                <p className="mt-1 text-sm text-white/60">
                  We will add plan management and billing controls here later.
                </p>
              </div>
            )}
          </div>

          <div className="mt-auto border-t border-white/[0.08] pt-5">
            <button
              type="button"
              onClick={handleSave}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-full py-3 text-xl font-semibold transition",
                savePulse
                  ? "bg-emerald-300 text-[#0f1218]"
                  : "bg-white/70 text-[#0f1218] hover:bg-white",
              )}
            >
              <Check className="h-5 w-5" />
              {savePulse ? "Saved" : "Save"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
