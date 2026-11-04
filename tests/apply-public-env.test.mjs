import assert from 'node:assert/strict'
import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { applyPublicEnv } from '../ops/vps/apply-public-env.mjs'

test('public production configuration changes only public origins and preserves secrets', async () => {
  const root = await mkdtemp(join(tmpdir(), 'deuce-public-env-'))
  const envPath = join(root, '.env.production')
  const configPath = join(root, 'public.env')
  await writeFile(envPath, [
    'DEUCE_HOST=old.example.com',
    'NEXT_PUBLIC_SITE_ORIGIN=https://old.example.com',
    'DEUCE_MONITOR_URL=https://old.example.com',
    'CRON_SECRET=keep-this-secret',
    '',
  ].join('\n'), { mode: 0o600 })
  await writeFile(configPath, [
    'DEUCE_HOST=deucearchive.com',
    'DEUCE_WWW_HOST=www.deucearchive.com',
    'DEUCE_LEGACY_HOST=old.example.com',
    'NEXT_PUBLIC_SITE_ORIGIN=https://deucearchive.com',
    'DEUCE_MONITOR_URL=https://deucearchive.com',
    '',
  ].join('\n'))

  assert.equal(await applyPublicEnv(envPath, configPath), true)
  const updated = await readFile(envPath, 'utf8')
  assert.match(updated, /^DEUCE_HOST=deucearchive\.com$/m)
  assert.match(updated, /^DEUCE_WWW_HOST=www\.deucearchive\.com$/m)
  assert.match(updated, /^DEUCE_LEGACY_HOST=old\.example\.com$/m)
  assert.match(updated, /^CRON_SECRET=keep-this-secret$/m)
  assert.equal((await stat(envPath)).mode & 0o777, 0o600)
  assert.equal(await applyPublicEnv(envPath, configPath), false)
})

test('public production configuration rejects attempts to change private values', async () => {
  const root = await mkdtemp(join(tmpdir(), 'deuce-public-env-'))
  const envPath = join(root, '.env.production')
  const configPath = join(root, 'public.env')
  await writeFile(envPath, 'CRON_SECRET=existing\n', { mode: 0o600 })
  await writeFile(configPath, 'CRON_SECRET=replaced\n')
  await assert.rejects(applyPublicEnv(envPath, configPath), /cannot change CRON_SECRET/)
})
