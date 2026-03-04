"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Github, Twitter } from "lucide-react";

// Discord SVG since lucide doesn't have it
function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
    </svg>
  );
}

const footerLinks = {
  Product: [
    { label: "Features", href: "/features" },
    { label: "Pricing", href: "/pricing" },
    { label: "Agents", href: "/agents" },
    { label: "API", href: "/docs/api" },
    { label: "Changelog", href: "/changelog" },
  ],
  Resources: [
    { label: "Documentation", href: "/docs" },
    { label: "Blog", href: "/blog" },
    { label: "System Status", href: "/status" },
    { label: "Community", href: "/community" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ],
};

const socials = [
  { icon: Twitter, href: "https://twitter.com/nexora_ai", label: "Twitter" },
  { icon: DiscordIcon, href: "https://discord.gg/nexora", label: "Discord" },
  { icon: Github, href: "https://github.com/nexora-ai", label: "GitHub" },
];

export function Footer() {
  return (
    <footer className="relative border-t border-white/[0.06] px-4 pt-20 sm:px-6">
      <div className="mx-auto max-w-7xl">
        {/* ── Top row: brand + link columns ── */}
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Brand column */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            {/* Logo */}
            <div className="mb-4 flex items-center gap-2.5">
              <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
                <defs>
                  <linearGradient id="footer-grad" x1="0" y1="0" x2="28" y2="28">
                    <stop offset="0%" stopColor="#7C3AED" />
                    <stop offset="100%" stopColor="#06B6D4" />
                  </linearGradient>
                </defs>
                <path
                  d="M14 2L25.5 8.5V19.5L14 26L2.5 19.5V8.5L14 2Z"
                  stroke="url(#footer-grad)"
                  strokeWidth="1.5"
                  fill="none"
                />
                <circle cx="14" cy="14" r="3" fill="url(#footer-grad)" opacity="0.8" />
              </svg>
              <span className="font-display text-sm font-bold text-white/80">
                Nexora
              </span>
            </div>
            <p className="mb-6 max-w-xs text-sm leading-relaxed text-[var(--text-muted)]">
              One platform. Every AI. Search → Action. 
              Multi-agent reasoning with execution blocks.
            </p>
            {/* Social icons */}
            <div className="flex gap-3">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-white/30 transition hover:border-white/[0.12] hover:text-white/60"
                  aria-label={s.label}
                >
                  <s.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </motion.div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([title, links], i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
            >
              <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-white/25">
                {title}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/40 transition hover:text-white/70"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* ── Large watermark ── */}
        <div
          className="mt-20 select-none overflow-hidden opacity-[0.03]"
          aria-hidden="true"
        >
          <span className="block font-display text-[10rem] font-black leading-none tracking-tighter sm:text-[14rem] lg:text-[18rem]">
            NEXORA
          </span>
        </div>

        {/* ── Bottom bar ── */}
        <div className="border-t border-white/[0.06] py-6">
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-xs text-white/20">
              © {new Date().getFullYear()} Nexora. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link href="/privacy" className="text-xs text-white/20 transition hover:text-white/40">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-xs text-white/20 transition hover:text-white/40">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
