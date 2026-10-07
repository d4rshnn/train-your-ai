import { useLayoutEffect, useRef, type MutableRefObject } from 'react'
import { TRAINING_EXAMPLES } from '../../data/examples'
import { stageScale } from '../../app/Stage'
import { TRAY_SIZE } from '../../state/machine'
import { imageUrl } from './images'
import './Tray.css'

const byId = new Map(TRAINING_EXAMPLES.map((e) => [e.id, e]))
const FLY_MS = 260

export type FlyRects = MutableRefObject<Map<string, DOMRect>>

function FilledSlot({ id, flyFrom, onRemove }: { id: string; flyFrom: FlyRects; onRemove: (id: string) => void }) {
  const ref = useRef<HTMLButtonElement>(null)
  const example = byId.get(id)!

  // FLIP: the slot is already at its final place; animate from where the card was to here.
  useLayoutEffect(() => {
    const el = ref.current
    const from = flyFrom.current.get(id)
    if (!el || !from) return
    flyFrom.current.delete(id)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const to = el.getBoundingClientRect()
    const s = stageScale()
    const dx = (from.left - to.left) / s
    const dy = (from.top - to.top) / s
    const k = from.width / to.width
    el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${k})`, zIndex: 10, opacity: 0.9 },
        { transform: 'translate(0, 0) scale(1)', zIndex: 10, opacity: 1 },
      ],
      { duration: FLY_MS, easing: 'cubic-bezier(.22,.8,.24,1)' },
    )
  }, [id, flyFrom])

  return (
    <button ref={ref} type="button" className="slot slot--filled" data-id={id} onClick={() => onRemove(id)} aria-label={`Remove ${example.colour} ${example.species} from the tray`}>
      <img src={imageUrl(example)} alt="" draggable={false} />
      <span className={`slot__label ${example.label === 'cat' ? 'is-cat' : ''}`}>{example.label === 'cat' ? 'CAT' : 'NOT'}</span>
    </button>
  )
}

type TrayProps = {
  selection: string[]
  flyFrom: FlyRects
  onRemove: (id: string) => void
  /** Change this value to replay the "tray is full" shake. */
  shakeKey: number
}

/** 10 fixed slots (2 x 5). Slot i holds the i-th pick; tap a filled slot to take the card back out. */
export function Tray({ selection, flyFrom, onRemove, shakeKey }: TrayProps) {
  return (
    <div className="tray" key={shakeKey} data-shake={shakeKey > 0 ? '1' : undefined} aria-label="Your 10 training examples">
      {Array.from({ length: TRAY_SIZE }, (_, i) => {
        const id = selection[i]
        return id ? (
          <FilledSlot key={`${i}-${id}`} id={id} flyFrom={flyFrom} onRemove={onRemove} />
        ) : (
          <div key={`empty-${i}`} className="slot slot--empty" aria-hidden="true">
            {i + 1}
          </div>
        )
      })}
    </div>
  )
}
