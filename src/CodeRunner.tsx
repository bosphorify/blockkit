import * as React from 'react'
import { useRunner } from 'react-runner'
import { normalizeRunnerCode } from './normalize-runner-code'

/**
 * Runs an author's component (JSX) and renders it.
 *
 * SECURITY:
 *  - Scope is passed EXPLICITLY (React + an optional caller-provided `scope`) —
 *    we never write to globalThis, so author code can't reach app internals by
 *    accident. Inject your own components via the `scope` prop.
 *  - Runs CLIENT-ONLY: `useRunner` uses `new Function`, so we feed it empty code
 *    until mounted. Author code therefore NEVER executes on the server (no
 *    chance of touching server secrets).
 *  - Real cross-origin isolation (for untrusted/multi-tenant code or npm
 *    imports) is a future iframe/Sandpack sandbox.
 */

class Boundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return <ErrorBox message={this.state.error.message} />
    }
    return this.props.children
  }
}

function ErrorBox({ message }: { message: string }) {
  return (
    <pre className="rounded border border-destructive/40 bg-destructive/10 p-3 text-xs whitespace-pre-wrap text-destructive">
      error: {message}
    </pre>
  )
}

export function CodeRunner({
  code,
  scope,
}: {
  code: string
  /** Extra values available to author code, e.g. your design-system components. */
  scope?: Record<string, unknown>
}) {
  const runnerScope = React.useMemo(() => ({ React, ...scope }), [scope])

  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  // debounce execution: never compile/run half-typed code on every keystroke
  // (also avoids remounting the preview — and losing its state — per key)
  const [settled, setSettled] = React.useState(code)
  React.useEffect(() => {
    const t = setTimeout(() => setSettled(code), 400)
    return () => clearTimeout(t)
  }, [code])

  const normalized = React.useMemo(() => normalizeRunnerCode(settled), [settled])
  const runnable = 'code' in normalized ? normalized.code : ''

  // empty code on the server / before mount → nothing executes
  const { element, error } = useRunner({
    code: mounted ? runnable : '',
    scope: runnerScope,
  })

  if (!mounted) return <div className="text-sm text-muted-foreground">rendering…</div>
  if ('error' in normalized) return <ErrorBox message={normalized.error} />
  if (error) return <ErrorBox message={error} />
  // boundary keyed by SETTLED code → render throws are contained, state survives typing
  return <Boundary key={settled}>{element}</Boundary>
}
