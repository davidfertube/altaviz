import {
  Account,
  Ad,
  AdSet,
  Campaign,
  CreativeType,
  DailyMetric,
  Platform,
} from "./types";

/**
 * Deterministic seeded dataset. The same account is regenerated identically on
 * every cold start, so the app needs no database and every judge sees the same
 * findable anomalies. Dates are anchored to "today" at request time; the shape
 * of the series (including injected anomalies) is fixed by the seed.
 */

const DAYS = 90;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface AdSpec {
  name: string;
  creativeType: CreativeType;
  headline: string;
  angle: string;
  /** relative performance multiplier vs campaign baseline */
  quality: number;
  /** anomaly hooks, applied by day offset from the end (0 = today) */
  fatigueFromDay?: number; // frequency climbs + CTR decays from this many days ago
}

interface AdSetSpec {
  name: string;
  audience: string;
  dailyBudget: number;
  ads: AdSpec[];
  /** consistently high ROAS but budget-capped — the "underfunded winner" */
  underfundedWinner?: boolean;
}

interface CampaignSpec {
  id: string;
  name: string;
  platform: Platform;
  vertical: string;
  dailyBudget: number;
  payoutPerLead: number;
  baseCtr: number;
  baseCvr: number;
  baseCpm: number;
  adSets: AdSetSpec[];
  cpaDriftFromDay?: number; // CVR decays steadily from this many days ago
  spendSpikeDay?: number; // one day at ~3x budget
  outageDay?: number; // conversions ~0 for one day (tracking outage)
}

const SPECS: CampaignSpec[] = [
  {
    id: "cmp-meta-solar",
    name: "Solar — US Homeowners",
    platform: "meta",
    vertical: "Solar",
    dailyBudget: 2500,
    payoutPerLead: 42,
    baseCtr: 0.021,
    baseCvr: 0.023,
    baseCpm: 14,
    adSets: [
      {
        name: "Homeowners 35-65 Broad",
        audience: "US homeowners, 35-65, broad",
        dailyBudget: 1500,
        ads: [
          {
            name: "SOLAR-VID-A “Power Bill Shock”",
            creativeType: "video",
            headline: "Your Power Company Doesn't Want You Seeing This",
            angle: "bill-shock",
            quality: 1.25,
            fatigueFromDay: 12, // headline anomaly #1: creative fatigue
          },
          {
            name: "SOLAR-IMG-B “State Incentive”",
            creativeType: "image",
            headline: "New State Incentives Cut Solar Costs by 40%",
            angle: "incentive",
            quality: 0.95,
          },
        ],
      },
      {
        name: "AngleB-v2 Retargeting",
        audience: "Site visitors 30d, lookalike 1%",
        dailyBudget: 400,
        underfundedWinner: true, // anomaly #5: scale opportunity
        ads: [
          {
            name: "SOLAR-VID-C “Installer Shortage”",
            creativeType: "video",
            headline: "Why Solar Installers Are Booked Out for Months",
            angle: "urgency",
            quality: 1.6,
          },
        ],
      },
    ],
  },
  {
    id: "cmp-meta-debt",
    name: "Debt Relief — Credit Card",
    platform: "meta",
    vertical: "Debt Relief",
    dailyBudget: 1800,
    payoutPerLead: 35,
    baseCtr: 0.018,
    baseCvr: 0.032,
    baseCpm: 16,
    adSets: [
      {
        name: "CC Debt 10k+ Interest",
        audience: "Interest: debt consolidation, 30-60",
        dailyBudget: 1800,
        ads: [
          {
            name: "DEBT-IMG-A “Forgiveness Program”",
            creativeType: "image",
            headline: "Owe Over $10k? This Program May Cut It in Half",
            angle: "relief-program",
            quality: 1.0,
          },
          {
            name: "DEBT-VID-B “Minimum Payment Trap”",
            creativeType: "video",
            headline: "The Minimum Payment Trap, Explained in 60 Seconds",
            angle: "education",
            quality: 1.05,
          },
        ],
      },
    ],
  },
  {
    id: "cmp-google-hi",
    name: "Home Insurance — Search",
    platform: "google",
    vertical: "Home Insurance",
    dailyBudget: 2200,
    payoutPerLead: 28,
    baseCtr: 0.045,
    baseCvr: 0.040,
    baseCpm: 38,
    outageDay: 6, // anomaly #4: conversion tracking outage 6 days ago
    adSets: [
      {
        name: "Exact — home insurance quotes",
        audience: "kw: [home insurance quotes]",
        dailyBudget: 1400,
        ads: [
          {
            name: "GOOG-RSA-A Quotes",
            creativeType: "native",
            headline: "Compare Home Insurance Quotes in 2 Minutes",
            angle: "comparison",
            quality: 1.1,
          },
        ],
      },
      {
        name: "Phrase — cheap home insurance",
        audience: 'kw: "cheap home insurance"',
        dailyBudget: 800,
        ads: [
          {
            name: "GOOG-RSA-B Savings",
            creativeType: "native",
            headline: "Homeowners Are Overpaying $600/yr on Insurance",
            angle: "savings",
            quality: 0.9,
          },
        ],
      },
    ],
  },
  {
    id: "cmp-google-solar",
    name: "Solar — Search Brand+",
    platform: "google",
    vertical: "Solar",
    dailyBudget: 900,
    payoutPerLead: 42,
    baseCtr: 0.052,
    baseCvr: 0.025,
    baseCpm: 42,
    adSets: [
      {
        name: "Solar cost keywords",
        audience: "kw: solar panel cost, solar installation",
        dailyBudget: 900,
        ads: [
          {
            name: "GOOG-RSA-C Cost Calc",
            creativeType: "native",
            headline: "See What Solar Would Cost for Your Home",
            angle: "calculator",
            quality: 1.0,
          },
        ],
      },
    ],
  },
  {
    id: "cmp-taboola-medicare",
    name: "Medicare Advantage — Native",
    platform: "taboola",
    vertical: "Medicare",
    dailyBudget: 3000,
    payoutPerLead: 22,
    baseCtr: 0.0032,
    baseCvr: 0.077,
    baseCpm: 4.2,
    cpaDriftFromDay: 21, // anomaly #2: CPA drift over the last 3 weeks
    adSets: [
      {
        name: "65+ Desktop",
        audience: "65+, desktop, health interest",
        dailyBudget: 1800,
        ads: [
          {
            name: "TAB-NAT-A “2026 Benefits”",
            creativeType: "native",
            headline: "Seniors: Check the New 2026 Medicare Benefits List",
            angle: "benefits-list",
            quality: 1.0,
          },
          {
            name: "TAB-NAT-B “Grocery Allowance”",
            creativeType: "native",
            headline: "Some Plans Now Include a Monthly Grocery Allowance",
            angle: "allowance",
            quality: 1.1,
          },
        ],
      },
      {
        name: "65+ Mobile",
        audience: "65+, mobile, health interest",
        dailyBudget: 1200,
        ads: [
          {
            name: "TAB-NAT-C “Zip Check”",
            creativeType: "native",
            headline: "Enter Your Zip to See Plans Available in Your Area",
            angle: "zip-check",
            quality: 0.92,
          },
        ],
      },
    ],
  },
  {
    id: "cmp-tiktok-auto",
    name: "Auto Warranty — Spark Ads",
    platform: "tiktok",
    vertical: "Auto Warranty",
    dailyBudget: 1200,
    payoutPerLead: 18,
    baseCtr: 0.011,
    baseCvr: 0.058,
    baseCpm: 9,
    spendSpikeDay: 4, // anomaly #3: spend spike 4 days ago
    adSets: [
      {
        name: "Car owners 25-45",
        audience: "Auto interest, 25-45",
        dailyBudget: 1200,
        ads: [
          {
            name: "TT-VID-A “Mechanic Confession”",
            creativeType: "video",
            headline: "A Mechanic Told Me What Repairs Really Cost",
            angle: "insider",
            quality: 1.15,
          },
          {
            name: "TT-VID-B “Breakdown Bill”",
            creativeType: "video",
            headline: "This $4,300 Repair Bill Could've Been $100",
            angle: "bill-shock",
            quality: 0.85,
          },
        ],
      },
    ],
  },
];

function isoDaysAgo(daysAgo: number, anchor: Date): string {
  const d = new Date(anchor);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function generateAdMetrics(
  rand: () => number,
  spec: CampaignSpec,
  adSet: AdSetSpec,
  ad: AdSpec,
  anchor: Date,
): DailyMetric[] {
  const out: DailyMetric[] = [];
  const adShare = 1 / adSet.ads.length;
  for (let i = DAYS - 1; i >= 0; i--) {
    // i = days ago. Weekly seasonality + noise around the ad-set budget.
    const dow = (anchor.getUTCDay() - (i % 7) + 7) % 7;
    const weekend = dow === 0 || dow === 6 ? 0.85 : 1.0;
    let spend =
      adSet.dailyBudget * adShare * weekend * (0.9 + rand() * 0.2);

    let ctr = spec.baseCtr * ad.quality * (0.92 + rand() * 0.16);
    let cvr = spec.baseCvr * (0.9 + rand() * 0.2);
    let frequency = 1.6 + rand() * 0.5;

    // Anomaly: creative fatigue — frequency climbs, CTR decays.
    if (ad.fatigueFromDay !== undefined && i <= ad.fatigueFromDay) {
      const p = (ad.fatigueFromDay - i) / ad.fatigueFromDay; // 0 → 1
      frequency = 2.0 + p * 2.6 + rand() * 0.2; // up to ~4.6
      ctr *= 1 - 0.45 * p; // CTR down ~45%
      cvr *= 1 - 0.15 * p;
    }

    // Anomaly: CPA drift — conversion rate decays steadily.
    if (spec.cpaDriftFromDay !== undefined && i <= spec.cpaDriftFromDay) {
      const p = (spec.cpaDriftFromDay - i) / spec.cpaDriftFromDay;
      cvr *= 1 - 0.28 * p; // ~28% CVR loss → ~+39% CPA by today
    }

    // Anomaly: one-day spend spike (runaway bid / budget misconfig).
    if (spec.spendSpikeDay !== undefined && i === spec.spendSpikeDay) {
      spend *= 3.1;
    }

    // Underfunded winner: strong CTR/CVR, spend pinned at the (low) budget cap.
    if (adSet.underfundedWinner) {
      ctr *= 1.15;
      cvr *= 1.25;
      spend = adSet.dailyBudget * adShare * (0.97 + rand() * 0.03); // always capped
    }

    const cpm = spec.baseCpm * (0.9 + rand() * 0.2);
    const impressions = Math.round((spend / cpm) * 1000);
    const clicks = Math.round(impressions * ctr);
    let conversions = Math.round(clicks * cvr);

    // Anomaly: tracking outage — clicks normal, conversions ~gone.
    if (spec.outageDay !== undefined && i === spec.outageDay) {
      conversions = Math.round(conversions * 0.04);
    }

    const revenue = conversions * spec.payoutPerLead;
    out.push({
      date: isoDaysAgo(i, anchor),
      spend: Math.round(spend * 100) / 100,
      impressions,
      clicks,
      conversions,
      revenue: Math.round(revenue * 100) / 100,
      frequency: Math.round(frequency * 100) / 100,
    });
  }
  return out;
}

function build(): Account {
  const rand = mulberry32(1337_2026);
  const anchor = new Date();
  anchor.setUTCHours(0, 0, 0, 0);

  const campaigns: Campaign[] = SPECS.map((spec) => {
    const adSets: AdSet[] = spec.adSets.map((s, si) => {
      const adSetId = `${spec.id}-as${si + 1}`;
      const ads: Ad[] = s.ads.map((a, ai) => ({
        id: `${adSetId}-ad${ai + 1}`,
        name: a.name,
        adSetId,
        campaignId: spec.id,
        platform: spec.platform,
        creativeType: a.creativeType,
        headline: a.headline,
        angle: a.angle,
        status: "active",
        metrics: generateAdMetrics(rand, spec, s, a, anchor),
      }));
      return {
        id: adSetId,
        name: s.name,
        campaignId: spec.id,
        platform: spec.platform,
        audience: s.audience,
        dailyBudget: s.dailyBudget,
        ads,
      };
    });
    return {
      id: spec.id,
      name: spec.name,
      platform: spec.platform,
      vertical: spec.vertical,
      objective: "lead_gen" as const,
      status: "active" as const,
      dailyBudget: spec.dailyBudget,
      payoutPerLead: spec.payoutPerLead,
      adSets,
    };
  });

  return { generatedAt: anchor.toISOString(), days: DAYS, campaigns };
}

let cached: Account | null = null;
let cachedDate: string | null = null;

/** The demo account. Regenerated when the UTC day changes so "today" stays current. */
export function getAccount(): Account {
  const today = new Date().toISOString().slice(0, 10);
  if (!cached || cachedDate !== today) {
    cached = build();
    cachedDate = today;
  }
  return cached;
}
