import { useEffect, useMemo, useRef, useState } from 'react'
import { TEST_EXAMPLES, type Example } from '../../data/examples'
import { Button } from '../../components/Button'
import { Card } from '../../features/cards/Card'
import { similarGroups } from '../../features/cards/groups'
import { imageUrl } from '../../features/cards/images'
import { resolveSelection } from '../../features/sim/predict'
import type { SimResult } from '../../features/sim/types'
import { guessWord, sureAboutCat, WHY, WHY_AUTO_MS, WHY_SKIP_AFTER_MS, whyVariant } from '../../features/why/copy'
import './Why.css'

const HERO = TEST_EXAMPLES[0]

type Props = { selection: string[]; yours: SimResult; onContinue: () => void }

function Mini({ card, style }: { card: Example; style?: React.CSSProperties }) {
  return (
    <div className="mini" style={style}>
      <img src={imageUrl(card)} alt="" draggable={false} />
      <span className={`mini__label ${card.label === 'cat' ? 'is-cat' : ''}`}>{card.label === 'cat' ? 'CAT' : 'NOT'}</span>
    </div>
  )
}

/**
 * "Why?" (replaces the old Struggle screen). Plain words about what the AI saw and what it guessed. No decision here:
 * it moves on by itself after ~8 s; a tap (after 1.5 s) or the Continue button moves on at once.
 */
export function Why({ selection, yours, onContinue }: Props) {
  const cards = useMemo(() => resolveSelection(selection), [selection])
  const { stacks, singles } = useMemo(() => similarGroups(cards), [cards])
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
        <p className="why__sub">{copy.sub}</p>
        <p className="why__analogy">{copy.analogy}</p>

        <p className="why__label">What you gave it</p>
        <div className={`strip ${singles.length > 7 ? 'strip--compact' : ''}`} aria-label="Your 10 examples">
          {stacks.map((stack) => (
            <div className="stack" key={stack[0].id}>
              <div className="stack__fan" style={{ width: 108 + (stack.length - 1) * 28 }}>
                {stack.map((c, i) => (
                  <Mini key={c.id} card={c} style={{ left: i * 28, transform: `rotate(${(i - (stack.length - 1) / 2) * 5}deg)`, zIndex: i }} />
                ))}
              </div>
              <p className="stack__label">
                Very similar <b>×{stack.length}</b>
              </p>
            </div>
          ))}
          {singles.map((c) => (
            <div className="single" key={c.id}>
              <Mini card={c} />
            </div>
          ))}
        </div>

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
    </section>
  )
}
