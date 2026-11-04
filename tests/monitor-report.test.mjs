import assert from 'node:assert/strict'
import test from 'node:test'
import { monitorMarkdown, monitorReport } from '../ops/monitor-report.mjs'

test('monitor report preserves the operational evidence without secrets', () => {
  const report = monitorReport({
    status: 'healthy', matches: 124082, ageHours: 2.5,
    deployment: { commit: 'a'.repeat(40) }, tours: { atp: 51450, wta: 72632 },
    scheduler: { status: 'healthy', heartbeatAgeSeconds: 25, nextRunAt: '2026-11-05T00:05:00Z' },
    recovery: {
      backup: { status: 'success', ageHours: 8, restoreValidated: true },
      restore: { status: 'success', ageHours: 20, restoreValidated: true },
    },
    providerQuota: { remaining: 600, reserve: 200, safeAvailable: 400 },
    storage: { payloadBytes: 500_000_000, maximumBytes: 40_000_000_000, available: true },
  }, [], 'https://deuce.example', '2026-11-04T12:00:00Z')
  assert.equal(report.healthy, true)
  assert.equal(report.matches, 124082)
  assert.equal(report.backup.restoreValidated, true)
  const markdown = monitorMarkdown(report)
  assert.match(markdown, /✅ Operativa/)
  assert.match(markdown, /51\.450 \/ 72\.632/)
  assert.doesNotMatch(markdown, /token|secret|authorization/i)
})

test('monitor report makes failures explicit', () => {
  const report = monitorReport(null, ['No se pudo consultar producción'], 'https://deuce.example')
  assert.equal(report.healthy, false)
  assert.match(monitorMarkdown(report), /No se pudo consultar producción/)
})
