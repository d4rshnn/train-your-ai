import { useEffect, useMemo, useRef, useState, type Dispatch, type MutableRefObject } from 'react'
import { getTrayRects } from '../../features/cards/trayHandoff'
import { imageUrl } from '../../features/cards/images'
import type { NetworkEngine } from '../../features/network/engine'
import { CAPTION_1, CAPTION_2, FEED_SIZE, feedX, feedY, startTrainingSequence, type Sequence } from '../../features/network/trainingSequence'
import { planTraining } from '../../features/network/training'
import { resolveSelection } from '../../features/sim/predict'
import { varietyScore } from '../../features/sim/score'
import { visualVariety } from '../../features/sim/visual'
import type { Action, Round } from '../../state/machine'
import './Training.css'

/** Round 2 runs at ~70% of the duration: the visitor has seen it already. */
export const ROUND_SPEED: Record<Round, number> = { 1: 1, 2: 1 / 0.7 }
/** After MODEL TRAINED appears, wait this long (real time) before moving on; a tap moves on at once. */
const HOLD_MS = 1500
const HOLD_AFTER_SKIP_MS = 700
/** Tap-to-skip only becomes available after this much real time. */
const SKIP_AFTER_MS = 2000

type Props = {
  round: Round
  selection: string[]
  dispatch: Dispatch<Action>
  engineRef: MutableRefObject<NetworkEngine | null>
}

export function Training({ round, selection, dispatch, engineRef }: Props) {
  const [caption, setCaption] = useState<1 | 2>(1)
  const [chip, setChip] = useState(false)
  const [stamp, setStamp] = useState(false)
  const [skipReady, setSkipReady] = useState(false)
  const feedRefs = useRef<(HTMLElement | null)[]>([])
  const docksRef = useRef<HTMLDivElement>(null)
  const pctRef = useRef<HTMLSpanElement>(null)
  const barRef = useRef<HTMLElement>(null)
  const seq = useRef<Sequence | null>(null)
  const advanced = useRef(false)
  const advanceTimer = useRef<number | undefined>(undefined)

  const cards = useMemo(() => resolveSelection(selection), [selection])
  // crispness of the end state comes from the remapped variety of this very selection
  const crisp = useMemo(() => visualVariety(varietyScore(cards)), [cards])

  const advance = () => {
    if (advanced.current) return
    advanced.current = true
    window.clearTimeout(advanceTimer.current)
    dispatch({ type: 'ANIM_DONE', stage: 'training' })
  }

  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    advanced.current = false
    const plan = planTraining(engine.layout, cards, crisp)
    const sequence = startTrainingSequence({
      engine,
      plan,
      speed: ROUND_SPEED[round],
      trayRects: getTrayRects(),
      ui: {
        feed: feedRefs.current,
        docks: docksRef.current!,
        setCaption,
        setChip,
        setProgress: (pct) => {
          if (pctRef.current) pctRef.current.textContent = String(Math.round(pct))
          if (barRef.current) barRef.current.style.transform = `scaleX(${pct / 100})`
        },
        setStamp,
        onSettled: () => {
          window.clearTimeout(advanceTimer.current)
          advanceTimer.current = window.setTimeout(advance, (seq.current?.skipped ?? true) ? HOLD_AFTER_SKIP_MS : HOLD_MS)
        },
      },
    })
    seq.current = sequence
    const t = window.setTimeout(() => setSkipReady(true), SKIP_AFTER_MS)
    return () => {
      window.clearTimeout(t)
      window.clearTimeout(advanceTimer.current)
      sequence.dispose()
      seq.current = null
    }
    // the sequence is started once per mount; round/selection are fixed while this screen is shown
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onTap = () => {
    if (stamp) return advance()
    if (skipReady && seq.current && !seq.current.skipped) seq.current.skip()
  }

  return (
    <section className="training" onPointerDown={onTap}>
      <div className="training__feed" aria-hidden="true">
        {cards.map((c, i) => (
          <div key={c.id} className="feed__slot" style={{ left: feedX(i), top: feedY(i), width: FEED_SIZE, height: FEED_SIZE }}>
            <div className="feed__card" ref={(el) => (feedRefs.current[i] = el)}>
              <img src={imageUrl(c)} alt="" draggable={false} />
              <span className={`feed__label ${c.label === 'cat' ? 'is-cat' : ''}`}>{c.label === 'cat' ? 'CAT' : 'NOT'}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="training__docks" ref={docksRef} aria-hidden="true" />

      <div className="training__panel">
        <div className={`training__chip ${chip ? 'is-on' : ''}`}>
          <i /> Training
        </div>
        <div className={`training__pct ${chip ? 'is-on' : ''}`} aria-live="off">
          <span ref={pctRef}>0</span>
          <small>%</small>
        </div>
        <div className={`training__bar ${chip ? 'is-on' : ''}`}>
          <i ref={barRef} />
        </div>
        <p className={`training__caption ${stamp ? 'is-off' : ''}`} key={caption}>
          {caption === 1 ? CAPTION_1 : CAPTION_2}
        </p>
        <div className={`training__stamp ${stamp ? 'is-on' : ''}`} role="status">
          <svg viewBox="0 0 48 48" width="44" height="44" aria-hidden="true">
            <circle cx="24" cy="24" r="21" />
            <path d="M14 25l7 7 13-15" />
          </svg>
          <strong>Model trained</strong>
          <p>It learned patterns from the examples it was given.</p>
        </div>
        {skipReady && !stamp ? <p className="training__hint">Tap to skip</p> : null}
      </div>
    </section>
  )
}
