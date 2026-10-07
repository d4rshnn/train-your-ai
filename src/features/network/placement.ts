import type { Screen } from '../../state/machine'

/** Logical size of the one persistent network (layout units = CSS px at scale 1). */
export const NET_W = 840
export const NET_H = 560

export type NetPos = { x: number; y: number; s: number; opacity: number }

/** Where the network sits on the 1366x768 stage. The same element glides between these (plan 6.8). */
export const NET_POS = {
  /** Attract screen: right side, smaller. */
  side: { x: 618, y: 120, s: 700 / NET_W, opacity: 1 },
  /** Training / test: large and centre-left. */
  hero: { x: 190, y: 100, s: 1, opacity: 1 },
  /** Same place as side but invisible (e.g. while choosing cards). */
  hidden: { x: 618, y: 120, s: 700 / NET_W, opacity: 0 },
} satisfies Record<string, NetPos>

export type NetPlace = keyof typeof NET_POS

export function placeFor(screen: Screen): NetPlace {
  switch (screen) {
    case 'attract':
    case 'learner': // its own steps hide the network until the numbers stream in
      return 'side'
    case 'training':
    case 'test':
    case 'whatIf': // the replay shows the network; the side-by-side hides it (the screen asks for that itself)
      return 'hero'
    default:
      // whatIsAi, rules, choose, why, everywhere, payoff: the network steps aside
      return 'hidden'
  }
}
