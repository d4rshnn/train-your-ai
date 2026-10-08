import { useEffect, useRef, useState, type Dispatch } from 'react'
import { NextPrompt } from '../../components/NextPrompt'
import { measure, type Side } from '../../features/quantum/draws'
import type { Action } from '../../state/machine'
import './QuantumBit.css'

export const QBIT_COPY = {
  headline: 'A bit and a qubit',
  bitLabel: 'A normal bit: 0 or 1',
  qubitLabel: 'A qubit',
  caption: "A qubit isn't secretly heads or tails. Measuring gives one, with set odds.",
  odds: 'Odds: 50 / 50',
} as const

/** The flip lasts this long; the prompt appears once the first measurement has landed. */
export const FLIP_MS = 1400

/**
 * A normal bit (a switch: 0 or 1) beside a qubit drawn as a spinning coin. MEASURE lands the coin on heads or tails,
 * drawn with a real random number. The "Click for next" prompt appears after the first measurement. Simplified view.
 */
export function QuantumBit({ dispatch }: { dispatch: Dispatch<Action> }) {
  const [bit, setBit] = useState<0 | 1>(0)
  const [result, setResult] = useState<Side | null>(null)
  const [flipping, setFlipping] = useState(false)
  const [flips, setFlips] = useState(0)
  const [measured, setMeasured] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const moved = useRef(false)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const onMeasure = () => {
    if (flipping) return
    const side = measure()
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setResult(side)
    setFlips((n) => n + 1)
    setFlipping(!reduced)
    if (reduced) return setMeasured(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      setFlipping(false)
      setMeasured(true)
    }, FLIP_MS)
  }

  const onNext = () => {
    if (moved.current) return
    moved.current = true
    dispatch({ type: 'ADVANCE' })
  }

  // the coin spins until it is measured, then lands on the drawn side (a new key restarts the landing animation)
  const coinClass = result === null ? 'is-spinning' : `is-landing is-${result}`

  return (
    <section className="qbit">
      <h2 className="qbit__headline">{QBIT_COPY.headline}</h2>

      <div className="qbit__panel qbit__panel--bit">
        <p className="qbit__label">{QBIT_COPY.bitLabel}</p>
        <button type="button" className={`qbit__switch is-${bit}`} onClick={() => setBit(bit ? 0 : 1)} aria-label={`A normal bit, now ${bit}. Click to flip it.`} aria-pressed={bit === 1}>
          <span className="qbit__knob" />
        </button>
        <p className="qbit__digit" aria-hidden="true">
          {bit}
        </p>
        <p className="qbit__sub">Always one or the other.</p>
      </div>

      <div className="qbit__panel qbit__panel--qubit">
        <p className="qbit__label">{QBIT_COPY.qubitLabel}</p>
        <div className="qbit__stage">
          <div className={`qbit__hop ${flipping ? 'is-hop' : ''}`} key={`hop-${flips}`}>
            <div className={`qbit__coin ${coinClass}`} key={`coin-${flips}`}>
              <span className="qbit__face qbit__face--heads">H</span>
              <span className="qbit__face qbit__face--tails">T</span>
            </div>
          </div>
        </div>
        <p className="qbit__result" role="status">
          {result && !flipping ? `Measured: ${result}` : result ? 'Measuring…' : QBIT_COPY.odds}
        </p>
        <button type="button" className="qbit__measure btn btn--ghost" onClick={onMeasure} disabled={flipping}>
          Measure
        </button>
      </div>

      <p className="qbit__caption">{QBIT_COPY.caption}</p>
      <p className="qbit__tag">Simplified view</p>

      <NextPrompt ready={measured} onNext={onNext} />
    </section>
  )
}
