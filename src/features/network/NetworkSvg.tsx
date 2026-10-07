import { memo } from 'react'
import { LAYERS, OUTPUT_LABELS, type Layout } from './layout'

/**
 * Static structure only. The engine finds the elements by data attributes and mutates their style/attributes
 * directly, so this component renders once per layout and never per frame.
 */
export const NetworkSvg = memo(function NetworkSvg({ layout }: { layout: Layout }) {
  const { width, height, nodes, edges } = layout
  const lastLayer = LAYERS.length - 1
  return (
    <svg className="net__svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Conceptual neural network diagram">
      <defs>
        {/* edges fade in from the left so the network reads as a flow, not a grid */}
        <linearGradient id="net-edge" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={width} y2="0">
          <stop offset="0" stopColor="var(--accent-deep)" />
          <stop offset="0.55" stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--accent)" />
        </linearGradient>
      </defs>
      <g className="net__edges" fill="none" stroke="url(#net-edge)" strokeLinecap="round">
        {edges.map((e) => (
          <path key={e.index} data-edge={e.index} d={e.d} />
        ))}
      </g>
      <g className="net__nodes">
        {nodes.map((n) => (
          <g key={n.index}>
            <circle data-core={n.index} className="net__core" cx={n.x} cy={n.y} r={n.layer === lastLayer ? 5 : 2.6} />
            <circle data-ring={n.index} className="net__ring" cx={n.x} cy={n.y} r={n.r} />
          </g>
        ))}
      </g>
      <g className="net__labels">
        {nodes
          .filter((n) => n.layer === lastLayer)
          .map((n) => (
            <text key={n.index} x={n.x + n.r + 14} y={n.y + 4}>
              {OUTPUT_LABELS[n.slot]}
            </text>
          ))}
      </g>
    </svg>
  )
})
