import assert from 'node:assert/strict'
import test from 'node:test'
import { recoveryFreshness } from '../ops/vps/recovery-freshness.mjs'

const now = Date.parse('2026-11-09T20:00:00Z')

test('accepts a recent restore-validated offsite backup', () => {
  const result = recoveryFreshness({ verifiedAt: '2026-11-09T03:00:00Z', restoreValidated: true }, 36, now)
  assert.equal(result.fresh, true)
  assert.equal(result.ageHours, 17)
})

test('rejects stale, future, invalid and unvalidated backups', () => {
  assert.equal(recoveryFreshness({ verifiedAt: '2026-11-07T03:00:00Z', restoreValidated: true }, 36, now).fresh, false)
  assert.equal(recoveryFreshness({ verifiedAt: '2026-11-10T03:00:00Z', restoreValidated: true }, 36, now).fresh, false)
  assert.equal(recoveryFreshness({ verifiedAt: 'invalid', restoreValidated: true }, 36, now).fresh, false)
  assert.equal(recoveryFreshness({ verifiedAt: '2026-11-09T03:00:00Z', restoreValidated: false }, 36, now).fresh, false)
})
