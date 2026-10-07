import { describe, expect, it } from 'vitest'
import { TRAINING_EXAMPLES } from '../../data/examples'
import { GOOD_SET, worstAchievableSet } from '../sim/fixtures'
import { resolveSelection } from '../sim/predict'
import { maxDistinctIn10, traitCoverage } from '../sim/score'

describe('per-trait meter coverage', () => {
  it('is 0 for an empty tray and 1 when a trait shows the most values 10 cards can', () => {
    expect(traitCoverage([])).toEqual({ colour: 0, pose: 0, scale: 0, age: 0 })
    const all = traitCoverage(TRAINING_EXAMPLES)
    expect(all).toEqual({ colour: 1, pose: 1, scale: 1, age: 1 })
  })

  it('scales by distinct values relative to the 10-card maximum', () => {
    expect(maxDistinctIn10('colour')).toBe(10)
    expect(maxDistinctIn10('pose')).toBe(4)
    expect(maxDistinctIn10('age')).toBe(2)
    const two = TRAINING_EXAMPLES.filter((e) => ['train-01', 'train-05'].includes(e.id))
    expect(traitCoverage(two).colour).toBeCloseTo(0.2, 10)
    expect(traitCoverage(two).age).toBe(0.5)
  })

  it('is higher for the good set than the worst set on colours and poses', () => {
    const good = traitCoverage(resolveSelection(GOOD_SET))
    const worst = traitCoverage(resolveSelection(worstAchievableSet()))
    expect(good.colour).toBeGreaterThan(worst.colour)
    expect(good.pose).toBeGreaterThanOrEqual(worst.pose)
    expect(good.colour).toBeGreaterThanOrEqual(0.9)
  })
})
