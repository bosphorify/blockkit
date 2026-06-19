/**
 * @bosphorify/blockkit/editor — the BlockNote authoring surface.
 *
 * Separate entry because it pulls in BlockNote + CodeMirror (heavy). Consumers
 * that only RENDER content import the main entry and never load this.
 */
export { BlockEditor } from './BlockEditor'
export { createEditorSchema, editorSchema, EDITOR_BLOCK_TYPES } from './blocks'
export type { EditorSchema } from './blocks'
