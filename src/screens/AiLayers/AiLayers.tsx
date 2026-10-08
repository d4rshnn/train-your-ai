import { useEffect, useRef, useState, type Dispatch } from 'react'
import { NextPrompt } from '../../components/NextPrompt'
import type { Action } from '../../state/machine'
import { SKIP_AFTER_MS } from '../useScreenClock'
import './AiLayers.css'

/** The three nested ideas, outermost first. Each is revealed by one click on "Click for next". */
export const LAYERS = [
  { key: 'ai', name: 'AI', text: 'Machines doing things that normally need human smarts.', chips: ['Face unlock', 'Voice assistants'] },
  { key: 'ml', name: 'Machine Learning', text: 'AI that learns from examples, not rules.', chips: ['Netflix picks'] },
  { key: 'dl', name: 'Deep Learning', text: 'Learning with many layers, like a brain.', chips: ['ChatGPT', 'Photo search'] },
] as const

/** How long each reveal takes to finish playing (ms): the prompt appears after it. */
export const REVEAL_READY_MS = [900, 1500, 1500] as const

/** A small, simple stack of layers of dots that pulse: just a picture of "many layers" (it is not the main network). */
function MiniLayers() {
  const layers = [
    { x: 18, ys: [30, 55, 80] },
    { x: 60, ys: [18, 42, 68, 92] },
    { x: 102, ys: [30, 55, 80] },
  ]
  return (
    <svg className="ail__mini" viewBox="0 0 120 110" width="132" height="121" aria-hidden="true">
      {layers.slice(0, -1).map((l, i) =>
        l.ys.flatMap((y1) => layers[i + 1].ys.map((y2) => <line key={`${i}-${y1}-${y2}`} x1={l.x} y1={y1} x2={layers[i + 1].x} y2={y2} />)),
      )}
      {layers.map((l, i) => l.ys.map((y) => <circle key={`${i}-${y}`} cx={l.x} cy={y} r="5" style={{ animationDelay: `${i * 0.35}s` }} />))}
    </svg>
  )
}

/**
 * Three nested circles (AI > machine learning > deep learning), one revealed per click. The first click-for-next reveals
 * machine learning, the second reveals deep learning, the third moves on. A click while a reveal is still playing (after
 * 1.5 s) finishes it; it never also advances.
 */
export function AiLayers({ dispatch }: { dispatch: Dispatch<Action> }) {
  const [level, setLevel] = useState(1)
  const [ready, setReady] = useState(false)
  const [skipOk, setSkipOk] = useState(false)
  const moved = useRef(false)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const r = window.setTimeout(() => setReady(true), reduced ? 0 : REVEAL_READY_MS[level - 1])
    const s = window.setTimeout(() => setSkipOk(true), SKIP_AFTER_MS)
    return () => {
      window.clearTimeout(r)
      window.clearTimeout(s)
    }
  }, [level])

  const onNext = () => {
    if (level < 3) {
      setLevel(level + 1)
      setReady(false)
      setSkipOk(false)
      return
    }
    if (moved.current) return
    moved.current = true
    dispatch({ type: 'ADVANCE' })
  }

  const onTap = () => {
    if (ready || !skipOk) return
    setReady(true)
  }

  return (
    <section className="ail" onPointerDown={onTap}>
      <h2 className="ail__headline">Where does AI fit?</h2>

      <div className="ail__circles" aria-hidden="true">
        <div className="ail__ring ail__ring--ai is-on">
          <span>AI</span>
        </div>
        <div className={`ail__ring ail__ring--ml ${level >= 2 ? 'is-on' : ''}`}>
          <span>Machine learning</span>
        </div>
        <div className={`ail__ring ail__ring--dl ${level >= 3 ? 'is-on' : ''}`}>
          <span>Deep learning</span>
          <MiniLayers />
        </div>
      </div>

      <div className="ail__rows">
        {LAYERS.map((l, i) => (
          <div key={l.key} className={`ail__row ${level > i ? 'is-on' : ''} ${level === i + 1 ? 'is-current' : ''}`}>
            <h3>{l.name}</h3>
            <p>{l.text}</p>
            <ul>
              {l.chips.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <NextPrompt ready={ready} onNext={onNext} />
    </section>
  )
}
