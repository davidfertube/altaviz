import PricingTable from '@/components/marketing/PricingTable';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing - Altaviz',
  description: 'Simple, transparent pricing for predictive maintenance. Start free, scale as you grow.',
};

export default function PricingPage() {
  return (
    <div className="pt-20">
      <PricingTable />
    </div>
  );
}
