import { NextResponse } from 'next/server';
import { DEMO_EMISSIONS, DEMO_FLEET } from '@/lib/demo-data';

export async function GET() {
  const totalCo2e = DEMO_EMISSIONS.reduce((sum, e) => sum + e.co2e_tonnes, 0);
  const annualProjected = totalCo2e * 8760; // hourly * hours/year

  return NextResponse.json({
    estimates: DEMO_EMISSIONS,
    fleet_summary: {
      total_compressors: DEMO_FLEET.length,
      total_co2e_tonnes_hr: +totalCo2e.toFixed(4),
      annual_projected_co2e: +annualProjected.toFixed(2),
      reporting_threshold: 25000,
      requires_reporting: annualProjected >= 25000,
      status: annualProjected < 25000 * 0.8 ? 'compliant' : annualProjected < 25000 ? 'near_threshold' : 'reporting_required',
    },
  });
}
