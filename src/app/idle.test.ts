import { describe, expect, it } from 'vitest'
import { IDLE_MS, nextIdleStep, secondsLeft, WARN_MS } from './idle'
import { fitScale } from './Stage'

describe('idle watcher timing', () => {
  it('does nothing on the attract screen', () => {
    expect(nextIdleStep('attract', false)).toBeNull()
  })
  it('warns after 60 s of silence, then resets 10 s later', () => {
    expect(nextIdleStep('choose', false)).toEqual({ delay: IDLE_MS, action: { type: 'IDLE_WARN' } })
    expect(nextIdleStep('choose', true)).toEqual({ delay: WARN_MS, action: { type: 'IDLE_RESET' } })
    expect(IDLE_MS).toBe(60_000)
    expect(WARN_MS).toBe(10_000)
  })
})

describe('stage fit', () => {
  it('letterboxes uniformly', () => {
    expect(fitScale(1366, 768)).toBe(1)
    expect(fitScale(1920, 1080)).toBeCloseTo(1.405, 2)
    expect(fitScale(1366, 1000)).toBe(1) // limited by width
    expect(fitScale(3000, 384)).toBe(0.5) // limited by height
  })
})

describe('idle countdown', () => {
  it('counts 10 down to 1 and never shows 0', () => {
    expect(secondsLeft(0)).toBe(10)
    expect(secondsLeft(1)).toBe(10)
    expect(secondsLeft(1001)).toBe(9)
    expect(secondsLeft(9500)).toBe(1)
    expect(secondsLeft(WARN_MS)).toBe(1)
    expect(secondsLeft(20000)).toBe(1)
  })
})
