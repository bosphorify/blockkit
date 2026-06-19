/**
 * react-runner only renders multi-statement code when it ends in
 * `export default …`. Our authoring convention (inherited from MDX) is
 * friendlier: write statements, then end with the JSX to render:
 *
 *   const Demo = () => { … }
 *   <Demo />
 *
 * This normalizes the friendly form into what react-runner expects.
 * Returns an error string instead when there's nothing renderable.
 */
export function normalizeRunnerCode(
  raw: string,
): { code: string } | { error: string } {
  const code = raw.trim()
  if (!code) return { error: 'empty code block' }

  // already explicit
  if (/(^|\n)\s*export\s+default\b/.test(code)) return { code }

  // a single JSX expression — fine as-is
  if (code.startsWith('<')) return { code }

  // find a trailing JSX expression: the last blank-line-separated chunk that
  // starts a JSX tag becomes the rendered expression
  const chunks = code.split(/\n\s*\n/)
  const trailing = chunks[chunks.length - 1].trim()
  if (chunks.length > 1 && trailing.startsWith('<')) {
    const body = chunks.slice(0, -1).join('\n\n').trim()
    return { code: `${body}\n\nexport default ${trailing}` }
  }

  return {
    error:
      'nothing to render — end the block with a JSX expression (e.g. `<MyComponent />`) or `export default`',
  }
}
