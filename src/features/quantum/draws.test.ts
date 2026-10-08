import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../../util/rand'
import { measure, partial, RUN_SIZE, runMany } from './draws'

describe('quantum draws', () => {
  it('measures to heads or tails, from the random source it is given', () => {
    expect(measure(() => 0.1)).toBe('heads')
    expect(measure(() => 0.9)).toBe('tails')
  })

  it('counts a run of 100 that adds up and is roughly even', () => {
    const rnd = mulberry32(7)
    for (let i = 0; i < 50; i++) {
      const r = runMany(RUN_SIZE, rnd)
      expect(r.heads + r.tails).toBe(100)
      expect(r.n).toBe(100)
      expect(r.heads).toBeGreaterThan(25)
      expect(r.heads).toBeLessThan(75)
    }
  })

  it('gives different answers from the same setup (not always the same split), but the same answer for the same seed', () => {
    const rnd = mulberry32(3)
    const splits = new Set(Array.from({ length: 12 }, () => runMany(100, rnd).heads))
    expect(splits.size).toBeGreaterThan(4)
    expect(runMany(100, mulberry32(9))).toEqual(runMany(100, mulberry32(9)))
  })

  it('uses real random numbers by default (two runs are rarely identical)', () => {
    const heads = new Set(Array.from({ length: 12 }, () => runMany().heads))
    expect(heads.size).toBeGreaterThan(3)
  })

  it('plays a run back in parts that end on the true counts', () => {
    const r = runMany(100, mulberry32(5))
    expect(partial(r, 0)).toEqual({ heads: 0, tails: 0 })
    expect(partial(r, 1)).toEqual({ heads: r.heads, tails: r.tails })
    expect(partial(r, 0.5).heads).toBeLessThanOrEqual(r.heads)
  })
})
