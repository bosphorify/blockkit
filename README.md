# @bosphorify/blockkit

A **runnable JSX block for [BlockNote](https://www.blocknotejs.org/)**, plus a light
read-only renderer.

BlockNote gives you the Notion-style editor. **blockkit** adds:

- **An executable block** — authors write JSX (a component) in an inline
  [CodeMirror](https://codemirror.net/) editor and it runs live via
  [`react-runner`](https://github.com/nihgwu/react-runner). Scope is explicit
  (`{ React }` by default; inject your own components via `scope`), it runs
  **client-only**, and it lives behind its own entry so consumers who don't want
  `eval` never load it.
- **A constrained editor** — `BlockEditor`: BlockNote's native blocks (paragraph,
  heading, quote, lists, code, image) plus the executable block, with a slash menu.
- **A light allowlist renderer** — `PostRenderer` turns stored block JSON into plain
  React **without loading BlockNote**, so a site or app can display authored content
  far cheaper (and server-side) than mounting the editor. Unknown block types render
  **nothing** (default-deny); the executable block renders **only** with
  `allowExecutable`.

The document is **BlockNote block JSON** — the canonical, lossless store. blockkit is a
*layer over* BlockNote, never a fork.

Need more block types (callouts, charts, quizzes…)? Add them with BlockNote's own
[`createReactBlockSpec`](https://www.blocknotejs.org/docs/custom-schemas/custom-blocks) —
blockkit deliberately stays out of that business.

## Install

```bash
npm install @bosphorify/blockkit
# required peers
npm install react react-dom
```

> Tested against React 19; the peer floor is React 18.

Add peers only for the entries you use:

```bash
# for /editor (the authoring surface) — note the Mantine peers, which
# @blocknote/mantine requires but npm does not auto-install
npm install @blocknote/core @blocknote/mantine @blocknote/react \
            @mantine/core @mantine/hooks \
            @codemirror/lang-javascript @uiw/react-codemirror
# for the executable block (also used by /runner directly)
npm install react-runner
```

**ESM-only.** Ships as ES modules (`"type": "module"`); there is no CommonJS `require`
build. blockkit bundles **no runtime dependencies** — everything is a peer. **Styling
assumes [Tailwind](https://tailwindcss.com/) in the host**: components use Tailwind
utility classes; blockkit ships no global CSS of its own. The **`/editor`** entry
additionally side-effect-imports BlockNote's stylesheets
(`@blocknote/core/fonts/inter.css`, `@blocknote/mantine/style.css`), so your bundler must
handle CSS imports when you use it.

## Entry points (split by cost)

| Import | Gives you | Pulls in |
|---|---|---|
| `@bosphorify/blockkit` | `PostRenderer` | nothing (the runner lazy-loads client-only, only when `allowExecutable`) |
| `@bosphorify/blockkit/editor` | `BlockEditor`, `createEditorSchema`, `editorSchema`, `EDITOR_BLOCK_TYPES` | BlockNote + CodeMirror (heavy) |
| `@bosphorify/blockkit/runner` | `CodeRunner`, `normalizeRunnerCode` | react-runner (`eval`) |

Render-only consumers (most pages) import the main entry and never load BlockNote or the
runner.

## Quick start

```tsx
// render a stored document — light, SSR-able, no editor
import { PostRenderer } from '@bosphorify/blockkit'
<PostRenderer document={post.document} allowExecutable />  // omit allowExecutable to deny eval

// author (admin side) — separate, heavier entry
import { BlockEditor } from '@bosphorify/blockkit/editor'
<BlockEditor
  initialContent={doc}
  onChange={setDoc}
  uploadFile={async (file) => (await myStorage.put(file)).url}  // defaults to data: URLs
/>
```

### Injecting your own components

Author code in the executable block sees `React` by default. To make your own components
available (so authors can write `<Callout/>`, `<Chart/>`, …), pass a `scope`:

```tsx
const scope = { Callout, Chart, Button }

// in the editor
<BlockEditor runnerScope={scope} initialContent={doc} onChange={setDoc} />

// when rendering
<PostRenderer document={post.document} allowExecutable scope={scope} />
```

Keep the editor and render `scope` the same, so code that previews while authoring also
renders when published.

## Host seam (no app coupling)

- **Image upload** — `BlockEditor`'s `uploadFile` prop. Without it, images inline as
  `data:` URLs so the editor works standalone; pass one to use real storage.

## Security model

- `PostRenderer` is an **allowlist**: unknown block types render nothing. The executable
  block renders **only** with `allowExecutable`, and **only** via the **client-only**
  `CodeRunner` (never evaluated during SSR — author code can't touch server secrets).
- The runner uses `eval` / `new Function`, so rendering executable content requires a CSP
  with `'unsafe-eval'`. If you don't render executable content, don't import `/runner` and
  keep a strict CSP.
- Scope is passed **explicitly**; blockkit never writes to `globalThis`, so author code
  can't reach app internals by accident.
- **Trust model:** only let **trusted authors** write executable blocks; never feed
  untrusted input to the runner. True isolation (iframe / Sandpack) is future work.

## Development

```bash
npm install        # installs peers as devDependencies for build/test
npm test           # vitest (runner normalization, renderer parity)
npm run typecheck  # tsc --noEmit
npm run build      # tsup → dist/{index,editor,runner}.{js,d.ts}
```

The test suite imports the package by its **public name** (e.g. `@bosphorify/blockkit`),
resolved to `src/` by aliases in `vitest.config.ts` — so tests exercise the real public API
with no build step.

## Publishing

`npm publish` runs `prepublishOnly` (which builds `dist/`). The published tarball contains
only `dist/` (see `files`); `exports` point at the built JS + `.d.ts`. It's a public scoped
package (`publishConfig.access = "public"`).

## License

MIT © bosphorify
