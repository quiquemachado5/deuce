import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('forced deployment command accepts only immutable deploy and probe verbs', async () => {
  const source = await readFile(new URL('../ops/vps/deploy-command.sh', import.meta.url), 'utf8')
  assert.match(source, /\^\(deploy\|probe\):\(\[a-f0-9\]\{40\}\)\$/)
  assert.match(source, /git rev-parse origin\/main/)
  assert.match(source, /flock --exclusive --nonblock/)
  assert.doesNotMatch(source, /eval|bash -c/)
})

test('guard installer restricts only the selected key before removing sudo', async () => {
  const source = await readFile(new URL('../ops/vps/install-deploy-guard.sh', import.meta.url), 'utf8')
  assert.match(source, /matches.*-ne 1/s)
  assert.match(source, /restrict,command=/)
  assert.ok(source.indexOf('sshd -t') < source.indexOf('rm -f /etc/sudoers.d/deuce'))
})
