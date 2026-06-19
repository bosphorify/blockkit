# @bosphorify/blockkit — agent guide

This file is the internal contract for AI agents and contributors. Consumer-facing
usage is in [README.md](README.md). Read both before changing anything.

## What this project is

`@bosphorify/blockkit` is a **runnable JSX block for [BlockNote](https://www.blocknotejs.org/),
plus a light read-only renderer**. BlockNote provides the Notion-style WYSIWYG editor and a
block-JSON document model. blockkit is a thin **layer over** BlockNote that adds:

1. **one executable block** that runs author-written JSX at view time (`react-runner` →
   `eval`), authored in an inline CodeMirror editor,
2. a **constrained editor** (`BlockEditor`) = BlockNote's native blocks + that executable block,
3. a **light allowlist renderer** (`PostRenderer`: block JSON → React) that displays stored
   content **without loading BlockNote**, so a host can render far cheaper (and server-side)
   than mounting the editor.

The document of record is **BlockNote block JSON** — lossless and canonical.

> **Scope discipline (this is the point of the package).** blockkit intentionally does NOT
> ship curated blocks (callouts, charts, quizzes, etc.), a block registry, config forms, a
> markdown bridge, or an analytics seam — those were removed deliberately. Anyone who wants
> more block types adds them with BlockNote's own `createReactBlockSpec`. Do not re-introduce
> that machinery here; keep this package about the runnable block + native rendering.

## Golden rules (do not violate)

- **Never fork BlockNote.** Use it as a library. The executable block is a
  `createReactBlockSpec` entry; the document stays BlockNote block JSON.
- **Executable block = opt-in and client-only.** It lives behind the `/runner` entry
  (`react-runner` → `eval`/`new Function`). `PostRenderer` renders it **only** when the
  caller passes `allowExecutable`, and **only** via the client-only `CodeRunner` (empty
  output during SSR, so author code can never touch server secrets).
- **Scope is explicit.** `CodeRunner` runs author code with `{ React, ...scope }` and never
  writes to `globalThis`. The optional `scope` threads consistently: `BlockEditor`
  (`runnerScope`) → `createEditorSchema(scope)` → the executable spec → `CodeRunner`, and
  `PostRenderer` (`scope`) → `CodeRunner`. Keep editor and render scope identical so previews
  match published output.
- **No app coupling.** The package must build and run with only its declared peers. App
  specifics enter through exactly one **seam**: `BlockEditor`'s `uploadFile` prop (asset
  storage; defaults to `data:` URLs). There must be **zero** `#/…` or app-path imports in `src/`.
- **No bundled dependencies.** `package.json` `dependencies` is empty by design. React,
  BlockNote, CodeMirror, react-runner are peers, marked `external` in `tsup.config.ts` — never
  bundle them, and don't add a runtime dependency for what a few lines can do.

## Layout

```
src/
  index.ts         main entry: PostRenderer. No BlockNote, no eval (runner lazy-loads client-only).
  editor.ts        /editor entry: BlockEditor, createEditorSchema, editorSchema, EDITOR_BLOCK_TYPES (heavy: BlockNote + CodeMirror)
  runner.ts        /runner entry: CodeRunner, normalizeRunnerCode  (eval; opt-in)
  PostRenderer.tsx allowlist renderer (block JSON → React; unknown types render nothing; executable opt-in + lazy)
  BlockEditor.tsx  BlockNote authoring surface (imports BlockNote CSS; uploadFile + runnerScope injected)
  blocks.tsx       BlockNote schema: native defaults + the executable block; createEditorSchema(scope) factory + EDITOR_BLOCK_TYPES
  CodeRunner.tsx   react-runner with an explicit scope (no globalThis); client-only
  normalize-runner-code.ts  "statements then trailing <X/>" → `export default` (react-runner needs it)
  css.d.ts         ambient decl so the BlockNote CSS side-effect imports typecheck
test/              the suite, imports the package by its public name (see vitest.config.ts aliases)
tsup.config.ts     publish build (ESM + .d.ts for the 3 entries; peers external)
vitest.config.ts   aliases @bosphorify/blockkit{,/editor,/runner} → src/ so tests run unbuilt
```

## Architecture notes

- **Three entries, split by cost** so consumers load only what they use. Most hosts only
  *render*, so the main entry pulls in no BlockNote and no eval. `PostRenderer` internally
  `React.lazy`-loads `CodeRunner` only when `allowExecutable` is set — so you can render
  executable content without importing `/runner` yourself.
- **`PostRenderer` re-implements rendering for the native block types** (paragraph, heading,
  quote, lists, code, image) on purpose: that's the price of letting a host display content
  without shipping the whole editor. Keep it in sync with `SUPPORTED_DEFAULTS` in `blocks.tsx`
  (`test/renderer-parity.test.tsx` asserts every insertable type renders).
- **Styling** is Tailwind utility classes expected from the host. The only stylesheet imports
  are BlockNote's own (`@blocknote/core/fonts/inter.css`, `@blocknote/mantine/style.css`)
  inside `BlockEditor.tsx`, resolved via the BlockNote peer.
- **`normalizeRunnerCode`** exists because react-runner needs an `export default`; the
  authoring convention is "statements, then a trailing JSX expression" which is rewritten to
  a default export. Without it react-runner returns `null`.

## Dev workflow

```bash
npm install        # peers are devDependencies so build + tests resolve
npm test           # vitest run (runner normalization, renderer parity)
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

## Don't

- Don't import from `#/` or any app path inside `src/`.
- Don't re-introduce curated blocks, a registry, config forms, a markdown bridge, or an
  analytics seam — they were removed on purpose (see scope discipline above).
- Don't bundle BlockNote / React / CodeMirror / react-runner into the build — they're peers.
- Don't add a runtime `dependency`; keep `dependencies` empty.
- Don't evaluate the executable block on the server, or render it without `allowExecutable`.
- Don't add a native block to `blocks.tsx` without a matching case in `PostRenderer.tsx`
  (the renderer-parity test will fail).
