import { describe, expect, it } from 'vitest'
import { parseAutoplay, scaleTiming, TIMING } from './autoplay'

describe('autoplay', () => {
  it('parses ?autoplay and ?autoplay&once', () => {
    expect(parseAutoplay('')).toEqual({ enabled: false, once: false, fast: false })
    expect(parseAutoplay('?dev')).toEqual({ enabled: false, once: false, fast: false })
    expect(parseAutoplay('?autoplay')).toEqual({ enabled: true, once: false, fast: false })
    expect(parseAutoplay('?autoplay&once')).toEqual({ enabled: true, once: true, fast: false })
    expect(parseAutoplay('?once')).toEqual({ enabled: false, once: true, fast: false })
    expect(parseAutoplay('?autoplay&fast')).toEqual({ enabled: true, once: false, fast: true })
  })

  it('has a single pick: no second-round pauses in the dwell table', () => {
    expect(Object.keys(TIMING).sort()).toEqual(['attract', 'compareHold', 'explainerHold', 'payoffHold', 'pick', 'prePick', 'prePlay'])
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
