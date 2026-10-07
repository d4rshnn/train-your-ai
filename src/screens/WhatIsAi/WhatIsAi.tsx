import type { CSSProperties, Dispatch } from 'react'
import { TRAINING_EXAMPLES } from '../../data/examples'
import { imageUrl } from '../../features/cards/images'
import type { Action } from '../../state/machine'
import { useScreenClock } from '../useScreenClock'
import './WhatIsAi.css'

/** Beats in seconds: the examples idea, then the COC line. The screen ends at WHAT_IS_AI_END_SEC. */
const PHASE_AT = [3.6, 7.0] as const
export const WHAT_IS_AI_END_SEC = 11.5

export const WHAT_IS_AI = {
  rules: 'Most software follows rules people write.',
  learns: 'AI is different. It learns from examples.',
  coc: 'At COC, we build things like this.',
} as const

const STEPS = ['Step 1', 'Step 2', 'Step 3']
const FLOW = ['train-01', 'train-05', 'train-07', 'train-11', 'train-15'].map((id) => TRAINING_EXAMPLES.find((e) => e.id === id)!)

/** A person writing steps: simple line art. */
function Writer() {
  return (
    <svg className="wia__person" viewBox="0 0 64 64" width="74" height="74" aria-hidden="true">
      <circle cx="26" cy="18" r="9" />
      <path d="M8 56c0-12 8-20 18-20s18 8 18 20" />
      <path d="M40 44l12-12 6 6-12 12-8 2z" />
    </svg>
  )
}

/** "Rules" vs "learns from examples", then a line about COC. About 11 s, moves on by itself; a tap skips after 1.5 s. */
export function WhatIsAi({ dispatch }: { dispatch: Dispatch<Action> }) {
  const { phase, onTap } = useScreenClock(PHASE_AT, WHAT_IS_AI_END_SEC, () => dispatch({ type: 'ADVANCE' }))

  return (
    <section className="wia" onPointerDown={onTap}>
      <div className="wia__headlines">
        <h2 className={`wia__headline ${phase < 1 ? 'is-on' : ''}`}>{WHAT_IS_AI.rules}</h2>
        <h2 className={`wia__headline ${phase >= 1 ? 'is-on' : ''}`}>{WHAT_IS_AI.learns}</h2>
      </div>

      <div className={`wia__panel wia__panel--rules ${phase >= 1 ? 'is-dim' : ''}`}>
        <p className="wia__label">Rules</p>
        <Writer />
        <ol className="wia__steps">
          {STEPS.map((s, i) => (
            <li key={s} style={{ animationDelay: `${0.5 + i * 0.5}s` }}>
              <b>{i + 1}</b>
              <span />
            </li>
          ))}
        </ol>
        <p className="wia__cap">A person writes the steps.</p>
      </div>

      <div className={`wia__panel wia__panel--learns ${phase >= 1 ? 'is-on' : ''}`}>
        <p className="wia__label">Learns from examples</p>
        <div className="wia__flow" aria-hidden="true">
          {FLOW.map((c, i) => (
            <img key={c.id} src={imageUrl(c)} alt="" draggable={false} style={{ '--i': i } as CSSProperties} />
          ))}
          <div className="wia__orb">
            <svg viewBox="0 0 64 64" width="64" height="64">
              <circle cx="20" cy="22" r="4" />
              <circle cx="44" cy="20" r="4" />
              <circle cx="14" cy="42" r="4" />
              <circle cx="34" cy="44" r="4" />
              <circle cx="50" cy="40" r="4" />
              <path d="M20 22L44 20M20 22L14 42M20 22L34 44M44 20L34 44M44 20L50 40M34 44L50 40M14 42L34 44" />
            </svg>
          </div>
        </div>
        <p className="wia__cap">It finds the patterns itself.</p>
      </div>

      <p className={`wia__coc ${phase >= 2 ? 'is-on' : ''}`}>{WHAT_IS_AI.coc}</p>

      <p className="wia__hint">Tap for next</p>
    </section>
  )
}
