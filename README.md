# @bosphorify/blockkit

A curated block editor **+ renderer** on top of [BlockNote](https://www.blocknotejs.org/).

BlockNote gives you the Notion-style editor. **blockkit** adds the layer that turns
it into a *content system*:

- **One registry** — each curated block (Callout, Slider, Chart, Quiz, Embed, FAQ)
  is described **once** (prop schema + config fields + parser + component). The slash
  menu, the renderer, and the executable-block scope all derive from that single source.
- **A shared allowlist renderer** — `PostRenderer` turns the stored block JSON into
  React. Unknown block types render **nothing** (default-deny). The executable block
  renders **only** when the caller passes `allowExecutable`.
- **One-way agent markdown** — `blocksToMarkdown` derives clean markdown from the block
  document for LLMs/agents (never parsed back); `markdownToBlocks` lifts legacy markdown in.
- **An opt-in executable block** — arbitrary author JSX via [`react-runner`](https://github.com/nihgwu/react-runner),
  isolated behind its own entry so consumers who don't want `eval` never load it.

The document is **BlockNote block JSON** — the canonical, lossless store. blockkit is a
*layer over* BlockNote, never a fork.

> Extracted from [bosphorify.com](https://bosphorify.com) (the `bosphorify-web` app), where
> it powers admin authoring + public post rendering.

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
# for /runner (the executable block)
npm install react-runner
```

**ESM-only.** Ships as ES modules (`"type": "module"`); there is no CommonJS `require` build. **Styling assumes [Tailwind](https://tailwindcss.com/) in the host** — the components are styled with Tailwind utility classes and shadcn/ui design tokens; blockkit ships no global CSS of its own. The **`/editor`** entry additionally side-effect-imports BlockNote's own stylesheets (`@blocknote/core/fonts/inter.css`, `@blocknote/mantine/style.css`), so your bundler must handle CSS imports when you use it.

## Entry points (split by cost)

| Import | Gives you | Pulls in |
|---|---|---|
| `@bosphorify/blockkit` | `PostRenderer`, the registry (`REGISTRY`, `REGISTRY_BY_TYPE`, `CURATED_SCOPE`, `SCOPE_NAMES`, `ConfigForm`), the curated block components, `markdownToBlocks` / `blocksToMarkdown`, types, `configureBlockKit` | recharts, prism, radix (render-only) |
| `@bosphorify/blockkit/editor` | `BlockEditor`, `editorSchema`, `EDITOR_BLOCK_TYPES` | BlockNote + CodeMirror (heavy) |
| `@bosphorify/blockkit/runner` | `CodeRunner`, `normalizeRunnerCode` | react-runner (`eval`) |

Render-only consumers (most pages) import the main entry and never load BlockNote or the runner.

## Quick start

```tsx
// 1. (client, once) wire your analytics — block events flow through this
import { configureBlockKit } from '@bosphorify/blockkit'
configureBlockKit({ track: (event, props) => posthog.capture(event, props) })

// 2. render a stored post
import { PostRenderer } from '@bosphorify/blockkit'
<PostRenderer document={post.document} allowExecutable />  // omit allowExecutable to deny eval

// 3. author (admin side) — separate, heavier entry
import { BlockEditor } from '@bosphorify/blockkit/editor'
<BlockEditor
  initialContent={doc}
  onChange={setDoc}
  uploadFile={async (file) => (await myStorage.put(file)).url}  // defaults to data: URLs
/>
```

## Host seams (so there's no app coupling)

blockkit talks to your app through exactly two seams:

- **Analytics** — the library never imports an analytics SDK. Call
  `configureBlockKit({ track })` once on the client; until then block events no-op.
- **Image upload** — `BlockEditor`'s `uploadFile` prop. Without it, images inline as
  `data:` URLs so the editor works standalone; pass one to use real storage.

## Security model

- `PostRenderer` is an **allowlist**: unknown block types render nothing. The executable
  block renders **only** with `allowExecutable`, and **only** via the **client-only**
  `CodeRunner` (never evaluated during SSR — author code can't touch server secrets).
- The runner uses `eval` / `new Function`, so rendering executable posts requires a CSP
  with `'unsafe-eval'`. If you don't render executable posts, don't import `/runner` and
  keep a strict CSP.
- **Trust model:** only let **trusted authors** write executable blocks; never feed
  untrusted input to the runner. True isolation (iframe / Sandpack) is future work.

## Development

```bash
npm install        # installs peers as devDependencies for build/test
npm test           # vitest (registry sync, md↔blocks, runner normalization, renderer parity)
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
