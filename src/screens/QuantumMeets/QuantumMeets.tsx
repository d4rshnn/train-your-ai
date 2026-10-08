import type { Dispatch } from 'react'
import { NextPrompt } from '../../components/NextPrompt'
import type { Action } from '../../state/machine'
import { useScreenClock } from '../useScreenClock'
import './QuantumMeets.css'

/** Beats in seconds: the first line, the honest second line, the two pills. The prompt appears at QMEETS_READY_SEC. */
const PHASE_AT = [0.3, 2.4, 4.2] as const
export const QMEETS_READY_SEC = 5.2

export const QMEETS_COPY = {
  lead: 'Quantum + ML: researchers are exploring whether quantum computers can help machines learn.',
  honest: "It's early. Today's quantum computers are small and noisy.",
  today: { tag: 'Real today', text: 'Small experiments' },
  research: { tag: 'Still research', text: 'Big speed-ups' },
} as const

/** Where quantum and machine learning meet, said honestly: what is real today and what is still research. */
export function QuantumMeets({ dispatch }: { dispatch: Dispatch<Action> }) {
  const { phase, ready, onTap, next } = useScreenClock(PHASE_AT, QMEETS_READY_SEC, () => dispatch({ type: 'ADVANCE' }))

  return (
    <section className="qmeets" onPointerDown={onTap}>
      <p className={`qmeets__lead ${phase >= 1 ? 'is-on' : ''}`}>{QMEETS_COPY.lead}</p>
      <p className={`qmeets__honest ${phase >= 2 ? 'is-on' : ''}`}>{QMEETS_COPY.honest}</p>

      <div className={`qmeets__pills ${phase >= 3 ? 'is-on' : ''}`}>
        <div className="qmeets__pill is-today">
          <b>{QMEETS_COPY.today.tag}</b>
          <span>{QMEETS_COPY.today.text}</span>
        </div>
        <div className="qmeets__pill is-research">
          <b>{QMEETS_COPY.research.tag}</b>
          <span>{QMEETS_COPY.research.text}</span>
        </div>
      </div>

      <p className="qmeets__tag">Simplified view</p>
      <NextPrompt ready={ready} onNext={next} />
    </section>
  )
}
