import { useEffect, useMemo, useRef, useState, type Dispatch } from 'react'
import { TEST_EXAMPLES } from '../../data/examples'
import { Button } from '../../components/Button'
import { Card } from '../../features/cards/Card'
import { imageUrl } from '../../features/cards/images'
import { displayPercents, OUTPUTS } from '../../features/network/inference'
import { drive, Timeline } from '../../features/network/timeline'
import { accuracyView, type Trend } from '../../features/sim/summary'
import type { SimResult } from '../../features/sim/types'
import type { Action } from '../../state/machine'
import './Accuracy.css'

/** Beat times in seconds (plan S7: 8 cards at ~0.3 s each, then the big number, then the round comparison). */
const BEAT = { first: 0.4, perCard: 0.3, flipMs: 450, number: 3.2, numberDur: 1.2, compare: 4.6, compareDur: 1.0, done: 5.8 } as const
const SKIP_AFTER_MS = 1500
const ease = (p: number) => 1 - Math.pow(1 - p, 3)

type Props = { round1: SimResult | null; round2: SimResult; dispatch: Dispatch<Action> }

function Arrow({ trend }: { trend: Trend }) {
  const rot = trend === 'up' ? 0 : trend === 'down' ? 180 : 90
  return (
    <svg className={`arrow is-${trend}`} viewBox="0 0 24 24" width="30" height="30" aria-label={trend === 'up' ? 'improved' : trend === 'down' ? 'lower' : 'same'} style={{ transform: `rotate(${rot}deg)` }}>
      <circle cx="12" cy="12" r="11" />
      <path d="M12 18V7M7 11.5L12 6.5l5 5" />
    </svg>
  )
}

/** S7. Eight unseen images flip one by one, then accuracy counts up, then Round 1 -> Round 2. */
export function Accuracy({ round1, round2, dispatch }: Props) {
  const view = useMemo(() => accuracyView(round1, round2), [round1, round2])
  const cardsRef = useRef<(HTMLElement | null)[]>([])
  const bigRef = useRef<HTMLSpanElement>(null)
  const countRef = useRef<HTMLElement>(null)
  const r1Ref = useRef<HTMLElement>(null)
  const r2Ref = useRef<HTMLElement>(null)
  const [compareOn, setCompareOn] = useState(false)
  const [doneOn, setDoneOn] = useState(false)
  const [skipReady, setSkipReady] = useState(false)
  const skipFn = useRef<(() => void) | null>(null)

  useEffect(() => {
    const tl = new Timeline(1)
    const anims: Animation[] = []
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // 8 cards, ~0.3 s apart: each flips to its result
    round2.predictions.forEach((_, i) => {
      tl.at(BEAT.first + i * BEAT.perCard, () => {
        const el = cardsRef.current[i]
        if (!el) return
        anims.push(el.animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(180deg)' }], { duration: BEAT.flipMs, easing: 'cubic-bezier(.22,.8,.24,1)', fill: 'both' }))
      })
    })

    // the big number and "N of 8 correct"
    tl.tween(BEAT.number, BEAT.numberDur, (p) => {
      if (bigRef.current) bigRef.current.textContent = String(Math.round(ease(p) * view.percent))
      if (countRef.current) countRef.current.textContent = String(Math.round(ease(p) * view.correct))
    })

    // Round 1 -> Round 2
    tl.at(BEAT.compare, () => setCompareOn(true))
    tl.tween(BEAT.compare, BEAT.compareDur, (p) => {
      if (r1Ref.current && view.round1) r1Ref.current.textContent = String(Math.round(ease(p) * view.round1.percent))
      if (r2Ref.current) r2Ref.current.textContent = String(Math.round(ease(p) * view.percent))
    })
    tl.at(BEAT.done, () => setDoneOn(true))

    const stop = drive(tl)
    const skip = () => {
      tl.skip()
      anims.forEach((a) => a.finish())
      setCompareOn(true)
      setDoneOn(true)
    }
    skipFn.current = skip
    if (reduced) skip()
    const t = window.setTimeout(() => setSkipReady(true), SKIP_AFTER_MS)
    return () => {
      window.clearTimeout(t)
      stop()
      tl.cancel()
      anims.forEach((a) => a.cancel())
      skipFn.current = null
    }
    // view is derived from round2/round1; depend on its numbers so a re-render never restarts the animation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round2, view.percent, view.correct, view.round1?.percent])

  const onTap = () => {
    if (!doneOn && skipReady) skipFn.current?.()
  }

  return (
    <section className="accuracy" onPointerDown={onTap}>
      <p className="accuracy__label">8 new images it has never seen</p>
      <div className="accuracy__grid">
        {TEST_EXAMPLES.map((test, i) => {
          const p = round2.predictions[i]
          const pct = displayPercents(p.probs)[OUTPUTS.indexOf(p.predicted)]
          return (
            <div className="flip" key={test.id}>
              <div className="flip__inner" ref={(el) => (cardsRef.current[i] = el)}>
                <div className="flip__face flip__front">
                  <Card example={test} unseen size={160} />
                </div>
                <div className={`flip__face flip__back ${p.correct ? 'is-right' : 'is-wrong'}`}>
                  <img src={imageUrl(test)} alt="" draggable={false} />
                  <div className="flip__result">
                    <span className="flip__mark" aria-label={p.correct ? 'correct' : 'wrong'}>
                      {p.correct ? '✓' : '✗'}
                    </span>
                    <span className="flip__name">{p.predicted}</span>
                    <span className="flip__conf">{pct}%</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="accuracy__panel">
        <p className="accuracy__tag">
          Accuracy <i>Simulated</i>
        </p>
        <p className="accuracy__big">
          <span ref={bigRef}>0</span>
          <small>%</small>
        </p>
        <p className="accuracy__count">
          <b ref={countRef}>0</b> of {view.total} correct
        </p>

        <div className={`compare ${compareOn ? 'is-on' : ''}`}>
          {view.round1 ? (
            <>
              <span className="compare__item">
                Round 1: <b ref={r1Ref}>0</b>%
              </span>
              <span className="compare__to" aria-hidden="true">
                →
              </span>
            </>
          ) : null}
          <span className="compare__item is-now">
            Round 2: <b ref={r2Ref}>0</b>%
          </span>
          {view.trend ? <Arrow trend={view.trend} /> : null}
        </div>

        <div className={`accuracy__after ${doneOn ? 'is-on' : ''}`}>
          <p className="accuracy__note">Accuracy is how often the predictions are right.</p>
          <p className="accuracy__note is-strong">{view.note}</p>
          <Button className="accuracy__cta" onClick={() => dispatch({ type: 'ADVANCE' })} disabled={!doneOn}>
            Continue
          </Button>
        </div>
        {skipReady && !doneOn ? <p className="accuracy__hint">Tap to skip</p> : null}
      </div>
    </section>
  )
}
