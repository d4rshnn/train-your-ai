import type { CSSProperties, Dispatch } from 'react'
import { TRAINING_EXAMPLES } from '../../data/examples'
import { imageUrl } from '../../features/cards/images'
import type { Action } from '../../state/machine'
import { useScreenClock } from '../useScreenClock'
import './Rules.css'

/** Beats in seconds (see RULES_PHASES). The screen ends at RULES_END_SEC, under the 14 s ceiling. */
const PHASE_AT = [0.3, 2.3, 3.2, 4.9, 6.5, 7.3, 8.9, 10.1] as const
export const RULES_END_SEC = 13.4

export const RULES_COPY = {
  headline: 'Can you write rules for “cat”?',
  checklist: ['Pointy ears', 'Whiskers', 'Fur'],
  foxCaption: 'Pointy ears? A fox has them.',
  catCaption: 'Whiskers? Not always visible.',
  foxVerdict: 'Checklist says: cat',
  catVerdict: 'Checklist says: not a cat',
  foxTruth: 'It is a fox.',
  catTruth: 'It is a cat, lying down.',
  closing: 'Rules break. So we show it examples instead.',
} as const

/** Existing photos only: a fox passes the checklist wrongly; a cat lying down (ears clear, whiskers hard to see) fails it on whiskers alone. */
const FOX = TRAINING_EXAMPLES.find((e) => e.id === 'train-18')!
const SLEEPER = TRAINING_EXAMPLES.find((e) => e.id === 'train-02')!

const tick = (ok: boolean) => (ok ? '✓' : '✗')

/** "Rules don't work". A checklist for "cat" is fooled both ways. About 13 s; a tap skips after 1.5 s. */
export function Rules({ dispatch }: { dispatch: Dispatch<Action> }) {
  const { phase, onTap } = useScreenClock(PHASE_AT, RULES_END_SEC, () => dispatch({ type: 'ADVANCE' }))
  const showCat = phase >= 5
  const photo = showCat ? SLEEPER : FOX
  const marks = showCat ? [true, false, true] : [true, true, true]
  const marksOn = showCat ? phase >= 6 : phase >= 3
  const verdictOn = showCat ? phase >= 7 : phase >= 4
  const closing = phase >= 8

  return (
    <section className="rules" onPointerDown={onTap}>
      <h2 className="rules__headline">{RULES_COPY.headline}</h2>

      <div className={`rules__list ${phase >= 1 ? 'is-on' : ''}`}>
        <p className="rules__label">Cat checklist</p>
        <ul>
          {RULES_COPY.checklist.map((item, i) => (
            <li key={item} style={{ '--i': i } as CSSProperties}>
              <span className={`rules__box ${marksOn ? (marks[i] ? 'is-yes' : 'is-no') : ''}`} style={{ '--d': `${i * 0.3}s` } as CSSProperties}>
                {marksOn ? tick(marks[i]) : ''}
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {phase >= 2 ? (
        <div className={`rules__photo ${closing ? 'is-dim' : ''}`} key={photo.id}>
          <img src={imageUrl(photo)} alt={showCat ? 'A white cat lying down' : 'A fox'} draggable={false} />
        </div>
      ) : null}

      {phase >= 2 ? (
        <p className={`rules__caption ${closing ? 'is-dim' : ''}`} key={showCat ? 'c' : 'f'}>
          {showCat ? RULES_COPY.catCaption : RULES_COPY.foxCaption}
        </p>
      ) : null}

      {verdictOn ? (
        <p className={`rules__verdict ${closing ? 'is-dim' : ''}`} key={showCat ? 'vc' : 'vf'} role="status">
          <b>{showCat ? RULES_COPY.catVerdict : RULES_COPY.foxVerdict}</b>
          <span>{showCat ? RULES_COPY.catTruth : RULES_COPY.foxTruth}</span>
        </p>
      ) : null}

      {closing ? <p className="rules__closing">{RULES_COPY.closing}</p> : null}

      <p className="rules__hint">Tap for next</p>
    </section>
  )
}
