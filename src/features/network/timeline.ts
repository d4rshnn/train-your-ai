type Event = { t: number; fn: () => void }
type Tween = { t0: number; dur: number; fn: (p: number) => void; done: boolean }

/**
 * Tiny sequencer driven by an external clock (the engine's rAF loop calls tick(dt)), so it can be stepped in tests.
 * Times are seconds at 1x; `speed` > 1 plays faster. skip() fires everything left and finishes every tween.
 */
export class Timeline {
  now = 0
  speed: number
  private events: Event[] = []
  private tweens: Tween[] = []

  constructor(speed = 1) {
    this.speed = speed
  }

  /** Run fn at absolute timeline time t. Same-time events fire in the order they were added. */
  at(t: number, fn: () => void): this {
    let i = this.events.length
    while (i > 0 && this.events[i - 1].t > t) i--
    this.events.splice(i, 0, { t, fn })
    return this
  }

  /** Run fn `delay` seconds after the current timeline time. */
  after(delay: number, fn: () => void): this {
    return this.at(this.now + delay, fn)
  }

  /** Call fn(p) with p running linearly 0..1 over [t0, t0 + dur] (callers apply easing); always ends with fn(1). */
  tween(t0: number, dur: number, fn: (p: number) => void): this {
    this.tweens.push({ t0, dur, fn, done: false })
    return this
  }

  get pending(): number {
    return this.events.length + this.tweens.filter((w) => !w.done).length
  }

  tick(dt: number) {
    this.now += dt * this.speed
    for (const w of this.tweens) {
      if (w.done || this.now < w.t0) continue
      const p = Math.min(1, (this.now - w.t0) / w.dur)
      w.fn(p)
      if (p >= 1) w.done = true
    }
    while (this.events.length && this.events[0].t <= this.now) this.events.shift()!.fn()
  }

  /** Jump to the end: fire every remaining event in order, then complete every tween. */
  skip() {
    const events = this.events
    this.events = []
    for (const e of events) e.fn()
    for (const w of this.tweens) if (!w.done) w.fn(1)
    this.tweens = []
    this.now = Math.max(this.now, ...events.map((e) => e.t))
  }

  /** Drop everything without firing it. */
  cancel() {
    this.events = []
    this.tweens = []
  }
}

/** Drive a Timeline from requestAnimationFrame (for screens that don't need the network engine's loop). Returns a stop function. */
export function drive(tl: Timeline): () => void {
  let last = performance.now()
  let raf = requestAnimationFrame(function frame(now) {
    tl.tick(Math.min(0.05, (now - last) / 1000))
    last = now
    raf = requestAnimationFrame(frame)
  })
  return () => cancelAnimationFrame(raf)
}
