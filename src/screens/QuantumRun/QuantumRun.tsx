import { useEffect, useRef, useState, type Dispatch } from 'react'
import { NextPrompt } from '../../components/NextPrompt'
import { partial, RUN_SIZE, runMany, type RunResult } from '../../features/quantum/draws'
import type { Action } from '../../state/machine'
import './QuantumRun.css'

export const QRUN_COPY = {
  headline: 'Run it 100 times',
  caption: 'Same setup, different answers each time. Quantum results come as odds, not certainties.',
} as const

/** How long the bars take to fill, in ms. */
export const FILL_MS = 1300

const ease = (p: number) => 1 - Math.pow(1 - p, 3)

/**
 * RUN 100 TIMES draws 100 real random measurements and fills a heads / tails bar chart. Roughly even, a little different
 * every run; it can be run again. The "Click for next" prompt appears after the first run. Simplified view.
 */
export function QuantumRun({ dispatch }: { dispatch: Dispatch<Action> }) {
  const [shown, setShown] = useState({ heads: 0, tails: 0 })
  const [running, setRunning] = useState(false)
  const [history, setHistory] = useState<RunResult[]>([])
  const raf = useRef(0)
  const moved = useRef(false)

  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  const onRun = () => {
    if (running) return
    const result = runMany(RUN_SIZE)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const finish = () => {
      setShown({ heads: result.heads, tails: result.tails })
      setRunning(false)
      setHistory((h) => [...h, result])
    }
    setRunning(true)
    if (reduced) return finish()
    const t0 = performance.now()
    const frame = (now: number) => {
      const p = Math.min(1, (now - t0) / FILL_MS)
      setShown(partial(result, ease(p)))
      if (p < 1) raf.current = requestAnimationFrame(frame)
      else finish()
    }
    raf.current = requestAnimationFrame(frame)
  }

  const onNext = () => {
    if (moved.current) return
    moved.current = true
    dispatch({ type: 'ADVANCE' })
  }

  const last = history[history.length - 1]
  const bar = (label: string, count: number, tone: 'heads' | 'tails') => (
    <div className={`qrun__col is-${tone}`}>
      <b className="qrun__count">{count}</b>
      <div className="qrun__track">
        <i style={{ height: `${(count / RUN_SIZE) * 100}%` }} />
      </div>
      <span className="qrun__name">{label}</span>
    </div>
  )

  return (
    <section className="qrun">
      <h2 className="qrun__headline">{QRUN_COPY.headline}</h2>

      <div className="qrun__left">
        <button type="button" className="qrun__run btn btn--primary" onClick={onRun} disabled={running}>
          Run 100 times
        </button>
        <p className="qrun__runs">{history.length === 0 ? 'Same coin, measured 100 times.' : `Run ${history.length}${running ? '…' : ''}`}</p>
        {history.length > 0 ? (
          <ul className="qrun__history" aria-label="Earlier runs">
            {history
              .slice(-4)
              .map((r, i, all) => ({ r, n: history.length - all.length + i + 1 }))
              .reverse()
              .map(({ r, n }) => (
                <li key={n}>
                  Run {n}: {r.heads} heads, {r.tails} tails
                </li>
              ))}
          </ul>
        ) : null}
      </div>

      <div className="qrun__chart" aria-label="Heads and tails counts">
        <span className="qrun__mid" aria-hidden="true">
          50
        </span>
        {bar('Heads', shown.heads, 'heads')}
        {bar('Tails', shown.tails, 'tails')}
        {last && !running ? <p className="qrun__total">{last.n} measurements</p> : null}
      </div>

      <p className="qrun__caption">{QRUN_COPY.caption}</p>
      <p className="qrun__tag">Simplified view</p>

      <NextPrompt ready={history.length > 0 && !running} onNext={onNext} />
    </section>
  )
}
