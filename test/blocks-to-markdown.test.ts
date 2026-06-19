import { describe, expect, it } from 'vitest'
import { blocksToMarkdown } from '@bosphorify/blockkit'
import { markdownToBlocks } from '@bosphorify/blockkit'
import { CURATED_TYPES } from '@bosphorify/blockkit'

const SAMPLE_CURATED: Record<string, object> = {
  callout: {
    type: 'callout',
    props: { calloutType: 'info', title: 'Heads up' },
    content: [{ type: 'text', text: 'careful', styles: {} }],
  },
  slider: {
    type: 'slider',
    props: { label: 'Intensity', min: 0, max: 100, start: 42, unit: '%' },
  },
  chart: {
    type: 'chart',
    props: { chartType: 'bar', label: 'Demo', values: '1, 2, 3' },
  },
  quiz: {
    type: 'quiz',
    props: { question: 'Q?', options: 'a\nb', answer: 0 },
  },
  embed: {
    type: 'embed',
    props: { url: 'https://youtu.be/abc', title: 'demo video' },
  },
  faq: {
    type: 'faq',
    props: { items: 'What? | That.\nWhy? | Because.' },
  },
}

describe('blocksToMarkdown', () => {
  it('serializes every curated type to non-empty markdown', () => {
    for (const type of CURATED_TYPES) {
      const block = SAMPLE_CURATED[type]
      expect(block, `missing sample for curated type "${type}"`).toBeTruthy()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const md = blocksToMarkdown([block as any])
      expect(md.trim(), `curated type "${type}" serialized to nothing`).not.toBe('')
    }
  })

  it('serializes the executable block as a jsx fence', () => {
    const md = blocksToMarkdown([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { type: 'executable', props: { code: 'const a = 1' } } as any,
    ])
    expect(md).toContain('```jsx\nconst a = 1\n```')
  })

  it('groups list items and renders inline styles', () => {
    const md = blocksToMarkdown([
      {
        type: 'paragraph',
        props: {},
        content: [
          { type: 'text', text: 'see ', styles: {} },
          { type: 'text', text: 'this', styles: { bold: true } },
        ],
        children: [],
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { type: 'bulletListItem', props: {}, content: [{ type: 'text', text: 'one', styles: {} }], children: [] } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { type: 'bulletListItem', props: {}, content: [{ type: 'text', text: 'two', styles: {} }], children: [] } as any,
    ])
    expect(md).toContain('see **this**')
    expect(md).toContain('- one\n- two')
  })

  it('round-trips legacy markdown content with stable meaning', () => {
    const original = '## Title\n\nA paragraph with **bold**.\n\n> a quote\n'
    const md = blocksToMarkdown(markdownToBlocks(original))
    expect(md).toContain('## Title')
    expect(md).toContain('A paragraph with **bold**.')
    expect(md).toContain('> a quote')
  })
})
