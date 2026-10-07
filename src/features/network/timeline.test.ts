import { describe, expect, it } from 'vitest'
import { Timeline } from './timeline'

const run = (tl: Timeline, seconds: number, step = 0.05) => {
  for (let t = 0; t < seconds - 1e-9; t += step) tl.tick(step)
}

describe('Timeline', () => {
  it('fires events in time order, same-time events in insertion order', () => {
    const log: string[] = []
    const tl = new Timeline()
    tl.at(1, () => log.push('b')).at(0.5, () => log.push('a')).at(1, () => log.push('c'))
    run(tl, 1.2)
    expect(log).toEqual(['a', 'b', 'c'])
  })

  it('after() is relative to the current time', () => {
    const log: number[] = []
    const tl = new Timeline()
    run(tl, 2)
    tl.after(1, () => log.push(tl.now))
    run(tl, 0.9)
    expect(log).toEqual([])
    run(tl, 0.2)
    expect(log).toHaveLength(1)
    expect(log[0]).toBeGreaterThanOrEqual(3)
  })

  it('speed 1/0.7 finishes a 7 s sequence in 5 s of real time', () => {
    let fired = false
    const tl = new Timeline(1 / 0.7)
    tl.at(7, () => (fired = true))
    run(tl, 4.9)
    expect(fired).toBe(false)
    run(tl, 0.2)
    expect(fired).toBe(true)
  })

  it('tweens run 0..1 and always end at exactly 1', () => {
    const seen: number[] = []
    const tl = new Timeline()
    tl.tween(1, 1, (p) => seen.push(p))
    run(tl, 3)
    expect(seen[0]).toBeGreaterThan(0)
    expect(seen.at(-1)).toBe(1)
    expect(seen.filter((p) => p === 1)).toHaveLength(1)
    expect(seen).toEqual([...seen].sort((a, b) => a - b))
  })

  it('skip() fires all remaining events in order and completes tweens', () => {
    const log: string[] = []
    let last = 0
    const tl = new Timeline()
    tl.at(5, () => log.push('late')).at(2, () => log.push('early')).tween(1, 10, (p) => (last = p))
    tl.tick(0.1)
    tl.skip()
    expect(log).toEqual(['early', 'late'])
    expect(last).toBe(1)
    expect(tl.pending).toBe(0)
  })

  it('cancel() drops everything without firing it', () => {
    let fired = false
    const tl = new Timeline()
    tl.at(1, () => (fired = true)).tween(0, 1, () => (fired = true))
    tl.cancel()
    run(tl, 3)
    tl.skip()
    expect(fired).toBe(false)
  })
})
