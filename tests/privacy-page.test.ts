import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { routeForHost } from '../src/lib/host-routing'

const read = (path: string) => readFileSync(path, 'utf8')

test('privacy notice is reachable on public host without a campaign or database', () => {
  assert.deepEqual(routeForHost('public', '/legal/privacidade', 'GET'), { action: 'next' })
  assert.deepEqual(routeForHost('admin', '/legal/privacidade', 'GET'), { action: 'not-found' })
  const page = read('src/app/legal/privacidade/page.tsx')
  assert.match(page, /<h1>Privacidade<\/h1>/)
  assert.match(page, /coleta de métricas com o PostHog está desativada/)
  assert.match(page, /não torna a conexão anônima/)
  assert.match(page, /prazo de retenção/)
  assert.match(page, /https:\/\/wa.me\/5547992901925/)
  assert.doesNotMatch(page, /trackPublicEvent|requireAdmin|from ['"].*db|90 dias|legítimo interesse/)
})

test('privacy links do not interrupt composition and stay out of private preview', () => {
  assert.match(read('src/components/site/Footer.tsx'), /href="\/legal\/privacidade">Privacidade<\/Link>/)
  const editor = read('src/editor/PhotoEditor.tsx')
  assert.match(editor, /telemetry && <p><a href="\/legal\/privacidade" target="_blank" rel="noopener noreferrer"/)
  assert.match(editor, /Privacidade da Namarca \(abre em outra aba\)/)
})
