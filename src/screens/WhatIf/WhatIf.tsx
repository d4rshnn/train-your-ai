import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import { Button } from '../../components/Button'
import { imageUrl } from '../../features/cards/images'
import type { NetworkEngine } from '../../features/network/engine'
import { displayPercents, OUTPUTS } from '../../features/network/inference'
import { drive, Timeline } from '../../features/network/timeline'
import type { Alternate } from '../../features/sim/alternate'
import { resolveSelection } from '../../features/sim/predict'
import type { SimResult } from '../../features/sim/types'
import { arrowLabel, compareLine, introLine, titles, trendOf, WHATIF_HEADLINE, WHATIF_AFTER_SKIP_MS, WHATIF_HOLD_MS, WHATIF_SKIP_AFTER_MS, type Trend } from '../../features/whatif/copy'
import { Test } from '../Test/Test'
import { CONDENSED_SPEED, Training } from '../Training/Training'
import './WhatIf.css'

type Props = {
  /** The visitor's own picks and what they produced. */
  selection: string[]
  yours: SimResult
  /** The other selection (more variety, or only very similar cats) and what it produces. */
  alternate: Alternate
  other: SimResult
  engineRef: MutableRefObject<NetworkEngine | null>
  /** The persistent network is hidden while the side-by-side is shown. */
  onNetworkHidden: (hidden: boolean) => void
  onContinue: () => void
}

type Phase = 'train' | 'test' | 'compare'

const ease = (p: number) => 1 - Math.pow(1 - p, 3)

function Arrow({ trend }: { trend: Trend }) {
  const rot = trend === 'up' ? 0 : trend === 'down' ? 180 : 90
  return (
    <svg className={`wi-arrow is-${trend}`} viewBox="0 0 24 24" width="64" height="64" aria-hidden="true" style={{ transform: `rotate(${rot}deg)` }}>
      <circle cx="12" cy="12" r="11" />
      <path d="M12 18V7M7 11.5L12 6.5l5 5" />
    </svg>
  )
}

/**
 * What if... The same AI replays with the other selection (condensed 2x: the very same Training and Test screens),
 * then both outcomes are shown side by side. No input needed; CONTINUE after the count-up, or it moves on by itself.
 */
export function WhatIf({ selection, yours, alternate, other, engineRef, onNetworkHidden, onContinue }: Props) {
  const [phase, setPhase] = useState<Phase>('train')

  useEffect(() => {
    onNetworkHidden(phase === 'compare')
    return () => onNetworkHidden(false)
  }, [phase, onNetworkHidden])

  return (
    <section className="whatif">
      {phase !== 'compare' ? (
        <>
          <p className="whatif__intro" role="status">
            <i>What if</i>
            {introLine(alternate.direction)}
          </p>
          {phase === 'train' ? (
            <Training key="t" selection={alternate.ids} speed={CONDENSED_SPEED} fromTray={false} engineRef={engineRef} onDone={() => setPhase('test')} />
          ) : (
            <Test key="s" result={other} speed={CONDENSED_SPEED} engineRef={engineRef} onDone={() => setPhase('compare')} />
          )}
        </>
      ) : (
        <Compare selection={selection} yours={yours} alternate={alternate} other={other} onContinue={onContinue} />
      )}
    </section>
  )
}

type Tone = 'plain' | 'up' | 'down'

function Side({ title, ids, result, refs, tone }: { title: string; ids: string[]; result: SimResult; refs: SideRefs; tone: Tone }) {
  const cards = useMemo(() => resolveSelection(ids), [ids])
  const percents = displayPercents(result.featured.probs)
  return (
    <div className={`wi-side is-${tone}`} ref={refs.root}>
      <h3>{title}</h3>
      <div className="wi-thumbs" aria-hidden="true">
        {cards.map((c) => (
          <img key={c.id} src={imageUrl(c)} alt="" draggable={false} />
        ))}
      </div>
      <p className="wi-count">
        <b ref={refs.count}>0</b>
        <span> of {result.predictions.length} correct</span>
      </p>
      <p className="wi-sure">How sure it was about the new cat (simulated)</p>
      <div className="wi-bars">
        {OUTPUTS.map((name, i) => (
          <div className="wi-bar" key={name}>
            <span className="wi-bar__name">{name}</span>
            <span className="wi-bar__track">
              <i ref={(el) => (refs.fills.current[i] = el)} data-pct={percents[i]} />
            </span>
            <span className="wi-bar__num">
              <b ref={(el) => (refs.nums.current[i] = el)}>0</b>%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

type SideRefs = { root: React.RefObject<HTMLDivElement>; count: React.RefObject<HTMLElement>; fills: React.MutableRefObject<(HTMLElement | null)[]>; nums: React.MutableRefObject<(HTMLElement | null)[]> }
const useSideRefs = (): SideRefs => ({ root: useRef<HTMLDivElement>(null), count: useRef<HTMLElement>(null), fills: useRef<(HTMLElement | null)[]>([]), nums: useRef<(HTMLElement | null)[]>([]) })

function Compare({ selection, yours, alternate, other, onContinue }: Pick<Props, 'selection' | 'yours' | 'alternate' | 'other' | 'onContinue'>) {
  const left = useSideRefs()
  const right = useSideRefs()
  const [arrowOn, setArrowOn] = useState(false)
  const [doneOn, setDoneOn] = useState(false)
  const [skipReady, setSkipReady] = useState(false)
  const skipFn = useRef<(() => void) | null>(null)
  const finished = useRef(false)
  const afterSkip = useRef<number | undefined>(undefined)

  const t = titles(alternate.direction)
  const trend = trendOf(yours.correctCount, other.correctCount)
  const diff = Math.abs(other.correctCount - yours.correctCount)

  const go = () => {
    if (finished.current) return
    finished.current = true
    onContinue()
  }

  useEffect(() => {
    finished.current = false
    const tl = new Timeline(1)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const paint = (side: SideRefs, result: SimResult, p: number) => {
      const pct = displayPercents(result.featured.probs)
      if (side.count.current) side.count.current.textContent = String(Math.round(p * result.correctCount))
      pct.forEach((v, i) => {
        const fill = side.fills.current[i]
        const num = side.nums.current[i]
        if (fill) fill.style.transform = `scaleX(${(p * v) / 100})`
        if (num) num.textContent = String(Math.round(p * v))
      })
    }
    // yours first, then the alternate, then the arrow
    tl.tween(0.5, 1.3, (p) => paint(left, yours, ease(p)))
    tl.tween(1.9, 1.3, (p) => paint(right, other, ease(p)))
    tl.at(3.4, () => setArrowOn(true))
    tl.at(4.0, () => setDoneOn(true))
    tl.at(4.0 + WHATIF_HOLD_MS / 1000, go)
    const stop = drive(tl)
    const skip = () => {
      tl.skip() // fires everything left, including the automatic move-on, so hold it back
    }
    skipFn.current = () => {
      finished.current = true // hold back the automatic move-on that skip() would otherwise fire right now
      skip()
      finished.current = false
      setArrowOn(true)
      setDoneOn(true)
      // after a skip (or with reduced motion) nothing else would move the screen on, so give it a moment, then go
      window.clearTimeout(afterSkip.current)
      afterSkip.current = window.setTimeout(go, WHATIF_AFTER_SKIP_MS)
    }
    if (reduced) skipFn.current()
    const s = window.setTimeout(() => setSkipReady(true), WHATIF_SKIP_AFTER_MS)
    return () => {
      window.clearTimeout(s)
      window.clearTimeout(afterSkip.current)
      stop()
      tl.cancel()
      skipFn.current = null
    }
    // the comparison is computed once per mount from fixed results
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onTap = () => {
    if (!skipReady) return
    if (doneOn) go()
    else skipFn.current?.()
  }

  return (
    <div className="wi-compare" onPointerDown={onTap}>
      <h2 className="wi-headline">{WHATIF_HEADLINE}</h2>
      <p className={`wi-line ${doneOn ? 'is-on' : ''}`}>{compareLine(trend, alternate.direction)}</p>

      <Side title={t.yours} ids={selection} result={yours} refs={left} tone="plain" />
      <div className={`wi-mid ${arrowOn ? 'is-on' : ''}`}>
        <Arrow trend={trend} />
        <span className={`wi-mid__label is-${trend}`}>{arrowLabel(trend, diff)}</span>
      </div>
      <Side title={t.other} ids={alternate.ids} result={other} refs={right} tone={trend === 'up' ? 'up' : 'down'} />

      <div className={`wi-foot ${doneOn ? 'is-on' : ''}`}>
        <span className="wi-sim">Simulated</span>
        <Button onClick={go} disabled={!doneOn} className="whatif__continue">
          Continue
        </Button>
      </div>
      {skipReady && !doneOn ? <p className="wi-hint">Tap to skip</p> : null}
    </div>
  )
}
