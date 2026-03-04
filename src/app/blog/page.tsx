import { Nav } from "@/components/layout/Nav";
import Link from "next/link";

export default function BlogPage() {
  return (
    <>
      <Nav />
      <main className="min-h-screen px-4 pt-24 pb-16">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-display text-4xl font-bold text-white sm:text-5xl">
            Blog
          </h1>
          <p className="mt-4 text-[var(--text-muted)]">
            Updates and product news. Coming soon.
          </p>
          <Link
            href="/"
            className="mt-8 inline-block rounded-xl border border-white/20 px-6 py-3 font-medium text-white transition hover:bg-white/10"
          >
            Back to home
          </Link>
        </div>
      </main>
    </>
  );
}
