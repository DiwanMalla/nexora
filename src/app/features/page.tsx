import { Nav } from "@/components/layout/Nav";
import Link from "next/link";

export default function FeaturesPage() {
  return (
    <>
      <Nav />
      <main className="min-h-screen px-4 pt-24 pb-16">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-display text-4xl font-bold text-white sm:text-5xl">
            Features
          </h1>
          <p className="mt-4 text-[var(--text-muted)]">
            Multi-model canvas, verifiable search, execution blocks, and more.
            See the full feature set on the{" "}
            <Link href="/" className="text-cyan hover:underline">
              homepage
            </Link>
            .
          </p>
          <Link
            href="/"
            className="mt-8 inline-block rounded-xl bg-violet px-6 py-3 font-medium text-white transition hover:bg-violet/90"
          >
            Back to home
          </Link>
        </div>
      </main>
    </>
  );
}
