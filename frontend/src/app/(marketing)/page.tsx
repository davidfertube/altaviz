import Hero from '@/components/marketing/Hero';
import Features from '@/components/marketing/Features';
import HowItWorks from '@/components/marketing/HowItWorks';
import AgentFlowDemo from '@/components/marketing/AgentFlowDemo';
import SecurityCompliance from '@/components/marketing/SecurityCompliance';
import Integrations from '@/components/marketing/Integrations';
import LeadCaptureSection from '@/components/marketing/LeadCaptureSection';

export default function LandingPage() {
  return (
    <>
      <Hero />
      <Features />
      <HowItWorks />
      <AgentFlowDemo />
      <SecurityCompliance />
      <Integrations />
      <LeadCaptureSection />
    </>
  );
}
