import Link from "next/link";
import { GlassPanel } from "./GlassPanel";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/chat", label: "Chat" },
  { href: "/search", label: "Search" },
  { href: "/workspace", label: "Workspace" },
  { href: "/discover", label: "Discover" },
];

export function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-4 py-3">
      <GlassPanel className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link
          href="/"
          className="font-semibold text-white transition hover:text-violet"
        >
          🌌 Nexora
        </Link>
        <div className="flex items-center gap-1">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium text-gray-300",
                "transition hover:bg-white/5 hover:text-cyan"
              )}
            >
              {label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-gray-400 transition hover:text-white"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className={cn(
              "rounded-lg bg-violet px-4 py-2 text-sm font-semibold text-white",
              "transition hover:bg-violet/90"
            )}
          >
            Get started
          </Link>
        </div>
      </GlassPanel>
    </nav>
  );
}
