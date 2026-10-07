import { useEffect, useMemo, useRef, useState } from 'react'
import { TEST_EXAMPLES, type Example } from '../../data/examples'
import { Button } from '../../components/Button'
import { Card } from '../../features/cards/Card'
import { similarGroups } from '../../features/cards/groups'
import { imageUrl } from '../../features/cards/images'
import { MemoryMap } from '../../features/map/MemoryMap'
import { resolveSelection } from '../../features/sim/predict'
import type { SimResult } from '../../features/sim/types'
import { guessWord, mapCaption, sureAboutCat, WHY, WHY_AUTO_MS, WHY_SKIP_AFTER_MS, whyVariant } from '../../features/why/copy'
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
 * the memory map shows where the new cat landed; it moves on by itself after ~8 s; a tap (after 1.5 s) or the Continue button moves on at once.
 */
export function Why({ selection, yours, onContinue }: Props) {
  const cards = useMemo(() => resolveSelection(selection), [selection])
  const { stacks, singles } = useMemo(() => similarGroups(cards), [cards])
  const newCat = useMemo(() => ({ id: yours.featured.testId, pCat: yours.featured.probs.cat }), [yours])
  const variant = whyVariant(yours)
  const copy = WHY[variant]
  const [skipReady, setSkipReady] = useState(false)
  const done = useRef(false)

  const go = () => {
    if (done.current) return
    done.current = true
    onContinue()
  }

  useEffect(() => {
    done.current = false
    const auto = window.setTimeout(go, WHY_AUTO_MS)
    const skip = window.setTimeout(() => setSkipReady(true), WHY_SKIP_AFTER_MS)
    return () => {
      window.clearTimeout(auto)
      window.clearTimeout(skip)
    }
    // runs once per mount; onContinue is stable for the life of this screen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <section className="why" onPointerDown={() => skipReady && go()}>
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
            <p className="why__sub">{copy.sub}</p>
            <p className="why__analogy">{copy.analogy}</p>
            <p className="why__mapcap">{mapCaption(variant)}</p>
            <div className="why__continue">
              <Button variant="ghost" className="why__continue-btn" onClick={go}>
                Continue →
              </Button>
              <span className="why__auto" aria-hidden="true">
                <i style={{ animationDuration: `${WHY_AUTO_MS}ms` }} />
              </span>
              {skipReady ? <p className="why__hint">Tap to continue</p> : null}
            </div>
          </div>
          <div className="why__map">
            <MemoryMap ids={selection} test={newCat} stagger={0.12} growAfter={1.6} testDelay={2.4} newLabel />
          </div>
        </div>
      </div>
    </section>
  )
}
