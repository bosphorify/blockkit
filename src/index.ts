/**
 * @bosphorify/blockkit — a runnable JSX block for BlockNote, with a constrained
 * editor and a read-only view.
 *
 * Three entry points, split by cost:
 *   - `@bosphorify/blockkit`         (this) — BlockView: read-only display of a
 *                                     document, via BlockNote (full fidelity).
 *   - `@bosphorify/blockkit/editor`  — BlockEditor + the schema (authoring).
 *   - `@bosphorify/blockkit/runner`  — the executable block runtime (react-runner/eval).
 *
 * Rendering is BlockNote's job: BlockView wraps `<BlockNoteView editable={false}>`,
 * so every block prop is honored. For SSR without shipping BlockNote to the
 * client, use BlockNote's own `editor.blocksToFullHTML(blocks)`.
 */
export { BlockView } from './BlockView'
