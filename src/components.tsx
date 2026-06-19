import { Highlight, themes } from 'prism-react-renderer'
import * as React from 'react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './ui/accordion'
import { Button } from './ui/button'
import { Slider as UiSlider } from './ui/slider'
import { track as capture } from './track'
import { cn } from './cn'

/**
 * Curated components (Tier A): safe, no eval, configured by props. These are
 * the canonical implementations rendered by BOTH the editor and the public
 * page (via the registry + PostRenderer). Styling uses design-system tokens
 * only — the XP reskin swaps `components/ui/*` and these follow.
 */

const CALLOUT_STYLES: Record<string, string> = {
  note: 'border-border bg-muted/50',
  info: 'border-primary/40 bg-primary/5',
  warning: 'border-amber-400/60 bg-amber-50 dark:bg-amber-950/30',
}

export function Callout({
  type = 'note',
  title,
  children,
}: {
  type?: 'note' | 'info' | 'warning'
  title?: string
  children?: React.ReactNode
}) {
  return (
    <aside
      className={`my-6 rounded-md border-l-4 px-4 py-3 ${CALLOUT_STYLES[type] ?? CALLOUT_STYLES.note}`}
    >
      {title ? <p className="mb-1 font-semibold">{title}</p> : null}
      <div className="text-sm leading-relaxed [&>p:last-child]:mb-0">
        {children}
      </div>
    </aside>
  )
}

export function Slider({
  label = 'Value',
  min = 0,
  max = 100,
  start,
  step = 1,
  unit = '',
}: {
  label?: string
  min?: number
  max?: number
  start?: number
  step?: number
  unit?: string
}) {
  const initial = start ?? min
  const [value, setValue] = React.useState(initial)
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100

  return (
    <div className="my-6 rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="font-mono text-sm tabular-nums text-foreground">
          {value}
          {unit}
        </span>
      </div>
      <UiSlider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(v) => setValue(v[0] ?? initial)}
        onValueCommit={(v) =>
          capture('slider_changed', { label, value: v[0] ?? initial })
        }
        aria-label={label}
      />
      <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-75"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function CodeBlock({
  code,
  language = 'text',
}: {
  code: string
  language?: string
}) {
  return (
    <Highlight code={code} language={language} theme={themes.vsDark}>
      {({ className, style, tokens, getLineProps, getTokenProps }) => (
        <pre
          className={`${className} my-6 overflow-x-auto rounded-lg border border-border p-4 text-[13px] leading-relaxed`}
          style={style}
        >
          {tokens.map((line, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: prism line order is stable
            <div key={i} {...getLineProps({ line })}>
              {line.map((token, key) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: prism token order is stable
                <span key={key} {...getTokenProps({ token })} />
              ))}
            </div>
          ))}
        </pre>
      )}
    </Highlight>
  )
}

// ---------------------------------------------------------------------------
// Chart — lazy wrapper. recharts only downloads when a chart is on screen.
// ---------------------------------------------------------------------------

const LazyChartImpl = React.lazy(() => import('./ChartImpl'))

export function Chart(props: {
  type?: 'bar' | 'line' | 'area'
  values?: number[]
  label?: string
}) {
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const skeleton = (
    <div className="h-[200px] w-full animate-pulse rounded-md bg-muted" aria-hidden />
  )

  return (
    <figure className="my-6 rounded-lg border border-border bg-card p-4">
      {props.label ? (
        <figcaption className="mb-2 text-sm font-medium text-foreground">
          {props.label}
        </figcaption>
      ) : null}
      {mounted ? (
        <React.Suspense fallback={skeleton}>
          <LazyChartImpl {...props} />
        </React.Suspense>
      ) : (
        skeleton
      )}
    </figure>
  )
}

export function Quiz({
  question = 'Question?',
  options = [],
  answer = 0,
}: {
  question?: string
  options?: string[]
  answer?: number
}) {
  const [picked, setPicked] = React.useState<number | null>(null)
  const answered = picked !== null

  const pick = (i: number) => {
    setPicked(i)
    capture('quiz_answered', { question, correct: i === answer })
  }

  return (
    <div className="my-6 rounded-lg border border-border bg-card p-4">
      <p className="mb-3 font-medium">{question}</p>
      <div className="space-y-2">
        {options.map((opt, i) => {
          const correct = i === answer
          return (
            <Button
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed option order
              key={i}
              type="button"
              variant="outline"
              onClick={() => pick(i)}
              className={cn(
                'h-auto w-full justify-start whitespace-normal py-2 text-left font-normal',
                answered && correct && 'border-green-600 bg-green-50 dark:bg-green-950/30',
                answered && picked === i && !correct &&
                  'border-destructive bg-destructive/10',
              )}
            >
              {opt}
              {answered && correct ? ' ✓' : ''}
              {answered && picked === i && !correct ? ' ✗' : ''}
            </Button>
          )
        })}
      </div>
      {answered ? (
        <p className="mt-3 text-xs text-muted-foreground" role="status">
          {picked === answer ? 'Correct!' : 'Not quite — try again.'}
        </p>
      ) : null}
    </div>
  )
}

/**
 * Provider-allowlisted external embed. Only known hosts render as an iframe
 * (sandboxed); anything else degrades to a plain link. This is the safe path
 * for third-party interactive content — never raw author HTML.
 */
const EMBED_PROVIDERS: Array<{ host: RegExp; src: (url: URL) => string | null }> = [
  {
    host: /(^|\.)youtube\.com$|(^|\.)youtu\.be$/,
    src: (url) => {
      const id =
        url.hostname.endsWith('youtu.be') ? url.pathname.slice(1)
        : url.searchParams.get('v')
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null
    },
  },
  {
    host: /(^|\.)vimeo\.com$/,
    src: (url) => {
      const id = url.pathname.split('/').filter(Boolean)[0]
      return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null
    },
  },
  {
    host: /(^|\.)codesandbox\.io$/,
    src: (url) => url.href.replace('/s/', '/embed/'),
  },
  {
    host: /(^|\.)observablehq\.com$/,
    src: (url) => `https://observablehq.com/embed${url.pathname}`,
  },
]

export function Embed({ url = '', title = 'embedded content' }: { url?: string; title?: string }) {
  let parsed: URL | null = null
  try {
    parsed = new URL(url)
  } catch {
    /* invalid url — link fallback below */
  }
  const provider =
    parsed && parsed.protocol === 'https:'
      ? EMBED_PROVIDERS.find((p) => p.host.test(parsed.hostname))
      : null
  const src = provider && parsed ? provider.src(parsed) : null

  if (!src) {
    return url ? (
      <p className="my-6">
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
          {title || url} ↗
        </a>
      </p>
    ) : (
      <p className="my-6 text-sm text-muted-foreground">(embed: add a URL)</p>
    )
  }

  return (
    <figure className="my-6 overflow-hidden rounded-lg border border-border">
      <iframe
        src={src}
        title={title}
        loading="lazy"
        sandbox="allow-scripts allow-same-origin allow-presentation"
        allowFullScreen
        className="aspect-video w-full"
      />
    </figure>
  )
}

export function FAQ({
  items = [],
}: {
  items?: Array<{ q: string; a: string }>
}) {
  return (
    <Accordion
      type="single"
      collapsible
      className="my-6 rounded-lg border border-border bg-card px-4"
      onValueChange={(v) => {
        if (v) capture('faq_opened', { item: v })
      }}
    >
      {items.map((it, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed item order
        <AccordionItem key={i} value={`item-${i}`}>
          <AccordionTrigger>{it.q}</AccordionTrigger>
          <AccordionContent>{it.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
