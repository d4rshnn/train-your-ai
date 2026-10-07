import type { Example } from '../../data/examples'

/** S8 copy (plan section 4, S8). Kept in one place so tests can pin the exact wording. */
export const PIPELINE_LABELS = ['Training data', 'Model learns patterns', 'Trained model', 'New data', 'Prediction'] as const

export const DEFINITIONS = [
  { term: 'Training Data', text: 'Examples we give the model to learn from.' },
  { term: 'Model', text: 'The system that learns patterns from those examples.' },
  { term: 'Prediction', text: 'What the trained model thinks about new data.' },
  { term: 'Accuracy', text: 'How often those predictions are correct.' },
] as const

export const CLOSING = 'You just experienced the basic idea behind Machine Learning.'

export const HONEST_NOTE = 'This was a visual simulation. Real models train on far more data — but the idea is the same. More examples and correct labels matter too.'

/** Beat times in seconds. The pulse crosses the five stages in under 4 s, the definitions are in by 5 s and it is all done by 6 s. */
export const BEAT = {
  pulseStart: 0.3,
  pulseDur: 3.4,
  defs: 4.0,
  defStagger: 0.25,
  closing: 5.2,
  done: 5.9,
} as const

/** When the travelling pulse reaches stage i (0..4), in seconds. */
export const stageTime = (i: number, stages = PIPELINE_LABELS.length) => BEAT.pulseStart + (BEAT.pulseDur * i) / (stages - 1)

/**
 * Order for the stacked training cards on the payoff screen (last = on top). A cat is always on top: the last-picked
 * cat if there is one (any cat otherwise), never a non-cat. Everything else keeps the visitor's pick order.
 */
export function pileOrder(cards: Example[]): Example[] {
  let top = -1
  cards.forEach((c, i) => {
    if (c.label === 'cat') top = i
  })
  if (top < 0 || top === cards.length - 1) return cards
  return [...cards.slice(0, top), ...cards.slice(top + 1), cards[top]]
}
