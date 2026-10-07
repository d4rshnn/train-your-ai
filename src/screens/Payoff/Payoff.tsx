import { useEffect, useMemo, useRef, useState, type Dispatch } from 'react'
import { TEST_EXAMPLES } from '../../data/examples'
import { Button } from '../../components/Button'
import { CatIcon } from '../../components/CatIcon'
import { DomainChips } from '../../components/DomainChips'
import { Card } from '../../features/cards/Card'
import { imageUrl } from '../../features/cards/images'
import { displayPercents, OUTPUTS } from '../../features/network/inference'
import { buildLayout } from '../../features/network/layout'
import { NET_H, NET_W } from '../../features/network/placement'
import { drive, Timeline } from '../../features/network/timeline'
import { planTraining } from '../../features/network/training'
import { BEAT, CLOSING, DEFINITIONS, HONEST_NOTE, PIPELINE_LABELS, pileOrder, SIGNPOST, stageTime } from '../../features/payoff/content'
import { MiniNetwork } from '../../features/payoff/MiniNetwork'
import { resolveSelection } from '../../features/sim/predict'
import { varietyScore } from '../../features/sim/score'
import { visualVariety } from '../../features/sim/visual'
import type { SimResult } from '../../features/sim/types'
import type { Action } from '../../state/machine'
import './Payoff.css'

const HERO = TEST_EXAMPLES[0]
const SKIP_AFTER_MS = 1500

/** Stage geometry (px): five tiles in a row with the travelling pulse along their centre line. */
const TILE = { w: 190, h: 170, y: 132 }
const GAP = (1270 - 5 * TILE.w) / 4
const tileX = (i: number) => 48 + i * (TILE.w + GAP)
const LINE_Y = TILE.y + TILE.h / 2
const LINE_X0 = tileX(0) + TILE.w / 2
const LINE_X1 = tileX(4) + TILE.w / 2

const ease = (p: number) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2)

type Props = { selection: string[]; result: SimResult; dispatch: Dispatch<Action> }

/** S8. The visitor's own run, as a pipeline: their cards -> network learns -> trained model -> new data -> prediction. */
export function Payoff({ selection, result, dispatch }: Props) {
  const cards = useMemo(() => resolveSelection(selection), [selection])
  const prediction = result.featured
  const percents = displayPercents(prediction.probs)
  const winner = OUTPUTS.indexOf(prediction.predicted)
  const good = prediction.correct

  // the spine of edges that this very selection strengthened, so the mini network shows the visitor's own training
  const spine = useMemo(() => {
    const layout = buildLayout(NET_W, NET_H)
    return planTraining(layout, cards, visualVariety(varietyScore(cards))).spine
  }, [cards])

  const [lit, setLit] = useState(0) // how many stages the pulse has reached
  const [defs, setDefs] = useState(0) // how many definition cards are shown
  const [closing, setClosing] = useState(false)
  const [done, setDone] = useState(false)
  const [skipReady, setSkipReady] = useState(false)
  const pulseRef = useRef<HTMLDivElement>(null)
  const fillRef = useRef<HTMLDivElement>(null)
  const skipFn = useRef<(() => void) | null>(null)

  useEffect(() => {
    const tl = new Timeline(1)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const setX = (x: number) => {
      if (pulseRef.current) pulseRef.current.style.transform = `translate(${x - LINE_X0}px, 0)`
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${(x - LINE_X0) / (LINE_X1 - LINE_X0)})`
    }
    // the pulse crosses the whole row; each stage lights (and its label appears) as the pulse reaches it
    tl.tween(BEAT.pulseStart, BEAT.pulseDur, (p) => setX(LINE_X0 + ease(p) * (LINE_X1 - LINE_X0)))
    PIPELINE_LABELS.forEach((_, i) => tl.at(stageTime(i) - 0.15, () => setLit((n) => Math.max(n, i + 1))))
    DEFINITIONS.forEach((_, i) => tl.at(BEAT.defs + i * BEAT.defStagger, () => setDefs(i + 1)))
    tl.at(BEAT.closing, () => setClosing(true))
    tl.at(BEAT.done, () => setDone(true))

    const stop = drive(tl)
    const skip = () => {
      tl.skip()
      setX(LINE_X1)
      setLit(PIPELINE_LABELS.length)
      setDefs(DEFINITIONS.length)
      setClosing(true)
      setDone(true)
    }
    skipFn.current = skip
    if (reduced) skip()
    const t = window.setTimeout(() => setSkipReady(true), SKIP_AFTER_MS)
    return () => {
      window.clearTimeout(t)
      stop()
      tl.cancel()
      skipFn.current = null
    }
  }, [])

  const onTap = () => {
    if (!done && skipReady) skipFn.current?.()
  }

  const tile = (i: number) => ({ left: tileX(i), top: TILE.y, width: TILE.w, height: TILE.h })

  return (
    <section className="payoff" onPointerDown={onTap}>
      <div className="payoff__line" style={{ left: LINE_X0, top: LINE_Y, width: LINE_X1 - LINE_X0 }} aria-hidden="true">
        <div ref={fillRef} className="payoff__fill" />
      </div>
      <div ref={pulseRef} className={`payoff__pulse ${done ? 'is-done' : ''}`} style={{ left: LINE_X0, top: LINE_Y }} aria-hidden="true" />

      {/* 1. their chosen cards, stacked */}
      <div className={`stage-tile ${lit > 0 ? 'is-on' : ''}`} style={tile(0)}>
        <div className="pile">
          {pileOrder(cards).map((c, i) => (
            <img key={c.id} src={imageUrl(c)} alt="" draggable={false} style={{ left: i * 9, transform: `rotate(${(i - 4.5) * 1.6}deg)`, zIndex: i }} />
          ))}
        </div>
      </div>

      {/* 2. the network that learned from them */}
      <div className={`stage-tile ${lit > 1 ? 'is-on' : ''}`} style={tile(1)}>
        <MiniNetwork spine={spine} lit={lit > 1} width={TILE.w - 24} height={((TILE.w - 24) * NET_H) / NET_W} />
      </div>

      {/* 3. trained model chip */}
      <div className={`stage-tile ${lit > 2 ? 'is-on' : ''}`} style={tile(2)}>
        <div className="chip-model">
          <svg viewBox="0 0 48 48" width="52" height="52" aria-hidden="true">
            <circle cx="24" cy="24" r="21" />
            <path d="M14 25l7 7 13-15" />
          </svg>
          <b>Model</b>
          <span>trained</span>
        </div>
      </div>

      {/* 4. the new image (the black cat) */}
      <div className={`stage-tile ${lit > 3 ? 'is-on' : ''}`} style={tile(3)}>
        <Card example={HERO} size={140} />
      </div>

      {/* 5. what the model predicted */}
      <div className={`stage-tile ${lit > 4 ? 'is-on' : ''}`} style={tile(4)}>
        <div className={`chip-pred ${good ? 'is-good' : 'is-poor'}`}>
          {prediction.predicted === 'cat' ? <CatIcon size={44} /> : null}
          <b>{prediction.predicted.toUpperCase()}</b>
          <span>{percents[winner]}%</span>
        </div>
      </div>

      {PIPELINE_LABELS.map((label, i) => (
        <p key={label} className={`stage-label ${lit > i ? 'is-on' : ''}`} style={{ left: tileX(i) - GAP / 2 + 10, width: TILE.w + GAP - 20, top: TILE.y + TILE.h + 16 }}>
          {label}
        </p>
      ))}

      <div className="defs" aria-label="Key terms">
        {DEFINITIONS.map((d, i) => (
          <div key={d.term} className={`def ${defs > i ? 'is-on' : ''}`}>
            <b>{d.term}</b>
            <span>{d.text}</span>
          </div>
        ))}
      </div>

      <h2 className={`payoff__closing ${closing ? 'is-on' : ''}`}>{CLOSING}</h2>
      <div className={`payoff__signpost ${closing ? 'is-on' : ''}`}>
        <span>{SIGNPOST}</span>
        <DomainChips onlyOthers />
      </div>
      <p className={`payoff__note ${closing ? 'is-on' : ''}`}>{HONEST_NOTE}</p>

      <Button className={`payoff__restart ${done ? 'is-on' : ''}`} onClick={() => dispatch({ type: 'RESTART' })} disabled={!done} aria-hidden={!done}>
        ↺ Restart
      </Button>
      {skipReady && !done ? <p className="payoff__hint">Tap to skip</p> : null}
    </section>
  )
}
