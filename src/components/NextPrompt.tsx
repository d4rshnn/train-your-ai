import { useEffect, useRef, useState } from 'react'
import './NextPrompt.css'

/** The one label every non-interactive screen uses to say "you can move on". */
export const NEXT_LABEL = 'Click for next'
/** The prompt fades in over this long and ignores clicks until then, so the click that skipped an animation can never also advance. */
export const NEXT_FADE_MS = 300
const NEXT_INERT_MS = 350

/**
 * A large pill at the bottom centre. It only exists once the screen's animation has finished (`ready`), which is the
 * visitor's cue that they can move on. Click, touch, Space, Enter or Right Arrow trigger it, once.
 */
export function NextPrompt({ ready, onNext }: { ready: boolean; onNext: () => void }) {
  const [live, setLive] = useState(false)
  const fired = useRef(false)
  const latest = useRef(onNext)
  latest.current = onNext

  useEffect(() => {
    fired.current = false
    if (!ready) return setLive(false)
    const t = window.setTimeout(() => setLive(true), NEXT_INERT_MS)
    return () => window.clearTimeout(t)
  }, [ready])

  const fire = () => {
    if (!live || fired.current) return
    fired.current = true
    latest.current()
  }

  useEffect(() => {
    if (!live) return
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || !['Space', 'Enter', 'ArrowRight'].includes(e.code)) return
      e.preventDefault()
      fire()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // fire only reads refs and `live`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live])

  if (!ready) return null
  return (
    <button type="button" className="next-prompt is-ready" disabled={!live} onClick={fire}>
      <span>{NEXT_LABEL}</span>
      <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
        <path d="M4 12h15M13 6l6 6-6 6" />
      </svg>
    </button>
  )
}
