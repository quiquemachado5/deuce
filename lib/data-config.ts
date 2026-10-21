type DataEnvironment = { NODE_ENV?: string; VERCEL_ENV?: string; NEXT_PUBLIC_USE_MOCK_DATA?: string };

/** Missing configuration must never silently select fictional results. */
export function isDemoDataEnabled(env: DataEnvironment = process.env): boolean {
  const value = env.NEXT_PUBLIC_USE_MOCK_DATA;
  if (value !== undefined && value !== 'true' && value !== 'false') {
    throw new Error('NEXT_PUBLIC_USE_MOCK_DATA must be true or false');
  }
  if (value === 'true' && (env.NODE_ENV === 'production' || env.VERCEL_ENV)) {
    throw new Error('Demo data is only allowed in local development or tests');
  }
  return value === 'true';
}
