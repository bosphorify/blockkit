import { javascript } from '@codemirror/lang-javascript'
import { BlockNoteSchema, defaultBlockSpecs } from '@blocknote/core'
import { createReactBlockSpec } from '@blocknote/react'
import CodeMirror from '@uiw/react-codemirror'
import * as React from 'react'
import { track as capture } from './track'
import {
  ConfigForm,
  REGISTRY,
  type RegistryEntry,
  SCOPE_NAMES,
} from './registry'
import { CodeRunner } from './CodeRunner'

/**
 * BlockNote schema = a CONSTRAINED pick of default blocks + curated blocks from
 * the REGISTRY + one executable block.
 *
 * The pick is the WYSIWYG contract: every type here has a renderer in
 * PostRenderer, so authors can never insert something the published page
 * silently drops (test/renderer-parity.test.tsx enforces this).
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

function makeCuratedBlock(entry: RegistryEntry) {
  return createReactBlockSpec(
    {
      type: entry.type,
      propSchema: entry.propSchema,
      content: entry.content,
    },
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render: ({ block, editor, contentRef }: any) => {
        const Comp = entry.Component
        const componentProps = entry.toProps(block.props)
        const [configOpen, setConfigOpen] = React.useState(false)
        return (
          <div className="my-1 w-full rounded-none border border-border bg-card p-3">
            <div
              className="mb-1 flex items-center justify-between font-mono text-[11px] text-muted-foreground"
              contentEditable={false}
            >
              <span>{entry.title.toLowerCase()}</span>
              <button
                type="button"
                onClick={() => setConfigOpen((o) => !o)}
                className="rounded px-1.5 py-0.5 hover:bg-muted"
                aria-expanded={configOpen}
                aria-label={`configure ${entry.title}`}
              >
                {configOpen ? '✕ close' : '⚙ configure'}
              </button>
            </div>
            {configOpen ? (
              <ConfigForm
                entry={entry}
                props={block.props}
                onChange={(patch) => editor.updateBlock(block, { props: patch })}
              />
            ) : null}
            {entry.content === 'inline' ? (
              <Comp {...componentProps}>
                <span ref={contentRef} />
              </Comp>
            ) : (
              <Comp {...componentProps} />
            )}
          </div>
        )
      },
    },
  )
}

const DEFAULT_CODE = `const Demo = () => {
  const [n, setN] = React.useState(6)
  const data = Array.from({ length: n }, (_, i) => (i + 1) * (i + 1))
  return (
    <div>
      <p>n = {n}, sum = {data.reduce((a, b) => a + b, 0)}</p>
      <button onClick={() => setN((v) => Math.min(12, v + 1))}>more</button>{' '}
      <button onClick={() => setN((v) => Math.max(1, v - 1))}>less</button>
      <Chart type="area" values={data} label={"squares up to " + n} />
    </div>
  )
}

<Demo />`

function ExecutableView({
  code: externalCode,
  onCommit,
}: {
  code: string
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
          <span>⚠ advanced · runs code (admins only)</span>
          <span className="opacity-70">
            scope: {SCOPE_NAMES} · end with &lt;MyComponent /&gt;
          </span>
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
        <CodeRunner code={code} />
      </div>
    </div>
  )
}

const Executable = createReactBlockSpec(
  {
    type: 'executable',
    propSchema: { code: { default: DEFAULT_CODE } },
    content: 'none',
  },
  {
    render: ({ block, editor }) => (
      <ExecutableView
        code={String(block.props.code)}
        onCommit={(code) => {
          editor.updateBlock(block, { props: { code } })
          capture('executable_edited', { chars: code.length })
        }}
      />
    ),
  },
)

const curatedSpecs = Object.fromEntries(
  REGISTRY.map((entry) => [entry.type, makeCuratedBlock(entry)()]),
)

export const editorSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...SUPPORTED_DEFAULTS,
    ...curatedSpecs,
    executable: Executable(),
  },
})

export type EditorSchema = typeof editorSchema

/** every type an author can insert — the renderer-parity test iterates this */
export const EDITOR_BLOCK_TYPES = Object.keys(editorSchema.blockSpecs)
