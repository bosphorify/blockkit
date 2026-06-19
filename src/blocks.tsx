import { javascript } from '@codemirror/lang-javascript'
import { BlockNoteSchema, defaultBlockSpecs } from '@blocknote/core'
import { createReactBlockSpec } from '@blocknote/react'
import CodeMirror from '@uiw/react-codemirror'
import * as React from 'react'
import { CodeRunner } from './CodeRunner'

/**
 * BlockNote schema = a CONSTRAINED pick of default blocks + one executable
 * block that runs author-written JSX (see CodeRunner).
 *
 * Every type here has a renderer in PostRenderer, so authors can never insert
 * something the published page silently drops (test/renderer-parity.test.tsx
 * enforces this).
 */
const SUPPORTED_DEFAULTS = {
  paragraph: defaultBlockSpecs.paragraph,
  heading: defaultBlockSpecs.heading,
  quote: defaultBlockSpecs.quote,
  bulletListItem: defaultBlockSpecs.bulletListItem,
  numberedListItem: defaultBlockSpecs.numberedListItem,
  codeBlock: defaultBlockSpecs.codeBlock,
  image: defaultBlockSpecs.image,
}

const DEFAULT_CODE = `const Demo = () => {
  const [n, setN] = React.useState(6)
  const squares = Array.from({ length: n }, (_, i) => (i + 1) * (i + 1))
  return (
    <div>
      <p>n = {n}, sum of squares = {squares.reduce((a, b) => a + b, 0)}</p>
      <button onClick={() => setN((v) => Math.min(12, v + 1))}>more</button>{' '}
      <button onClick={() => setN((v) => Math.max(1, v - 1))}>less</button>
      <ul>
        {squares.map((s, i) => (
          <li key={i}>{i + 1}² = {s}</li>
        ))}
      </ul>
    </div>
  )
}

<Demo />`

function ExecutableView({
  code: externalCode,
  scope,
  onCommit,
}: {
  code: string
  scope?: Record<string, unknown>
  onCommit: (code: string) => void
}) {
  const [code, setCode] = React.useState(externalCode)
  const lastCommitted = React.useRef(externalCode)

  // adopt external changes (undo/redo, collaborative edits) when they differ
  // from what we last committed — otherwise undo leaves stale code on screen
  React.useEffect(() => {
    if (externalCode !== lastCommitted.current) {
      lastCommitted.current = externalCode
      setCode(externalCode)
    }
  }, [externalCode])

  React.useEffect(() => {
    if (code === lastCommitted.current) return
    const t = setTimeout(() => {
      lastCommitted.current = code
      onCommit(code)
    }, 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  return (
    <div
      className="my-1 grid w-full grid-cols-1 gap-2 rounded-none border border-border bg-muted/40 p-2 md:grid-cols-2"
      contentEditable={false}
    >
      <div className="overflow-hidden rounded-none border border-border bg-card">
        <div className="flex flex-wrap items-center gap-x-2 border-b border-amber-300/60 bg-amber-50 px-2 py-1 font-mono text-[10px] text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          <span>⚠ advanced · runs code</span>
          <span className="opacity-70">scope: React · end with &lt;MyComponent /&gt;</span>
        </div>
        <CodeMirror
          value={code}
          onChange={setCode}
          extensions={[javascript({ jsx: true })]}
          basicSetup={{
            lineNumbers: true,
            foldGutter: false,
            closeBrackets: true,
            autocompletion: false,
          }}
          className="text-[12px]"
        />
      </div>
      <div className="prose prose-sm max-w-none overflow-auto rounded-none border border-border bg-card p-3">
        <CodeRunner code={code} scope={scope} />
      </div>
    </div>
  )
}

function makeExecutable(scope?: Record<string, unknown>) {
  return createReactBlockSpec(
    {
      type: 'executable',
      propSchema: { code: { default: DEFAULT_CODE } },
      content: 'none',
    },
    {
      render: ({ block, editor }) => (
        <ExecutableView
          code={String(block.props.code)}
          scope={scope}
          onCommit={(code) => editor.updateBlock(block, { props: { code } })}
        />
      ),
    },
  )
}

/**
 * Build the editor schema. Pass `scope` to make extra values (e.g. your own
 * components) available to author code inside executable blocks.
 */
export function createEditorSchema(scope?: Record<string, unknown>) {
  return BlockNoteSchema.create({
    blockSpecs: {
      ...SUPPORTED_DEFAULTS,
      executable: makeExecutable(scope)(),
    },
  })
}

export const editorSchema = createEditorSchema()

export type EditorSchema = typeof editorSchema

/** every type an author can insert — the renderer-parity test iterates this */
export const EDITOR_BLOCK_TYPES = Object.keys(editorSchema.blockSpecs)
