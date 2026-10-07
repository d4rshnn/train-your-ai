import type { Example } from '../../data/examples'
import { remappedVariety } from './alternate'
import { resolveSelection } from './predict'
import { hash01 } from './score'

/**
 * The memory map (PLAN_V2 section 4): a deterministic picture of what the simulation already decided. No learning here.
 * Every picked example is a dot near its label's centre; the cat island grows with the remapped variety of the pick; the
 * new cat lands inside the island exactly when the sim says the AI is at least 50% sure it is a cat.
 */
export const MAP_W = 640
export const MAP_H = 380

export const CAT_CENTRE = { x: 180, y: 178 }
export const OTHER_CENTRE = { x: 484, y: 178 }
export const CAT_R_MIN = 58
export const CAT_R_MAX = 140
export const OTHER_R = 76
/** Where the new cat starts its flight (just off the right edge). */
export const TEST_START = { x: MAP_W + 40, y: CAT_CENTRE.y }

/** Least distance (map units) between the cat island's edge and the new cat's centre when it is outside. */
export const OUTSIDE_GAP = 60

/** Cat island radius for a remapped variety (0..1): grows linearly from CAT_R_MIN to CAT_R_MAX. */
export const catRadius = (variety: number) => CAT_R_MIN + (CAT_R_MAX - CAT_R_MIN) * Math.min(1, Math.max(0, variety))

export type MapDot = { id: string; label: 'cat' | 'notcat'; x: number; y: number }
export type MapTest = {
  id: string
  x: number
  y: number
  /** Inside the cat island: the AI is at least 50% sure it is a cat. */
  inside: boolean
  /** The island the new dot is closest to. */
  nearest: 'cat' | 'other'
}
export type MapLayout = {
  /** The remapped variety (0..1) the island radius came from. */
  variety: number
  catR: number
  otherR: number
  /** False when the visitor picked no non-cat examples: the right group is then "never seen these", not an empty "not cat". */
  otherSeen: boolean
  dots: MapDot[]
  test: MapTest | null
}

/** How far from the island centre a dot sits (fraction of the radius), by pose: front-on cats sit near the middle. */
const POSE_FRAC: Record<Example['pose'], number> = { 'front-sit': 0.3, 'side-walk': 0.5, lying: 0.62, 'back-view': 0.78, perched: 0.5 }

function dotFor(card: Example, catR: number): MapDot {
  const isCat = card.label === 'cat'
  const c = isCat ? CAT_CENTRE : OTHER_CENTRE
  const r = isCat ? catR : OTHER_R
  // colour picks the direction, pose the distance, a hash of the id spreads cards that share both
  const angle = hash01(`angle|${isCat ? card.colour : card.species}`) * Math.PI * 2 + (hash01(`a|${card.id}`) - 0.5) * 1.1
  const frac = Math.min(0.88, Math.max(0.12, POSE_FRAC[card.pose] + (hash01(`r|${card.id}`) - 0.5) * 0.24))
  return { id: card.id, label: card.label, x: c.x + Math.cos(angle) * frac * r, y: c.y + Math.sin(angle) * frac * r }
}

/**
 * Position of the new cat. `pCat` is the simulation's own chance that it is a cat (a monotone function of the evidence the
 * picks give for that image), so the dot can never contradict the number on screen: at 0.5 or more it is inside the island
 * (the higher, the nearer the middle); below 0.5 it is outside, and the lower, the nearer the other group.
 */
export function testPosition(id: string, pCat: number, catR: number): MapTest {
  const t = (0.5 - pCat) / 0.5 // < 0 inside, > 0 outside
  const edge = CAT_CENTRE.x + catR
  const otherEdge = OTHER_CENTRE.x - OTHER_R
  // outside: always a clear gap (the dot, its halo and its ring clear the island), then on towards the other group
  const lo = edge + OUTSIDE_GAP
  const hi = Math.max(lo + 10, otherEdge - 8)
  const x = t <= 0 ? edge + t * catR * 0.9 : lo + t * (hi - lo)
  const inside = x <= edge
  const toCat = Math.abs(x - CAT_CENTRE.x) - catR
  const toOther = Math.abs(x - OTHER_CENTRE.x) - OTHER_R
  return { id, x, y: CAT_CENTRE.y, inside, nearest: toCat <= toOther ? 'cat' : 'other' }
}

/** Pure and order independent: the same set of ids always gives the same map. */
export function layoutMap(selectionIds: string[], test?: { id: string; pCat: number } | null): MapLayout {
  const cards = resolveSelection(selectionIds).sort((a, b) => (a.id < b.id ? -1 : 1))
  const variety = remappedVariety(cards.map((c) => c.id))
  const catR = catRadius(variety)
  return {
    variety,
    catR,
    otherR: OTHER_R,
    otherSeen: cards.some((c) => c.label === 'notcat'),
    dots: cards.map((c) => dotFor(c, catR)),
    test: test ? testPosition(test.id, test.pCat, catR) : null,
  }
}
