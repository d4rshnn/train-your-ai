import { TEST_EXAMPLES, TRAINING_EXAMPLES } from '../../data/examples'
import { HERO_TEST_ID } from './predict'
import { similarity } from './score'

export const CATS = TRAINING_EXAMPLES.filter((e) => e.label === 'cat')
const HERO = TEST_EXAMPLES.find((t) => t.id === HERO_TEST_ID)!
export const ids = (...n: number[]) => n.map((x) => `train-${String(x).padStart(2, '0')}`)

/**
 * Worst achievable set W: the 4 white fluffy cards plus the 6 most similar cats
 * (fluffy or front-sitting, no black cards, no non-cats), ranked by similarity to the white cards.
 */
export function worstAchievableSet(): string[] {
  const whites = CATS.filter((c) => c.colour === 'white' && c.fur === 'fluffy')
  const eligible = CATS.filter((c) => !whites.includes(c) && c.colour !== HERO.colour && (c.fur === 'fluffy' || c.pose === 'front-sit'))
  const closeness = (c: (typeof CATS)[number]) => whites.reduce((s, w) => s + similarity(c, w), 0)
  const rest = [...eligible].sort((a, b) => closeness(b) - closeness(a) || a.id.localeCompare(b.id)).slice(0, 10 - whites.length)
  return [...whites, ...rest].map((c) => c.id)
}

/** Nine cats and one non-cat chosen for maximum variety (0.99); covers every trait of the black cat. */
export const GOOD_SET = ids(3, 5, 7, 9, 11, 13, 14, 15, 16, 20)

