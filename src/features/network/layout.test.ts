import { describe, expect, it } from 'vitest'
import { buildLayout, LAYERS } from './layout'

describe('network layout', () => {
  const a = buildLayout(700, 520)

  it('is deterministic', () => {
    expect(buildLayout(700, 520)).toEqual(a)
  })

  it('has 6-8-8-5-3 nodes', () => {
    expect(LAYERS).toEqual([6, 8, 8, 5, 3])
    expect(a.layers.map((l) => l.length)).toEqual([6, 8, 8, 5, 3])
    expect(a.nodes).toHaveLength(30)
  })

  it('is sparse but connected: every node has an edge in or out, density near 60%', () => {
    const touched = new Set(a.edges.flatMap((e) => [e.from, e.to]))
    expect(touched.size).toBe(a.nodes.length)
    const possible = 6 * 8 + 8 * 8 + 8 * 5 + 5 * 3
    expect(a.edges.length / possible).toBeGreaterThan(0.5)
    expect(a.edges.length / possible).toBeLessThan(0.75)
  })

  it('only links neighbouring layers, left to right', () => {
    for (const e of a.edges) expect(a.nodes[e.to].layer - a.nodes[e.from].layer).toBe(1)
  })
})
