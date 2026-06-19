import { describe, expect, it } from 'vitest'
import { normalizeRunnerCode } from '../src/normalize-runner-code'

describe('normalizeRunnerCode', () => {
  it('passes a bare JSX expression through', () => {
    expect(normalizeRunnerCode('<div>hi</div>')).toEqual({ code: '<div>hi</div>' })
  })

  it('passes explicit export default through', () => {
    const code = 'const X = () => <b>x</b>\nexport default <X />'
    expect(normalizeRunnerCode(code)).toEqual({ code })
  })

  it('converts the trailing-JSX convention to export default', () => {
    const result = normalizeRunnerCode(
      'const Demo = () => {\n  return <b>ok</b>\n}\n\n<Demo />\n',
    )
    expect(result).toEqual({
      code: 'const Demo = () => {\n  return <b>ok</b>\n}\n\nexport default <Demo />',
    })
  })

  it('keeps multi-line trailing JSX together', () => {
    const result = normalizeRunnerCode(
      'const A = () => <i>a</i>\n\n<div>\n<A />\n</div>',
    )
    expect('code' in result && result.code.endsWith('export default <div>\n<A />\n</div>')).toBe(
      true,
    )
  })

  it('errors helpfully when nothing is renderable', () => {
    const result = normalizeRunnerCode('const x = 1')
    expect('error' in result && /end the block with a JSX/i.test(result.error)).toBe(true)
  })

  it('errors on empty code', () => {
    expect('error' in normalizeRunnerCode('  \n ')).toBe(true)
  })
})
