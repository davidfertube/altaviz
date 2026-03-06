export function isDemoMode(): boolean {
  return !process.env.DATABASE_URL || process.env.DEMO_MODE === 'true';
}
