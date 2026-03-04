"use client";

import { useEffect, useMemo, useState } from "react";
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
  Loader2,
  ShieldCheck,
  UserCircle2,
  Mail,
  Phone,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

type AccountSettingsModalProps = {
  open: boolean;
  onClose: () => void;
};

type SettingsTab = "general" | "ai" | "memory" | "subscription" | "profile";
type ThemeMode = "system" | "light" | "dark";

type GroqModel = {
  id: string;
  object?: string;
  owned_by?: string;
};

type GroqResponse = {
  data?: GroqModel[];
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
};

const STORAGE_KEY = "nexora.account.settings.v1";

const navItems = [
  { key: "general" as const, label: "General", icon: Settings },
  { key: "ai" as const, label: "AI Preferences", icon: SlidersHorizontal },
  { key: "memory" as const, label: "Memory", icon: Brain },
  { key: "subscription" as const, label: "Subscription", icon: Crown },
  { key: "profile" as const, label: "Profile", icon: User },
];

const curatedModels = [
  { provider: "ChatGPT", model: "GPT-5 mini" },
  { provider: "Gemini", model: "Gemini 2.5 Lite" },
  { provider: "DeepSeek", model: "DeepSeek Chat" },
  { provider: "Perplexity", model: "Perplexity Sonar" },
  { provider: "Anthropic", model: "Claude Haiku 4.5" },
  { provider: "xAI", model: "Grok 3 Mini" },
  { provider: "ByteDance", model: "Seedream 4.0" },
  { provider: "Moonshot", model: "Kimi-k2" },
  { provider: "Mistral", model: "Codestral" },
  { provider: "Qwen", model: "Qwen Flash" },
  { provider: "Meta", model: "Llama 4 Scout" },
];

const defaultSettings: UserSettings = {
  tab: "general",
  theme: "system",
  language: "English",
  memoryEnabled: false,
  profileName: "",
  profilePhoneCountry: "+61",
  profilePhoneNumber: "",
  modelOrder: curatedModels.map((item) => `${item.provider}::${item.model}`),
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
  const [groqLoading, setGroqLoading] = useState(false);
  const [groqError, setGroqError] = useState("");
  const [groqModels, setGroqModels] = useState<string[]>([]);
  const [orderedModels, setOrderedModels] = useState(curatedModels);

  const profileEmail = user?.primaryEmailAddress?.emailAddress || "";
  const profileName = settings.profileName;

  const availableGroqModels = useMemo(
    () => Array.from(new Set(groqModels)).sort((a, b) => a.localeCompare(b)),
    [groqModels],
  );

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
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<UserSettings>;
      setSettings((prev) => ({ ...prev, ...parsed }));
      if (parsed.modelOrder && parsed.modelOrder.length > 0) {
        const next = [...curatedModels].sort((left, right) => {
          const leftKey = `${left.provider}::${left.model}`;
          const rightKey = `${right.provider}::${right.model}`;
          const leftIndex = parsed.modelOrder?.indexOf(leftKey) ?? -1;
          const rightIndex = parsed.modelOrder?.indexOf(rightKey) ?? -1;
          return (
            (leftIndex === -1 ? 999 : leftIndex) -
            (rightIndex === -1 ? 999 : rightIndex)
          );
        });
        setOrderedModels(next);
      }
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

  const moveModel = (index: number, direction: "up" | "down") => {
    setOrderedModels((prev) => {
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= prev.length) return prev;
      const updated = [...prev];
      [updated[index], updated[target]] = [updated[target], updated[index]];
      return updated;
    });
  };

  useEffect(() => {
    if (
      !open ||
      settings.tab !== "ai" ||
      groqModels.length > 0 ||
      groqLoading
    ) {
      return;
    }

    const fetchGroqModels = async () => {
      try {
        setGroqLoading(true);
        setGroqError("");
        const response = await fetch("/api/groq/models", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Unable to load Groq models right now.");
        }
        const payload = (await response.json()) as GroqResponse;
        const modelNames =
          payload.data
            ?.map((item) => item.id)
            .filter((model): model is string => Boolean(model)) || [];
        setGroqModels(modelNames);
      } catch (error) {
        setGroqError(
          error instanceof Error
            ? error.message
            : "Unable to load Groq models right now.",
        );
      } finally {
        setGroqLoading(false);
      }
    };

    fetchGroqModels();
  }, [open, settings.tab, groqLoading, groqModels.length]);

  const handleSave = () => {
    const payload: UserSettings = {
      ...settings,
      modelOrder: orderedModels.map(
        (item) => `${item.provider}::${item.model}`,
      ),
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
              <div className="space-y-6">
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                  <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/60">
                    Curated Providers
                  </p>
                  <div className="space-y-2.5">
                    {orderedModels.map((item, index) => (
                      <div
                        key={`${item.provider}-${item.model}`}
                        className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3"
                      >
                        <div>
                          <p className="text-base font-semibold text-white/90">
                            {item.provider}
                          </p>
                          <p className="text-sm font-medium text-white/65">
                            {item.model}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveModel(index, "up")}
                            disabled={index === 0}
                            className="rounded-lg border border-white/10 p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label={`Move ${item.provider} up`}
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveModel(index, "down")}
                            disabled={index === orderedModels.length - 1}
                            className="rounded-lg border border-white/10 p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label={`Move ${item.provider} down`}
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-violet/20 bg-violet/5 p-4">
                  <div className="mb-3 flex items-center gap-2 text-violet-light">
                    <ShieldCheck className="h-4 w-4" />
                    <p className="text-sm font-semibold uppercase tracking-wider">
                      Groq API models available
                    </p>
                  </div>
                  {groqLoading ? (
                    <div className="flex items-center gap-2 text-sm text-white/70">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading models from Groq...
                    </div>
                  ) : groqError ? (
                    <p className="text-sm text-rose-300">{groqError}</p>
                  ) : availableGroqModels.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {availableGroqModels.map((model) => (
                        <span
                          key={model}
                          className="rounded-lg border border-white/10 bg-black/25 px-2.5 py-1 text-xs font-medium text-white/85"
                        >
                          {model}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-white/70">
                      No Groq models returned for this key.
                    </p>
                  )}
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
