import { useState } from 'react'
import { BlockEditor } from '@bosphorify/blockkit/editor'
import { BlockView } from '@bosphorify/blockkit'

// A tiny interactive component for the executable block. Set explicitly so the
// renderer pane has code from the first paint (BlockNote only applies the schema
// default *inside* the editor). Edit it live — both panes update.
const DEMO_CODE = `const Counter = () => {
  const [n, setN] = React.useState(0)
  return (
    <div>
      <p>You clicked {n} times.</p>
      <button onClick={() => setN(n + 1)}>click me</button>
    </div>
  )
}

<Counter />`

// BlockNote partial blocks (the document = block JSON).
const INITIAL = [
  { type: 'heading', props: { level: 1 }, content: 'blockkit demo' },
  {
    type: 'paragraph',
    content:
      'Left = the editor. Right = a read-only BlockNote view of the same document. Type "/" and pick "Component (code)" to drop in a live React component.',
  },
  { type: 'executable', props: { code: DEMO_CODE } },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
] as any[]

export default function App() {
  const [doc, setDoc] = useState<unknown[]>(INITIAL)

  return (
    <div className="mx-auto max-w-7xl p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">@bosphorify/blockkit</h1>
        <p className="mt-1 text-muted-foreground">
          A runnable JSX block for BlockNote. Edit on the left; the right is a
          read-only BlockNote view — full fidelity, executable block runs live.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-lg border border-border">
          <h2 className="border-b border-border bg-muted px-4 py-2 text-sm font-medium">
            Editor — <code>@bosphorify/blockkit/editor</code>
          </h2>
          <div className="p-2">
            <BlockEditor initialContent={INITIAL} onChange={setDoc} />
          </div>
        </section>

        <section className="rounded-lg border border-border">
          <h2 className="border-b border-border bg-muted px-4 py-2 text-sm font-medium">
            Read-only — <code>&lt;BlockView /&gt;</code>
          </h2>
          <div className="p-2">
            {/* BlockView IS BlockNote rendering (editable=false) — every prop
                the author set is honored, no hand-rolled renderer. */}
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <BlockView document={doc as any} />
          </div>
        </section>
      </div>

      <details className="mt-6 rounded-lg border border-border p-4">
        <summary className="cursor-pointer text-sm font-medium">
          Document (BlockNote block JSON — the source of truth)
        </summary>
        <pre className="mt-3 overflow-x-auto text-xs text-muted-foreground">
          {JSON.stringify(doc, null, 2)}
        </pre>
      </details>
    </div>
  )
}
