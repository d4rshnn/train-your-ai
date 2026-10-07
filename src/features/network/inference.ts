import type { Example } from '../../data/examples'
import type { Prediction } from '../sim/types'
import { INPUT_TRAITS, examplePaths } from './training'
import { LAYERS, type Layout } from './layout'

export const OUTPUTS = ['cat', 'dog', 'other'] as const
export type OutputName = (typeof OUTPUTS)[number]

/** Whole-number percentages that always add up to exactly 100 (largest remainder), in the order cat, dog, other. */
export function displayPercents(probs: Prediction['probs']): [number, number, number] {
  const raw = OUTPUTS.map((k) => probs[k] * 100)
  const floors = raw.map(Math.floor)
  let left = 100 - floors.reduce((a, b) => a + b, 0)
  const order = raw.map((v, i) => ({ i, r: v - Math.floor(v) })).sort((a, b) => b.r - a.r || a.i - b.i)
  for (const { i } of order) {
    if (left <= 0) break
    floors[i]++
    left--
  }
  return floors as [number, number, number]
}

/**
 * Which output each of the 6 pulses heads for. A correct prediction is coherent: every pulse goes to the same output.
 * A wrong one splits the pulses across outputs in proportion to the probabilities, so the visual shows indecision.
 */
export function inferenceTargets(prediction: Prediction): number[] {
  const n = INPUT_TRAITS.length
  const predicted = OUTPUTS.indexOf(prediction.predicted)
  if (prediction.correct) return Array<number>(n).fill(predicted)

  const raw = OUTPUTS.map((k) => prediction.probs[k] * n)
  const counts = raw.map(Math.floor)
  let left = n - counts.reduce((a, b) => a + b, 0)
  const order = raw.map((v, i) => ({ i, r: v - Math.floor(v) })).sort((a, b) => b.r - a.r || a.i - b.i)
  for (const { i } of order) {
    if (left <= 0) break
    counts[i]++
    left--
  }
  // a split needs at least two different outputs
  if (counts.filter((c) => c > 0).length < 2) {
    const other = OUTPUTS.map((_, i) => i).filter((i) => i !== predicted).sort((a, b) => raw[b] - raw[a])[0]
    counts[predicted]--
    counts[other]++
  }
  const targets: number[] = []
  OUTPUTS.map((_, i) => i)
    .sort((a, b) => counts[b] - counts[a] || a - b)
    .forEach((o) => targets.push(...Array<number>(counts[o]).fill(o)))
  return targets
}

export type InferencePlan = {
  coherent: boolean
  /** One route per input node, ending at the output chosen for it. */
  paths: number[][]
  targets: number[]
  /** 0.5..1 brightness, from the confidence of the predicted output. */
  strength: number
}

export function planInference(layout: Layout, test: Example, prediction: Prediction): InferencePlan {
  const targets = inferenceTargets(prediction)
  const outs = layout.layers[LAYERS.length - 1]
  const paths = targets.map((t, k) => examplePaths(layout, test, outs[t]).paths[k])
  return { coherent: prediction.correct, paths, targets, strength: 0.5 + 0.5 * prediction.probs[prediction.predicted] }
}
