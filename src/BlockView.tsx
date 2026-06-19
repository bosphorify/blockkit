import '@blocknote/core/fonts/inter.css'
import '@blocknote/mantine/style.css'
import { BlockNoteView } from '@blocknote/mantine'
import { useCreateBlockNote } from '@blocknote/react'
import * as React from 'react'
import { createEditorSchema } from './blocks'

/**
 * Read-only display of a BlockNote document. This IS BlockNote rendering, so
 * every prop the author set (alignment, colors, image width, …) is honored —
 * no hand-maintained renderer, no prop drift. Client-only.
 *
 * The executable block renders just its live output here (no code editor),
 * because its spec branches on `editor.isEditable`.
 *
 * For server-side rendering without shipping BlockNote to the client, use
 * BlockNote's own `editor.blocksToFullHTML(blocks)` instead (see README).
 */
export function BlockView({
  document,
  runnerScope,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  document?: any[]
  /** Extra values available to executable-block author code. */
  runnerScope?: Record<string, unknown>
}) {
  // stable schema (mount-time scope); see BlockEditor for the same pattern
  const [schema] = React.useState(() => createEditorSchema(runnerScope))
  const editor = useCreateBlockNote({
    schema,
    initialContent: document && document.length ? document : undefined,
  })

  // keep the view in sync if the document prop changes
  React.useEffect(() => {
    if (document) editor.replaceBlocks(editor.document, document)
  }, [document, editor])

  return <BlockNoteView editor={editor} editable={false} theme="light" />
}
