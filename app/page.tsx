import Link from "next/link";
import { OdysseyLogo } from "@/components/OdysseyLogo";
import { ToursSection } from "@/components/ToursSection";
import { getSummaries } from "@/lib/tours";

export default async function LandingPage() {
  const tours = getSummaries();

  return (
    <div className="min-h-screen bg-app-bg">
      <header className="sticky top-0 z-20 border-b border-app-border bg-surface/95 backdrop-blur-sm px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="min-h-[44px] flex items-center" aria-label="Odyssey Walk home">
            <OdysseyLogo size="lg" priority />
          </Link>
          <Link
            href="/create"
            className="text-[15px] font-semibold px-5 py-2.5 rounded-full bg-brand-primary text-white hover:bg-brand-primaryHover transition-opacity min-h-[44px] flex items-center"
            aria-label="Create Custom Tour"
          >
            Create Custom Tour
          </Link>
        </div>
      </header>

      <section className="px-4 py-12 sm:py-16 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-ink-primary mb-4" style={{ letterSpacing: "-0.03em", lineHeight: 1.1 }}>
            Discover Walking Tours
            <span className="text-brand-primary"> Worldwide</span>
          </h1>
          <p className="text-lg sm:text-xl text-ink-secondary mb-8 max-w-lg mx-auto font-medium" style={{ letterSpacing: "-0.01em" }}>
            Generate and navigate pre-planned walking tours in major cities. Narrated stories, guided routes, and immersive experiences.
          </p>
        </div>
      </section>

      <ToursSection initialTours={tours} />
    </div>
  );
}
