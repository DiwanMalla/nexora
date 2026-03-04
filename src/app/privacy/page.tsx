import { Nav } from "@/components/layout/Nav";
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <>
      <Nav />
      <main className="min-h-screen px-4 pt-24 pb-16">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-4xl font-bold text-white">
            Privacy Policy
          </h1>
          <p className="mt-4 text-[var(--text-muted)]">
            Privacy policy content. See docs for our security and data handling
            practices. Placeholder — replace with full policy.
          </p>
          <Link
            href="/"
            className="mt-8 inline-block text-cyan hover:underline"
          >
            Back to home
          </Link>
        </div>
      </main>
    </>
  );
}
