import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/options";
import { LandingHero } from "@/components/landing/LandingHero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { CommandShowcase } from "@/components/landing/CommandShowcase";
import { ClosingCta } from "@/components/landing/ClosingCta";

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/home");
  }

  return (
    <main className="flex flex-1 flex-col">
      <LandingHero />
      <HowItWorks />
      <CommandShowcase />
      <ClosingCta />
    </main>
  );
}
