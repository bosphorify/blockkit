# blockkit — a runnable JSX block for BlockNote

Drop three files into your [BlockNote](https://www.blocknotejs.org/) project and you get an
**executable block**: authors write a React component in an inline code editor and it runs
live, both while editing and in the read-only view.

This is **not an npm package** — it's ~250 lines you copy in. No build step, no dependency to
track. Rendering and editing stay BlockNote's job; this only adds the one block.

## The files

| File | What it is |
|---|---|
| [`src/CodeRunner.tsx`](src/CodeRunner.tsx) | Runs author JSX via [`react-runner`](https://github.com/nihgwu/react-runner) — client-only, sandboxed scope, error boundary, debounced |
| [`src/normalize-runner-code.ts`](src/normalize-runner-code.ts) | Lets authors write "statements, then a trailing `<App/>`" instead of `export default` |
| [`src/executable-block.tsx`](src/executable-block.tsx) | The BlockNote block (`createReactBlockSpec`) + the inline CodeMirror editor. Imports the other two. |

Copy all three (keep them together) into wherever your code lives.

## Install the peers

You already have BlockNote. Add the three the block needs:

```bash
npm install react-runner @uiw/react-codemirror @codemirror/lang-javascript
```

## Use it

**1. Add the block to your schema:**

```ts
import { BlockNoteSchema, defaultBlockSpecs } from '@blocknote/core'
import { createExecutableBlockSpec } from './executable-block'

export const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    executable: createExecutableBlockSpec(),
  },
})
```

**2. Use that schema in your editor and your read-only view.** The block is `isEditable`-aware
— it shows the code editor + live preview when editing, and just the live output when not:

```tsx
import { BlockNoteView } from '@blocknote/mantine'
import { useCreateBlockNote } from '@blocknote/react'

function Editor() {
  const editor = useCreateBlockNote({ schema })
  return <BlockNoteView editor={editor} />
}

function ReadOnly({ document }: { document: any[] }) {
  const editor = useCreateBlockNote({ schema, initialContent: document })
  return <BlockNoteView editor={editor} editable={false} />
}
```

**3. Let authors insert it** — add a slash-menu item (see BlockNote's
[suggestion menu docs](https://www.blocknotejs.org/docs/ui-components/suggestion-menus)):

```tsx
{
  title: 'Code',
  onItemClick: () => editor.insertBlocks(
    [{ type: 'executable' }],
    editor.getTextCursorPosition().block,
    'after',
  ),
}
```

## Inject your own components

By default author code only sees `React`. Pass a `scope` to expose more:

```ts
createExecutableBlockSpec({ Chart, Button })
// author can now write <Chart .../> inside the block
```

Use the **same scope** when you build the schema for the editor and the read-only view, so a
preview written while authoring also renders when displayed.

## How authors write code

Statements, then a trailing JSX expression — `normalizeRunnerCode` rewrites it to the
`export default` that react-runner needs:

```jsx
const Counter = () => {
  const [n, setN] = React.useState(0)
  return <button onClick={() => setN(n + 1)}>clicked {n}</button>
}

<Counter />
```

(An explicit `export default <X/>` works too.)

## Security

- The block uses `eval` / `new Function` (react-runner), so it needs a CSP that allows
  `'unsafe-eval'`. If you don't render executable blocks, don't ship these files.
- `CodeRunner` runs **client-only** — author code never executes during SSR, so it can't
  touch server secrets.
- Scope is passed **explicitly**; the runner never writes to `globalThis`, so author code
  can only reach what you hand it.
- **Trust model:** only let **trusted authors** write executable blocks — never feed an
  untrusted document to a view that renders them. True isolation (iframe / Sandpack) is
  future work.

## Need other blocks?

Callouts, charts, quizzes — that's plain BlockNote. Write them with
[`createReactBlockSpec`](https://www.blocknotejs.org/docs/custom-schemas/custom-blocks), the
same way this block is built.

## Working on these files

```bash
npm install        # peers, for typecheck + the one test
npm run typecheck
npm test           # vitest — covers normalizeRunnerCode (the one piece of pure logic)
```

## License

MIT © bosphorify
