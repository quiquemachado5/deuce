import assert from 'node:assert/strict'
import test from 'node:test'
import { parseEnvFile, validateProductionEnv } from '../ops/vps/preflight.mjs'

const valid = {
  DEUCE_HOST: 'deuce.example.net',
  DEUCE_RATE_LIMIT_STORE:'sqlite',
  DEUCE_RATE_LIMIT_DB:'/app/.deuce-archive/.runtime/rate-limits.sqlite',
  DEUCE_WWW_HOST: 'www.deuce.example.net',
  NEXT_PUBLIC_SITE_ORIGIN: 'https://deuce.example.net',
  DEUCE_MONITOR_URL: 'https://deuce.example.net',
  TENNIS_API_KEY: 'provider-key-with-enough-entropy',
  CRON_SECRET: 'a'.repeat(64),
  WTA_BACKFILL_SECRET: 'b'.repeat(64),
  METRICS_SECRET: 'c'.repeat(64),
  DEUCE_ARCHIVE_MAX_BYTES: '40000000000',
  DEUCE_BACKUP_REMOTE: 'crypt:deuce/production',
  DEUCE_PROVIDER_MIN_REMAINING:'200',
  DEUCE_PROVIDER_DAILY_MAX_CALLS:'400',
  DEUCE_BACKUP_REMOTE_KEEP_DAYS:'14',
}

test('production preflight accepts a coherent private configuration', () => {
  const source = Object.entries(valid).map(([key, value]) => `${key}=${value}`).join('\n')
  assert.deepEqual(parseEnvFile(`# production\n${source}\n`), valid)
  assert.deepEqual(validateProductionEnv(valid).errors, [])
})

test('production preflight rejects placeholders, weak secrets and mismatched origins', () => {
  const result = validateProductionEnv({
    ...valid,
    DEUCE_HOST: 'deuce.example.com',
    NEXT_PUBLIC_SITE_ORIGIN: 'http://other.example.net/path',
    CRON_SECRET: 'short',
    WTA_BACKFILL_SECRET: 'short',
    METRICS_SECRET: 'short',
    DEUCE_BACKUP_REMOTE: '/local/backups',
    DEUCE_PROVIDER_MIN_REMAINING:'199',
    DEUCE_PROVIDER_DAILY_MAX_CALLS:'2001',
    DEUCE_BACKUP_REMOTE_KEEP_DAYS:'7',
  })
  assert.ok(result.errors.some(error => error.includes('placeholder')))
  assert.ok(result.errors.some(error => error.includes('bare HTTPS origin')))
  assert.ok(result.errors.some(error => error.includes('must use DEUCE_HOST')))
  assert.ok(result.errors.some(error => error.includes('at least 48')))
  assert.ok(result.errors.some(error => error.includes('must be different')))
  assert.ok(result.errors.some(error => error.includes('rclone remote')))
  assert.ok(result.errors.some(error=>error.includes('at least 200')))
  assert.ok(result.errors.some(error=>error.includes('250 to 2000')))
  assert.ok(result.errors.some(error=>error.includes('8 to 90')))
})


test('production preflight rejects per-worker rate limits and unshared SQLite paths',()=>{
 for(const values of [{...valid,DEUCE_RATE_LIMIT_STORE:'memory'},{...valid,DEUCE_RATE_LIMIT_DB:'/tmp/limits.sqlite'},{...valid,DEUCE_RATE_LIMIT_DB:'/app/.deuce-archive/.runtime/../limits.sqlite'}])assert.ok(validateProductionEnv(values).errors.some(error=>error.includes('RATE_LIMIT')));
});
