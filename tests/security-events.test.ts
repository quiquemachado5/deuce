import assert from 'node:assert/strict';
import test from 'node:test';
import { securityActorHash, unauthorizedResponse } from '../lib/security-events';

test('security events identify repeated actors without recording private request data', async () => {
  const previousSalt = process.env.SECURITY_LOG_SALT;
  process.env.SECURITY_LOG_SALT = 'test-only-security-log-salt';
  const originalWarn = console.warn;
  const rows: string[] = [];
  console.warn = (value?: unknown) => rows.push(String(value));
  try {
    const request = new Request('https://deuce.test/api/metrics?token=must-not-leak', {
      headers: {
        Authorization: 'Bearer must-not-leak',
        'X-Forwarded-For': '203.0.113.19, 10.0.0.2',
        'X-Request-Id': 'security-test-request',
      },
    });
    const expectedHash = securityActorHash(request);
    const response = unauthorizedResponse(request, 'metrics');
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.equal(response.headers.get('x-request-id'), 'security-test-request');
    assert.deepEqual(await response.json(), { error: 'Unauthorized' });

    const event = JSON.parse(rows.at(-1) || '{}');
    assert.equal(event.event, 'security.auth.denied');
    assert.equal(event.surface, 'metrics');
    assert.equal(event.method, 'GET');
    assert.equal(event.ipHash, expectedHash);
    assert.match(event.ipHash, /^[a-f0-9]{24}$/);
    const serialized = JSON.stringify(event);
    assert.doesNotMatch(serialized, /203\.0\.113\.19|must-not-leak|token=/);
  } finally {
    console.warn = originalWarn;
    if (previousSalt === undefined) delete process.env.SECURITY_LOG_SALT;
    else process.env.SECURITY_LOG_SALT = previousSalt;
  }
});

test('security actor hash is omitted unless a private salt is configured', () => {
  const previousSalt = process.env.SECURITY_LOG_SALT;
  delete process.env.SECURITY_LOG_SALT;
  try {
    const request = new Request('https://deuce.test/api/cron/refresh', { headers: { 'X-Real-Ip': '198.51.100.5' } });
    assert.equal(securityActorHash(request), undefined);
  } finally {
    if (previousSalt !== undefined) process.env.SECURITY_LOG_SALT = previousSalt;
  }
});
