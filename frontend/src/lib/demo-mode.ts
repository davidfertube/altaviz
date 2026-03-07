export function isDemoMode(req?: Request): boolean {
  if (!process.env.DATABASE_URL || process.env.DEMO_MODE === 'true') return true;
  if (req?.headers.get('x-demo-mode') === 'true') return true;
  return false;
}
