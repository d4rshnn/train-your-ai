import type { Example } from '../../data/examples'
import { displayPercents } from '../network/inference'
import type { SimResult } from '../sim/types'

/** Copy deck, PLAN_V2 section 6. Plain words only: "sure" for confidence, never "accuracy". */
export const WHY = {
  weak: { headline: 'It had only seen cats like these.', sub: 'This one looked different, so it guessed.', analogy: 'Like a kid who has only ever met white cats.' },
  good: { headline: 'It had seen enough different cats to recognise a new one.', sub: 'A good mix of examples gives it more to compare with.', analogy: 'Like a kid who has met all kinds of cats.' },
} as const

export type WhyVariant = keyof typeof WHY

/** Which explanation fits what actually happened: the one that describes the AI's guess on the new cat. */
export const whyVariant = (yours: SimResult): WhyVariant => (yours.featured.correct ? 'good' : 'weak')

/** "38% sure it's a cat": how sure the AI is that the new picture is a cat. */
export const sureAboutCat = (r: SimResult) => `${displayPercents(r.featured.probs)[0]}% sure it's a cat`

/** What the AI said it was, in plain words. */
export const guessWord = (r: SimResult) => ({ cat: 'cat', dog: 'dog', other: 'something else' })[r.featured.predicted]

/** The "Very similar" stack label is only shown when the picks really were alike (3+ the same look). */
export const hasSimilarStack = (stacks: Example[][]) => stacks.length > 0

/** Seconds before the Why screen moves on by itself. */
export const WHY_AUTO_MS = 8000
export const WHY_SKIP_AFTER_MS = 1500
