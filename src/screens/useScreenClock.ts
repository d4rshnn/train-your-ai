import { useCallback, useEffect, useRef, useState } from 'react'

/** Tap-to-skip becomes available this long after a non-interactive screen appears. */
export const SKIP_AFTER_MS = 1500

/**
 * The clock of a non-interactive screen. `phase` counts up as each time in `phaseAt` (seconds) passes; the screen calls
 * `onDone` by itself at `endSec`, or on a tap once `skipReady`. `onDone` fires at most once. With reduced motion every
 * phase is shown at once (the screen still waits `endSec` so there is time to read).
 */
export function useScreenClock(phaseAt: readonly number[], endSec: number, onDone: () => void) {
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const [phase, setPhase] = useState(reduced ? phaseAt.length : 0)
  const [skipReady, setSkipReady] = useState(false)
  const fired = useRef(false)
  const latest = useRef(onDone)
  latest.current = onDone

  const done = useCallback(() => {
    if (fired.current) return
    fired.current = true
    latest.current()
  }, [])

  useEffect(() => {
    fired.current = false
    const timers = phaseAt.map((t, i) => window.setTimeout(() => setPhase((p) => Math.max(p, i + 1)), t * 1000))
    timers.push(window.setTimeout(done, endSec * 1000))
    timers.push(window.setTimeout(() => setSkipReady(true), SKIP_AFTER_MS))
    return () => timers.forEach((t) => window.clearTimeout(t))
    // the schedule is fixed for the life of the screen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Wire to the section's onPointerDown. */
  const onTap = useCallback(() => {
    if (skipReady) done()
  }, [skipReady, done])

  return { phase, skipReady, onTap }
}
