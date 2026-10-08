import { useCallback, useEffect, useRef, useState } from 'react'

/** A click to skip an animation that is still playing only works this long after the screen appears. */
export const SKIP_AFTER_MS = 1500

/**
 * The clock of a click-to-advance screen. `phase` counts up as each time in `phaseAt` (seconds) passes; at `readySec` the
 * animation has finished and `ready` turns true (the screen then shows its "Click for next" prompt; nothing moves on by
 * itself). A click on the screen while it is still playing (after SKIP_AFTER_MS) jumps to the finished state and shows the
 * prompt; it never advances. `next` (wired to the prompt) fires `onNext` at most once. With reduced motion the screen is
 * finished at once.
 */
export function useScreenClock(phaseAt: readonly number[], readySec: number, onNext: () => void) {
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const [phase, setPhase] = useState(reduced ? phaseAt.length : 0)
  const [ready, setReady] = useState(reduced)
  const [skipReady, setSkipReady] = useState(false)
  const fired = useRef(false)
  const latest = useRef(onNext)
  latest.current = onNext

  useEffect(() => {
    fired.current = false
    const timers = phaseAt.map((t, i) => window.setTimeout(() => setPhase((p) => Math.max(p, i + 1)), t * 1000))
    timers.push(window.setTimeout(() => setReady(true), readySec * 1000))
    timers.push(window.setTimeout(() => setSkipReady(true), SKIP_AFTER_MS))
    return () => timers.forEach((t) => window.clearTimeout(t))
    // the schedule is fixed for the life of the screen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Wire to the prompt's onNext. */
  const next = useCallback(() => {
    if (fired.current) return
    fired.current = true
    latest.current()
  }, [])

  /** Wire to the section's onPointerDown: skips what is still playing, never advances. */
  const onTap = useCallback(() => {
    if (ready || !skipReady) return
    setPhase(phaseAt.length)
    setReady(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, skipReady])

  return { phase, ready, onTap, next }
}
