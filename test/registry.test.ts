import { describe, expect, it } from 'vitest'
import { REGISTRY, REGISTRY_BY_TYPE } from '@bosphorify/blockkit'
import { CURATED_TYPES } from '@bosphorify/blockkit'

describe('registry', () => {
  it('covers exactly the shared curated type list', () => {
    expect(REGISTRY.map((e) => e.type).sort()).toEqual([...CURATED_TYPES].sort())
  })

  it('every entry has fields matching its propSchema keys', () => {
    for (const entry of REGISTRY) {
      for (const field of entry.fields) {
        expect(
          entry.propSchema[field.key],
          `${entry.type}: field "${field.key}" missing from propSchema`,
        ).toBeTruthy()
      }
    }
  })

  it('chart toProps parses csv values and drops junk', () => {
    const props = REGISTRY_BY_TYPE.chart.toProps({
      chartType: 'bar',
      label: 'x',
      values: ' 1, 2, oops, 3.5, , 4 ',
    })
    expect(props.values).toEqual([1, 2, 3.5, 4])
  })

  it('quiz toProps clamps the answer into range', () => {
    const base = { question: 'q', options: 'a\nb\nc' }
    expect(REGISTRY_BY_TYPE.quiz.toProps({ ...base, answer: 99 }).answer).toBe(2)
    expect(REGISTRY_BY_TYPE.quiz.toProps({ ...base, answer: -5 }).answer).toBe(0)
    expect(REGISTRY_BY_TYPE.quiz.toProps({ ...base, answer: 'NaN' }).answer).toBe(0)
  })

  it('faq toProps tolerates extra pipes and skips empty lines', () => {
    const props = REGISTRY_BY_TYPE.faq.toProps({
      items: 'Q1? | A | with pipe\n\nQ2? | A2\n   \nno-answer-line |',
    })
    expect(props.items).toEqual([
      { q: 'Q1?', a: 'A | with pipe' },
      { q: 'Q2?', a: 'A2' },
      { q: 'no-answer-line', a: '' },
    ])
  })

  it('slider toProps coerces numerics', () => {
    const props = REGISTRY_BY_TYPE.slider.toProps({
      label: 'x',
      min: '0',
      max: '10',
      start: '5',
      unit: '%',
    })
    expect(props).toEqual({ label: 'x', min: 0, max: 10, start: 5, unit: '%' })
  })
})
