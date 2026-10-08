import type { Alternate } from '../sim/alternate'

/** What-if copy (PLAN_V2 sections 5 and 6). "Right"/"correct" for how often it is right, "sure" for confidence. */
export const WHATIF_HEADLINE = 'Same AI. Different examples.'

/** The sentence shown while the alternate replays. Weak pick -> more variety; good pick -> only very similar cats. */
export const introLine = (direction: Alternate['direction']) =>
  direction === 'better' ? 'Now watch the same AI with more variety.' : 'Now watch what happens if it had only seen very similar cats.'

export const titles = (direction: Alternate['direction']) => ({
  yours: 'Your examples',
  other: direction === 'better' ? 'More variety' : 'Very similar cats',
})

export type Trend = 'up' | 'same' | 'down'

/** Trend of "N of 8 correct" from the visitor's own run to the alternate, from the real numbers (never assumed). */
export const trendOf = (yoursCorrect: number, otherCorrect: number): Trend => (otherCorrect > yoursCorrect ? 'up' : otherCorrect < yoursCorrect ? 'down' : 'same')

/** One honest sentence under the headline, describing the numbers on screen. */
export function compareLine(trend: Trend, direction: Alternate['direction']): string {
  if (trend === 'same') return 'Here, both sets of examples did equally well.'
  if (direction === 'better') return trend === 'up' ? 'With more variety, it got more right.' : 'Here, more variety did not help.'
  return trend === 'down' ? 'With only very similar cats, it got fewer right.' : 'Here, very similar cats did not hurt.'
}

export const arrowLabel = (trend: Trend, diff: number) =>
  trend === 'up' ? `${diff} more right` : trend === 'down' ? `${diff} fewer right` : 'no change'

export const WHATIF_SKIP_AFTER_MS = 1500
