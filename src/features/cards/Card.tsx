import { forwardRef } from 'react'
import type { Example } from '../../data/examples'
import { imageUrl } from './images'
import './Card.css'

export type CardProps = {
  example: Example
  selected?: boolean
  /** Dimmed (e.g. tray full). Still focusable so a tap can explain why. */
  disabled?: boolean
  /** Test image the model has never seen: dashed border and a "?" instead of a label. */
  unseen?: boolean
  size?: number
  onClick?: (el: HTMLButtonElement) => void
}

const describe = (e: Example) => `${e.colour} ${e.species}`

/** States: default, hover (CSS), selected, disabled, test-unseen. */
export const Card = forwardRef<HTMLButtonElement, CardProps>(function Card({ example, selected, disabled, unseen, size = 144, onClick }, ref) {
  const isCat = example.label === 'cat'
  return (
    <button
      ref={ref}
      type="button"
      className={`card ${selected ? 'is-selected' : ''} ${disabled ? 'is-disabled' : ''} ${unseen ? 'is-unseen' : ''}`}
      data-id={example.id}
      style={{ width: size, height: size }}
      aria-pressed={unseen ? undefined : !!selected}
      aria-disabled={disabled || undefined}
      aria-label={unseen ? 'New image, never seen before' : `${describe(example)}, labelled ${isCat ? 'cat' : 'not cat'}`}
      onClick={(e) => onClick?.(e.currentTarget)}
    >
      <img src={imageUrl(example)} alt="" draggable={false} />
      {unseen ? (
        <span className="card__mark">?</span>
      ) : (
        <span className={`card__chip ${isCat ? 'is-cat' : 'is-notcat'}`}>{isCat ? 'CAT' : 'NOT CAT'}</span>
      )}
      {selected ? (
        <span className="card__tick" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      ) : null}
    </button>
  )
})
