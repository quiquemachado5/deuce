import { createHmac } from 'node:crypto';
import { logEvent, requestId } from '@/lib/structured-log';
import { observeSecurityEvent } from '@/lib/runtime-metrics';
import {clientAddress} from './client-address';

export function securityActorHash(request: Request, salt = process.env.SECURITY_LOG_SALT) {
  const address = clientAddress(request);
  if (!address || !salt) return undefined;
  return createHmac('sha256', salt).update(address).digest('hex').slice(0, 24);
}

export function unauthorizedResponse(request: Request, surface: string) {
  const id = requestId(request);
  observeSecurityEvent(surface, 'denied');
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
