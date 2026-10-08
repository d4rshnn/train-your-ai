/**
 * The two quantum demos draw real random numbers (Math.random by default), so a run is roughly 50/50 and different every
 * time. A qubit here is a fair coin: measuring gives heads or tails with fixed odds. Simplified view, not a simulation of a
 * real quantum computer.
 */
export type Side = 'heads' | 'tails'

export const HEADS_ODDS = 0.5
export const RUN_SIZE = 100

/** One measurement. */
export const measure = (rnd: () => number = Math.random): Side => (rnd() < HEADS_ODDS ? 'heads' : 'tails')

export type RunResult = { heads: number; tails: number; n: number }

/** n identical measurements, counted. */
export function runMany(n: number = RUN_SIZE, rnd: () => number = Math.random): RunResult {
  let heads = 0
  for (let i = 0; i < n; i++) if (measure(rnd) === 'heads') heads++
  return { heads, tails: n - heads, n }
}

/** Heads / tails counts after `p` (0..1) of the run has played, so the bars can fill quickly but honestly. */
export const partial = (r: RunResult, p: number): { heads: number; tails: number } => {
  const heads = Math.round(r.heads * p)
  const tails = Math.round(r.tails * p)
  return { heads, tails }
}
