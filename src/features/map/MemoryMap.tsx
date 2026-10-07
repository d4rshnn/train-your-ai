import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { CAT_CENTRE, CAT_R_MIN, layoutMap, MAP_H, MAP_W, OTHER_CENTRE, TEST_START } from '../sim/mapLayout'
import './MemoryMap.css'

/** Seconds the new cat takes to fly in. */
export const FLIGHT_S = 1.2
const DOT_R = 12

type Props = {
  /** The picked examples; dots appear as ids are added. */
  ids: string[]
  /** The new cat: pass it when it should fly in (its own `pCat` decides where it lands). */
  test?: { id: string; pCat: number } | null
  /** Seconds before the new cat starts flying, counted from when `test` is first passed. */
  testDelay?: number
  /** Seconds between dots appearing when they arrive together (Training / Why / What-if). 0 = they appear at once. */
  stagger?: number
  /** Seconds before the island grows to its final size (omit to follow the dots live, as on Choose). */
  growAfter?: number
  /** The width is set by the parent; the height follows. Labels and the tag are real text (min 14 px) over the picture. */
  className?: string
  /** Show the "Simplified view" tag. */
  tag?: boolean
  /** Names under each group. */
  labels?: boolean
  /** A "New cat" label by the new dot (only worth it on the large map). */
  newLabel?: boolean
}

const pct = (v: number, of: number) => `${(v / of) * 100}%`

/**
 * The memory map: every example the AI saw is a dot, similar ones sit close together, and the new picture lands where the
 * AI thinks it belongs. A simplified, deterministic picture of the simulation's own numbers (see sim/mapLayout.ts).
 */
export function MemoryMap({ ids, test = null, testDelay = 0, stagger = 0, growAfter, className = '', tag = true, labels = true, newLabel = false }: Props) {
  const layout = useMemo(() => layoutMap(ids, test), [ids, test])
  // the island starts small and grows once the dots are in (unless it is following a live pick)
  const [grown, setGrown] = useState(growAfter === undefined)
  useEffect(() => {
    if (growAfter === undefined) return setGrown(true)
    const t = window.setTimeout(() => setGrown(true), growAfter * 1000)
    return () => window.clearTimeout(t)
  }, [growAfter])

  const catR = grown ? layout.catR : CAT_R_MIN
  const t = layout.test
  const arrive = testDelay + FLIGHT_S
  const nearestIsCat = t?.nearest === 'cat'
  const nearest = nearestIsCat ? { ...CAT_CENTRE, r: catR } : { ...OTHER_CENTRE, r: layout.otherR }

  return (
    <div className={`map ${className}`} role="img" aria-label="Simplified map of the examples the AI has seen">
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} aria-hidden="true">
        <defs>
          <radialGradient id="map-island">
            <stop offset="0%" stopColor="rgb(var(--accent-rgb))" stopOpacity="0.2" />
            <stop offset="100%" stopColor="rgb(var(--accent-rgb))" stopOpacity="0.05" />
          </radialGradient>
        </defs>

        <circle className="map__island map__island--other" cx={OTHER_CENTRE.x} cy={OTHER_CENTRE.y} r={layout.otherR} />
        <circle className="map__island map__island--cat" cx={CAT_CENTRE.x} cy={CAT_CENTRE.y} style={{ r: catR }} />
        {t ? (
          <circle
            key={t.id + t.nearest}
            className="map__pulse"
            cx={nearest.x}
            cy={nearest.y}
            style={{ r: nearest.r, animationDelay: `${arrive}s` }}
          />
        ) : null}

        {layout.dots.map((d, i) => (
          <g key={d.id} className="map__dot" style={{ transform: `translate(${d.x}px, ${d.y}px)` }}>
            <g className={`map__dot-in is-${d.label}`} style={{ animationDelay: `${i * stagger}s` }}>
              <circle className="map__halo" r={DOT_R * 1.9} />
              <circle className="map__core" r={DOT_R} />
            </g>
          </g>
        ))}

        {t ? (
          <>
            <line
              className="map__trail"
              x1={TEST_START.x}
              y1={TEST_START.y}
              x2={t.x}
              y2={t.y}
              pathLength={1}
              style={{ animationDelay: `${testDelay}s` }}
            />
            <line
              className="map__link"
              x1={t.x}
              y1={t.y}
              x2={nearest.x}
              y2={nearest.y}
              pathLength={1}
              style={{ animationDelay: `${arrive}s` }}
            />
            <g transform={`translate(${t.x} ${t.y})`}>
              <g className={`map__test ${t.inside ? 'is-inside' : 'is-outside'}`} style={{ '--fx': `${TEST_START.x - t.x}px`, animationDelay: `${testDelay}s` } as CSSProperties}>
                <circle className="map__halo" r={DOT_R * 2.3} />
                <circle className="map__core" r={DOT_R * 1.15} />
              </g>
            </g>
          </>
        ) : null}
      </svg>

      {labels ? (
        <>
          <span className="map__label" style={{ left: pct(CAT_CENTRE.x, MAP_W), top: pct(MAP_H - 34, MAP_H) }}>
            Cat
          </span>
          <span className="map__label" style={{ left: pct(OTHER_CENTRE.x, MAP_W), top: pct(MAP_H - 34, MAP_H) }}>
            Not cat
          </span>
        </>
      ) : null}
      {t && newLabel ? (
        <span
          className={`map__new ${t.inside ? 'is-inside' : 'is-outside'}`}
          style={{ left: pct(t.x, MAP_W), top: pct(t.inside ? Math.max(24, CAT_CENTRE.y - catR - 36) : t.y - 44, MAP_H), animationDelay: `${arrive}s` }}
        >
          New cat
        </span>
      ) : null}
      {tag ? <span className="map__tag">Simplified view</span> : null}
    </div>
  )
}
