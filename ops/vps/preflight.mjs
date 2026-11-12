import { readFile, stat, statfs } from 'node:fs/promises'
import { resolve, isAbsolute } from 'node:path'
import { pathToFileURL } from 'node:url'

const required = [
  'DEUCE_HOST',
  'DEUCE_WWW_HOST',
  'NEXT_PUBLIC_SITE_ORIGIN',
  'DEUCE_MONITOR_URL',
  'TENNIS_API_KEY',
  'CRON_SECRET',
  'WTA_BACKFILL_SECRET',
  'METRICS_SECRET',
  'DEUCE_ARCHIVE_MAX_BYTES',
  'DEUCE_BACKUP_REMOTE',
]

export function parseEnvFile(source) {
  const values = {}
  for (const original of source.split(/\r?\n/)) {
    const line = original.trim()
    if (!line || line.startsWith('#')) continue
    const match = /^(?:export\s+)?([A-Z][A-Z0-9_]*)=(.*)$/.exec(line)
    if (!match) throw new Error(`Invalid environment line: ${original.slice(0, 40)}`)
    let value = match[2].trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1)
    values[match[1]] = value
  }
  return values
}

export function validateProductionEnv(values) {
  const errors = []
  for (const name of required) if (!values[name]?.trim()) errors.push(`${name} is required`)
  const placeholder = /replace-|example\.com|change[-_]?me|your[-_]/i
  for (const name of required) if (placeholder.test(values[name] || '')) errors.push(`${name} still contains a placeholder`)

  const host = values.DEUCE_HOST?.trim()
  if (host && (host.includes('://') || host.includes('/') || /\s/.test(host))) errors.push('DEUCE_HOST must be a bare DNS name')
  const wwwHost = values.DEUCE_WWW_HOST?.trim()
  if (wwwHost && (wwwHost.includes('://') || wwwHost.includes('/') || /\s/.test(wwwHost))) errors.push('DEUCE_WWW_HOST must be a bare DNS name')
  const legacyHost = values.DEUCE_LEGACY_HOST?.trim()
  if (legacyHost && (legacyHost.includes('://') || legacyHost.includes('/') || /\s/.test(legacyHost))) errors.push('DEUCE_LEGACY_HOST must be a bare DNS name')
  if (host && legacyHost === host) errors.push('DEUCE_LEGACY_HOST must differ from DEUCE_HOST')
  if (host && wwwHost === host) errors.push('DEUCE_WWW_HOST must differ from DEUCE_HOST')
  if (wwwHost && legacyHost === wwwHost) errors.push('DEUCE_WWW_HOST must differ from DEUCE_LEGACY_HOST')
  for (const name of ['NEXT_PUBLIC_SITE_ORIGIN', 'DEUCE_MONITOR_URL']) {
    const value = values[name]
    if (!value) continue
    try {
      const url = new URL(value)
      if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash) errors.push(`${name} must be a bare HTTPS origin`)
      if (host && url.host !== host) errors.push(`${name} must use DEUCE_HOST`)
    } catch { errors.push(`${name} must be a valid HTTPS URL`) }
  }

  if ((values.TENNIS_API_KEY || '').length < 20) errors.push('TENNIS_API_KEY is unexpectedly short')
  const secretNames = ['CRON_SECRET', 'WTA_BACKFILL_SECRET', 'METRICS_SECRET']
  for (const name of secretNames) if ((values[name] || '').length < 48) errors.push(`${name} must contain at least 48 characters`)
  if (new Set(secretNames.map(name => values[name]).filter(Boolean)).size !== secretNames.filter(name => values[name]).length) errors.push('Server secrets must be different')
  if (values.DEUCE_BACKUP_REMOTE && !/^[^\s:]+:.+/.test(values.DEUCE_BACKUP_REMOTE)) errors.push('DEUCE_BACKUP_REMOTE must name a configured rclone remote')

  const archiveMaximum = Number(values.DEUCE_ARCHIVE_MAX_BYTES)
  if (!Number.isSafeInteger(archiveMaximum) || archiveMaximum < 1_000_000_000) errors.push('DEUCE_ARCHIVE_MAX_BYTES must be an integer of at least 1 GB')
  if(values.DEUCE_PROVIDER_MIN_REMAINING!==undefined){
    const reserve=Number(values.DEUCE_PROVIDER_MIN_REMAINING)
    if(!Number.isSafeInteger(reserve)||reserve<200)errors.push('DEUCE_PROVIDER_MIN_REMAINING must preserve at least 200 daily calls')
  }
  if(values.DEUCE_PROVIDER_DAILY_MAX_CALLS!==undefined){
    const dailyMaximum=Number(values.DEUCE_PROVIDER_DAILY_MAX_CALLS)
    if(!Number.isSafeInteger(dailyMaximum)||dailyMaximum<250||dailyMaximum>2000)errors.push('DEUCE_PROVIDER_DAILY_MAX_CALLS must be an integer from 250 to 2000')
  }
  if(values.DEUCE_BACKUP_REMOTE_KEEP_DAYS!==undefined){
    const retention=Number(values.DEUCE_BACKUP_REMOTE_KEEP_DAYS)
    if(!Number.isSafeInteger(retention)||retention<8||retention>90)errors.push('DEUCE_BACKUP_REMOTE_KEEP_DAYS must be an integer from 8 to 90')
  }
  if(values.DEUCE_RATE_LIMIT_STORE!=='sqlite')errors.push('DEUCE_RATE_LIMIT_STORE must be sqlite for shared production workers')
  if(!values.DEUCE_RATE_LIMIT_DB||!isAbsolute(values.DEUCE_RATE_LIMIT_DB)||!values.DEUCE_RATE_LIMIT_DB.startsWith('/app/.deuce-archive/.runtime/')||values.DEUCE_RATE_LIMIT_DB.includes('..'))errors.push('DEUCE_RATE_LIMIT_DB must use the shared archive runtime volume')
  return { errors, archiveMaximum }
}

async function main() {
  const envArgument = process.argv.find(value => value.startsWith('--env='))?.slice(6)
  const rootArgument = process.argv.find(value => value.startsWith('--root='))?.slice(7)
  const envPath = resolve(envArgument || '.env.production')
  const root = resolve(rootArgument || '.')
  const metadata = await stat(envPath)
  if ((metadata.mode & 0o077) !== 0) throw new Error(`${envPath} must be readable only by its owner (chmod 600)`)
  const values = parseEnvFile(await readFile(envPath, 'utf8'))
  const { errors, archiveMaximum } = validateProductionEnv(values)

  const filesystem = await statfs(root, { bigint: true })
  const totalBytes = filesystem.blocks * filesystem.bsize
  const freeBytes = filesystem.bavail * filesystem.bsize
  if (BigInt(archiveMaximum || 0) > totalBytes * 7n / 10n) errors.push('DEUCE_ARCHIVE_MAX_BYTES exceeds 70% of the filesystem')
  if (freeBytes < 8n * 1024n * 1024n * 1024n) errors.push('At least 8 GB of free disk space is required before deployment')
  if (errors.length) throw new Error(`Production preflight failed:\n- ${errors.join('\n- ')}`)
  console.log(JSON.stringify({ verified: true, host: values.DEUCE_HOST, archiveMaximum, freeBytes: Number(freeBytes) }))
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error instanceof Error ? error.message : 'Production preflight failed'); process.exitCode = 1 })
}
