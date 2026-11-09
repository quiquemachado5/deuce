import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { parseEnvFile } from './preflight.mjs'

const separator = process.argv.indexOf('--')
if (separator < 0 || !process.argv[separator + 1]) throw new Error('A command is required after --')

const envPath = resolve(process.env.DEUCE_PRODUCTION_ENV || '.env.production')
const values = parseEnvFile(await readFile(envPath, 'utf8'))
const command = resolve(process.argv[separator + 1])
const args = process.argv.slice(separator + 2)
const child = spawn(command, args, {
  cwd: process.cwd(),
  env: { ...process.env, ...values },
  stdio: 'inherit',
})

child.on('error', error => {
  console.error(error instanceof Error ? error.message : 'Production maintenance command failed')
  process.exitCode = 1
})
child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`Production maintenance command stopped by ${signal}`)
    process.exitCode = 1
  } else process.exitCode = code ?? 1
})
