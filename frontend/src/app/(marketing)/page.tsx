import Hero from '@/components/marketing/Hero';
import Stats from '@/components/marketing/Stats';
import Features from '@/components/marketing/Features';
import PricingTable from '@/components/marketing/PricingTable';
import Testimonials from '@/components/marketing/Testimonials';

export default function LandingPage() {
  return (
    <>
      <Hero />
      <Stats />
      <Features />
      <Testimonials />
      <PricingTable />
    </>
  );
}
