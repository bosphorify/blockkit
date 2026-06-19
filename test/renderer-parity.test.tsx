// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PostRenderer } from '@bosphorify/blockkit'

/**
 * The WYSIWYG contract + the security invariant:
 *  1. every block type an author can insert renders SOMETHING on the public
 *     page (no silently-dropped content)
 *  2. unknown block types render nothing (default-deny)
 *  3. the executable block renders ONLY with allowExecutable
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const text = (t: string): any => [{ type: 'text', text: t, styles: {} }]

// a sample document containing every author-insertable type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SAMPLES: Record<string, any> = {
  paragraph: { type: 'paragraph', props: {}, content: text('para'), children: [] },
  heading: { type: 'heading', props: { level: 2 }, content: text('head'), children: [] },
  quote: { type: 'quote', props: {}, content: text('quote'), children: [] },
  bulletListItem: { type: 'bulletListItem', props: {}, content: text('bullet'), children: [] },
  numberedListItem: { type: 'numberedListItem', props: {}, content: text('numbered'), children: [] },
  codeBlock: { type: 'codeBlock', props: { language: 'ts' }, content: text('const x = 1'), children: [] },
  image: { type: 'image', props: { url: 'https://x.com/a.png', caption: 'cap' }, content: [], children: [] },
  executable: { type: 'executable', props: { code: '<div>x</div>' }, content: [], children: [] },
}

const render = (doc: unknown[], allowExecutable = true) =>
  renderToStaticMarkup(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <PostRenderer document={doc as any} allowExecutable={allowExecutable} />,
  )

describe('renderer parity (WYSIWYG contract)', () => {
  it('renders every author-insertable block type non-empty', async () => {
    // EDITOR_BLOCK_TYPES imports BlockNote (heavy but works under jsdom)
    const { EDITOR_BLOCK_TYPES } = await import('@bosphorify/blockkit/editor')
    for (const type of EDITOR_BLOCK_TYPES) {
      const sample = SAMPLES[type]
      expect(sample, `no test sample for editor block type "${type}"`).toBeTruthy()
      const html = render([sample])
      expect(html.length, `type "${type}" rendered nothing`).toBeGreaterThan(0)
    }
  })
})

describe('renderer security invariants', () => {
  it('default-denies unknown block types', () => {
    expect(render([{ type: 'evil-embed', props: { src: 'x' }, content: [], children: [] }])).toBe('')
  })

  it('denies the executable block unless explicitly allowed', () => {
    expect(render([SAMPLES.executable], false)).toBe('')
  })

  it('renders the executable placeholder when allowed (client loads the runner)', () => {
    const html = render([SAMPLES.executable], true)
    expect(html).toContain('rendering…')
  })
})
