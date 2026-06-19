# @bosphorify/blockkit — agent guide

This file is the internal contract for AI agents and contributors. Consumer-facing
usage is in [README.md](README.md). Read both before changing anything.

## What this project is

`@bosphorify/blockkit` is a **curated block editor + renderer built on top of
[BlockNote](https://www.blocknotejs.org/)**. BlockNote provides the Notion-style WYSIWYG
editor and a block-JSON document model. blockkit is the **layer over** BlockNote that turns
it into a content system:

1. a **single registry** describing each curated block,
2. a **shared allowlist renderer** (block JSON → React) used by both the public site and the
   editor preview,
3. a **one-way markdown bridge** so agents/LLMs get clean markdown derived from the blocks,
4. **one opt-in executable block** that runs author-written JSX at view time.

It was extracted from the **bosphorify-web** app (the TanStack Start site behind
bosphorify.com) so this layer is portable and publishable. The app still vendors a copy
under its `packages/blockkit/` until it switches to the published npm dependency — keep the
two in sync conceptually, but **this repo is the canonical home** going forward: make blockkit
changes HERE and let the app's vendored copy follow downstream — do not edit blockkit logic in
the app repo (its copy may already be stale).

The document of record is **BlockNote block JSON** — lossless and canonical. Markdown is
*derived* from it one-way (for agents); it is never parsed back into the source of truth.

## Golden rules (do not violate)

- **Never fork BlockNote.** Use it as a library. Curated blocks are `createReactBlockSpec`
  entries *derived from the registry*; the document stays BlockNote block JSON.
- **The registry is the single source of truth.** `src/registry.tsx` drives the slash menu,
  the renderer, the config forms, and the executable-block scope. **Adding a curated block =
  one registry entry + keeping `CURATED_TYPES` in `src/types.ts` in sync.** (`test/registry.test.ts`
  enforces this — it will fail if they drift.)
- **No app coupling.** The package must build and run with only its declared peers/deps.
  App specifics enter through exactly two **seams** and nowhere else:
  - `configureBlockKit({ track })` — analytics (no SDK is imported here; events no-op until set).
  - `BlockEditor`'s `uploadFile` prop — asset storage (defaults to `data:` URLs).
  If you reach for app code, add/extend a seam instead. There must be **zero** `#/…` or
  app-path imports in `src/`.
- **Executable block = opt-in and client-only.** It lives behind the `/runner` entry
  (`react-runner` → `eval`/`new Function`). `PostRenderer` renders it **only** when the
  caller passes `allowExecutable`, and **only** via the client-only `CodeRunner` (empty
  output during SSR, so author code can never touch server secrets).
- **Peers stay external in the build.** React, BlockNote, CodeMirror, react-runner are peer
  dependencies and are marked `external` in `tsup.config.ts` — never bundle them, so the
  consumer dedupes a single copy.

## Layout

```
src/
  index.ts         main entry: PostRenderer + registry + curated components + md converters
                   + types + configureBlockKit. No BlockNote, no eval.
  editor.ts        /editor entry: BlockEditor, editorSchema, EDITOR_BLOCK_TYPES  (heavy: BlockNote + CodeMirror)
  runner.ts        /runner entry: CodeRunner, normalizeRunnerCode                (eval; opt-in)
  registry.tsx     THE registry — specs / slash menu / renderer / runner scope all derive from it
  PostRenderer.tsx allowlist renderer (block JSON → React; unknown types render nothing)
  BlockEditor.tsx  BlockNote authoring surface (imports BlockNote CSS; uploadFile injected)
  blocks.tsx       BlockNote schema (createReactBlockSpec) + EDITOR_BLOCK_TYPES
  CodeRunner.tsx   react-runner with an explicit scope (no globalThis); client-only
  components.tsx   curated block components (Callout, Slider, Chart, Quiz, Embed, FAQ) +
                   CodeBlock (renderer for BlockNote's BUILT-IN code block — not a registry entry)
  ChartImpl.tsx    recharts implementation (lazy-loaded by Chart)
  markdown-to-blocks.ts / blocks-to-markdown.ts   one-way agent-markdown bridges
  normalize-runner-code.ts  "statements then trailing <X/>" → `export default` (react-runner needs it)
  track.ts         analytics seam (module-level injected tracker; configureBlockKit / TrackFn)
  cn.ts            vendored clsx + tailwind-merge helper
  ui/              vendored shadcn/ui primitives (button, input, label, select, textarea,
                   slider, accordion, chart) — self-contained for portability
test/              the suite, imports the package by its public name (see vitest.config.ts aliases)
tsup.config.ts     publish build (ESM + .d.ts for the 3 entries; peers external)
vitest.config.ts   aliases @bosphorify/blockkit{,/editor,/runner} → src/ so tests run unbuilt
```

## Architecture notes

- **Three entries, split by cost** so consumers load only what they use. Most pages only
  *render*, so the main entry pulls in no BlockNote and no eval. `PostRenderer` internally
  `React.lazy`-loads `CodeRunner` only when `allowExecutable` is set — so you can render
  executable posts without importing `/runner` yourself.
- **Styling** is Tailwind utility classes + shadcn/ui tokens, expected from the host. The
  only stylesheet imports are BlockNote's own (`@blocknote/core/fonts/inter.css`,
  `@blocknote/mantine/style.css`) inside `BlockEditor.tsx`, resolved via the BlockNote peer.
- **`normalizeRunnerCode`** exists because react-runner needs an `export default`; the
  authoring convention is "statements, then a trailing JSX expression" which is rewritten to
  a default export. Without it react-runner returns `null`.

## Dev workflow

```bash
npm install        # peers are devDependencies so build + tests resolve
npm test           # vitest run (registry sync, md↔blocks round-trips, runner normalization, renderer parity)
npm run typecheck  # tsc --noEmit
npm run build      # tsup → dist/{index,editor,runner}.{js,d.ts}
```

Tests import via the public package name and are resolved to `src/` by `vitest.config.ts`
aliases — so they exercise the true public surface with no build step. `renderer-parity`
uses `react-dom/server` to assert every insertable block renders and that the executable
block is opt-in only.

## Publishing

1. Bump `version` in `package.json` (semver).
2. `npm publish` — `prepublishOnly` runs `tsup` to produce `dist/`. Only `dist/` is shipped
   (`files`); `exports`/`main`/`module`/`types` already point at the built output. It's a
   public scoped package (`publishConfig.access = "public"`), so the first publish needs an
   npm account in the `@bosphorify` org/scope.
3. Tag the release in git.

After it's on npm, the **bosphorify-web** app can drop its in-repo `packages/blockkit` copy
and depend on the published version (remove the workspace + the tsconfig/vitest aliases for
`@bosphorify/blockkit`, add the npm dep). That cleanup lives in the app repo, not here.

## Don't

- Don't import from `#/` or any app path inside `src/`.
- Don't put app analytics / storage / auth logic here — use the two seams.
- Don't bundle BlockNote / React / CodeMirror / react-runner into the build — they're peers.
- Don't add a curated block without a matching `CURATED_TYPES` entry (the test will fail).
- Don't evaluate the executable block on the server, or render it without `allowExecutable`.
