import type { BlockNode, InlineNode } from './markdown-to-blocks'

/**
 * One-way BlockNote-document → markdown derivation, used for the agent
 * content-negotiation path (and llms.txt). Pure (no React) so it can run in
 * server routes. Curated blocks serialize to readable text; the executable
 * block serializes to a jsx code fence (agents read code well). This direction
 * is derive-only — we NEVER parse this markdown back into blocks.
 */

function inlineToMd(content: unknown): string {
  if (!Array.isArray(content)) return ''
  return (content as InlineNode[])
    .map((node) => {
      if (node.type === 'link') {
        return `[${inlineToMd(node.content)}](${node.href ?? ''})`
      }
      let t = node.text ?? ''
      const s = node.styles ?? {}
      if (s.code) t = `\`${t}\``
      if (s.bold) t = `**${t}**`
      if (s.italic) t = `*${t}*`
      return t
    })
    .join('')
}

const inlineText = (content: unknown): string =>
  Array.isArray(content)
    ? (content as InlineNode[]).map((n) => n.text ?? inlineText(n.content)).join('')
    : ''

function blockToMd(block: BlockNode): string | null {
  const p = block.props ?? {}
  switch (block.type) {
    case 'paragraph': {
      const t = inlineToMd(block.content)
      return t ? t : null
    }
    case 'heading': {
      const lvl = Math.min(3, Math.max(1, Number(p.level ?? 2)))
      return `${'#'.repeat(lvl)} ${inlineToMd(block.content)}`
    }
    case 'quote':
      return `> ${inlineToMd(block.content)}`
    case 'codeBlock':
      return `\`\`\`${p.language ?? ''}\n${inlineText(block.content)}\n\`\`\``
    case 'image':
      return p.url ? `![${p.caption ?? ''}](${p.url})` : null
    case 'callout': {
      const title = p.title ? `**${p.title}**: ` : ''
      return `> ${title}${inlineToMd(block.content)}`
    }
    case 'slider':
      return `*Interactive slider: ${p.label ?? 'Value'} (${p.min ?? 0}–${p.max ?? 100}${p.unit ?? ''}, starts at ${p.start ?? p.min ?? 0}).*`
    case 'chart':
      return `*Chart (${p.chartType ?? 'bar'}): ${p.label ?? ''} — values: ${p.values ?? ''}*`
    case 'quiz': {
      const opts = String(p.options ?? '')
        .split('\n')
        .map((o: string) => o.trim())
        .filter(Boolean)
        .map((o: string, i: number) => `${i + 1}. ${o}`)
        .join('\n')
      return `**Quiz:** ${p.question ?? ''}\n\n${opts}`
    }
    case 'embed':
      return p.url ? `[${p.title || p.url}](${p.url})` : null
    case 'faq': {
      const items = String(p.items ?? '')
        .split('\n')
        .map((line: string) => {
          const [q, ...rest] = line.split('|')
          return q?.trim() ? `**${q.trim()}** — ${rest.join('|').trim()}` : null
        })
        .filter(Boolean)
        .join('\n\n')
      return items || null
    }
    case 'executable':
      return `\`\`\`jsx\n${p.code ?? ''}\n\`\`\``
    default: {
      // default-deny unknown block types, but keep their readable text if any
      const t = inlineToMd(block.content)
      return t || null
    }
  }
}

export function blocksToMarkdown(document: BlockNode[]): string {
  if (!Array.isArray(document)) return ''
  const out: string[] = []
  let i = 0
  while (i < document.length) {
    const b = document[i]
    if (b.type === 'bulletListItem' || b.type === 'numberedListItem') {
      const ordered = b.type === 'numberedListItem'
      const items: string[] = []
      while (
        i < document.length &&
        document[i].type === (ordered ? 'numberedListItem' : 'bulletListItem')
      ) {
        items.push(inlineToMd(document[i].content))
        i++
      }
      out.push(
        items
          .map((t, n) => (ordered ? `${n + 1}. ${t}` : `- ${t}`))
          .join('\n'),
      )
      continue
    }
    const md = blockToMd(b)
    if (md) out.push(md)
    if (b.children?.length) {
      const childMd = blocksToMarkdown(b.children)
      if (childMd.trim()) out.push(childMd.trim())
    }
    i++
  }
  return `${out.join('\n\n')}\n`
}
