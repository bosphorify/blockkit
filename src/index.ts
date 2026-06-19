/**
 * @bosphorify/blockkit — a runnable JSX block for BlockNote, plus a light
 * read-only renderer.
 *
 * Three entry points, split by cost so consumers pull only what they use:
 *   - `@bosphorify/blockkit`         (this) — PostRenderer: block JSON → React.
 *                                     No BlockNote, no eval. The executable
 *                                     block's runtime lazy-loads client-only,
 *                                     only when `allowExecutable` is passed.
 *   - `@bosphorify/blockkit/editor`  — the BlockNote authoring surface (heavy).
 *   - `@bosphorify/blockkit/runner`  — the executable block runtime (react-runner/eval).
 */
export { PostRenderer } from './PostRenderer'
