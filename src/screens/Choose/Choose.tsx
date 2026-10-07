import { useCallback, useEffect, useRef, useState, type Dispatch } from 'react'
import { TRAINING_EXAMPLES, type Example } from '../../data/examples'
import { Button } from '../../components/Button'
import { Card } from '../../features/cards/Card'
import { captureTrayRects, recordTrayRects } from '../../features/cards/trayHandoff'
import { Tray, type FlyRects } from '../../features/cards/Tray'
import { MemoryMap } from '../../features/map/MemoryMap'
import { TRAY_SIZE, type Action } from '../../state/machine'
import { mulberry32 } from '../../util/rand'
import './Choose.css'

/** Fixed, seeded shuffle so cats and non-cats are mixed in the grid and it is identical on every run. */
export function gridOrder(examples: Example[], seed = 5): Example[] {
  const rnd = mulberry32(seed)
  const a = [...examples]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const GRID = gridOrder(TRAINING_EXAMPLES)
const NOTICE_MS = 2200

type Props = { selection: string[]; dispatch: Dispatch<Action> }

export function Choose({ selection, dispatch }: Props) {
  const flyFrom: FlyRects = useRef(new Map())
  const [shakeKey, setShakeKey] = useState(0)
  const [notice, setNotice] = useState('')
  const noticeTimer = useRef<number | undefined>(undefined)
  const full = selection.length >= TRAY_SIZE

  useEffect(() => () => window.clearTimeout(noticeTimer.current), [])

  const flash = useCallback((text: string) => {
    setNotice(text)
    window.clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => setNotice(''), NOTICE_MS)
  }, [])

  const onCard = (ex: Example, el: HTMLElement) => {
    if (selection.includes(ex.id)) {
      dispatch({ type: 'TOGGLE_CARD', id: ex.id })
    } else if (full) {
      setShakeKey((k) => k + 1)
      flash('Tray full — remove one first')
    } else {
      flyFrom.current.set(ex.id, el.getBoundingClientRect())
      dispatch({ type: 'TOGGLE_CARD', id: ex.id })
    }
  }

  return (
    <section className="choose">
      <div className="choose__grid" role="group" aria-label="Example photos">
        {GRID.map((ex) => (
          <Card
            key={ex.id}
            example={ex}
            selected={selection.includes(ex.id)}
            disabled={full && !selection.includes(ex.id)}
            onClick={(el) => onCard(ex, el)}
          />
        ))}
      </div>
      <div className="choose__panel">
        <h2 className="choose__headline">Choose 10 examples to teach your AI.</h2>
        <p className="choose__sub">Each card has a label.</p>

        <Tray selection={selection} flyFrom={flyFrom} shakeKey={shakeKey} onRemove={(id) => dispatch({ type: 'TOGGLE_CARD', id })} />

        <p className="choose__notice" role="status" aria-live="polite">
          {notice}
        </p>

        <div className="choose__row">
          <MemoryMap ids={selection} className="choose__map" labels={false} />
          <div className="choose__side">
            <span className="choose__count" aria-label={`${selection.length} of ${TRAY_SIZE} chosen`}>
              <b>{selection.length}</b> / {TRAY_SIZE}
            </span>
            <Button variant="ghost" onClick={() => dispatch({ type: 'CLEAR' })} disabled={selection.length === 0}>
              Clear
            </Button>
          </div>
        </div>

        <Button className="choose__train" onClick={() => {
            recordTrayRects(captureTrayRects())
            dispatch({ type: 'TRAIN' })
          }} disabled={selection.length !== TRAY_SIZE}>
          Train
        </Button>
      </div>
    </section>
  )
}
