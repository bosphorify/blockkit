/**
 * @bosphorify/blockkit — a curated block editor + renderer on top of BlockNote.
 *
 * The value over raw BlockNote: ONE registry describing each curated block, a
 * shared allowlist renderer (block JSON → React), and a one-way markdown bridge
 * for agents/LLMs.
 *
 * Three entry points, split by cost so consumers pull only what they use:
 *   - `@bosphorify/blockkit`         (this) — render posts + the registry + the
 *                                     curated block components + the agent
 *                                     markdown converters. No BlockNote, no eval.
 *   - `@bosphorify/blockkit/editor`  — the BlockNote authoring surface (heavy).
 *   - `@bosphorify/blockkit/runner`  — the executable block (react-runner/eval).
 *
 * Wire host analytics once on the client with `configureBlockKit({ track })`.
 */

// pure core: types + agent markdown bridges
export * from './types'
export * from './markdown-to-blocks'
export * from './blocks-to-markdown'

// the registry (specs/slash-menu/renderer/runner-scope all derive from it)
export {
  REGISTRY,
  REGISTRY_BY_TYPE,
  CURATED_SCOPE,
  SCOPE_NAMES,
  ConfigForm,
} from './registry'
export type { RegistryEntry } from './registry'

// the shared public renderer (allowlist; executable opt-in via allowExecutable)
export { PostRenderer } from './PostRenderer'

// curated block components (for advanced/custom rendering)
export * from './components'

// analytics seam
export { configureBlockKit } from './track'
export type { TrackFn } from './track'
