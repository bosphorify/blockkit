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
import { REGISTRY } from './registry'
import { editorSchema } from './blocks'

/**
 * Visual (Notion-style) editor. Source of truth is the BlockNote document
 * (JSON), handed back via a DEBOUNCED `onChange`. Client-only.
 *
 * Image upload is INJECTED via the `uploadFile` prop so the library has no
 * storage dependency — the host wires it to its own backend (e.g. Supabase
 * Storage). The built-in default inlines images as data: URLs, so the editor
 * works standalone out of the box.
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
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialContent?: any[]
  onChange?: (doc: unknown) => void
  /** Host-provided uploader: receives a File, returns a URL to store. */
  uploadFile?: (file: File) => Promise<string>
}) {
  const editor = useCreateBlockNote({
    schema: editorSchema,
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
              // writing primitives first — curated embeds after
              ...getDefaultReactSlashMenuItems(editor),
              ...REGISTRY.map((entry) => ({
                title: entry.title,
                group: entry.group,
                subtext: entry.subtext,
                aliases: entry.aliases,
                onItemClick: () =>
                  insertOrUpdateBlockForSlashMenu(editor, {
                    type: entry.type,
                    ...(entry.type === 'callout'
                      ? { props: { calloutType: 'info' } }
                      : {}),
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  } as any),
              })),
              {
                title: 'Component (code)',
                group: 'Run code',
                subtext: '⚠ advanced — write & run an arbitrary component',
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
