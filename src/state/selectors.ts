import { simulate } from '../features/sim/predict'
import type { SimResult } from '../features/sim/types'
import { TRAY_SIZE, type Screen, type State } from './machine'

export type Step = 'Learn' | 'Choose' | 'Train' | 'Test' | 'Understand'
export const STEPS: Step[] = ['Learn', 'Choose', 'Train', 'Test', 'Understand']

const STEP_OF: Record<Screen, number> = {
  attract: -1,
  whatAiKnows: 0,
  choose: 1,
  training: 2,
  test: 3,
  struggle: 3,
  accuracy: 3,
  payoff: 4,
}

export const stepIndex = (screen: Screen): number => STEP_OF[screen]

/** Did the hero test image get a wrong prediction this round? Null before the result exists. */
export function struggled(state: State): boolean | null {
  const r = state.results[state.round]
  return r ? !r.featured.correct : null
}

/**
 * Round 1's result for the Accuracy comparison. It is normally stored at TRAIN; if it is missing but Round 1 had a full
 * tray, it is recomputed (the simulation is deterministic), so the comparison always exists.
 */
export function roundOneResult(state: State): SimResult | null {
  if (state.results[1]) return state.results[1]
  return state.selections[1].length === TRAY_SIZE ? simulate(state.selections[1]) : null
}
