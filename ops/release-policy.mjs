function integer(value) { return Number.isSafeInteger(value) ? value : undefined }

export function recoverableDailyPublicationFailure(health) {
  const daily = health?.dailyUpdate
  if (!daily || typeof daily !== 'object') return false
  const issues = Array.isArray(health.healthIssues) ? health.healthIssues : []
  if (!issues.includes('daily-update')
    || issues.some(issue => !['daily-update', 'scheduler', 'host'].includes(issue))
    || health.storage?.available !== true || health.fallbackReason) return false
  const refreshFresh = row => row && typeof row === 'object'
    && row.status === 'success' && Number.isFinite(row.ageHours) && row.ageHours <= 12
  const staleAfterHours = Number.isFinite(daily.staleAfterHours) ? daily.staleAfterHours : 36
  const publication = daily.publication
  return Boolean(refreshFresh(daily.atp) && refreshFresh(daily.wta)
    && publication && typeof publication === 'object'
    && publication.status === 'error'
    && Number.isFinite(publication.lastSuccessAgeHours)
    && publication.lastSuccessAgeHours <= staleAfterHours)
}

function initialDailyBootstrapReady(health) {
  const daily = health?.dailyUpdate
  if (!daily || typeof daily !== 'object') return false
  const unavailable = row =>
    row && typeof row === 'object' && row.status === 'unavailable'
      && (row.at === null || row.at === undefined)
      && (row.ageHours === null || row.ageHours === undefined)
  const refreshesUnavailable = unavailable(daily.atp) && unavailable(daily.wta)
  if (!refreshesUnavailable) return false
  if (unavailable(daily.publication)) return true
  const staleAfterHours = Number.isFinite(daily.staleAfterHours) ? daily.staleAfterHours : 36
  return daily.publication && typeof daily.publication === 'object'
    && daily.publication.status === 'success' && daily.publication.initialSeed === true
    && Number.isFinite(daily.publication.ageHours) && daily.publication.ageHours <= staleAfterHours
}

export function releaseFailures(health, baseline, options = {}) {
  const failures = []
  const allowDegraded = options.allowDegraded === true
  if (!health || typeof health !== 'object') return ['Respuesta de salud ausente o inválida']
  const hostIssueOnly = options.allowHostIssue === true
    && health.status === 'degraded'
    && Array.isArray(health.healthIssues)
    && health.healthIssues.length > 0
    && health.healthIssues.every(issue => issue === 'host')
  // Before the first provider run, accept only absent circuit refreshes plus
  // a recent, explicitly marked seed publication (or no publication row yet).
  // Stale/error rows and every other release check remain blocking.
  const initialDailyBootstrap = options.allowInitialDailyUnavailable === true
    && health.status === 'degraded' && initialDailyBootstrapReady(health)
  if (health.status !== 'healthy' && !(allowDegraded && health.status === 'degraded') && !initialDailyBootstrap && !hostIssueOnly) failures.push(`Estado ${String(health.status).slice(0, 30)}`)
  if (!Number.isFinite(health.ageHours) || health.ageHours > (baseline.maximumDataAgeHours || 72)) failures.push('Datos fuera de la ventana de frescura permitida')
  if ((integer(health.matches) || 0) < baseline.minimumMatches) failures.push('Pérdida de volumen frente a la última release validada')
  if ((integer(health.statistics) || 0) < baseline.minimumStatistics) failures.push('Pérdida de catálogo frente a la última release validada')
  for (const [tour, minimum] of Object.entries(baseline.minimumStatisticsByTour || {})) {
    if ((integer(health.statisticsByTour?.[tour]) || 0) < minimum) failures.push(`Pérdida de catálogo ${tour.toUpperCase()}`)
  }
  for (const [tour, minimum] of Object.entries(baseline.minimumTours || {})) {
    if ((integer(health.tours?.[tour]) || 0) < minimum) failures.push(`Pérdida de cobertura ${tour.toUpperCase()}`)
  }
  const tourTotal = Object.keys(baseline.minimumTours || {}).reduce((sum, tour) => sum + (integer(health.tours?.[tour]) || 0), 0)
  if (Object.keys(baseline.minimumTours || {}).length && tourTotal !== health.matches) failures.push('Totales por circuito incoherentes con el archivo')
  if (!/^[a-f0-9]{20}$/.test(health.datasetVersion || '')) failures.push('Versión de datos ausente o inválida')
  const expectedDataset = options.expectedDatasetVersion || baseline.expectedDatasetVersion
  if (expectedDataset && health.datasetVersion !== expectedDataset) failures.push('Versión de datos distinta de la release aprobada')
  if (baseline.requiredRulesVersion && health.rulesVersion !== baseline.requiredRulesVersion) failures.push('Versión de reglas incompatible')
  const expectedCommit = options.expectedCommit || baseline.expectedCommit
  if (baseline.requireCommit && !/^[a-f0-9]{7,40}$/.test(health.deployment?.commit || '')) failures.push('Commit del despliegue ausente')
  if (expectedCommit && !String(health.deployment?.commit || '').startsWith(expectedCommit)) failures.push('Commit desplegado distinto del aprobado')
  if (baseline.requireStorage && health.storage?.available !== true) failures.push('Capacidad del archivo no verificada')
  if (health.fallbackReason) failures.push('Respaldo activado por fallo de generación remota')
  if (baseline.requireScheduler) {
    if (health.scheduler?.configured !== true) failures.push('Scheduler no configurado')
    else if (health.scheduler?.status !== 'healthy') failures.push(`Scheduler ${String(health.scheduler?.status || 'unavailable')}`)
    const maximum = baseline.maximumSchedulerHeartbeatSeconds || 180
    if (!Number.isFinite(health.scheduler?.heartbeatAgeSeconds) || health.scheduler.heartbeatAgeSeconds > maximum) failures.push('Heartbeat del scheduler fuera de plazo')
  }
  return [...new Set(failures)]
}
