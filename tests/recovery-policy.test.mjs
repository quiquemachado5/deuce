import test from 'node:test'
import assert from 'node:assert/strict'
import { recoveryFailures } from '../ops/recovery-policy.mjs'

test('recovery policy requires recent restored backups and restore drills', () => {
  const healthy = { recovery: {
    backup: { status: 'success', ageHours: 12, restoreValidated: true },
    restore: { status: 'success', ageHours: 120, backupAgeHours: 1 },
    backupStaleAfterHours: 36, restoreStaleAfterHours: 192,
  } }
  assert.deepEqual(recoveryFailures(healthy), [])
  assert.ok(recoveryFailures({ recovery: { ...healthy.recovery,
    backup: { status: 'success', ageHours: 37, restoreValidated: true } } }).length)
  assert.ok(recoveryFailures({ recovery: { ...healthy.recovery,
    restore: { status: 'success', ageHours: 193, backupAgeHours: 193 } } }).length >= 2)
  assert.deepEqual(recoveryFailures({}), ['Estado de copias y restauración ausente'])
})
