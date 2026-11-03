import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const workflow = await readFile(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8')

test('CI builds once, caches Next output and reuses it for browser verification', () => {
  assert.equal((workflow.match(/npm run build/g) || []).length, 1)
  assert.match(workflow, /actions\/cache@0057852bfaa89a56745cba8c7296529d2fc39830/)
  assert.match(workflow, /path: \$\{\{ github\.workspace \}\}\/\.next\/cache/)
  assert.match(workflow, /'data\/reading\/\*\*'/)
  assert.match(workflow, /'data\/archive\/\*\*'/)
  assert.match(workflow, /'public\/\*\*'/)
  assert.match(workflow, /'styles\/\*\*'/)
  assert.match(workflow, /'instrumentation\*\.ts'/)
  assert.match(workflow, /'postcss\.config\.\*'/)
  assert.match(workflow, /hashFiles\('package\.json', 'package-lock\.json'\)/)
  assert.doesNotMatch(workflow, /restore-keys:/)
  assert.match(workflow, /name: next-build-\$\{\{ github\.sha \}\}/)
  assert.match(workflow, /data\/reading\/\*\*/)
  assert.match(workflow, /!data\/reading\/matches\.json\.gz/)
  assert.equal((workflow.match(/actions\/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093/g) || []).length, 1)
  assert.equal((workflow.match(/test -s \.next\/BUILD_ID/g) || []).length, 1)
  assert.match(workflow, /test -s data\/reading\/manifest\.json\.gz/)
  assert.match(workflow, /find data\/reading -maxdepth 1 -name 'matches-\*\.json\.gz'/)
  assert.doesNotMatch(workflow, /\.deuce-cache\/reading/)
  assert.doesNotMatch(workflow, /path: \.next\n\s+- run: test -s \.next\/BUILD_ID/)
})

test('CI keeps independent quality gates behind the stable verify check', () => {
  assert.doesNotMatch(workflow, /data:\n\s+needs:/)
  assert.match(workflow, /browser:\n\s+needs: build/)
  assert.match(workflow, /verify:\n\s+needs: \[quality, build, data, browser\]/)
  for (const gate of ['QUALITY', 'BUILD', 'DATA', 'BROWSER']) {
    assert.match(workflow, new RegExp(`test "\\$${gate}" = success`))
  }
})

test('visual builds use a deterministic editorial day', () => {
  assert.match(workflow, /DEUCE_E2E_DATE: '2026-11-02T12:00:00Z'/)
})
