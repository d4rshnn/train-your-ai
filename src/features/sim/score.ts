import { TRAINING_EXAMPLES, type Example } from '../../data/examples'

/** Hand-designed weights; this is a simulation rule, not learning. */
export const WEIGHTS = { colour: 0.3, pose: 0.25, fur: 0.15, age: 0.15, scale: 0.1, bg: 0.05 } as const
export type Trait = keyof typeof WEIGHTS
export const TRAITS = Object.keys(WEIGHTS) as Trait[]

/** Evidence range mapped onto the S-curve. Below E_LO the model is clueless; above E_HI it is sure. */
const E_LO = 0.43
const E_HI = 0.93

export const P_MIN = 0.05
export const P_MAX = 0.97
/** Absolute jitter on the cat probability (+/-1.5 points). */
export const JITTER = 0.015

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))

export function similarity(a: Example, b: Example): number {
  return TRAITS.reduce((sum, t) => sum + (a[t] === b[t] ? WEIGHTS[t] : 0), 0)
}

/** near = best single-card match; cov = share of the test image's traits present anywhere in the set. */
export function evidence(test: Example, cats: Example[]) {
  let near = 0
  for (const c of cats) near = Math.max(near, similarity(test, c))
  const cov = TRAITS.reduce((sum, t) => sum + (cats.some((c) => c[t] === test[t]) ? WEIGHTS[t] : 0), 0)
  return { near, cov, e: 0.5 * near + 0.5 * cov }
}

export function curve(e: number): number {
  const x = clamp((e - E_LO) / (E_HI - E_LO), 0, 1)
  return x * x * (3 - 2 * x)
}

/** Cat probability before jitter. Monotone non-decreasing in evidence. */
export function pCatBase(e: number): number {
  return clamp(0.12 + 0.86 * curve(e), P_MIN, P_MAX)
}

/** FNV-1a hash of a string mapped to [0, 1). */
export function hash01(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0) / 0x100000000
}

/** Deterministic jitter in [-amp, amp]. */
export function jitter(seed: string, amp = JITTER): number {
  return (hash01(seed) * 2 - 1) * amp
}

/** Seed independent of selection order. */
export function selectionKey(ids: string[]): string {
  return [...new Set(ids)].sort().join(',')
}

/** Number of distinct values each trait takes across the 20-card training pool. */
export const TRAIT_DOMAIN: Record<Trait, number> = Object.fromEntries(
  TRAITS.map((t) => [t, new Set(TRAINING_EXAMPLES.map((c) => c[t])).size]),
) as Record<Trait, number>

/**
 * Effective number of distinct values (inverse Simpson index): 4 white cards count as ~1 colour, not 4.
 * 1 = every card looks the same on this trait, up to the number of cards when they all differ.
 */
function effectiveValues(cards: Example[], t: Trait): number {
  const counts = new Map<string, number>()
  for (const c of cards) counts.set(c[t], (counts.get(c[t]) ?? 0) + 1)
  let q = 0
  for (const n of counts.values()) q += (n / cards.length) ** 2
  return 1 / q
}

/** Raw variety of the selected cards across ALL six traits (colour, pose, fur, age, scale, bg), weighted like the sim. */
export function rawVariety(cards: Example[]): number {
  if (cards.length === 0) return 0
  return TRAITS.reduce((sum, t) => sum + WEIGHTS[t] * ((effectiveValues(cards, t) - 1) / (TRAIT_DOMAIN[t] - 1)), 0)
}

/**
 * Min / max of rawVariety over every achievable 10-card selection (all C(20,10) = 184,756 of them).
 * Precomputed offline because the scan takes ~1 s; variety.test.ts recomputes them and fails if the data changes.
 */
export const VARIETY_MIN = 0.327778
export const VARIETY_MAX = 0.755016

/** 0 = the weakest achievable 10-card selection, 1 = the most varied one. */
export function varietyScore(cards: Example[]): number {
  return clamp((rawVariety(cards) - VARIETY_MIN) / (VARIETY_MAX - VARIETY_MIN), 0, 1)
}

/** The four traits the variety meter shows, in display order. */
export const METER_TRAITS = ['colour', 'pose', 'scale', 'age'] as const

/** Distinct values of a trait that 10 cards can show at most (the pool may offer fewer or more values). */
export const maxDistinctIn10 = (t: Trait): number => Math.min(10, TRAIT_DOMAIN[t])

/**
 * Per-trait coverage for the meter, each 0..1: distinct values of that trait among the chosen cards,
 * relative to the most a 10-card tray could show.
 */
export function traitCoverage(cards: Example[]): Record<(typeof METER_TRAITS)[number], number> {
  const out = {} as Record<(typeof METER_TRAITS)[number], number>
  for (const t of METER_TRAITS) out[t] = clamp(new Set(cards.map((c) => c[t])).size / maxDistinctIn10(t), 0, 1)
  return out
}
