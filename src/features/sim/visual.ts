/**
 * Display-only remap of the sim's normalised variety (0..1). Raw variety rarely drops below ~0.45 even for a poor
 * selection (it still has several colours), so for visuals everything at or under VISUAL_FLOOR reads as "no variety".
 * The simulation keeps using the raw score; only the variety meter and the Round-2 network crispness use this.
 */
export const VISUAL_FLOOR = 0.45

export function visualVariety(raw: number): number {
  return Math.min(1, Math.max(0, (raw - VISUAL_FLOOR) / (1 - VISUAL_FLOOR)))
}
