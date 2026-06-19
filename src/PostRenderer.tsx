import * as React from 'react'
import { CodeBlock } from './components'
import { REGISTRY_BY_TYPE } from './registry'

/**
 * The executable block's runtime (react-runner) is heavy and rarely needed —
 * load it only on the client, only when a document actually contains an
 * executable block. SSR and plain posts never pay for it.
 */
function LazyCodeRunner({ code }: { code: string }) {
  const [Runner, setRunner] = React.useState<React.ComponentType<{
    code: string
  }> | null>(null)
  React.useEffect(() => {
    let cancelled = false
    import('./CodeRunner').then((m) => {
      if (!cancelled) setRunner(() => m.CodeRunner)
    })
    return () => {
      cancelled = true
    }
  }, [])
  if (!Runner) {
    return <div className="text-sm text-muted-foreground">rendering…</div>
  }
  return <Runner code={code} />
}

/**
 * Renders a BlockNote document (JSON) → React for the reader view AND the
 * editor preview — the single canonical render path.
 *
 * SECURITY: an explicit allowlist. Known block types render; anything unknown
 * is dropped (default-deny). The executable block is DENIED unless the caller
 * passes `allowExecutable` explicitly (our own public blog + admin preview do —
 * content is admin-authored; see CLAUDE.md trust rules), and even then it runs
 * ONLY through the client-only CodeRunner (never server-evaluated).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Block = { id?: string; type: string; props?: any; content?: any; children?: Block[] }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Inline = any

const SAFE_HREF = /^(https?:|mailto:|\/(?!\/))/i

function renderInline(content: Inline): React.ReactNode {
  if (!Array.isArray(content)) return null
  return content.map((node, i) => {
    if (node?.type === 'link') {
      const href = String(node.href ?? '')
      // scheme allowlist: javascript:/data: etc. degrade to plain text
      if (!SAFE_HREF.test(href)) {
        // biome-ignore lint/suspicious/noArrayIndexKey: stable doc order
        return <React.Fragment key={i}>{renderInline(node.content)}</React.Fragment>
      }
      return (
        <a
          // biome-ignore lint/suspicious/noArrayIndexKey: stable doc order
          key={i}
          href={href}
          rel="noopener noreferrer"
          className="text-primary underline"
        >
          {renderInline(node.content)}
        </a>
      )
    }
    const text: string = node?.text ?? ''
    const s = node?.styles ?? {}
    let el: React.ReactNode = text
    if (s.code) el = <code className="rounded bg-muted px-1 py-0.5 text-[0.85em]">{el}</code>
    if (s.bold) el = <strong>{el}</strong>
    if (s.italic) el = <em>{el}</em>
    if (s.underline) el = <u>{el}</u>
    if (s.strike) el = <s>{el}</s>
    // biome-ignore lint/suspicious/noArrayIndexKey: stable doc order
    return <React.Fragment key={i}>{el}</React.Fragment>
  })
}

const inlineText = (content: Inline): string =>
  Array.isArray(content) ? content.map((n) => n?.text ?? '').join('') : ''

function CuratedBlock({ block }: { block: Block }) {
  const entry = REGISTRY_BY_TYPE[block.type]
  if (!entry) return null
  const Comp = entry.Component
  const props = entry.toProps(block.props ?? {})
  if (entry.content === 'inline') {
    return <Comp {...props}>{renderInline(block.content)}</Comp>
  }
  return <Comp {...props} />
}

type RenderOpts = { allowExecutable: boolean }

function renderBlock(block: Block, opts: RenderOpts): React.ReactNode {
  // curated blocks (allowlisted via registry)
  if (REGISTRY_BY_TYPE[block.type]) {
    return <CuratedBlock block={block} />
  }

  switch (block.type) {
    case 'paragraph':
      return <p>{renderInline(block.content)}</p>
    case 'heading': {
      const lvl = Number(block.props?.level ?? 2)
      const Tag = (lvl === 1 ? 'h1' : lvl === 3 ? 'h3' : 'h2') as 'h1' | 'h2' | 'h3'
      return <Tag>{renderInline(block.content)}</Tag>
    }
    case 'quote':
      return <blockquote>{renderInline(block.content)}</blockquote>
    case 'codeBlock':
      return (
        <CodeBlock
          code={inlineText(block.content)}
          language={String(block.props?.language ?? 'text')}
        />
      )
    case 'image':
      return block.props?.url ? (
        <figure>
          <img
            src={block.props.url}
            alt={block.props?.caption || 'post image'}
            loading="lazy"
            width={block.props?.previewWidth || undefined}
          />
          {block.props?.caption ? <figcaption>{block.props.caption}</figcaption> : null}
        </figure>
      ) : null
    case 'executable':
      // default-deny: only rendered when the caller explicitly opts in,
      // and even then client-only (never server-evaluated)
      return opts.allowExecutable ? (
        <LazyCodeRunner code={String(block.props?.code ?? '')} />
      ) : null
    default:
      // default-deny: unknown block types render nothing
      return null
  }
}

const LIST_TYPES: Record<string, 'ul' | 'ol'> = {
  bulletListItem: 'ul',
  checkListItem: 'ul',
  numberedListItem: 'ol',
}

/** Render a block list, grouping consecutive list items into <ul>/<ol>. */
function renderBlocks(blocks: Block[], opts: RenderOpts): React.ReactNode[] {
  const out: React.ReactNode[] = []
  let i = 0
  while (i < blocks.length) {
    const block = blocks[i]
    const listTag = LIST_TYPES[block.type]
    if (listTag) {
      const items: Block[] = []
      while (i < blocks.length && LIST_TYPES[blocks[i].type] === listTag) {
        items.push(blocks[i])
        i++
      }
      const Tag = listTag
      out.push(
        <Tag key={items[0].id ?? `list-${i}`}>
          {items.map((it) => (
            <li key={it.id}>
              {renderInline(it.content)}
              {it.children?.length ? renderBlocks(it.children, opts) : null}
            </li>
          ))}
        </Tag>,
      )
      continue
    }
    out.push(
      <React.Fragment key={block.id ?? `b-${i}`}>
        {renderBlock(block, opts)}
        {block.children?.length ? renderBlocks(block.children, opts) : null}
      </React.Fragment>,
    )
    i++
  }
  return out
}

export function PostRenderer({
  document,
  allowExecutable = false,
}: {
  document: Block[]
  /** Opt-in to render executable blocks (admin-authored content only). */
  allowExecutable?: boolean
}) {
  if (!Array.isArray(document)) return null
  return <>{renderBlocks(document, { allowExecutable })}</>
}
