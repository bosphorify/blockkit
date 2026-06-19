import { defineConfig } from 'tsup'

/**
 * Publish build. Emits ESM + .d.ts for the three entries to dist/. Peers (React,
 * BlockNote, CodeMirror, react-runner) stay external so the consumer dedupes a
 * single copy. Dependency CSS side-effect imports (e.g. @blocknote styles)
 * remain as external imports for the host to resolve.
 *
 * `npm run build` (or `npm publish` via prepublishOnly) runs this.
 */
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    editor: 'src/editor.ts',
    runner: 'src/runner.ts',
  },
  format: ['esm'],
  // Build tsconfig has no `paths` (only tests need the self-name alias); keeps
  // tsup's dts pass from injecting a deprecated `baseUrl`.
  tsconfig: 'tsconfig.build.json',
  dts: true,
  clean: true,
  treeshake: true,
  // every peer stays external so the consumer dedupes a single copy (no
  // bundled runtime deps remain — the package ships only its own source)
  external: [
    /^react($|\/)/,
    /^react-dom($|\/)/,
    /^@blocknote\//,
    /^@codemirror\//,
    '@uiw/react-codemirror',
    'react-runner',
  ],
})
