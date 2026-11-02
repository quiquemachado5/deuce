import 'server-only'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

type Stage = {
  status?: unknown
  attempts?: unknown
  lastAttemptAt?: unknown
  nextAttemptAt?: unknown
  operationStatus?: unknown
  error?: unknown
}

const date = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : undefined

export function schedulerStateHealth(value: unknown, now = Date.now(), staleAfterMs = 3 * 60_000) {
  const row = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const heartbeatAt = date(row.heartbeatAt)
  const rawStages = row.stages && typeof row.stages === 'object' ? row.stages as Record<string, Stage> : {}
  const stages = Object.fromEntries(Object.entries(rawStages).map(([path, stage]) => [path, {
    status: typeof stage.status === 'string' ? stage.status : 'unknown',
    attempts: Number.isSafeInteger(stage.attempts) ? Number(stage.attempts) : 0,
    lastAttemptAt: date(stage.lastAttemptAt), nextAttemptAt: date(stage.nextAttemptAt),
    operationStatus: typeof stage.operationStatus === 'string' ? stage.operationStatus.slice(0, 48) : undefined,
    error: typeof stage.error === 'string' ? stage.error.slice(0, 120) : undefined,
  }]))
  const heartbeatAgeSeconds = heartbeatAt ? Math.max(0, Math.round((now - Date.parse(heartbeatAt)) / 1_000)) : null
  const blocked = Object.values(stages).some(stage => stage.status === 'blocked')
  const stale = heartbeatAgeSeconds === null || heartbeatAgeSeconds * 1_000 > staleAfterMs
  return {
    status: stale ? 'stale' as const : blocked ? 'degraded' as const : 'healthy' as const,
    day: typeof row.day === 'string' ? row.day : undefined,
    heartbeatAt, heartbeatAgeSeconds, nextRunAt: date(row.nextRunAt), stages,
  }
}

export async function readSchedulerHealth() {
  const configured = Boolean(process.env.DEUCE_SCHEDULER_STATE || process.env.DEUCE_ARCHIVE_DIR)
  if (!configured) return { configured: false, status: 'disabled' as const }
  const path = process.env.DEUCE_SCHEDULER_STATE || join(process.env.DEUCE_ARCHIVE_DIR!, '.scheduler', 'state.json')
  try {
    return { configured: true, ...schedulerStateHealth(JSON.parse(await readFile(path, 'utf8'))) }
  } catch {
    return { configured: true, status: 'missing' as const }
  }
}
