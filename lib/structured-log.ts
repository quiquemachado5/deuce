import { randomUUID } from 'node:crypto';

export function requestId(request?: Request) {
  return request?.headers.get('x-request-id')?.slice(0, 96) || randomUUID();
}

export function logEvent(
  level: 'info' | 'warn' | 'error',
  event: string,
  fields: Record<string, string | number | boolean | null | undefined> = {},
) {
  const row = JSON.stringify({ at: new Date().toISOString(), level, event, ...fields });
  if (level === 'error') console.error(row);
  else if (level === 'warn') console.warn(row);
  else console.info(row);
}
