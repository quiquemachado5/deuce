import { chmod, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const allowed = new Set([
  'DEUCE_HOST',
  'DEUCE_WWW_HOST',
  'DEUCE_LEGACY_HOST',
  'NEXT_PUBLIC_SITE_ORIGIN',
  'DEUCE_MONITOR_URL',
  'DEUCE_RATE_LIMIT_STORE',
  'DEUCE_RATE_LIMIT_DB',
])

function parse(source) {
  const values = new Map()
  for (const original of source.split(/\r?\n/)) {
    const line = original.trim()
    if (!line || line.startsWith('#')) continue
    const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line)
    if (!match) throw new Error(`Invalid public configuration line: ${original.slice(0, 40)}`)
    if (!allowed.has(match[1])) throw new Error(`Public configuration cannot change ${match[1]}`)
    values.set(match[1], match[2])
  }
  if (values.size !== allowed.size) throw new Error('Public production configuration is incomplete')
  return values
}

export async function applyPublicEnv(envPath, configPath) {
  const updates = parse(await readFile(configPath, 'utf8'))
  const source = await readFile(envPath, 'utf8')
  const seen = new Set()
  const lines = source.split(/\r?\n/).map(line => {
    const match = /^(?:export\s+)?([A-Z][A-Z0-9_]*)=/.exec(line.trim())
    if (!match || !updates.has(match[1])) return line
    if (seen.has(match[1])) throw new Error(`Duplicate ${match[1]} in production environment`)
    seen.add(match[1])
    return `${match[1]}=${updates.get(match[1])}`
  })
  for (const [name, value] of updates) if (!seen.has(name)) lines.push(`${name}=${value}`)

  const output = `${lines.join('\n').replace(/\n+$/, '')}\n`
  if (output === source) return false

  const temporary = resolve(dirname(envPath), `.env.production.${process.pid}.tmp`)
  try {
    await writeFile(temporary, output, { mode: 0o600, flag: 'wx' })
    await chmod(temporary, 0o600)
    await rename(temporary, envPath)
  } finally {
    await rm(temporary, { force: true })
  }
  return true
}

async function main() {
  const envPath = resolve(process.argv.find(value => value.startsWith('--env='))?.slice(6) || '.env.production')
  const configPath = resolve(process.argv.find(value => value.startsWith('--config='))?.slice(9) || 'ops/vps/production-public.env')
  const changed = await applyPublicEnv(envPath, configPath)
  console.log(JSON.stringify({ updated: changed }))
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : 'Failed to apply public production configuration')
    process.exitCode = 1
  })
}
