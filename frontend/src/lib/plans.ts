import type { WindowType } from './types';

export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

export interface PlanDefinition {
  name: string;
  tier: SubscriptionTier;
  price: number; // monthly USD
  maxCompressors: number;
  windowTypes: WindowType[];
  dataRetentionDays: number;
  features: string[];
}

export const PLANS: Record<SubscriptionTier, PlanDefinition> = {
  free: {
    name: 'Free',
    tier: 'free',
    price: 0,
    maxCompressors: 2,
    windowTypes: ['1hr'],
    dataRetentionDays: 7,
    features: [
      '2 compressors',
      '1-hour aggregation window',
      'Basic email alerts',
      '7-day data retention',
      'Community support',
    ],
  },
  pro: {
    name: 'Pro',
    tier: 'pro',
    price: 49,
    maxCompressors: 20,
    windowTypes: ['1hr', '4hr', '24hr'],
    dataRetentionDays: 90,
    features: [
      'Up to 20 compressors',
      'All aggregation windows (1hr, 4hr, 24hr)',
      'Priority + SMS alerts',
      '90-day data retention',
      'API access',
      'Email support',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    tier: 'enterprise',
    price: 199,
    maxCompressors: Infinity,
    windowTypes: ['1hr', '4hr', '24hr'],
    dataRetentionDays: 365,
    features: [
      'Unlimited compressors',
      'All aggregation windows + custom',
      'Priority + SMS + webhook alerts',
      '1-year data retention',
      'API access + bulk export',
      'ML predictions',
      'Dedicated support',
    ],
  },
};

export function getPlan(tier: string): PlanDefinition {
  return PLANS[(tier as SubscriptionTier)] || PLANS.free;
}

export function canAccessWindowType(tier: string, windowType: WindowType): boolean {
  const plan = getPlan(tier);
  return plan.windowTypes.includes(windowType);
}

export function getCompressorLimit(tier: string): number {
  return getPlan(tier).maxCompressors;
}

export function canAccessFeature(tier: string, feature: 'api' | 'ml_predictions' | 'bulk_export' | 'webhook_alerts'): boolean {
  switch (feature) {
    case 'api':
      return tier === 'pro' || tier === 'enterprise';
    case 'ml_predictions':
      return tier === 'enterprise';
    case 'bulk_export':
      return tier === 'enterprise';
    case 'webhook_alerts':
      return tier === 'enterprise';
    default:
      return false;
  }
}

export function getStripePriceId(tier: SubscriptionTier): string | null {
  switch (tier) {
    case 'pro':
      return process.env.STRIPE_PRICE_ID_PRO || null;
    case 'enterprise':
      return process.env.STRIPE_PRICE_ID_ENTERPRISE || null;
    default:
      return null;
  }
}
