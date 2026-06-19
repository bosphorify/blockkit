import { describe, expect, it } from 'vitest'
import {
  markdownToBlocks,
  parseInline,
} from '@bosphorify/blockkit'

describe('parseInline', () => {
  it('parses bold, italic, code, and links', () => {
    const nodes = parseInline('a **b** *c* `d` [e](https://x.com) f')
    expect(nodes).toEqual([
      { type: 'text', text: 'a ', styles: {} },
      { type: 'text', text: 'b', styles: { bold: true } },
      { type: 'text', text: ' ', styles: {} },
      { type: 'text', text: 'c', styles: { italic: true } },
      { type: 'text', text: ' ', styles: {} },
      { type: 'text', text: 'd', styles: { code: true } },
      { type: 'text', text: ' ', styles: {} },
      {
        type: 'link',
        href: 'https://x.com',
        content: [{ type: 'text', text: 'e', styles: {} }],
      },
      { type: 'text', text: ' f', styles: {} },
    ])
  })

  it('passes plain text through', () => {
    expect(parseInline('plain')).toEqual([
      { type: 'text', text: 'plain', styles: {} },
    ])
  })
})

describe('markdownToBlocks', () => {
  it('parses the legacy post constructs', () => {
    const md = [
      '> We write to become less ignorant.',
      '',
      '## Why',
      '',
      'First paragraph',
      'continues here.',
      '',
      '- one',
      '- two',
      '',
      '```ts',
      'const x = 1',
      '```',
    ].join('\n')

    const blocks = markdownToBlocks(md)
    expect(blocks.map((b) => b.type)).toEqual([
      'quote',
      'heading',
      'paragraph',
      'bulletListItem',
      'bulletListItem',
      'codeBlock',
    ])
    expect(blocks[1].props?.level).toBe(2)
    // wrapped source lines join into one paragraph
    expect(blocks[2].content?.[0]?.text).toBe('First paragraph continues here.')
    expect(blocks[5].props?.language).toBe('ts')
    expect(blocks[5].content?.[0]?.text).toBe('const x = 1')
  })

  it('consumes consecutive quote lines into one block', () => {
    const blocks = markdownToBlocks('> line one\n> line two')
    expect(blocks).toHaveLength(1)
    expect(blocks[0].type).toBe('quote')
    expect(blocks[0].content?.[0]?.text).toBe('line one line two')
  })
})
