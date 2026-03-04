import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Nav } from "@/components/layout/Nav";
import { HeroSection } from "@/components/home/HeroSection";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { AgentsShowcase } from "@/components/home/AgentsShowcase";
import { FAQSection } from "@/components/home/FAQSection";
import { CTASection } from "@/components/home/CTASection";
import { Footer } from "@/components/home/Footer";

export default async function Home() {
  // If user is logged in, redirect to workspace
  const user = await currentUser();
  if (user) {
    redirect("/workspace");
  }

  return (
    <>
      <Nav />
      <main className="relative min-h-screen">
        <HeroSection />
        <FeaturesSection />
        <AgentsShowcase />
        <CTASection />
        <FAQSection />
        <Footer />
      </main>
    </>
  );
}
