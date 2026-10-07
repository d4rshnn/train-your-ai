import type { Example } from '../../data/examples'
import { METER_TRAITS, traitCoverage } from '../sim/score'
import './VarietyMeter.css'

export const METER_LABELS = ['Colours', 'Poses', 'Sizes', 'Ages'] as const

type Props = {
  /** The cards currently in the tray. */
  cards: Example[]
  /** Round 1 hides it (the failure is the lesson); the space stays reserved so nothing shifts. */
  visible: boolean
}

/** Four segments, one per trait: each fills by the share of that trait's possible values present in the tray. */
export function VarietyMeter({ cards, visible }: Props) {
  const coverage = traitCoverage(cards)
  return (
    <div className={`meter ${visible ? '' : 'is-hidden'}`} aria-hidden={!visible} data-testid="variety-meter">
      <div className="meter__bar">
        {METER_TRAITS.map((trait, i) => (
          <div
            className="meter__seg"
            key={trait}
            role="meter"
            aria-label={METER_LABELS[i]}
            aria-valuemin={0}
            aria-valuemax={1}
            aria-valuenow={Number(coverage[trait].toFixed(2))}
          >
            <div className="meter__fill" style={{ transform: `scaleX(${coverage[trait]})` }} />
          </div>
        ))}
      </div>
      <div className="meter__labels">
        {METER_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <p className="meter__caption">Look for variety</p>
    </div>
  )
}
