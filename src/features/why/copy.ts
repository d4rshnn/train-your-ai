import { displayPercents } from '../network/inference'
import type { SimResult } from '../sim/types'

/** Copy deck, PLAN_V2 section 6. Plain words only: "sure" for confidence, never "accuracy". */
export const WHY = {
  weak: { headline: 'It had only seen cats like these.', sub: 'This one looked different, so it guessed.', analogy: 'Same as practising only one type of question.' },
  good: { headline: 'It had seen enough different cats to recognise a new one.', sub: 'A good mix of examples gives it more to compare with.', analogy: 'Same as practising a good mix of questions.' },
} as const

export type WhyVariant = keyof typeof WHY

/** Which explanation fits what actually happened: the one that describes the AI's guess on the new cat. */
export const whyVariant = (yours: SimResult): WhyVariant => (yours.featured.correct ? 'good' : 'weak')

/** "38% sure it's a cat": how sure the AI is that the new picture is a cat. */
export const sureAboutCat = (r: SimResult) => `${displayPercents(r.featured.probs)[0]}% sure it's a cat`

/** What the AI said it was, in plain words. */
export const guessWord = (r: SimResult) => ({ cat: 'cat', dog: 'dog', other: 'something else' })[r.featured.predicted]

/** One plain line over the memory map, describing where the new cat landed (the same result as the numbers). */
export const mapCaption = (variant: WhyVariant) => (variant === 'good' ? 'The new cat landed inside the cats it knew.' : 'The new cat landed outside the cats it knew.')

/** When the Why screen has finished playing (the new cat has landed) and shows its prompt. */
export const WHY_READY_MS = 4300
export const WHY_SKIP_AFTER_MS = 1500
