import type { Example } from '../../data/examples'
import { hash01 } from '../sim/score'
import { LAYERS, type Layout } from './layout'

/** The six input nodes stand for the six traits of an example. */
export const INPUT_TRAITS = ['colour', 'pose', 'fur', 'age', 'scale', 'bg'] as const

export type ExamplePlan = {
  example: Example
  /** One path of consecutive edges per input node (input layer -> output layer). */
  paths: number[][]
  /** Output node (layer 4) that the example's label points at: CAT, DOG or OTHER. */
  outputNode: number
}

export type TrainingPlan = {
  examples: ExamplePlan[]
  /** How many times each edge was used by a pulse. */
  counts: Float32Array
  /** Strongest-first edges that end up as bright "spine" paths. */
  spine: number[]
  /** Final learned edge weight 0..1 and how strongly unused edges are suppressed 0..1. */
  finalMemory: Float32Array
  suppress: Float32Array
  /** Resting activation per node once settled. */
  finalRest: Float32Array
  crisp: number
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export function outputIndexFor(example: Example): 0 | 1 | 2 {
  if (example.label === 'cat') return 0
  return example.species === 'dog' ? 1 : 2
}

const reachCache = new WeakMap<Layout, Map<number, Uint8Array>>()

/** Which nodes can still reach `target` by following edges forward. Edges are stored layer by layer, so one reverse pass is enough. */
function nodesReaching(layout: Layout, target: number): Uint8Array {
  let perLayout = reachCache.get(layout)
  if (!perLayout) reachCache.set(layout, (perLayout = new Map()))
  let can = perLayout.get(target)
  if (!can) {
    can = new Uint8Array(layout.nodes.length)
    can[target] = 1
    for (let i = layout.edges.length - 1; i >= 0; i--) if (can[layout.edges[i].to]) can[layout.edges[i].from] = 1
    perLayout.set(target, can)
  }
  return can
}

/**
 * Deterministic path for one example: each input node (= one trait) walks forward, choosing its next edge from a hash of
 * (trait, value, layer) among the edges that can still reach the target output. Cards that share a trait value therefore
 * share that part of the route; different cards light visibly different paths. By default the target is the output that
 * matches the card's label; inference passes `outputNode` to steer where the pulse ends.
 */
export function examplePaths(layout: Layout, example: Example, outputNode?: number): { paths: number[][]; outputNode: number } {
  const target = outputNode ?? layout.layers[LAYERS.length - 1][outputIndexFor(example)]
  const can = nodesReaching(layout, target)
  const paths = INPUT_TRAITS.map((trait, i) => {
    const path: number[] = []
    let node = layout.layers[0][i]
    for (let layer = 0; layer < LAYERS.length - 1; layer++) {
      const outs = layout.outEdges[node]
      const toward = outs.filter((e) => can[layout.edges[e].to])
      const pool = toward.length ? toward : outs
      const pick = pool[Math.floor(hash01(`${trait}|${example[trait]}|${layer}|${node}`) * pool.length)]
      path.push(pick)
      node = layout.edges[pick].to
    }
    return path
  })
  return { paths, outputNode: target }
}

/**
 * Everything the sequence needs, computed up front and purely: per-example routes, edge usage, and the final "settled"
 * state. `crisp` (0..1, the remapped visual variety) decides how organised the end state is: more bright spine edges,
 * a dimmer periphery, and clearer separation between the output nodes.
 */
export function planTraining(layout: Layout, examples: Example[], crisp: number): TrainingPlan {
  const plans: ExamplePlan[] = examples.map((example) => ({ example, ...examplePaths(layout, example) }))
  const counts = new Float32Array(layout.edges.length)
  for (const p of plans) for (const path of p.paths) for (const e of path) counts[e]++

  const used = layout.edges.map((e) => e.index).filter((e) => counts[e] > 0)
  used.sort((a, b) => counts[b] - counts[a] || hash01(`tie${a}`) - hash01(`tie${b}`))
  const spineSize = Math.min(used.length, Math.round(lerp(6, 34, crisp)))
  const spine = used.slice(0, spineSize)
  const spineSet = new Set(spine)
  const max = Math.max(1, ...counts)

  const finalMemory = new Float32Array(layout.edges.length)
  const suppress = new Float32Array(layout.edges.length)
  for (const e of layout.edges) {
    const s = counts[e.index] / max
    if (spineSet.has(e.index)) finalMemory[e.index] = 0.55 + 0.45 * s
    else {
      finalMemory[e.index] = 0.18 * s * (1 - 0.6 * crisp)
      suppress[e.index] = lerp(0.1, 0.85, crisp) * (counts[e.index] > 0 ? 0.7 : 1)
    }
  }

  const finalRest = new Float32Array(layout.nodes.length).fill(0.08)
  for (const e of spine) {
    const edge = layout.edges[e]
    finalRest[edge.from] = Math.max(finalRest[edge.from], lerp(0.14, 0.4, crisp))
    finalRest[edge.to] = Math.max(finalRest[edge.to], lerp(0.14, 0.4, crisp))
  }
  const outs = layout.layers[LAYERS.length - 1]
  const outUse = [0, 0, 0]
  for (const p of plans) outUse[outs.indexOf(p.outputNode)]++
  const top = Math.max(1, ...outUse)
  outs.forEach((node, i) => {
    // blurry: all outputs similar. crisp: the output with evidence stands out, the others fall back.
    const blurry = 0.3
    const sharp = outUse[i] === 0 ? 0.1 : 0.2 + 0.7 * (outUse[i] / top)
    finalRest[node] = lerp(blurry, sharp, crisp)
  })

  return { examples: plans, counts, spine, finalMemory, suppress, finalRest, crisp }
}
