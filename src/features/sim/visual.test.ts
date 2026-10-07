import { describe, expect, it } from 'vitest'
import { TRAINING_EXAMPLES } from '../../data/examples'
import { GOOD_SET, worstAchievableSet } from './fixtures'
import { resolveSelection } from './predict'
import { varietyScore } from './score'
import { visualVariety, VISUAL_FLOOR } from './visual'

describe('visualVariety', () => {
  it('maps the floor and below to 0 and 1.0 to 1, linearly in between', () => {
    expect(visualVariety(VISUAL_FLOOR)).toBe(0)
    expect(visualVariety(0.2)).toBe(0)
    expect(visualVariety(0)).toBe(0)
    expect(visualVariety(1)).toBe(1)
    expect(visualVariety(0.725)).toBeCloseTo(0.5, 10)
  })

  it('is monotonic and never changes the raw score', () => {
    let prev = -1
    for (let v = 0; v <= 1.0001; v += 0.05) {
      const m = visualVariety(v)
      expect(m).toBeGreaterThanOrEqual(prev)
      prev = m
    }
  })

  it('shows the worst achievable set as low and the good set as nearly full', () => {
    const w = visualVariety(varietyScore(resolveSelection(worstAchievableSet())))
    const g = visualVariety(varietyScore(resolveSelection(GOOD_SET)))
    expect(w).toBeLessThan(0.1)
    expect(g).toBeGreaterThan(0.95)
    expect(TRAINING_EXAMPLES).toHaveLength(20)
  })
})
