import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const src = (p: string) => fileURLToPath(new URL(`./src/${p}`, import.meta.url))

// The test suite imports the package by its public name (`@bosphorify/blockkit`,
// `/editor`, `/runner`) — exactly as a consumer would — resolved here to the TS
// source so tests run with zero build step. Array form preserves order: the more
// specific subpath aliases must precede the bare one (first match wins).
export default defineConfig({
  resolve: {
    alias: [
      { find: '@bosphorify/blockkit/editor', replacement: src('editor.ts') },
      { find: '@bosphorify/blockkit/runner', replacement: src('runner.ts') },
      { find: '@bosphorify/blockkit', replacement: src('index.ts') },
      // node env can't load CSS — BlockEditor side-effect-imports BlockNote's
      // stylesheets; map any *.css import to an empty stub for tests.
      {
        find: /^.+\.css$/,
        replacement: fileURLToPath(new URL('./test/css-stub.ts', import.meta.url)),
      },
    ],
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.{ts,tsx}'],
  },
})
