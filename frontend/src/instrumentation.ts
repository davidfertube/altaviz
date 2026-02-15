export async function register() {
  const { validateEnvironment } = await import('./lib/env');
  validateEnvironment();
}
