import { describe, expect, it } from 'vitest'
import { GOOD_SET, worstAchievableSet } from '../features/sim/fixtures'
import { parseAutoplay, scaleTiming, swapPlan, TIMING } from './autoplay'

describe('autoplay', () => {
  it('parses ?autoplay and ?autoplay&once', () => {
    expect(parseAutoplay('')).toEqual({ enabled: false, once: false, fast: false })
    expect(parseAutoplay('?dev')).toEqual({ enabled: false, once: false, fast: false })
    expect(parseAutoplay('?autoplay')).toEqual({ enabled: true, once: false, fast: false })
    expect(parseAutoplay('?autoplay&once')).toEqual({ enabled: true, once: true, fast: false })
    expect(parseAutoplay('?once')).toEqual({ enabled: false, once: true, fast: false })
    expect(parseAutoplay('?autoplay&fast')).toEqual({ enabled: true, once: false, fast: true })
  })

  it('swaps the Round-1 worst picks for the good set: 5 out, 5 in, 5 kept', () => {
    const worst = worstAchievableSet()
    const { remove, add } = swapPlan(worst, GOOD_SET)
    expect(remove).toHaveLength(5)
    expect(add).toHaveLength(5)
    // after removing and adding, the tray holds exactly the good set (any order)
    const after = [...worst.filter((id) => !remove.includes(id)), ...add]
    expect([...after].sort()).toEqual([...GOOD_SET].sort())
    expect(after).toHaveLength(10)
  })

  it('picks cards about 0.4 s apart and holds the payoff for about 6 s', () => {
    expect(TIMING.pick).toBe(400)
    expect(TIMING.payoffHold).toBe(6000)
  })

  it('fast mode shrinks every pause but never below 100 ms', () => {
    const fast = scaleTiming(TIMING, 0.1)
    expect(Math.min(...Object.values(fast))).toBeGreaterThanOrEqual(100)
    expect(fast.attract).toBeLessThan(TIMING.attract / 5)
  })
})
