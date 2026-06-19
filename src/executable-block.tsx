import { javascript } from '@codemirror/lang-javascript'
import { createReactBlockSpec } from '@blocknote/react'
import CodeMirror from '@uiw/react-codemirror'
import * as React from 'react'
import { CodeRunner } from './CodeRunner'

/**
 * A BlockNote block that runs author-written JSX live (via react-runner).
 *
 * Add it to your own schema:
 *
 *   import { BlockNoteSchema, defaultBlockSpecs } from '@blocknote/core'
 *   const schema = BlockNoteSchema.create({
 *     blockSpecs: { ...defaultBlockSpecs, executable: createExecutableBlockSpec(scope) },
 *   })
 *
 * `scope` (optional) exposes extra values to author code (default: just React).
 * The block is `isEditable`-aware: the CodeMirror authoring UI + live preview
 * when editing, just the live output when read-only.
 *
 * Styling is plain inline styles so this file is self-contained — restyle freely.
 */

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

const panel: React.CSSProperties = {
  overflow: 'hidden',
  border: '1px solid #e4e4e7',
  background: '#fff',
}

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

  // adopt external changes (undo/redo) when they differ from our last commit
  React.useEffect(() => {
    if (externalCode !== lastCommitted.current) {
      lastCommitted.current = externalCode
      setCode(externalCode)
    }
  }, [externalCode])

  // debounce committing back to the document
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
      contentEditable={false}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 8,
        margin: '4px 0',
        padding: 8,
        border: '1px solid #e4e4e7',
        background: '#fafafa',
      }}
    >
      <div style={panel}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 8,
            padding: '4px 8px',
            borderBottom: '1px solid #fcd34d',
            background: '#fffbeb',
            color: '#92400e',
            fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            fontSize: 10,
          }}
        >
          <span>⚠ advanced · runs code</span>
          <span style={{ opacity: 0.7 }}>scope: React · end with &lt;MyComponent /&gt;</span>
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
          style={{ fontSize: 12 }}
        />
      </div>
      <div style={{ ...panel, overflow: 'auto', padding: 12 }}>
        <CodeRunner code={code} scope={scope} />
      </div>
    </div>
  )
}

/** Build the executable block spec. Put the result in your schema's `blockSpecs`. */
export function createExecutableBlockSpec(scope?: Record<string, unknown>) {
  return createReactBlockSpec(
    {
      type: 'executable',
      propSchema: { code: { default: DEFAULT_CODE } },
      content: 'none',
    },
    {
      // editing → full authoring UI; read-only → just the live output
      render: ({ block, editor }) =>
        editor.isEditable ? (
          <ExecutableView
            code={String(block.props.code)}
            scope={scope}
            onCommit={(code) => editor.updateBlock(block, { props: { code } })}
          />
        ) : (
          <div contentEditable={false}>
            <CodeRunner code={String(block.props.code)} scope={scope} />
          </div>
        ),
    },
  )()
}
