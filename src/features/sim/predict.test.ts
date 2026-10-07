import { describe, expect, it } from 'vitest'
import { TEST_EXAMPLES, TRAINING_EXAMPLES } from '../../data/examples'
import { GOOD_SET, worstAchievableSet } from './fixtures'
import { simulate, simulateDetailed } from './predict'

const CATS = TRAINING_EXAMPLES.filter((e) => e.label === 'cat')

describe('worst achievable set W', () => {
  const W = worstAchievableSet()
  const wCards = TRAINING_EXAMPLES.filter((e) => W.includes(e.id))

  it('is 10 cats: the 4 white fluffy cards plus fluffy / front-sitting cards, no black, no non-cats', () => {
    expect(W).toHaveLength(10)
    expect(wCards.every((c) => c.label === 'cat')).toBe(true)
    expect(wCards.filter((c) => c.colour === 'white' && c.fur === 'fluffy')).toHaveLength(4)
    expect(wCards.some((c) => c.colour === 'black')).toBe(false)
    for (const c of wCards) expect(c.colour === 'white' || c.fur === 'fluffy' || c.pose === 'front-sit').toBe(true)
  })

  it('makes the black cat a miss: p_cat 0.25-0.45, predicted not cat, accuracy <= 5/8', () => {
    const r = simulate(W)
    expect(r.featured.probs.cat).toBeGreaterThanOrEqual(0.25)
    expect(r.featured.probs.cat).toBeLessThanOrEqual(0.45)
    expect(r.featured.predicted).not.toBe('cat')
    expect(r.correctCount).toBeLessThanOrEqual(5)
  })
})

describe('good-variety set', () => {
  it('makes the black cat a clear hit: p_cat 0.88-0.97, accuracy >= 7/8', () => {
    const r = simulate(GOOD_SET)
    expect(r.featured.probs.cat).toBeGreaterThanOrEqual(0.88)
    expect(r.featured.probs.cat).toBeLessThanOrEqual(0.97)
    expect(r.featured.predicted).toBe('cat')
    expect(r.correctCount).toBeGreaterThanOrEqual(7)
  })
  it('has higher variety than W', () => {
    expect(simulate(GOOD_SET).variety).toBeGreaterThan(simulate(worstAchievableSet()).variety)
  })
})

describe('properties', () => {
  it('is deterministic and independent of selection order', () => {
    const a = simulate(GOOD_SET)
    expect(simulate(GOOD_SET)).toEqual(a)
    expect(simulate([...GOOD_SET].reverse())).toEqual(a)
    expect(simulate([...GOOD_SET].sort(() => 0.5 - Math.sqrt(0.3)))).toEqual(a)
  })

  it('is monotonic: adding a card with a new trait never lowers a cat test probability (before and, within jitter, after)', () => {
    const catIds = CATS.map((c) => c.id)
    let checked = 0
    for (let seed = 0; seed < 300; seed++) {
      // pseudo-random subset of 3-9 cats, then try every extra cat
      const subset = catIds.filter((_, i) => ((i * 7 + seed * 13) % 5) < 2 + (seed % 3)).slice(0, 3 + (seed % 7))
      const before = simulateDetailed(subset)
      for (const extra of catIds.filter((id) => !subset.includes(id))) {
        const after = simulateDetailed([...subset, extra])
        TEST_EXAMPLES.forEach((t, i) => {
          if (t.label !== 'cat') return
          expect(after.details[i].pCatBase).toBeGreaterThanOrEqual(before.details[i].pCatBase - 1e-12)
          expect(after.details[i].probs.cat).toBeGreaterThanOrEqual(before.details[i].probs.cat - 0.03)
          checked++
        })
      }
    }
    expect(checked).toBeGreaterThan(1000)
  })

  it('needs a non-cat in the set to reject the dog and the bird', () => {
    const withNon = simulate(GOOD_SET)
    const without = simulate(GOOD_SET.filter((id) => id !== 'train-20').concat('train-02'))
    for (const id of ['test-07', 'test-08']) {
      expect(withNon.predictions.find((p) => p.testId === id)!.correct).toBe(true)
      expect(without.predictions.find((p) => p.testId === id)!.correct).toBe(false)
    }
  })

  it('probabilities sum to 1', () => {
    for (const p of simulate(GOOD_SET).predictions) expect(p.probs.cat + p.probs.dog + p.probs.other).toBeCloseTo(1, 10)
  })
})
