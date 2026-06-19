// Tests run in a node environment where CSS imports (BlockNote's stylesheets,
// pulled in by BlockEditor) can't be loaded. vitest.config.ts aliases any
// `*.css` import to this empty module so importing the /editor entry works.
export {}
