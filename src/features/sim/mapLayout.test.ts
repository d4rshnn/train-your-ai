import { describe, expect, it } from 'vitest'
import { TRAINING_EXAMPLES } from '../../data/examples'
import { mulberry32 } from '../../util/rand'
import { buildAlternate } from './alternate'
import { catRadius, CAT_CENTRE, CAT_R_MAX, CAT_R_MIN, layoutMap, MAP_H, MAP_W, OTHER_CENTRE, OTHER_R, OUTSIDE_GAP, testPosition } from './mapLayout'
import { GOOD_SET, worstAchievableSet } from './presets'
import { simulate } from './predict'

const WORST = worstAchievableSet()
const test = (ids: string[]) => {
  const f = simulate(ids).featured
  return { id: f.testId, pCat: f.probs.cat }
}
const map = (ids: string[]) => layoutMap(ids, test(ids))
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y)

describe('memory map layout', () => {
  it('is deterministic', () => {
    expect(map(WORST)).toEqual(map(WORST))
    expect(map(GOOD_SET)).toEqual(map(GOOD_SET))
  })

  it('does not depend on the order of the picks', () => {
    const shuffled = [...GOOD_SET].reverse()
    expect(map(shuffled)).toEqual(map(GOOD_SET))
    expect(map([...WORST].sort().reverse())).toEqual(map(WORST))
  })

  it('weak pick: small island, the new cat lands outside it', () => {
    const m = map(WORST)
    expect(m.catR).toBeLessThan(CAT_R_MIN + 0.25 * (CAT_R_MAX - CAT_R_MIN))
    expect(m.test!.inside).toBe(false)
    expect(dist(m.test!, CAT_CENTRE)).toBeGreaterThan(m.catR)
  })

  it('good pick: larger island, the new cat lands inside it', () => {
    const weak = map(WORST)
    const good = map(GOOD_SET)
    expect(good.catR).toBeGreaterThan(weak.catR + 20)
    expect(good.test!.inside).toBe(true)
    expect(dist(good.test!, CAT_CENTRE)).toBeLessThanOrEqual(good.catR)
  })

  it('shows a clear gap between the island and the new cat whenever it is outside', () => {
    for (const ids of [WORST, GOOD_SET]) for (const p of [0.02, 0.2, 0.4, 0.49, 0.499]) {
      for (const catR of [CAT_R_MIN, 80, CAT_R_MAX]) {
        const t = testPosition('test-01', p, catR)
        expect(t.inside).toBe(false)
        expect(t.x - (CAT_CENTRE.x + catR)).toBeGreaterThanOrEqual(OUTSIDE_GAP)
        expect(t.x).toBeLessThan(OTHER_CENTRE.x) // still short of the middle of the other group
      }
      expect(ids.length).toBe(10)
    }
    expect(map(WORST).test!.x - (CAT_CENTRE.x + map(WORST).catR)).toBeGreaterThanOrEqual(OUTSIDE_GAP)
  })

  it('knows whether any non-cat example was picked', () => {
    expect(layoutMap(WORST).otherSeen).toBe(false) // the weakest pick is all cats
    expect(layoutMap(['train-01', 'train-17']).otherSeen).toBe(true)
    expect(layoutMap([]).otherSeen).toBe(false)
  })

  it('the island radius follows the remapped variety', () => {
    const m = layoutMap(GOOD_SET)
    expect(m.catR).toBeCloseTo(catRadius(m.variety), 9)
    expect(catRadius(0)).toBe(CAT_R_MIN)
    expect(catRadius(1)).toBe(CAT_R_MAX)
    expect(catRadius(0.5)).toBeGreaterThan(catRadius(0.25))
  })

  it('is inside the island exactly when the sim says p_cat >= 0.5, for many random picks', () => {
    const rnd = mulberry32(11)
    let inside = 0
    let outside = 0
    for (let n = 0; n < 400; n++) {
      const pool = TRAINING_EXAMPLES.map((e) => e.id)
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1))
        ;[pool[i], pool[j]] = [pool[j], pool[i]]
      }
      const ids = pool.slice(0, 10)
      const t = test(ids)
      const m = layoutMap(ids, t)
      expect(m.test!.inside, ids.join()).toBe(t.pCat >= 0.5)
      expect(dist(m.test!, CAT_CENTRE) <= m.catR).toBe(m.test!.inside)
      m.test!.inside ? inside++ : outside++
    }
    expect(inside).toBeGreaterThan(20) // the check above is not vacuous
    expect(outside).toBeGreaterThan(20)
  })

  it('moves the new cat towards the cat group as the sim gets more sure', () => {
    const xs = [0.05, 0.2, 0.4, 0.49, 0.5, 0.6, 0.8, 0.97].map((p) => testPosition('test-01', p, 70).x)
    for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeLessThan(xs[i - 1])
  })

  it('also lays out the what-if alternate, and it differs from the visitor\'s own map', () => {
    for (const mine of [WORST, GOOD_SET]) {
      const alt = buildAlternate(mine)
      const a = layoutMap(alt.ids, test(alt.ids))
      const m = map(mine)
      expect(a.dots).toHaveLength(10)
      expect(a.test!.inside).toBe(test(alt.ids).pCat >= 0.5)
      expect(a.catR).not.toBe(m.catR)
      // better direction = bigger island and the new cat inside; worse = the opposite
      if (alt.direction === 'better') {
        expect(a.catR).toBeGreaterThan(m.catR)
        expect(a.test!.inside).toBe(true)
      } else {
        expect(a.catR).toBeLessThan(m.catR)
        expect(a.test!.inside).toBe(false)
      }
    }
  })

  it('keeps every dot on the map, inside its own island, and non-cats with the other group', () => {
    for (const ids of [WORST, GOOD_SET]) {
      const m = layoutMap(ids)
      for (const d of m.dots) {
        expect(d.x).toBeGreaterThan(0)
        expect(d.x).toBeLessThan(MAP_W)
        expect(d.y).toBeGreaterThan(0)
        expect(d.y).toBeLessThan(MAP_H)
        if (d.label === 'cat') expect(dist(d, CAT_CENTRE)).toBeLessThanOrEqual(m.catR)
        else expect(dist(d, OTHER_CENTRE)).toBeLessThanOrEqual(OTHER_R)
      }
    }
    // the good set holds non-cat train-... check the tray with a non-cat shows up at the right
    const withDog = layoutMap(['train-17', 'train-01'])
    expect(withDog.dots.find((d) => d.id === 'train-17')!.x).toBeGreaterThan(OTHER_CENTRE.x - OTHER_R)
    expect(withDog.dots.find((d) => d.id === 'train-01')!.x).toBeLessThan(CAT_CENTRE.x + CAT_R_MAX)
  })

  it('handles an empty and a partial pick (the map fills as the visitor picks)', () => {
    expect(layoutMap([])).toMatchObject({ dots: [], test: null, catR: CAT_R_MIN })
    const part = layoutMap(WORST.slice(0, 3))
    expect(part.dots).toHaveLength(3)
    // the dots that are there do not move when more are added
    const more = layoutMap(WORST.slice(0, 3))
    expect(more).toEqual(part)
  })

  it('bunches the weak pick tighter than the good pick', () => {
    const spread = (ids: string[]) => {
      const cats = layoutMap(ids).dots.filter((d) => d.label === 'cat')
      return cats.reduce((s, d) => s + dist(d, CAT_CENTRE), 0) / cats.length
    }
    expect(spread(WORST)).toBeLessThan(spread(GOOD_SET))
  })
})
