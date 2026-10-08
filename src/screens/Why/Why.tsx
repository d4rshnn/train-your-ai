import { useEffect, useMemo, useRef, useState } from 'react'
import { TEST_EXAMPLES, type Example } from '../../data/examples'
import { NextPrompt } from '../../components/NextPrompt'
import { Card } from '../../features/cards/Card'
import { similarGroups } from '../../features/cards/groups'
import { imageUrl } from '../../features/cards/images'
import { MemoryMap } from '../../features/map/MemoryMap'
import { resolveSelection } from '../../features/sim/predict'
import type { SimResult } from '../../features/sim/types'
import { guessWord, mapCaption, sureAboutCat, WHY, WHY_READY_MS, WHY_SKIP_AFTER_MS, whyVariant } from '../../features/why/copy'
import './Why.css'

const HERO = TEST_EXAMPLES[0]

type Props = { selection: string[]; yours: SimResult; onContinue: () => void }

function Thumb({ card, style }: { card: Example; style?: React.CSSProperties }) {
  return (
    <span className={`thumb ${card.label === 'cat' ? 'is-cat' : 'is-notcat'}`} style={style}>
      <img src={imageUrl(card)} alt="" draggable={false} />
    </span>
  )
}

/**
 * "Why?" (replaces the old Struggle screen). Plain words about what the AI saw and what it guessed. No decision here:
 * the memory map shows where the new cat landed; once it has played it waits for a click on "Click for next"; a click while it plays (after 1.5 s) jumps to the finished picture.
 */
export function Why({ selection, yours, onContinue }: Props) {
  const cards = useMemo(() => resolveSelection(selection), [selection])
  const { stacks, singles } = useMemo(() => similarGroups(cards), [cards])
  const newCat = useMemo(() => ({ id: yours.featured.testId, pCat: yours.featured.probs.cat }), [yours])
  const variant = whyVariant(yours)
  const copy = WHY[variant]
  const [ready, setReady] = useState(false)
  const [skipReady, setSkipReady] = useState(false)
  const [finished, setFinished] = useState(false)
  const done = useRef(false)

  const go = () => {
    if (done.current) return
    done.current = true
    onContinue()
  }

  // the screen plays (the new cat flies in and lands), then waits for a click on the prompt
  useEffect(() => {
    done.current = false
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const r = window.setTimeout(() => setReady(true), reduced ? 0 : WHY_READY_MS)
    const skip = window.setTimeout(() => setSkipReady(true), WHY_SKIP_AFTER_MS)
    return () => {
      window.clearTimeout(r)
      window.clearTimeout(skip)
    }
  }, [])

  // a click while the map is still playing jumps it to its finished picture; it never also moves on
  const onTap = () => {
    if (ready || !skipReady) return
    setFinished(true)
    setReady(true)
  }

  return (
    <section className="why" onPointerDown={onTap}>
      <div className="why__test">
        <Card example={HERO} size={220} />
        <p className={`why__result ${yours.featured.correct ? 'is-good' : 'is-poor'}`}>{sureAboutCat(yours)}</p>
        <p className="why__tag">Its guess: {guessWord(yours)}</p>
      </div>

      <div className="why__main">
        <h2>{copy.headline}</h2>

        <div className="picks" aria-label="Your 10 examples">
          {stacks.map((stack) => (
            <div className="picks__stack" key={stack[0].id}>
              <div className="picks__fan" style={{ width: 56 + (stack.length - 1) * 16 }}>
                {stack.map((c, i) => (
                  <Thumb key={c.id} card={c} style={{ left: i * 16, zIndex: i, transform: `rotate(${(i - (stack.length - 1) / 2) * 4}deg)` }} />
                ))}
              </div>
              <p className="picks__label">
                Very similar <b>×{stack.length}</b>
              </p>
            </div>
          ))}
          {singles.map((c) => (
            <Thumb key={c.id} card={c} />
          ))}
        </div>

        <div className="why__body">
          <div className="why__text">
            <p className="why__analogy">{copy.analogy}</p>
            <p className="why__sub">{copy.sub}</p>
            <p className="why__mapcap">{mapCaption(variant)}</p>
          </div>
          <div className="why__map">
            <MemoryMap ids={selection} test={newCat} stagger={0.12} growAfter={1.6} testDelay={2.4} newLabel finished={finished} />
          </div>
        </div>
      </div>
      <NextPrompt ready={ready} onNext={go} />
    </section>
  )
}
