/**
 * ProfileTab — Handles user account information.
 *
 * Extracted from AccountSettingsModal.
 */

"use client";

import { User, Mail, ShieldCheck } from "lucide-react";

interface ProfileTabProps {
  displayName: string;
  onDisplayNameChange: (val: string) => void;
  email: string;
  onEmailChange: (val: string) => void;
}

export function ProfileTab({
  displayName,
  onDisplayNameChange,
  email,
  onEmailChange,
}: ProfileTabProps) {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <section className="space-y-5">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-text-dim">
          Personal Information
        </h3>

        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-muted px-1">
              Display Name
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-dim" />
              <input
                type="text"
                value={displayName}
                onChange={(e) => onDisplayNameChange(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-overlay px-11 py-3 text-sm font-medium text-text outline-none focus:border-violet/40 focus:ring-1 focus:ring-violet/20"
                placeholder="Nexora User"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-muted px-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-dim" />
              <input
                type="email"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-overlay px-11 py-3 text-sm font-medium text-text outline-none focus:border-violet/40 focus:ring-1 focus:ring-violet/20"
                placeholder="user@example.com"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="flex items-center gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-500">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-text uppercase tracking-tight">
            Identity Verified
          </h4>
          <p className="text-[11px] text-text-muted leading-snug">
            Your account is linked to your primary developer identity.
          </p>
        </div>
      </section>
    </div>
  );
}
