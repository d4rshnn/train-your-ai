import { GOOD_SET, worstAchievableSet } from './presets'
import { resolveSelection } from './predict'
import { varietyScore } from './score'
import { visualVariety } from './visual'

/** A pick whose remapped variety is below this counts as "weak" (PLAN_V2 section 5). */
export const WEAK_BELOW = 0.6

export type Alternate = {
  /** The other 10-card selection the what-if screen replays. */
  ids: string[]
  /** 'better': the visitor's pick was weak, so the alternate has more variety. 'worse': the pick was varied, so the alternate is very similar cats. */
  direction: 'better' | 'worse'
  /** Remapped variety (0..1) of the visitor's own pick, the number that decided the direction. */
  variety: number
}

/** Remapped variety (display scale, see visual.ts) of a selection. */
export const remappedVariety = (selection: string[]) => visualVariety(varietyScore(resolveSelection(selection)))

/**
 * The "what if" selection (PLAN_V2 section 5). Weak pick (remapped variety below 0.6): replay with the achievable GOOD set.
 * Otherwise: replay with the achievable WORST set. Pure and deterministic: same pick, same alternate.
 */
export function buildAlternate(selection: string[]): Alternate {
  const variety = remappedVariety(selection)
  return variety < WEAK_BELOW ? { ids: [...GOOD_SET], direction: 'better', variety } : { ids: worstAchievableSet(), direction: 'worse', variety }
}
