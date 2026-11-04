import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const workflow = await readFile(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8')

test('CI builds once and verifies that exact output in the same isolated job', () => {
  assert.equal((workflow.match(/npm run build/g) || []).length, 1)
  assert.match(workflow, /actions\/cache@55cc8345863c7cc4c66a329aec7e433d2d1c52a9/)
  assert.match(workflow, /path: \$\{\{ github\.workspace \}\}\/\.next\/cache/)
  assert.match(workflow, /'data\/reading\/\*\*'/)
  assert.match(workflow, /'data\/archive\/\*\*'/)
  assert.match(workflow, /'public\/\*\*'/)
  assert.match(workflow, /'styles\/\*\*'/)
  assert.match(workflow, /'instrumentation\*\.ts'/)
  assert.match(workflow, /'postcss\.config\.\*'/)
  assert.match(workflow, /hashFiles\('package\.json', 'package-lock\.json'\)/)
  assert.doesNotMatch(workflow, /restore-keys:/)
  assert.match(workflow, /npm run build[\s\S]*npm run test:browser/)
  assert.doesNotMatch(workflow, /actions\/download-artifact/)
  assert.doesNotMatch(workflow, /name: next-build-/)
  assert.equal((workflow.match(/test -s \.next\/BUILD_ID/g) || []).length, 1)
  assert.match(workflow, /test -s data\/reading\/manifest\.json\.gz/)
  assert.match(workflow, /find data\/reading -maxdepth 1 -name 'matches-\*\.json\.gz'/)
  assert.doesNotMatch(workflow, /\.deuce-cache\/reading/)
  assert.doesNotMatch(workflow, /path: \.next\n\s+- run: test -s \.next\/BUILD_ID/)
})

test('CI keeps independent quality gates behind the stable verify check', () => {
  assert.doesNotMatch(workflow, /data:\n\s+needs:/)
  assert.doesNotMatch(workflow, /^  browser:/m)
  assert.match(workflow, /verify:\n\s+needs: \[quality, build, data\]/)
  for (const gate of ['QUALITY', 'BUILD', 'DATA']) {
    assert.match(workflow, new RegExp(`test "\\$${gate}" = success`))
  }
})

test('visual builds use a deterministic editorial day', () => {
  assert.match(workflow, /DEUCE_E2E_DATE: '2026-11-02T12:00:00Z'/)
})
