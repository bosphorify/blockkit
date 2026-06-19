/**
 * Analytics seam. The library NEVER imports a specific analytics SDK — the host
 * app injects a tracker once (client-side) via `configureBlockKit`, and the
 * curated blocks emit semantic events (quiz_answered, slider_changed,
 * chart_viewed, faq_opened, executable_edited) through it. No host = no-op.
 *
 * A module-level singleton (not React context) on purpose: block events fire on
 * user interaction (client-only), and this avoids forcing consumers to wrap both
 * the editor and the renderer in a provider.
 */
export type TrackFn = (event: string, props?: Record<string, unknown>) => void

let _track: TrackFn = () => {}

/** Wire the host's analytics. Call once on the client (e.g. app entry). */
export function configureBlockKit(opts: { track?: TrackFn }): void {
  if (opts.track) _track = opts.track
}

/** Emit a block event through the host tracker (no-op until configured). */
export function track(event: string, props?: Record<string, unknown>): void {
  _track(event, props)
}
