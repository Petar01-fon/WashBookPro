import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Demo } from "@/components/landing/Demo";
import { WashList } from "@/components/landing/WashList";
import { Pricing } from "@/components/landing/Pricing";
import { Faq } from "@/components/landing/Faq";
import { Waitlist } from "@/components/landing/Waitlist";
import { Footer } from "@/components/landing/Footer";

async function getTenants() {
  const apiUrl = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL;
  try {
    const res = await fetch(`${apiUrl}/tenants`, { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const tenants = await getTenants();

  return (
    <main>
      <Nav />
      <Hero />
      <HowItWorks />
      <Demo />
      <WashList tenants={tenants} />
      <Pricing />
      <Faq />
      <Waitlist />
      <Footer />
    </main>
  );
}
