import { Providers } from "./providers";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { ResearchChat } from "@/components/ResearchChat";
import { FeaturesSection } from "@/components/FeaturesSection";
import { Footer } from "@/components/Footer";

export default function HomePage() {
  return (
    <Providers>
      <Header />
      <main className="flex flex-col">
        <HeroSection />
        <ResearchChat />
        <FeaturesSection />
      </main>
      <Footer />
    </Providers>
  );
}
