import { describe, expect, it } from 'vitest'
import { TEST_EXAMPLES, TRAINING_EXAMPLES } from '../../data/examples'
import { GOOD_SET, worstAchievableSet } from '../sim/fixtures'
import { simulate } from '../sim/predict'
import type { Prediction } from '../sim/types'
import { displayPercents, inferenceTargets, planInference } from './inference'
import { buildLayout, LAYERS } from './layout'
import { examplePaths } from './training'

const layout = buildLayout(840, 560)
const outs = layout.layers[LAYERS.length - 1]
const pred = (cat: number, dog: number, other: number, predicted: Prediction['predicted'], correct: boolean): Prediction => ({
  testId: 'test-01',
  probs: { cat, dog, other },
  predicted,
  correct,
})

describe('displayPercents', () => {
  it('always adds up to exactly 100 and keeps the order of the probabilities', () => {
    for (const p of [pred(0.94, 0.036, 0.024, 'cat', true), pred(0.35, 0.41, 0.24, 'dog', false), pred(1 / 3, 1 / 3, 1 / 3, 'cat', true), pred(0.505, 0.2525, 0.2425, 'cat', true)]) {
      const d = displayPercents(p.probs)
      expect(d.reduce((a, b) => a + b, 0)).toBe(100)
    }
    expect(displayPercents({ cat: 0.35, dog: 0.41, other: 0.24 })).toEqual([35, 41, 24])
  })

  it('matches every prediction the simulation produces', () => {
    for (const ids of [GOOD_SET, worstAchievableSet()]) for (const p of simulate(ids).predictions) expect(displayPercents(p.probs).reduce((a, b) => a + b, 0)).toBe(100)
  })
})

describe('inference plan', () => {
  it('sends all six pulses to the predicted output when the result is right (coherent)', () => {
    expect(inferenceTargets(pred(0.94, 0.04, 0.02, 'cat', true))).toEqual([0, 0, 0, 0, 0, 0])
    const plan = planInference(layout, TEST_EXAMPLES[0], pred(0.94, 0.04, 0.02, 'cat', true))
    expect(plan.coherent).toBe(true)
    for (const path of plan.paths) expect(layout.edges[path.at(-1)!].to).toBe(outs[0])
  })

  it('splits the pulses across outputs when the result is wrong (hesitant), with the predicted output leading', () => {
    const t = inferenceTargets(pred(0.35, 0.41, 0.24, 'dog', false))
    expect(t).toHaveLength(6)
    expect(new Set(t).size).toBeGreaterThanOrEqual(2)
    const count = (o: number) => t.filter((x) => x === o).length
    expect(count(1)).toBeGreaterThanOrEqual(count(0))
    expect(count(1)).toBeGreaterThanOrEqual(count(2))
    const plan = planInference(layout, TEST_EXAMPLES[0], pred(0.35, 0.41, 0.24, 'dog', false))
    expect(new Set(plan.paths.map((p) => layout.edges[p.at(-1)!].to)).size).toBeGreaterThanOrEqual(2)
  })

  it('a wrong answer with one dominant output still splits at least two ways', () => {
    expect(new Set(inferenceTargets(pred(0.05, 0.9, 0.05, 'dog', false))).size).toBeGreaterThanOrEqual(2)
  })

  it('uses the sim result for the real worst and good sets', () => {
    const bad = simulate(worstAchievableSet()).featured
    const good = simulate(GOOD_SET).featured
    expect(new Set(inferenceTargets(bad)).size).toBeGreaterThanOrEqual(2)
    expect(new Set(inferenceTargets(good)).size).toBe(1)
  })
})

describe('paths reach the output they are steered at', () => {
  it('almost every training card route ends at its own label output', () => {
    let ends = 0
    let total = 0
    for (const e of TRAINING_EXAMPLES) {
      const { paths, outputNode } = examplePaths(layout, e)
      for (const p of paths) {
        total++
        if (layout.edges[p.at(-1)!].to === outputNode) ends++
      }
    }
    expect(ends / total).toBeGreaterThan(0.9)
  })
})
