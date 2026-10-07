import { STEPS } from '../state/selectors'
import './Chrome.css'

/** Five small dots: Learn · Choose · Train · Test · Understand. `current` is -1 on the attract screen. */
export function StepDots({ current }: { current: number }) {
  return (
    <ol className="steps" aria-label="Progress">
      {STEPS.map((label, i) => (
        <li key={label} className={`steps__dot ${i < current ? 'is-done' : ''} ${i === current ? 'is-current' : ''}`} aria-current={i === current ? 'step' : undefined}>
          <span className="steps__label">{label}</span>
        </li>
      ))}
    </ol>
  )
}
