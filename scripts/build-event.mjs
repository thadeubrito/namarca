import { build, context } from 'esbuild'
import { copyFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = fileURLToPath(new URL('../', import.meta.url))
const outdir = path.join(root, 'public/event-runtime')

await mkdir(outdir, { recursive: true })
const options = {
  absWorkingDir: root,
  entryPoints: { main: 'apps/event/src/main.tsx', preview: 'apps/event/src/preview.tsx' },
  outdir,
  bundle: true,
  splitting: true,
  format: 'esm',
  platform: 'browser',
  target: ['es2022'],
  jsx: 'automatic',
  minify: true,
  sourcemap: false,
  entryNames: '[name]',
  chunkNames: 'chunks/[name]-[hash]',
  assetNames: 'assets/[name]-[hash]',
  define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'info',
}
if (process.argv.includes('--watch')) {
  const compiler = await context(options)
  await compiler.watch()
  console.info('Editor estático: observando apps/event e packages/editor.')
} else await build(options)
await Promise.all(['index.html', 'preview.html'].map(name =>
  copyFile(path.join(root, 'apps/event', name), path.join(outdir, name)),
))
