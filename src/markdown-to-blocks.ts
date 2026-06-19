/**
 * Minimal, deterministic markdown → BlockNote-document converter.
 *
 * Used ONLY to lift the legacy markdown fixtures (and any pasted markdown)
 * into the canonical block-JSON format. It supports exactly the constructs our
 * content uses: headings (#–###), blockquotes, fenced code, bullet/numbered
 * lists, paragraphs, and inline bold/italic/code/links. It is NOT a general
 * markdown parser — the block document is the source of truth going forward.
 */

export type InlineNode = {
  type: 'text' | 'link'
  text?: string
  href?: string
  content?: InlineNode[]
  styles?: Record<string, boolean>
}

export type BlockNode = {
  id?: string
  type: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props?: Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content?: any
  children?: BlockNode[]
}

let nextId = 0
const id = () => `md-${++nextId}`

// ---- inline parsing -------------------------------------------------------

const INLINE_RE =
  /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)]+)\))/g

export function parseInline(text: string): InlineNode[] {
  const out: InlineNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  INLINE_RE.lastIndex = 0
  while ((m = INLINE_RE.exec(text))) {
    if (m.index > last) out.push({ type: 'text', text: text.slice(last, m.index), styles: {} })
    if (m[2] !== undefined) {
      out.push({ type: 'text', text: m[2], styles: { bold: true } })
    } else if (m[4] !== undefined) {
      out.push({ type: 'text', text: m[4], styles: { italic: true } })
    } else if (m[6] !== undefined) {
      out.push({ type: 'text', text: m[6], styles: { code: true } })
    } else if (m[8] !== undefined) {
      out.push({
        type: 'link',
        href: m[9],
        content: [{ type: 'text', text: m[8], styles: {} }],
      })
    }
    last = INLINE_RE.lastIndex
  }
  if (last < text.length) out.push({ type: 'text', text: text.slice(last), styles: {} })
  return out
}

// ---- block parsing --------------------------------------------------------

export function markdownToBlocks(md: string): BlockNode[] {
  const blocks: BlockNode[] = []
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  let i = 0

  const flushParagraph = (buf: string[]) => {
    const text = buf.join(' ').trim()
    if (text) {
      blocks.push({ id: id(), type: 'paragraph', props: {}, content: parseInline(text), children: [] })
    }
    buf.length = 0
  }

  const para: string[] = []

  while (i < lines.length) {
    const line = lines[i]

    // fenced code
    const fence = /^```(\w*)\s*$/.exec(line)
    if (fence) {
      flushParagraph(para)
      const lang = fence[1] || 'text'
      const code: string[] = []
      i++
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        code.push(lines[i])
        i++
      }
      i++ // skip closing fence
      blocks.push({
        id: id(),
        type: 'codeBlock',
        props: { language: lang },
        content: [{ type: 'text', text: code.join('\n'), styles: {} }],
        children: [],
      })
      continue
    }

    // heading
    const heading = /^(#{1,3})\s+(.*)$/.exec(line)
    if (heading) {
      flushParagraph(para)
      blocks.push({
        id: id(),
        type: 'heading',
        props: { level: heading[1].length },
        content: parseInline(heading[2].trim()),
        children: [],
      })
      i++
      continue
    }

    // blockquote (consume consecutive `>` lines as one quote)
    if (/^>\s?/.test(line)) {
      flushParagraph(para)
      const quote: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      blocks.push({
        id: id(),
        type: 'quote',
        props: {},
        content: parseInline(quote.join(' ').trim()),
        children: [],
      })
      continue
    }

    // list items
    const bullet = /^[-*]\s+(.*)$/.exec(line)
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line)
    if (bullet || numbered) {
      flushParagraph(para)
      blocks.push({
        id: id(),
        type: bullet ? 'bulletListItem' : 'numberedListItem',
        props: {},
        content: parseInline((bullet ?? numbered)![1].trim()),
        children: [],
      })
      i++
      continue
    }

    // blank line = paragraph boundary
    if (!line.trim()) {
      flushParagraph(para)
      i++
      continue
    }

    para.push(line.trim())
    i++
  }
  flushParagraph(para)
  return blocks
}
