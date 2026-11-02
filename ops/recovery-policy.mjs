function successfulWithin(row, maximumAgeHours) {
  return row && typeof row === 'object' && row.status === 'success'
    && Number.isFinite(row.ageHours) && row.ageHours <= maximumAgeHours
}

export function recoveryFailures(health) {
  const recovery = health?.recovery
  if (!recovery || typeof recovery !== 'object') return ['Estado de copias y restauración ausente']
  const backupMaximum = Number.isFinite(recovery.backupStaleAfterHours) ? recovery.backupStaleAfterHours : 36
  const restoreMaximum = Number.isFinite(recovery.restoreStaleAfterHours) ? recovery.restoreStaleAfterHours : 192
  const failures = []
  if (!successfulWithin(recovery.backup, backupMaximum) || recovery.backup?.restoreValidated !== true) {
    failures.push('Copia externa restaurable ausente o fuera de plazo')
  }
  if (!successfulWithin(recovery.restore, restoreMaximum)) failures.push('Simulacro de restauración ausente o fuera de plazo')
  if (Number.isFinite(recovery.restore?.backupAgeHours) && recovery.restore.backupAgeHours > restoreMaximum) {
    failures.push('El simulacro usó una copia externa demasiado antigua')
  }
  return failures
}
