import Hero from '@/components/marketing/Hero';
import Stats from '@/components/marketing/Stats';
import Features from '@/components/marketing/Features';
import HowItWorks from '@/components/marketing/HowItWorks';
import AgentFlowDemo from '@/components/marketing/AgentFlowDemo';
import LiveDemoTeaser from '@/components/marketing/LiveDemoTeaser';
import SecurityCompliance from '@/components/marketing/SecurityCompliance';
import Integrations from '@/components/marketing/Integrations';
import LeadCaptureSection from '@/components/marketing/LeadCaptureSection';

export default function LandingPage() {
  return (
    <>
      <Hero />
      <Stats />
      <Features />
      <HowItWorks />
      <AgentFlowDemo />
      <LiveDemoTeaser />
      <SecurityCompliance />
      <Integrations />
      <LeadCaptureSection />
    </>
  );
}
