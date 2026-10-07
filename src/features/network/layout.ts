import { mulberry32 } from '../../util/rand'

export const LAYERS = [6, 8, 8, 5, 3] as const
export const OUTPUT_LABELS = ['CAT', 'DOG', 'OTHER'] as const

export type NodePos = { index: number; layer: number; slot: number; x: number; y: number; r: number }
export type Edge = {
  index: number
  from: number
  to: number
  /** Quadratic curve: start, control, end. */
  ax: number
  ay: number
  cx: number
  cy: number
  bx: number
  by: number
  /** Approximate length in px, used to keep particle speed constant. */
  len: number
  d: string
}
export type Layout = { width: number; height: number; nodes: NodePos[]; edges: Edge[]; outEdges: number[][]; layers: number[][] }

/**
 * Deterministic organic layout: seeded jitter on node positions, each node connects to roughly 60% of the next
 * layer (never fewer than one), edges bow gently so it reads as tissue, not a grid.
 */
export function buildLayout(width: number, height: number, seed = 11): Layout {
  const rnd = mulberry32(seed)
  const padX = 56
  const padY = 54
  const nodes: NodePos[] = []
  const layers: number[][] = []
  LAYERS.forEach((count, layer) => {
    const x = padX + (layer * (width - padX * 2 - 70)) / (LAYERS.length - 1)
    layers.push([])
    for (let slot = 0; slot < count; slot++) {
      const y = padY + ((slot + 0.5) * (height - padY * 2)) / count
      const index = nodes.length
      const isOut = layer === LAYERS.length - 1
      nodes.push({ index, layer, slot, x: x + (rnd() - 0.5) * 30, y: y + (rnd() - 0.5) * 26, r: isOut ? 11 : 6.5 + rnd() * 1.5 })
      layers[layer].push(index)
    }
  })

  const edges: Edge[] = []
  const outEdges: number[][] = nodes.map(() => [])
  for (let layer = 0; layer < LAYERS.length - 1; layer++) {
    const to = layers[layer + 1]
    const incoming = new Set<number>()
    for (const a of layers[layer]) {
      let targets = to.filter(() => rnd() < 0.6)
      if (!targets.length) targets = [to[Math.floor(rnd() * to.length)]]
      for (const b of targets) {
        addEdge(a, b)
        incoming.add(b)
      }
    }
    // every node in the next layer receives at least one edge
    for (const b of to) if (!incoming.has(b)) addEdge(layers[layer][Math.floor(rnd() * layers[layer].length)], b)
  }

  function addEdge(from: number, to: number) {
    const a = nodes[from]
    const b = nodes[to]
    const mx = (a.x + b.x) / 2
    const my = (a.y + b.y) / 2
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len0 = Math.hypot(dx, dy)
    const bow = (rnd() - 0.5) * 0.28 * len0
    const cx = mx - (dy / len0) * bow
    const cy = my + (dx / len0) * bow
    const index = edges.length
    const len = len0 * 1.02
    edges.push({
      index,
      from,
      to,
      ax: a.x,
      ay: a.y,
      cx,
      cy,
      bx: b.x,
      by: b.y,
      len,
      d: `M${a.x.toFixed(1)} ${a.y.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`,
    })
    outEdges[from].push(index)
  }

  return { width, height, nodes, edges, outEdges, layers }
}

/** Point on an edge's quadratic curve at t in [0, 1]. */
export function pointOnEdge(e: Edge, t: number, out: { x: number; y: number }) {
  const u = 1 - t
  out.x = u * u * e.ax + 2 * u * t * e.cx + t * t * e.bx
  out.y = u * u * e.ay + 2 * u * t * e.cy + t * t * e.by
}
