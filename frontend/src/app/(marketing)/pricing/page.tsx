import PricingTable from '@/components/marketing/PricingTable';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing - Altaviz',
  description: 'Pipeline integrity management pricing. Start with a pilot, scale to enterprise.',
};

export default function PricingPage() {
  return (
    <div className="pt-20">
      <PricingTable />
    </div>
  );
}
