/**
 * @bosphorify/blockkit/runner — the OPT-IN executable block.
 *
 * Kept out of the main entry on purpose: it pulls in react-runner (eval /
 * `new Function`), so importing it is an explicit choice. Consumers who don't
 * render executable blocks never load it, and can keep a strict CSP.
 *
 * Note: the renderer (main entry) lazy-loads CodeRunner internally only when a
 * caller passes `allowExecutable`, so you don't need to import this yourself
 * just to render executable posts — it's here for direct/advanced use.
 */
export { CodeRunner } from './CodeRunner'
export { normalizeRunnerCode } from './normalize-runner-code'
