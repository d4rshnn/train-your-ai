import { describe, expect, it } from 'vitest'
import { GOOD_SET, worstAchievableSet } from './fixtures'
import { simulate } from './predict'
import { accuracyPercent, accuracyView } from './summary'

describe('accuracy summary', () => {
  it('rounds 8 test results to whole percentages', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => accuracyPercent(n))).toEqual([0, 13, 25, 38, 50, 63, 75, 88, 100])
  })

  it('compares Round 1 (worst picks) to Round 2 (good picks) and says it improved', () => {
    const r1 = simulate(worstAchievableSet())
    const r2 = simulate(GOOD_SET)
    const v = accuracyView(r1, r2)
    expect(v.total).toBe(8)
    expect(v.correct).toBe(r2.correctCount)
    expect(v.round1?.correct).toBe(r1.correctCount)
    expect(v.trend).toBe('up')
    expect(v.percent).toBeGreaterThan(v.round1!.percent)
    expect(v.note).toBe('It improved because the data improved.')
  })

  it('still ends with a note when Round 2 improved but is not great yet', () => {
    const r1 = simulate(worstAchievableSet())
    const middling = { ...simulate(GOOD_SET), correctCount: r1.correctCount + 1 }
    expect(accuracyView(r1, middling).note).toBe('Better! Add even more variety to push it higher.')
  })

  it('handles a Round 2 that did not improve, and a missing Round 1', () => {
    const r2 = simulate(worstAchievableSet())
    expect(accuracyView(r2, r2).trend).toBe('same')
    expect(accuracyView(simulate(GOOD_SET), r2).trend).toBe('down')
    expect(accuracyView(null, r2)).toMatchObject({ round1: null, trend: null })
  })
})
