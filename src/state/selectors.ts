import type { Screen, State } from './machine'

export type Step = 'Learn' | 'Choose' | 'Train' | 'Test' | 'Understand'
export const STEPS: Step[] = ['Learn', 'Choose', 'Train', 'Test', 'Understand']

const STEP_OF: Record<Screen, number> = {
  attract: -1,
  whatIsAi: 0,
  rules: 0,
  learner: 0,
  choose: 1,
  training: 2,
  test: 3,
  why: 4,
  whatIf: 4,
  everywhere: 4,
  payoff: 4,
}

export const stepIndex = (screen: Screen): number => STEP_OF[screen]

/** Did the new cat get a wrong guess with the visitor's own examples? Null before the result exists. */
export function struggled(state: State): boolean | null {
  const r = state.results.yours
  return r ? !r.featured.correct : null
}
