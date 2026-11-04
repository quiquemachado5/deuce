import { createHmac } from 'node:crypto';
import { logEvent, requestId } from '@/lib/structured-log';

function requestAddress(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('x-real-ip')?.trim() || request.headers.get('cf-connecting-ip')?.trim();
}

export function securityActorHash(request: Request, salt = process.env.SECURITY_LOG_SALT) {
  const address = requestAddress(request);
  if (!address || !salt) return undefined;
  return createHmac('sha256', salt).update(address).digest('hex').slice(0, 24);
}

export function unauthorizedResponse(request: Request, surface: string) {
  const id = requestId(request);
  logEvent('warn', 'security.auth.denied', {
    requestId: id,
    surface,
    method: request.method,
    ipHash: securityActorHash(request),
  });
  return Response.json({ error: 'Unauthorized' }, {
    status: 401,
    headers: { 'Cache-Control': 'private, no-store', 'X-Request-Id': id },
  });
}
