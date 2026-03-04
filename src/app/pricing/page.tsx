import { Nav } from "@/components/layout/Nav";
import Link from "next/link";

export default function PricingPage() {
  return (
    <>
      <Nav />
      <main className="min-h-screen px-4 pt-24 pb-16">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">
            Pricing
          </h1>
          <p className="mt-4 text-[var(--text-muted)]">
            Free: 20 messages/day, 5 agent uses. Pro: $12/month. Teams: $29/user.
            Full details coming soon.
          </p>
          <Link
            href="/sign-up"
            className="mt-8 inline-block rounded-xl bg-violet px-6 py-3 font-medium text-white transition hover:bg-violet/90"
          >
            Get started free
          </Link>
        </div>
      </main>
    </>
  );
}
