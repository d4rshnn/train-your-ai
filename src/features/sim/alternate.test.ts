import { describe, expect, it } from 'vitest'
import { TRAINING_EXAMPLES } from '../../data/examples'
import { buildAlternate, remappedVariety, WEAK_BELOW } from './alternate'
import { GOOD_SET, ids, worstAchievableSet } from './presets'
import { simulate } from './predict'

const WORST = worstAchievableSet()

describe('buildAlternate', () => {
  it('is deterministic and independent of pick order', () => {
    expect(buildAlternate(WORST)).toEqual(buildAlternate(WORST))
    expect(buildAlternate([...WORST].reverse())).toEqual(buildAlternate(WORST))
    expect(buildAlternate([...GOOD_SET].reverse())).toEqual(buildAlternate(GOOD_SET))
  })

  it('a weak pick gets the good set as its alternate, and the alternate does better', () => {
    expect(remappedVariety(WORST)).toBeLessThan(WEAK_BELOW)
    const alt = buildAlternate(WORST)
    expect(alt.direction).toBe('better')
    expect([...alt.ids].sort()).toEqual([...GOOD_SET].sort())
    const yours = simulate(WORST)
    const other = simulate(alt.ids)
    expect(other.correctCount).toBeGreaterThan(yours.correctCount)
    expect(other.featured.probs.cat).toBeGreaterThan(yours.featured.probs.cat + 0.3)
    expect(yours.featured.correct).toBe(false)
    expect(other.featured.correct).toBe(true)
  })

  it('a good pick gets the worst set as its alternate, and the alternate does worse', () => {
    expect(remappedVariety(GOOD_SET)).toBeGreaterThanOrEqual(WEAK_BELOW)
    const alt = buildAlternate(GOOD_SET)
    expect(alt.direction).toBe('worse')
    expect([...alt.ids].sort()).toEqual([...WORST].sort())
    const yours = simulate(GOOD_SET)
    const other = simulate(alt.ids)
    expect(other.correctCount).toBeLessThan(yours.correctCount)
    expect(other.featured.probs.cat).toBeLessThan(yours.featured.probs.cat - 0.3)
  })

  it('always returns a legal 10-card selection of real cards, whatever the pick', () => {
    for (const pick of [WORST, GOOD_SET, ids(1, 2, 3, 4, 5, 6, 7, 8, 9, 10), ids(11, 12, 13, 14, 15, 16, 17, 18, 19, 20), TRAINING_EXAMPLES.slice(0, 10).map((e) => e.id)]) {
      const alt = buildAlternate(pick)
      expect(alt.ids).toHaveLength(10)
      expect(new Set(alt.ids).size).toBe(10)
      for (const id of alt.ids) expect(TRAINING_EXAMPLES.some((e) => e.id === id)).toBe(true)
      expect(alt.variety).toBeGreaterThanOrEqual(0)
      expect(alt.variety).toBeLessThanOrEqual(1)
    }
  })

  it('the threshold is 0.6: just under it is weak, at it is not', () => {
    // find any pick whose remapped variety sits on each side, by scanning a few structured picks
    const picks = [WORST, GOOD_SET, ids(1, 2, 3, 5, 6, 8, 10, 12, 14, 16), ids(2, 4, 6, 8, 10, 12, 14, 16, 18, 20)]
    for (const p of picks) expect(buildAlternate(p).direction).toBe(remappedVariety(p) < WEAK_BELOW ? 'better' : 'worse')
  })
})
