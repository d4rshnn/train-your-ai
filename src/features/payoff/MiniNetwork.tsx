import { useMemo } from 'react'
import { buildLayout } from '../network/layout'
import { NET_H, NET_W } from '../network/placement'

type Props = {
  /** Edge indices that the visitor's run strengthened (the spine from planTraining). */
  spine: number[]
  /** Lit once the pulse has reached this stage. */
  lit: boolean
  width?: number
  height?: number
}

/** A small, static copy of the network. Same seed as the big one, so edge indices match the training plan. */
export function MiniNetwork({ spine, lit, width = 180, height = 120 }: Props) {
  // same layout (and edge indices) as the big network; only the display size differs
  const layout = useMemo(() => buildLayout(NET_W, NET_H), [])
  const spineSet = useMemo(() => new Set(spine), [spine])
  return (
    <svg className={`mini-net ${lit ? 'is-lit' : ''}`} viewBox={`0 0 ${NET_W} ${NET_H}`} width={width} height={height} role="img" aria-label="Small view of the trained network">
      <g fill="none" strokeLinecap="round">
        {layout.edges.map((e) => (
          <path key={e.index} d={e.d} className={spineSet.has(e.index) ? 'is-spine' : ''} />
        ))}
      </g>
      <g>
        {layout.nodes.map((n) => (
          <circle key={n.index} cx={n.x} cy={n.y} r={n.layer === 4 ? 17 : 11} />
        ))}
      </g>
    </svg>
  )
}
