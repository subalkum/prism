import { Providers } from "./providers";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { ResearchInput } from "@/components/ResearchInput";
import { FeaturesSection } from "@/components/FeaturesSection";
import { Footer } from "@/components/Footer";
import FAQ from "@/components/FAQ";


export default function HomePage() {
  return (
    <Providers>
      <Header />
      <main className="flex flex-col">
        <HeroSection />
        <ResearchInput />
        <FeaturesSection />
        <FAQ/>
      </main>
      <Footer />
    </Providers>
  );
}
