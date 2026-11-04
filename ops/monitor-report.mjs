const integer = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 })
const decimal = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 })

function value(input, fallback = '—') {
  return input === null || input === undefined || input === '' ? fallback : String(input)
}

export function monitorReport(health, failures, productionUrl, checkedAt = new Date().toISOString()) {
  const snapshot = health && typeof health === 'object' ? health : {}
  const recovery = snapshot.recovery || {}
  const quota = snapshot.providerQuota || {}
  const storage = snapshot.storage || {}
  const report = {
    schema: 1,
    checkedAt,
    productionUrl,
    healthy: failures.length === 0,
    failures,
    status: snapshot.status || 'unreachable',
    commit: snapshot.deployment?.commit || null,
    datasetVersion: snapshot.datasetVersion || null,
    datasetAgeHours: Number.isFinite(snapshot.ageHours) ? snapshot.ageHours : null,
    matches: Number.isFinite(snapshot.matches) ? snapshot.matches : null,
    tours: snapshot.tours || null,
    scheduler: snapshot.scheduler ? {
      status: snapshot.scheduler.status || null,
      heartbeatAgeSeconds: Number.isFinite(snapshot.scheduler.heartbeatAgeSeconds) ? snapshot.scheduler.heartbeatAgeSeconds : null,
      nextRunAt: snapshot.scheduler.nextRunAt || null,
    } : null,
    backup: recovery.backup ? {
      status: recovery.backup.status || null,
      ageHours: Number.isFinite(recovery.backup.ageHours) ? recovery.backup.ageHours : null,
      restoreValidated: recovery.backup.restoreValidated === true,
    } : null,
    restore: recovery.restore ? {
      status: recovery.restore.status || null,
      ageHours: Number.isFinite(recovery.restore.ageHours) ? recovery.restore.ageHours : null,
      restoreValidated: recovery.restore.restoreValidated === true,
    } : null,
    providerQuota: {
      remaining: Number.isFinite(quota.remaining) ? quota.remaining : null,
      reserve: Number.isFinite(quota.reserve) ? quota.reserve : null,
      safeAvailable: Number.isFinite(quota.safeAvailable) ? quota.safeAvailable : null,
      retryAt: quota.retryAt || null,
    },
    storage: {
      bytes: Number.isFinite(storage.payloadBytes) ? storage.payloadBytes : null,
      maximumBytes: Number.isFinite(storage.maximumBytes) ? storage.maximumBytes : null,
      available: storage.available === true,
    },
  }
  return report
}

export function monitorMarkdown(report) {
  const status = report.healthy ? '✅ Operativa' : '❌ Incidencia'
  const rows = [
    ['Estado', status],
    ['Commit', report.commit ? `\`${report.commit.slice(0, 12)}\`` : '—'],
    ['Partidos', Number.isFinite(report.matches) ? integer.format(report.matches) : '—'],
    ['ATP / WTA', report.tours ? `${integer.format(report.tours.atp || 0)} / ${integer.format(report.tours.wta || 0)}` : '—'],
    ['Antigüedad del archivo', Number.isFinite(report.datasetAgeHours) ? `${decimal.format(report.datasetAgeHours)} h` : '—'],
    ['Scheduler', report.scheduler ? `${value(report.scheduler.status)} · ${integer.format(report.scheduler.heartbeatAgeSeconds || 0)} s` : '—'],
    ['Copia', report.backup ? `${value(report.backup.status)} · ${decimal.format(report.backup.ageHours || 0)} h · restaurable: ${report.backup.restoreValidated ? 'sí' : 'no'}` : '—'],
    ['Simulacro', report.restore ? `${value(report.restore.status)} · ${decimal.format(report.restore.ageHours || 0)} h` : '—'],
    ['Cuota proveedor', Number.isFinite(report.providerQuota.remaining) ? `${integer.format(report.providerQuota.remaining)} restantes · reserva ${integer.format(report.providerQuota.reserve || 0)}` : '—'],
    ['Almacenamiento', Number.isFinite(report.storage.bytes) && Number.isFinite(report.storage.maximumBytes) ? `${decimal.format(report.storage.bytes / 1_000_000)} MB / ${decimal.format(report.storage.maximumBytes / 1_000_000_000)} GB` : '—'],
  ]
  const incidents = report.failures.length
    ? `\n### Incidencias\n\n${report.failures.map(failure => `- ${failure}`).join('\n')}\n`
    : ''
  return `## DEUCE · salud de producción\n\nComprobación: ${report.checkedAt} · [abrir producción](${report.productionUrl})\n\n| Control | Resultado |\n| --- | --- |\n${rows.map(([name, result]) => `| ${name} | ${result} |`).join('\n')}\n${incidents}`
}
