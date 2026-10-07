import type { Dispatch, ReactNode } from 'react'
import type { Action } from '../../state/machine'
import { useScreenClock } from '../useScreenClock'
import './Everywhere.css'

/** Beats in seconds: the four icons one by one, then the closing line. The screen ends at EVERYWHERE_END_SEC. */
const PHASE_AT = [0.5, 1.5, 2.5, 3.5, 4.8] as const
export const EVERYWHERE_END_SEC = 8

export const EVERYWHERE_COPY = {
  headline: "It's everywhere.",
  closing: 'Same idea. Different examples.',
} as const

const FaceUnlock = () => (
  <>
    <path d="M6 18V10a4 4 0 0 1 4-4h8M46 6h8a4 4 0 0 1 4 4v8M58 46v8a4 4 0 0 1-4 4h-8M18 58h-8a4 4 0 0 1-4-4v-8" />
    <path d="M22 26v5M42 26v5M32 28v8h-3" />
    <path d="M22 42c6 6 14 6 20 0" />
  </>
)
const Envelope = () => (
  <>
    <rect x="6" y="14" width="44" height="32" rx="4" />
    <path d="M6 18l22 17 22-17" />
    <circle cx="48" cy="44" r="10" />
    <path d="M41 51l14-14" />
  </>
)
const MusicNote = () => (
  <>
    <path d="M24 46V14l28-6v32" />
    <path d="M24 24l28-6" />
    <circle cx="16" cy="46" r="8" />
    <circle cx="44" cy="40" r="8" />
  </>
)
const Car = () => (
  <>
    <path d="M6 40v-8l6-2 8-14h24l10 14 4 2v8a2 2 0 0 1-2 2h-4M16 42h-8a2 2 0 0 1-2-2" />
    <path d="M20 30h26M33 16v14" />
    <circle cx="19" cy="44" r="6" />
    <circle cx="47" cy="44" r="6" />
  </>
)

const ITEMS: { label: string; line: string; icon: ReactNode }[] = [
  { label: 'Face unlock', line: 'Your phone unlocks with your face.', icon: <FaceUnlock /> },
  { label: 'Spam filter', line: 'Spam gets filtered.', icon: <Envelope /> },
  { label: 'Music picks', line: 'Music gets picked for you.', icon: <MusicNote /> },
  { label: 'Self-driving', line: 'Cars learn to drive.', icon: <Car /> },
]

/** "It's everywhere". Four simple icons appear one by one, then the closing line. About 8 s; a tap skips after 1.5 s. */
export function Everywhere({ dispatch }: { dispatch: Dispatch<Action> }) {
  const { phase, skipReady, onTap } = useScreenClock(PHASE_AT, EVERYWHERE_END_SEC, () => dispatch({ type: 'ADVANCE' }))

  return (
    <section className="every" onPointerDown={onTap}>
      <h2 className="every__headline">{EVERYWHERE_COPY.headline}</h2>

      <ul className="every__row">
        {ITEMS.map((it, i) => (
          <li key={it.label} className={`every__item ${phase > i ? 'is-on' : ''}`}>
            <span className="every__icon">
              <svg viewBox="0 0 64 64" width="104" height="104" aria-hidden="true">
                {it.icon}
              </svg>
            </span>
            <b>{it.label}</b>
            <span className="every__line">{it.line}</span>
          </li>
        ))}
      </ul>

      <p className={`every__closing ${phase >= 5 ? 'is-on' : ''}`}>{EVERYWHERE_COPY.closing}</p>

      {skipReady ? <p className="every__hint">Tap to continue</p> : null}
    </section>
  )
}
