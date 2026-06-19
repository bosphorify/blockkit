import '@blocknote/core/fonts/inter.css'
import '@blocknote/mantine/style.css'
import {
  filterSuggestionItems,
  insertOrUpdateBlockForSlashMenu,
} from '@blocknote/core'
import { BlockNoteView } from '@blocknote/mantine'
import {
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  useCreateBlockNote,
} from '@blocknote/react'
import * as React from 'react'
import { createEditorSchema } from './blocks'

/**
 * Visual (Notion-style) editor over a constrained BlockNote schema: native
 * blocks + one executable block. Source of truth is the BlockNote document
 * (JSON), handed back via a DEBOUNCED `onChange`. Client-only.
 *
 * Image upload is INJECTED via the `uploadFile` prop so the library has no
 * storage dependency — the host wires it to its own backend. The built-in
 * default inlines images as data: URLs, so the editor works standalone.
 *
 * `runnerScope` injects extra values into executable-block author code.
 */
async function dataUrlUpload(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result)) // full data: URL
    reader.onerror = () => reject(new Error('file read failed'))
    reader.readAsDataURL(file)
  })
}

export function BlockEditor({
  initialContent,
  onChange,
  uploadFile = dataUrlUpload,
  runnerScope,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialContent?: any[]
  onChange?: (doc: unknown) => void
  /** Host-provided uploader: receives a File, returns a URL to store. */
  uploadFile?: (file: File) => Promise<string>
  /** Extra values available to executable-block author code. */
  runnerScope?: Record<string, unknown>
}) {
  // runnerScope is mount-time config: a lazy initializer bakes it into the
  // executable block's schema ONCE, so a fresh `runnerScope={{...}}` literal on
  // every render doesn't recreate the editor (which would discard typed
  // content). To swap scope at runtime, remount BlockEditor with a new `key`.
  const [schema] = React.useState(() => createEditorSchema(runnerScope))
  const editor = useCreateBlockNote({
    schema,
    uploadFile,
    initialContent:
      initialContent && initialContent.length ? initialContent : undefined,
  })

  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const handleChange = React.useCallback(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => onChange?.(editor.document), 300)
  }, [editor, onChange])

  return (
    <BlockNoteView
      editor={editor}
      slashMenu={false}
      onChange={handleChange}
      theme="light"
    >
      <SuggestionMenuController
        triggerCharacter="/"
        getItems={async (query) =>
          filterSuggestionItems(
            [
              ...getDefaultReactSlashMenuItems(editor),
              {
                title: 'Component (code)',
                group: 'Run code',
                subtext: '⚠ advanced — write & run a component',
                onItemClick: () =>
                  insertOrUpdateBlockForSlashMenu(editor, { type: 'executable' }),
              },
            ],
            query,
          )
        }
      />
    </BlockNoteView>
  )
}
