import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import { TEST_EXAMPLES } from '../../data/examples'
import { CatIcon } from '../../components/CatIcon'
import { Card } from '../../features/cards/Card'
import type { NetworkEngine } from '../../features/network/engine'
import { displayPercents, OUTPUTS, planInference } from '../../features/network/inference'
import { CAPTION_NEW, startTestSequence, sureCaption, TEST_CARD } from '../../features/network/testSequence'
import type { Sequence } from '../../features/network/trainingSequence'
import type { SimResult } from '../../features/sim/types'
import './Test.css'

const HERO = TEST_EXAMPLES[0]
const GUESS_WORD = { cat: 'cat', dog: 'dog', other: 'something else' } as const
/** Real time to let the verdict sink in before moving on (a tap moves on at once). */
const HOLD_MS = 2200
const HOLD_AFTER_SKIP_MS = 1000
const SKIP_AFTER_MS = 1500
const CONDENSED_HOLD_MS = 700

type Props = {
  result: SimResult
  /** 1 for the visitor's own run; 2 for the what-if replay. */
  speed?: number
  onDone: () => void
  engineRef: MutableRefObject<NetworkEngine | null>
}

export function Test({ result, speed = 1, onDone, engineRef }: Props) {
  const prediction = result.featured
  const percents = useMemo(() => displayPercents(prediction.probs), [prediction])
  const [caption, setCaption] = useState<'new' | 'done'>('new')
  const [barsOn, setBarsOn] = useState(false)
  const [verdictOn, setVerdictOn] = useState(false)
  const [skipReady, setSkipReady] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const fillRefs = useRef<(HTMLElement | null)[]>([])
  const numRefs = useRef<(HTMLElement | null)[]>([])
  const seq = useRef<Sequence | null>(null)
  const advanced = useRef(false)
  const timer = useRef<number | undefined>(undefined)

  const advance = () => {
    if (advanced.current) return
    advanced.current = true
    window.clearTimeout(timer.current)
    onDone()
  }

  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    advanced.current = false
    const sequence = startTestSequence({
      engine,
      plan: planInference(engine.layout, HERO, prediction),
      prediction,
      speed,
      ui: {
        card: cardRef.current,
        setCaption,
        showBars: () => setBarsOn(true),
        setBars: (p) =>
          percents.forEach((pct, i) => {
            const fill = fillRefs.current[i]
            const num = numRefs.current[i]
            if (fill) fill.style.transform = `scaleX(${(p * pct) / 100})`
            if (num) num.textContent = String(Math.round(p * pct))
          }),
        showVerdict: () => setVerdictOn(true),
        onSettled: () => {
          window.clearTimeout(timer.current)
          timer.current = window.setTimeout(advance, (seq.current?.skipped ?? true) ? HOLD_AFTER_SKIP_MS : speed > 1 ? CONDENSED_HOLD_MS : HOLD_MS)
        },
      },
    })
    seq.current = sequence
    const t = window.setTimeout(() => setSkipReady(true), SKIP_AFTER_MS)
    return () => {
      window.clearTimeout(t)
      window.clearTimeout(timer.current)
      sequence.dispose()
      seq.current = null
    }
    // started once per mount; the result and speed are fixed while this screen is shown
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onTap = () => {
    if (verdictOn) return advance()
    if (skipReady && seq.current && !seq.current.skipped) seq.current.skip()
  }

  const good = prediction.correct
  const winner = OUTPUTS.indexOf(prediction.predicted)

  return (
    <section className="test" onPointerDown={onTap}>
      <div className="test__chip">
        <i /> Test
      </div>

      <div ref={cardRef} className="test__card" style={{ left: TEST_CARD.x, top: TEST_CARD.y }}>
        <Card example={HERO} unseen size={TEST_CARD.size} />
        <p className="test__tag">New image — never seen before</p>
      </div>

      <p className="test__caption" key={caption}>
        {caption === 'new' ? CAPTION_NEW : sureCaption(percents[0])}
      </p>

      <div className={`test__bars ${barsOn ? 'is-on' : ''}`}>
        <p className="test__sim">How sure (simulated)</p>
        {OUTPUTS.map((name, i) => (
          <div className={`bar ${verdictOn && i === winner ? 'is-win' : ''} ${verdictOn && i === winner && !good ? 'is-poor' : ''}`} key={name}>
            <span className="bar__name">{name}</span>
            <span className="bar__track">
              <i ref={(el) => (fillRefs.current[i] = el)} />
            </span>
            <span className="bar__num">
              <b ref={(el) => (numRefs.current[i] = el)}>0</b>%
            </span>
          </div>
        ))}
      </div>

      <div className={`test__verdict ${verdictOn ? 'is-on' : ''} ${good ? 'is-good' : 'is-poor'}`} role="status">
        {good ? <CatIcon size={26} /> : null}
        <span className="verdict__text">
          <b>{percents[0]}% sure it&apos;s a cat</b>
          <small>Its guess: {GUESS_WORD[prediction.predicted]}</small>
        </span>
      </div>
      {skipReady && !verdictOn ? <p className="test__hint">Tap to skip</p> : null}
    </section>
  )
}
