import type { SimResult } from './types'

/** 4 of 8 -> 50, 7 of 8 -> 88 (87.5 rounds up), 3 of 8 -> 38. */
export const accuracyPercent = (correct: number, total = 8): number => Math.round((correct / total) * 100)

export type Trend = 'up' | 'same' | 'down'

export type AccuracyView = {
  total: number
  correct: number
  percent: number
  /** Round 1 numbers, or null when Round 1 never ran. */
  round1: { correct: number; percent: number } | null
  trend: Trend | null
  /** One honest line under the comparison. */
  note: string
}

/**
 * What the Accuracy screen shows. Round 1 is computed up front by the sim at TRAIN, so it exists even if the visitor
 * never saw all 8 tests in Round 1 (or the screen was reached through the dev jump).
 */
export function accuracyView(round1: SimResult | null, round2: SimResult): AccuracyView {
  const total = round2.predictions.length
  const percent = accuracyPercent(round2.correctCount, total)
  const r1 = round1 ? { correct: round1.correctCount, percent: accuracyPercent(round1.correctCount, total) } : null
  const trend: Trend | null = r1 ? (round2.correctCount > r1.correct ? 'up' : round2.correctCount < r1.correct ? 'down' : 'same') : null

  let note: string
  if (trend === 'up' && round2.correctCount < 7) note = 'Better! Add even more variety to push it higher.'
  else if (trend === 'up') note = 'It improved because the data improved.'
  else note = 'More variety can still help.'
  return { total, correct: round2.correctCount, percent, round1: r1, trend, note }
}
