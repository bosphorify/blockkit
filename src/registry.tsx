import * as React from 'react'
import { Callout, Chart, Embed, FAQ, Quiz, Slider } from './components'
import { Input } from './ui/input'
import { Label } from './ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { Textarea } from './ui/textarea'

/**
 * SINGLE SOURCE OF TRUTH for curated blocks.
 *
 * The editor block specs, the slash menu, the shared block→React renderer, and
 * the executable-block scope all derive from this array — so a new mini-app is
 * one entry here, and the editor renders the exact same component readers see.
 *
 * Curated blocks NEVER execute code. Props are primitives (BlockNote constraint)
 * parsed into structured, validated component props by `toProps`.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyProps = Record<string, any>

type Field =
  | { key: string; label: string; kind: 'text' | 'number' | 'textarea' }
  | { key: string; label: string; kind: 'select'; options: string[] }
  /** pick one of the block's own parsed options (e.g. quiz correct answer) */
  | { key: string; label: string; kind: 'optionIndex'; optionsKey: string }

export type RegistryEntry = {
  type: string
  title: string
  group: 'Basic' | 'Mini-apps'
  subtext: string
  /** extra slash-menu search terms ("graph" finds Chart, etc.) */
  aliases: string[]
  content: 'inline' | 'none'
  /** BlockNote propSchema (primitive defaults only) */
  propSchema: Record<string, { default: string | number; values?: string[] }>
  /** editor config controls, rendered via shadcn */
  fields: Field[]
  /** primitive block props → structured, validated component props */
  toProps: (raw: AnyProps) => AnyProps
  /** the canonical component (same in editor + reader view) */
  Component: React.ComponentType<AnyProps>
}

// ---- parsers (string props → structured) --------------------------------
const csvNumbers = (s: unknown): number[] =>
  String(s ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter((x) => x !== '') // Number('') === 0 — empty cells must drop, not zero
    .map(Number)
    .filter((n) => Number.isFinite(n))

const lines = (s: unknown): string[] =>
  String(s ?? '')
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean)

const faqItems = (s: unknown): Array<{ q: string; a: string }> =>
  lines(s)
    .map((line) => {
      const [q, ...rest] = line.split('|')
      return { q: (q ?? '').trim(), a: rest.join('|').trim() }
    })
    .filter((it) => it.q)

const clampInt = (v: unknown, min: number, max: number) => {
  const n = Math.trunc(Number(v))
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, n))
}

// ---- the registry --------------------------------------------------------
export const REGISTRY: RegistryEntry[] = [
  {
    type: 'callout',
    aliases: ['note', 'info', 'warning', 'aside'],
    title: 'Callout',
    group: 'Basic',
    subtext: 'info / note / warning box',
    content: 'inline',
    propSchema: {
      calloutType: { default: 'note', values: ['note', 'info', 'warning'] },
      title: { default: '' },
    },
    fields: [
      { key: 'calloutType', label: 'Style', kind: 'select', options: ['note', 'info', 'warning'] },
      { key: 'title', label: 'Title', kind: 'text' },
    ],
    toProps: (p) => ({ type: p.calloutType, title: p.title }),
    Component: Callout,
  },
  {
    type: 'slider',
    aliases: ['range', 'control', 'input'],
    title: 'Slider',
    group: 'Basic',
    subtext: 'interactive value slider',
    content: 'none',
    propSchema: {
      label: { default: 'Value' },
      min: { default: 0 },
      max: { default: 100 },
      start: { default: 50 },
      unit: { default: '' },
    },
    fields: [
      { key: 'label', label: 'Label', kind: 'text' },
      { key: 'min', label: 'Min', kind: 'number' },
      { key: 'max', label: 'Max', kind: 'number' },
      { key: 'start', label: 'Start', kind: 'number' },
      { key: 'unit', label: 'Unit', kind: 'text' },
    ],
    toProps: (p) => ({
      label: p.label,
      min: Number(p.min),
      max: Number(p.max),
      start: Number(p.start),
      unit: p.unit,
    }),
    Component: Slider,
  },
  {
    type: 'chart',
    aliases: ['graph', 'bar', 'line', 'area', 'plot', 'data'],
    title: 'Chart',
    group: 'Mini-apps',
    subtext: 'bar / line / area (no code)',
    content: 'none',
    propSchema: {
      chartType: { default: 'bar', values: ['bar', 'line', 'area'] },
      label: { default: 'Chart' },
      values: { default: '4, 8, 15, 16, 23, 42' },
    },
    fields: [
      { key: 'chartType', label: 'Type', kind: 'select', options: ['bar', 'line', 'area'] },
      { key: 'label', label: 'Label', kind: 'text' },
      { key: 'values', label: 'Values (comma-separated)', kind: 'text' },
    ],
    toProps: (p) => ({
      type: p.chartType,
      label: p.label,
      values: csvNumbers(p.values),
    }),
    Component: Chart,
  },
  {
    type: 'quiz',
    aliases: ['question', 'multiple choice', 'test', 'poll'],
    title: 'Quiz',
    group: 'Mini-apps',
    subtext: 'interactive multiple-choice',
    content: 'none',
    propSchema: {
      question: { default: 'What ships fastest?' },
      options: { default: 'A prototype\nA perfect plan\nA meeting' },
      answer: { default: 0 },
    },
    fields: [
      { key: 'question', label: 'Question', kind: 'text' },
      { key: 'options', label: 'Options (one per line)', kind: 'textarea' },
      { key: 'answer', label: 'Correct answer', kind: 'optionIndex', optionsKey: 'options' },
    ],
    toProps: (p) => {
      const options = lines(p.options)
      return {
        question: p.question,
        options,
        answer: clampInt(p.answer, 0, Math.max(0, options.length - 1)),
      }
    },
    Component: Quiz,
  },
  {
    type: 'embed',
    aliases: ['youtube', 'video', 'vimeo', 'iframe', 'codesandbox'],
    title: 'Embed',
    group: 'Mini-apps',
    subtext: 'YouTube / Vimeo / CodeSandbox / Observable (sandboxed)',
    content: 'none',
    propSchema: {
      url: { default: '' },
      title: { default: '' },
    },
    fields: [
      { key: 'url', label: 'URL (https)', kind: 'text' },
      { key: 'title', label: 'Title (accessibility)', kind: 'text' },
    ],
    toProps: (p) => ({ url: String(p.url ?? ''), title: String(p.title ?? '') }),
    Component: Embed,
  },
  {
    type: 'faq',
    aliases: ['accordion', 'questions', 'toggle'],
    title: 'FAQ',
    group: 'Mini-apps',
    subtext: 'expandable question list',
    content: 'none',
    propSchema: {
      items: {
        default:
          'What is this? | A block-based editor.\nIs it safe? | Only admins author it.',
      },
    },
    fields: [
      { key: 'items', label: 'Items (one “question | answer” per line)', kind: 'textarea' },
    ],
    toProps: (p) => ({ items: faqItems(p.items) }),
    Component: FAQ,
  },
]

export const REGISTRY_BY_TYPE: Record<string, RegistryEntry> = Object.fromEntries(
  REGISTRY.map((e) => [e.type, e]),
)

/**
 * Components exposed (by name) to author code in the executable block —
 * DERIVED from the registry so adding an entry automatically extends the
 * author scope and the editor's scope hint.
 */
export const CURATED_SCOPE: Record<string, React.ComponentType<AnyProps>> =
  Object.fromEntries(REGISTRY.map((e) => [e.title.replace(/\s+/g, ''), e.Component]))

/** e.g. "React, Callout, Slider, Chart, Quiz, FAQ" — for UI hints */
export const SCOPE_NAMES = ['React', ...Object.keys(CURATED_SCOPE)].join(', ')

/**
 * Generic, accessible config form for a curated block — shadcn controls with
 * <Label htmlFor> (ids namespaced by useId so multiple blocks of the same type
 * don't collide). Edits are held locally and committed to the BlockNote
 * document on a debounce, so typing doesn't create per-keystroke transactions
 * (undo entries, re-renders). Editor-only chrome; never shown to readers.
 */
export function ConfigForm({
  entry,
  props,
  onChange,
}: {
  entry: RegistryEntry
  props: AnyProps
  onChange: (patch: AnyProps) => void
}) {
  const uid = React.useId()
  const [local, setLocal] = React.useState<AnyProps>(props)
  const pending = React.useRef<AnyProps>({})
  const onChangeRef = React.useRef(onChange)
  onChangeRef.current = onChange

  // flush uncommitted edits when the panel closes/unmounts — otherwise edits
  // made within the debounce window silently vanish
  React.useEffect(
    () => () => {
      if (Object.keys(pending.current).length > 0) {
        onChangeRef.current(pending.current)
        pending.current = {}
      }
    },
    [],
  )

  // adopt external changes (e.g. undo) unless we have uncommitted edits
  React.useEffect(() => {
    if (Object.keys(pending.current).length === 0) setLocal(props)
  }, [props])

  React.useEffect(() => {
    if (Object.keys(pending.current).length === 0) return
    const t = setTimeout(() => {
      onChange(pending.current)
      pending.current = {}
    }, 400)
    return () => clearTimeout(t)
  }, [local, onChange])

  const set = (patch: AnyProps) => {
    pending.current = { ...pending.current, ...patch }
    setLocal((prev: AnyProps) => ({ ...prev, ...patch }))
  }

  return (
    <div className="mb-2 grid gap-2 sm:grid-cols-2" contentEditable={false}>
      {entry.fields.map((f) => {
        const id = `${uid}-${f.key}`
        return (
          <div key={f.key} className="grid gap-1">
            <Label htmlFor={id} className="text-[11px] text-muted-foreground">
              {f.label}
            </Label>
            {f.kind === 'select' ? (
              <Select
                value={String(local[f.key])}
                onValueChange={(v) => set({ [f.key]: v })}
              >
                <SelectTrigger id={id} className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {f.options.map((o) => (
                    <SelectItem key={o} value={o} className="text-xs">
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : f.kind === 'optionIndex' ? (
              (() => {
                const options = lines(local[f.optionsKey])
                const idx = clampInt(local[f.key], 0, Math.max(0, options.length - 1))
                return (
                  <Select
                    value={String(idx)}
                    onValueChange={(v) => set({ [f.key]: Number(v) })}
                  >
                    <SelectTrigger id={id} className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {options.map((o, i) => (
                        <SelectItem key={o} value={String(i)} className="text-xs">
                          {i + 1}. {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )
              })()
            ) : f.kind === 'textarea' ? (
              <Textarea
                id={id}
                value={String(local[f.key])}
                onChange={(e) => set({ [f.key]: e.target.value })}
                rows={3}
                className="text-xs"
              />
            ) : (
              <Input
                id={id}
                type={f.kind === 'number' ? 'number' : 'text'}
                value={String(local[f.key])}
                onChange={(e) =>
                  set({
                    [f.key]:
                      f.kind === 'number'
                        ? Number(e.target.value)
                        : e.target.value,
                  })
                }
                className="h-8 text-xs"
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
