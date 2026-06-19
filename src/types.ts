/**
 * Pure shared constants for the block system (no React imports — safe for
 * server/agent code paths). A test asserts the registry and the markdown
 * serializer both cover exactly these curated types.
 */
export const CURATED_TYPES = ['callout', 'slider', 'chart', 'quiz', 'embed', 'faq'] as const
export type CuratedType = (typeof CURATED_TYPES)[number]

/** Version stamp written into every stored document for future migrations. */
export const DOCUMENT_SCHEMA_VERSION = 1
