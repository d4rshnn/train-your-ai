import { useMemo, type Dispatch } from 'react'
import { TEST_EXAMPLES, type Example } from '../../data/examples'
import { Button } from '../../components/Button'
import { Card } from '../../features/cards/Card'
import { imageUrl } from '../../features/cards/images'
import { similarGroups } from '../../features/cards/groups'
import { displayPercents, OUTPUTS } from '../../features/network/inference'
import { resolveSelection } from '../../features/sim/predict'
import type { SimResult } from '../../features/sim/types'
import type { Action } from '../../state/machine'
import './Struggle.css'

const HERO = TEST_EXAMPLES[0]

type Props = { selection: string[]; result: SimResult; dispatch: Dispatch<Action> }

function Mini({ card, style }: { card: Example; style?: React.CSSProperties }) {
  return (
    <div className="mini" style={style}>
      <img src={imageUrl(card)} alt="" draggable={false} />
      <span className={`mini__label ${card.label === 'cat' ? 'is-cat' : ''}`}>{card.label === 'cat' ? 'CAT' : 'NOT'}</span>
    </div>
  )
}

/** S6. Poor result: "It didn't see enough variety." Good-first variant: "Nice, that was a great mix." */
export function Struggle({ selection, result, dispatch }: Props) {
  const cards = useMemo(() => resolveSelection(selection), [selection])
  const { stacks, singles } = useMemo(() => similarGroups(cards), [cards])
  const prediction = result.featured
  const good = prediction.correct
  const percents = displayPercents(prediction.probs)
  const idx = OUTPUTS.indexOf(prediction.predicted)

  return (
    <section className="struggle">
      <div className="struggle__test">
        <Card example={HERO} size={220} />
        <p className={`struggle__result ${good ? 'is-good' : 'is-poor'}`}>
          {good ? '✓' : '✗'} {prediction.predicted === 'cat' ? 'CAT' : prediction.predicted.toUpperCase()} {percents[idx]}%
        </p>
        <p className="struggle__tag">The new image</p>
      </div>

      <div className="struggle__main">
        {good ? (
          <>
            <h2>Nice, that was a great mix.</h2>
            <p className="struggle__sub">Now try the opposite — what if all your examples were alike?</p>
          </>
        ) : (
          <>
            <h2>It didn&apos;t see enough variety.</h2>
            <p className="struggle__sub">
              {stacks.length ? (
                <>
                  Your examples were too alike, so it hadn&apos;t learned what <em>other</em> cats look like.
                </>
              ) : (
                <>
                  It hadn&apos;t seen cats that look like this one, so it hadn&apos;t learned what <em>other</em> cats look like.
                </>
              )}
            </p>
          </>
        )}

        <p className="struggle__label">What you taught it</p>
        <div className="strip" aria-label="Your 10 training examples">
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

        <Button className="struggle__cta" onClick={() => dispatch({ type: 'IMPROVE' })}>
          {good ? 'Break it on purpose' : 'Improve training data'}
        </Button>
      </div>
    </section>
  )
}
