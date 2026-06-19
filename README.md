# @bosphorify/blockkit

A **runnable JSX block for [BlockNote](https://www.blocknotejs.org/)**, with a constrained
editor and a read-only view.

BlockNote gives you the Notion-style editor and a block-JSON document model. **blockkit**
adds:

- **An executable block** — authors write JSX (a component) in an inline
  [CodeMirror](https://codemirror.net/) editor and it runs live via
  [`react-runner`](https://github.com/nihgwu/react-runner). Scope is explicit
  (`{ React }` by default; inject your own components via `scope`), it runs
  **client-only**, and it lives behind its own entry so consumers who don't want
  `eval` never load it.
- **A constrained editor** — `BlockEditor`: BlockNote's native blocks (paragraph,
  heading, quote, lists, code, image) plus the executable block, with a slash menu.
- **A read-only view** — `BlockView`: `<BlockNoteView editable={false}>`, so displaying a
  document is **BlockNote's own rendering** — every prop the author set (alignment, color,
  image width…) is honored, with no hand-maintained renderer to drift. The executable block
  renders just its live output here (no code editor).

The document is **BlockNote block JSON** — the canonical, lossless store. blockkit is a
*layer over* BlockNote, never a fork.

Need more block types (callouts, charts, quizzes…)? Add them with BlockNote's own
[`createReactBlockSpec`](https://www.blocknotejs.org/docs/custom-schemas/custom-blocks).

## Install

```bash
npm install @bosphorify/blockkit
# required peers
npm install react react-dom

# BlockNote (for the editor and the read-only view)
npm install @blocknote/core @blocknote/mantine @blocknote/react \
            @mantine/core @mantine/hooks
# the editor also needs CodeMirror (for authoring the executable block)
npm install @codemirror/lang-javascript @uiw/react-codemirror
# the executable block runtime
npm install react-runner
```

> Tested against React 19; the peer floor is React 18.

**ESM-only.** Ships as ES modules (`"type": "module"`); there is no CommonJS `require`
build. blockkit bundles **no runtime dependencies** — everything is a peer. Both `BlockView`
and `BlockEditor` side-effect-import BlockNote's stylesheets
(`@blocknote/core/fonts/inter.css`, `@blocknote/mantine/style.css`), so your bundler must
handle CSS imports. The editor additionally uses [Tailwind](https://tailwindcss.com/) utility
classes for the executable block's authoring chrome, so the **editor** expects Tailwind in the
host. (The read-only view needs only BlockNote's CSS.)

## Entry points (split by cost)

| Import | Gives you | Pulls in |
|---|---|---|
| `@bosphorify/blockkit` | `BlockView` (read-only display) | BlockNote |
| `@bosphorify/blockkit/editor` | `BlockEditor`, `createEditorSchema`, `editorSchema`, `EDITOR_BLOCK_TYPES` | BlockNote + CodeMirror (heavy) |
| `@bosphorify/blockkit/runner` | `CodeRunner`, `normalizeRunnerCode` | react-runner (`eval`) |

## Quick start

```tsx
// display a stored document (read-only, full fidelity)
import { BlockView } from '@bosphorify/blockkit'
<BlockView document={post.document} />

// author
import { BlockEditor } from '@bosphorify/blockkit/editor'
<BlockEditor
  initialContent={doc}
  onChange={setDoc}
  uploadFile={async (file) => (await myStorage.put(file)).url}  // defaults to data: URLs
/>
```

### Rendering without shipping BlockNote to the client

`BlockView` is client-only. For SSR / static pages that don't ship BlockNote to the browser,
use BlockNote's own server-side HTML export — `editor.blocksToFullHTML(blocks)`, or
`@blocknote/server-util`'s `ServerBlockNoteEditor` for a DOM-free render (see
[BlockNote's server-side rendering docs](https://www.blocknotejs.org/docs/advanced/server-processing)).
Pass `editorSchema` so it knows the executable block type.

(The executable block can't run in static HTML — there's no client to eval it — so it falls
back to an inert placeholder. Use `BlockView` where you want it live.)

### Injecting your own components

Author code in the executable block sees `React` by default. To make your own components
available (`<Callout/>`, `<Chart/>`, …), pass a `scope`:

```tsx
const scope = { Callout, Chart, Button }
<BlockEditor runnerScope={scope} initialContent={doc} onChange={setDoc} />
<BlockView document={post.document} runnerScope={scope} />
```

Keep the editor and view `scope` the same, so code that previews while authoring also
renders when displayed.

## Host seam (no app coupling)

- **Image upload** — `BlockEditor`'s `uploadFile` prop. Without it, images inline as
  `data:` URLs so the editor works standalone; pass one to use real storage.

## Security model

- The executable block uses `eval` / `new Function` (via react-runner), so it requires a CSP
  with `'unsafe-eval'`. If you never render executable content, don't import `/runner` and
  keep a strict CSP.
- `CodeRunner` runs **client-only** (empty code until mounted), so author code **never
  executes during SSR** and can't touch server secrets.
- Scope is passed **explicitly**; blockkit never writes to `globalThis`, so author code
  can't reach app internals by accident.
- **Trust model:** the executable block runs whenever it's rendered (editor or `BlockView`).
  Only let **trusted authors** write executable blocks; never feed untrusted documents to a
  view that renders them. True isolation (iframe / Sandpack) is future work.

## Development

```bash
npm install        # installs peers as devDependencies for build/test
npm test           # vitest (runner normalization)
npm run typecheck  # tsc --noEmit
npm run build      # tsup → dist/{index,editor,runner}.{js,d.ts}
```

See [`examples/demo`](examples/demo) for a runnable Vite app (editor + read-only view side by
side).

## Publishing

`npm publish` runs `prepublishOnly` (which builds `dist/`). The published tarball contains
only `dist/` (see `files`); `exports` point at the built JS + `.d.ts`. It's a public scoped
package (`publishConfig.access = "public"`).

## License

MIT © bosphorify
