import Hero from '@/components/marketing/Hero';
import TrustBar from '@/components/marketing/TrustBar';
import Stats from '@/components/marketing/Stats';
import Features from '@/components/marketing/Features';
import HowItWorks from '@/components/marketing/HowItWorks';
import CaseStudyTeaser from '@/components/marketing/CaseStudyTeaser';
import SecurityCompliance from '@/components/marketing/SecurityCompliance';
import Integrations from '@/components/marketing/Integrations';

import PricingTable from '@/components/marketing/PricingTable';
import FAQ from '@/components/marketing/FAQ';
import CtaBanner from '@/components/marketing/CtaBanner';

export default function LandingPage() {
  return (
    <>
      <Hero />
      <TrustBar />
      <Stats />
      <Features />
      <HowItWorks />
      <CaseStudyTeaser />
      <SecurityCompliance />
      <Integrations />
      <PricingTable />
      <FAQ />
      <CtaBanner />
    </>
  );
}
