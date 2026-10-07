import { Button } from '../components/Button'
import type { Screen } from '../state/machine'
import './Placeholder.css'

const TITLES: Record<Screen, string> = {
  attract: 'Attract',
  whatIsAi: 'What is AI?',
  rules: 'Rules',
  learner: 'Meet the learner',
  choose: 'Choose examples',
  training: 'Training',
  test: 'Test and predict',
  why: 'Why?',
  whatIf: 'What if',
  everywhere: "It's everywhere",
  payoff: 'Payoff',
}

/** Stand-in for screens built in later sessions. */
export function Placeholder({ screen, onNext, onRestart }: { screen: Screen; onNext?: () => void; onRestart: () => void }) {
  return (
    <section className="placeholder">
      <p className="placeholder__tag">Placeholder screen</p>
      <h2>{TITLES[screen]}</h2>
      <p className="placeholder__note">Built in a later session.</p>
      <div className="placeholder__actions">
        {onNext ? <Button onClick={onNext}>Continue</Button> : null}
        <Button variant="ghost" onClick={onRestart}>
          ↺ Restart
        </Button>
      </div>
    </section>
  )
}
