import { useEffect, useReducer } from 'react'
import type { Action, Screen } from '../state/machine'

export const IDLE_MS = 60_000 // no input on S2-S8 -> warning
export const WARN_MS = 10_000 // warning -> silent reset

/** Whole seconds left on the Still-there countdown, 10 down to 1. */
export const secondsLeft = (elapsedMs: number, totalMs = WARN_MS) => Math.max(1, Math.ceil((totalMs - elapsedMs) / 1000))

export type IdleStep = { delay: number; action: Action }

/** What should happen next if the visitor does nothing. Null on the attract screen (its loop just runs). */
export function nextIdleStep(screen: Screen, idleWarn: boolean): IdleStep | null {
  if (screen === 'attract') return null
  return idleWarn ? { delay: WARN_MS, action: { type: 'IDLE_RESET' } } : { delay: IDLE_MS, action: { type: 'IDLE_WARN' } }
}

const INPUT_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'wheel'] as const

/** Any input restarts the timer (and dismisses the warning). */
export function useIdleWatcher(screen: Screen, idleWarn: boolean, dispatch: (a: Action) => void, timing = nextIdleStep) {
  const [bump, restart] = useReducer((n: number) => n + 1, 0)

  useEffect(() => {
    const onInput = () => {
      if (idleWarn) dispatch({ type: 'ACTIVITY' })
      else restart()
    }
    for (const e of INPUT_EVENTS) window.addEventListener(e, onInput, { passive: true })
    return () => {
      for (const e of INPUT_EVENTS) window.removeEventListener(e, onInput)
    }
  }, [idleWarn, dispatch])

  useEffect(() => {
    const step = timing(screen, idleWarn)
    if (!step) return
    const t = window.setTimeout(() => dispatch(step.action), step.delay)
    return () => window.clearTimeout(t)
  }, [screen, idleWarn, bump, dispatch, timing])
}
