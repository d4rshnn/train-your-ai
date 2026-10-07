import type { Example } from '../../data/examples'

export const STACK_MIN = 3

/**
 * Cards that look almost the same (same colour and same fur) and come at least 3 at a time are shown as one fanned
 * stack on the Struggle screen; everything else stays as single cards, in tray order.
 */
export function similarGroups(cards: Example[]): { stacks: Example[][]; singles: Example[] } {
  const byLook = new Map<string, Example[]>()
  for (const c of cards) {
    const key = `${c.colour}|${c.fur}`
    byLook.set(key, [...(byLook.get(key) ?? []), c])
  }
  const stacks: Example[][] = []
  const stacked = new Set<string>()
  for (const group of byLook.values()) {
    if (group.length >= STACK_MIN) {
      stacks.push(group)
      for (const c of group) stacked.add(c.id)
    }
  }
  return { stacks, singles: cards.filter((c) => !stacked.has(c.id)) }
}
