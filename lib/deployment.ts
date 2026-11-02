export const APPLICATION_VERSION = '0.1.0';

function compact(value: string | undefined, maximum = 64) {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, maximum) : null;
}

/** Public, non-secret identifiers that let an incident be tied to one release. */
export function deploymentMetadata() {
  const commit = compact(process.env.VERCEL_GIT_COMMIT_SHA || process.env.COMMIT_REF || process.env.GITHUB_SHA, 40);
  return {
    applicationVersion: APPLICATION_VERSION,
    commit,
    deploymentId: compact(process.env.VERCEL_DEPLOYMENT_ID || process.env.DEPLOY_ID),
    deploymentUrl: compact(process.env.VERCEL_URL || process.env.DEPLOY_PRIME_URL || process.env.URL, 180),
    environment: compact(process.env.VERCEL_ENV || process.env.CONTEXT || process.env.NODE_ENV, 24),
  };
}
