import { describe, expect, it } from 'vitest'
import { TRAINING_EXAMPLES } from '../../data/examples'
import { GOOD_SET, worstAchievableSet } from './fixtures'
import { simulate } from './predict'
import { rawVariety, varietyScore, VARIETY_MAX, VARIETY_MIN } from './score'

const byId = (ids: string[]) => ids.map((id) => TRAINING_EXAMPLES.find((e) => e.id === id)!)

describe('variety score', () => {
  it('has bounds equal to the exhaustive min/max over all 184,756 ten-card selections', () => {
    let min = Infinity
    let max = -Infinity
    let n = 0
    const rec = (start: number, chosen: number[]) => {
      if (chosen.length === 10) {
        const v = rawVariety(chosen.map((i) => TRAINING_EXAMPLES[i]))
        min = Math.min(min, v)
        max = Math.max(max, v)
        n++
        return
      }
      for (let i = start; i < TRAINING_EXAMPLES.length; i++) {
        chosen.push(i)
        rec(i + 1, chosen)
        chosen.pop()
      }
    }
    rec(0, [])
    expect(n).toBe(184_756)
    expect(min).toBeCloseTo(VARIETY_MIN, 5)
    expect(max).toBeCloseTo(VARIETY_MAX, 5)
  })

  it('stays within 0..1 and the good set is near the top', () => {
    const good = varietyScore(byId(GOOD_SET))
    expect(good).toBeGreaterThanOrEqual(0.9)
    expect(good).toBeLessThanOrEqual(1)
  })

  it('scores a very alike selection low and a mixed one high', () => {
    const alike = byId(['train-01', 'train-02', 'train-03', 'train-04', 'train-06', 'train-09', 'train-15', 'train-18', 'train-19', 'train-20'])
    expect(varietyScore(alike)).toBeLessThan(0.1)
    expect(varietyScore(byId(GOOD_SET))).toBeGreaterThan(varietyScore(alike) + 0.8)
  })

  it('the worst achievable cat set is well below the good set (it still has 7 colours, so it is not near 0)', () => {
    const w = varietyScore(byId(worstAchievableSet()))
    expect(w).toBeLessThan(0.55)
    expect(w).toBeLessThan(varietyScore(byId(GOOD_SET)) - 0.4)
  })

  it('is exposed on the simulation result', () => {
    expect(simulate(GOOD_SET).variety).toBeCloseTo(varietyScore(byId(GOOD_SET)), 10)
  })

  it('counts duplicates as less variety (4 white cards are about one colour)', () => {
    const base = byId(['train-05', 'train-07', 'train-08', 'train-09', 'train-10', 'train-11', 'train-12', 'train-13', 'train-14', 'train-16'])
    const withWhites = byId(['train-01', 'train-02', 'train-03', 'train-04', 'train-10', 'train-11', 'train-12', 'train-13', 'train-14', 'train-16'])
    expect(varietyScore(base)).toBeGreaterThan(varietyScore(withWhites))
  })
})
