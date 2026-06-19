# blockkit — agent notes

**Not an npm package.** Three source files you copy into a BlockNote project:

- `src/CodeRunner.tsx` — runs author JSX (react-runner)
- `src/normalize-runner-code.ts` — "statements then trailing `<X/>`" → `export default`
- `src/executable-block.tsx` — the BlockNote block (`createReactBlockSpec`) + CodeMirror editor

Consumer-facing usage is in [README.md](README.md). Read it before changing anything.

## Rules

- **The eval safety in `CodeRunner` is the whole point — don't weaken it:** client-only (no
  SSR eval), explicit `scope` (never `globalThis`), error boundary, debounce.
- **Keep it copy-pasteable.** No build, no bundler, no publish, no entry files. The three
  files are self-contained (inline styles, no Tailwind/shadcn coupling) and import only peers
  (React, `@blocknote/react`, CodeMirror, `react-runner`). `package.json` is `private` and
  dev-only.
- **Rendering and editing are BlockNote's job.** We only ship the executable block; don't
  re-introduce wrappers (a curated editor, a read-only view, a hand-rolled renderer), a block
  registry, a markdown bridge, or an analytics seam — all removed on purpose.
- **`normalizeRunnerCode`** exists because react-runner needs an `export default`; it's the
  one piece of pure logic and the one thing under test.

## Dev

```bash
npm install        # peers as devDependencies
npm run typecheck  # tsc --noEmit
npm test           # vitest (normalizeRunnerCode)
```
