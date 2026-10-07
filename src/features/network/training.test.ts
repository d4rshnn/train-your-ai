import { describe, expect, it } from 'vitest'
import { TRAINING_EXAMPLES } from '../../data/examples'
import { GOOD_SET, worstAchievableSet } from '../sim/fixtures'
import { resolveSelection } from '../sim/predict'
import { varietyScore } from '../sim/score'
import { visualVariety } from '../sim/visual'
import { buildLayout, LAYERS } from './layout'
import { examplePaths, planTraining } from './training'

const layout = buildLayout(840, 560)
const byId = (id: string) => TRAINING_EXAMPLES.find((e) => e.id === id)!

describe('examplePaths', () => {
  it('is deterministic and gives 6 connected input->output paths', () => {
    const a = examplePaths(layout, byId('train-01'))
    expect(examplePaths(layout, byId('train-01'))).toEqual(a)
    expect(a.paths).toHaveLength(6)
    for (const path of a.paths) {
      expect(path).toHaveLength(LAYERS.length - 1)
      path.forEach((e, i) => {
        expect(layout.nodes[layout.edges[e].from].layer).toBe(i)
        if (i > 0) expect(layout.edges[e].from).toBe(layout.edges[path[i - 1]].to)
      })
    }
  })

  it('lights different routes for different cards', () => {
    const route = (id: string) => examplePaths(layout, byId(id)).paths.flat().join(',')
    expect(route('train-01')).not.toBe(route('train-05'))
    expect(route('train-05')).not.toBe(route('train-12'))
    const distinct = new Set(TRAINING_EXAMPLES.map((e) => route(e.id)))
    expect(distinct.size).toBeGreaterThanOrEqual(18)
  })

  it('points the last hop at CAT for cats, DOG for dogs, OTHER for the rest', () => {
    const outs = layout.layers[LAYERS.length - 1]
    expect(examplePaths(layout, byId('train-01')).outputNode).toBe(outs[0])
    expect(examplePaths(layout, byId('train-17')).outputNode).toBe(outs[1])
    expect(examplePaths(layout, byId('train-18')).outputNode).toBe(outs[2])
  })
})

describe('planTraining', () => {
  const picks = (ids: string[]) => ids.map(byId)
  const crispOf = (ids: string[]) => visualVariety(varietyScore(resolveSelection(ids)))

  it('is deterministic', () => {
    const a = planTraining(layout, picks(GOOD_SET), 1)
    const b = planTraining(layout, picks(GOOD_SET), 1)
    expect(Array.from(a.finalMemory)).toEqual(Array.from(b.finalMemory))
    expect(a.spine).toEqual(b.spine)
  })

  it('counts every pulse hop', () => {
    const plan = planTraining(layout, picks(GOOD_SET), 1)
    expect(plan.counts.reduce((s, c) => s + c, 0)).toBe(10 * 6 * (LAYERS.length - 1))
  })

  it('ends visibly crisper for the good set than for the worst set', () => {
    const worst = planTraining(layout, picks(worstAchievableSet()), crispOf(worstAchievableSet()))
    const good = planTraining(layout, picks(GOOD_SET), crispOf(GOOD_SET))
    expect(worst.crisp).toBeLessThan(0.1)
    expect(good.crisp).toBeGreaterThan(0.95)
    expect(good.spine.length).toBeGreaterThan(worst.spine.length + 12)
    const mean = (a: Float32Array) => a.reduce((s, v) => s + v, 0) / a.length
    expect(mean(good.suppress)).toBeGreaterThan(mean(worst.suppress))
    // spine edges are bright, the rest is dim
    for (const e of good.spine) expect(good.finalMemory[e]).toBeGreaterThanOrEqual(0.55)
  })

  it('separates the output nodes more when crisp', () => {
    const outs = layout.layers[LAYERS.length - 1]
    const spread = (crisp: number) => {
      const p = planTraining(layout, picks(GOOD_SET), crisp)
      const v = outs.map((n) => p.finalRest[n])
      return Math.max(...v) - Math.min(...v)
    }
    expect(spread(1)).toBeGreaterThan(spread(0) + 0.3)
  })
})
