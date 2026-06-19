# @bosphorify/blockkit — agent guide

This file is the internal contract for AI agents and contributors. Consumer-facing
usage is in [README.md](README.md). Read both before changing anything.

## What this project is

`@bosphorify/blockkit` is a **runnable JSX block for [BlockNote](https://www.blocknotejs.org/),
with a constrained editor and a read-only view**. BlockNote provides the Notion-style WYSIWYG
editor and a block-JSON document model. blockkit is a thin **layer over** BlockNote that adds:

1. **one executable block** that runs author-written JSX at view time (`react-runner` →
   `eval`), authored in an inline CodeMirror editor,
2. a **constrained editor** (`BlockEditor`) = BlockNote's native blocks + that executable block,
3. a **read-only view** (`BlockView` = `<BlockNoteView editable={false}>`) — displaying a
   document is **BlockNote's own rendering**, so every block prop is honored with no
   hand-maintained renderer to drift.

The document of record is **BlockNote block JSON** — lossless and canonical.

> **Scope discipline (this is the point of the package).** blockkit intentionally does NOT
> ship curated blocks (callouts, charts, quizzes, etc.), a block registry, config forms, a
> markdown bridge, an analytics seam, or a hand-rolled renderer — those were removed
> deliberately. Rendering is BlockNote's job. Anyone who wants more block types adds them with
> BlockNote's own `createReactBlockSpec`. Keep this package about the runnable block.

## Golden rules (do not violate)

- **Never fork BlockNote, and don't re-implement its rendering.** Use it as a library. The
  executable block is a `createReactBlockSpec` entry; display goes through BlockNote
  (`BlockView`, or the host's own `BlockNoteView` / `blocksToFullHTML`). We learned the hard
  way that a hand-rolled renderer silently drops block props — don't bring one back.
- **Executable block = client-only, and `isEditable`-aware.** Its spec branches on
  `editor.isEditable`: editing → the CodeMirror authoring UI + live preview; read-only → just
  the live `CodeRunner` output. `CodeRunner` feeds empty code until mounted, so author code
  **never executes during SSR**. It's behind the `/runner` entry (`react-runner` →
  `eval`/`new Function`) for consumers who want to keep a strict CSP.
- **Scope is explicit.** `CodeRunner` runs author code with `{ React, ...scope }` and never
  writes to `globalThis`. The optional `scope` threads consistently: `BlockEditor`
  (`runnerScope`) → `createEditorSchema(scope)` → the executable spec → `CodeRunner`, and
  `BlockView` (`runnerScope`) → the same schema. Keep editor and view scope identical so
  previews match displayed output.
- **No app coupling.** The package must build and run with only its declared peers. App
  specifics enter through exactly one **seam**: `BlockEditor`'s `uploadFile` prop (asset
  storage; defaults to `data:` URLs). There must be **zero** `#/…` or app-path imports in `src/`.
- **No bundled dependencies.** `package.json` `dependencies` is empty by design. React,
  BlockNote, CodeMirror, react-runner are peers, marked `external` in `tsup.config.ts` — never
  bundle them, and don't add a runtime dependency for what a few lines can do.

## Layout

```
src/
  index.ts         main entry: BlockView (read-only display via BlockNote).
  editor.ts        /editor entry: BlockEditor, createEditorSchema, editorSchema, EDITOR_BLOCK_TYPES (heavy: BlockNote + CodeMirror)
  runner.ts        /runner entry: CodeRunner, normalizeRunnerCode  (eval; opt-in)
  BlockView.tsx    read-only <BlockNoteView editable={false}> over the schema (full-fidelity display)
  BlockEditor.tsx  BlockNote authoring surface (imports BlockNote CSS; uploadFile + runnerScope injected)
  blocks.tsx       BlockNote schema: native defaults + the executable block (isEditable-aware); createEditorSchema(scope) factory
  CodeRunner.tsx   react-runner with an explicit scope (no globalThis); client-only
  normalize-runner-code.ts  "statements then trailing <X/>" → `export default` (react-runner needs it)
  css.d.ts         ambient decl so the BlockNote CSS side-effect imports typecheck
test/              the suite, imports the package by its public name (see vitest.config.ts aliases)
tsup.config.ts     publish build (ESM + .d.ts for the 3 entries; peers external)
vitest.config.ts   aliases @bosphorify/blockkit{,/editor,/runner} → src/ so tests run unbuilt
```

## Architecture notes

- **Three entries, split by use.** `index` = display (`BlockView`), `/editor` = authoring,
  `/runner` = the eval runtime. Both `index` and `/editor` pull in BlockNote (display now
  goes through it), so both are side-effecting (BlockNote CSS) — see `sideEffects` in
  `package.json`.
- **Display is BlockNote, not us.** `BlockView` wraps `<BlockNoteView editable={false}>` over
  `createEditorSchema(scope)`, and syncs to the `document` prop via `editor.replaceBlocks`. For
  SSR without a client, hosts use BlockNote's own `blocksToFullHTML`. There is deliberately no
  hand-rolled block-JSON→HTML renderer here anymore.
- **The executable block is the only custom rendering.** It's `isEditable`-aware so the same
  spec serves both the editor (CodeMirror + preview) and the read-only view (output only).
- **Styling.** Display is BlockNote/Mantine styled (full WYSIWYG). The editor-side chrome (the
  executable block's authoring UI in `blocks.tsx`) uses Tailwind utility classes; the runner's
  error box carries a minimal inline color so an error reads as an error without a CSS
  dependency. Both `BlockView` and `BlockEditor` side-effect-import BlockNote's stylesheets.
- **`normalizeRunnerCode`** exists because react-runner needs an `export default`; the
  authoring convention is "statements, then a trailing JSX expression" which is rewritten to
  a default export. Without it react-runner returns `null`.

## Dev workflow

```bash
npm install        # peers are devDependencies so build + tests resolve
npm test           # vitest run (runner normalization)
npm run typecheck  # tsc --noEmit
npm run build      # tsup → dist/{index,editor,runner}.{js,d.ts}
```

Tests import via the public package name and are resolved to `src/` by `vitest.config.ts`
aliases. The BlockNote-backed editor/view aren't unit-tested (mounting BlockNote in jsdom is
heavy and low-value); `normalizeRunnerCode` — the one piece of pure logic — is.

## Publishing

1. Bump `version` in `package.json` (semver).
2. `npm publish` — `prepublishOnly` runs `tsup` to produce `dist/`. Only `dist/` is shipped
   (`files`); `exports`/`main`/`module`/`types` already point at the built output. It's a
   public scoped package (`publishConfig.access = "public"`), so the first publish needs an
   npm account in the `@bosphorify` org/scope.
3. Tag the release in git.

## Don't

- Don't import from `#/` or any app path inside `src/`.
- Don't re-introduce curated blocks, a registry, config forms, a markdown bridge, an analytics
  seam, or a hand-rolled renderer — they were removed on purpose (see scope discipline above).
- Don't bundle BlockNote / React / CodeMirror / react-runner into the build — they're peers.
- Don't add a runtime `dependency`; keep `dependencies` empty.
- Don't evaluate the executable block on the server (keep `CodeRunner`'s mounted-gate).
- Don't add a native block to `blocks.tsx` that the host's BlockNote schema can't render.
