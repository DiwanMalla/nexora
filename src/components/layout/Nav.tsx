"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { ArrowRight, Menu, X } from "lucide-react";

const navLinks = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "Docs" },
  { href: "/blog", label: "Blog" },
];

export function Nav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-white/[0.06] bg-[var(--bg)]/80 backdrop-blur-xl"
          : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5"
          aria-label="Nexora Home"
        >
          {/* Nexora geometric logo — unique, not an eye like kumari */}
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            className="shrink-0"
          >
            <defs>
              <linearGradient id="nexora-grad" x1="0" y1="0" x2="28" y2="28">
                <stop offset="0%" stopColor="#7C3AED" />
                <stop offset="100%" stopColor="#06B6D4" />
              </linearGradient>
            </defs>
            {/* Hexagonal shape */}
            <path
              d="M14 2L25.5 8.5V19.5L14 26L2.5 19.5V8.5L14 2Z"
              stroke="url(#nexora-grad)"
              strokeWidth="1.5"
              fill="none"
            />
            {/* Inner node */}
            <circle
              cx="14"
              cy="14"
              r="3"
              fill="url(#nexora-grad)"
              opacity="0.8"
            />
            {/* Connection lines */}
            <line
              x1="14"
              y1="2"
              x2="14"
              y2="11"
              stroke="url(#nexora-grad)"
              strokeWidth="0.8"
              opacity="0.4"
            />
            <line
              x1="14"
              y1="17"
              x2="14"
              y2="26"
              stroke="url(#nexora-grad)"
              strokeWidth="0.8"
              opacity="0.4"
            />
            <line
              x1="2.5"
              y1="8.5"
              x2="11"
              y2="14"
              stroke="url(#nexora-grad)"
              strokeWidth="0.8"
              opacity="0.4"
            />
            <line
              x1="17"
              y1="14"
              x2="25.5"
              y2="8.5"
              stroke="url(#nexora-grad)"
              strokeWidth="0.8"
              opacity="0.4"
            />
          </svg>
          <span className="font-display text-[1.15rem] font-bold tracking-tight text-white/90">
            Nexora
          </span>
        </Link>

        {/* Center links — desktop */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3.5 py-2 text-base font-medium transition-colors ${
                pathname === link.href
                  ? "text-white"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          <SignedOut>
            <Link
              href="/sign-in"
              className="hidden text-base font-medium text-white/40 transition hover:text-white/70 sm:block"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="group inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-base font-semibold text-black transition-all hover:bg-white/90"
            >
              Get Started
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </SignedOut>
          <SignedIn>
            <Link
              href="/workspace"
              className="rounded-lg bg-white/[0.06] px-4 py-2 text-base font-medium text-white/70 transition hover:bg-white/[0.1] hover:text-white"
            >
              Workspace
            </Link>
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: { avatarBox: "h-8 w-8" },
              }}
            />
          </SignedIn>

          {/* Mobile menu toggle */}
          <button
            type="button"
            className="ml-1 flex h-9 w-9 items-center justify-center rounded-lg text-white/50 transition hover:bg-white/[0.06] hover:text-white md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-white/[0.06] bg-[var(--bg)]/95 backdrop-blur-xl md:hidden">
          <div className="space-y-1 px-4 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-lg px-3 py-2.5 text-base font-medium text-white/60 transition hover:bg-white/[0.04] hover:text-white"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
