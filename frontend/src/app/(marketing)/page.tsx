import Hero from '@/components/marketing/Hero';
import TrustBar from '@/components/marketing/TrustBar';
import Stats from '@/components/marketing/Stats';
import Features from '@/components/marketing/Features';
import HowItWorks from '@/components/marketing/HowItWorks';
import AgentFlowDemo from '@/components/marketing/AgentFlowDemo';
import CaseStudyTeaser from '@/components/marketing/CaseStudyTeaser';
import ClosedLoopDiagram from '@/components/marketing/ClosedLoopDiagram';
import SecurityCompliance from '@/components/marketing/SecurityCompliance';
import Integrations from '@/components/marketing/Integrations';
import PricingTable from '@/components/marketing/PricingTable';
import FAQ from '@/components/marketing/FAQ';
import LiveDemoTeaser from '@/components/marketing/LiveDemoTeaser';
import CtaBanner from '@/components/marketing/CtaBanner';

export default function LandingPage() {
  return (
    <>
      <Hero />
      <TrustBar />
      <Stats />
      <Features />
      <HowItWorks />
      <AgentFlowDemo />
      <CaseStudyTeaser />
      <ClosedLoopDiagram />
      <SecurityCompliance />
      <Integrations />
      <PricingTable />
      <FAQ />
      <LiveDemoTeaser />
      <CtaBanner />
    </>
  );
}
