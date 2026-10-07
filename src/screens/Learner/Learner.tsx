import { useCallback, useEffect, useRef, useState, type Dispatch, type MutableRefObject } from 'react'
import { TRAINING_EXAMPLES } from '../../data/examples'
import { imageUrl } from '../../features/cards/images'
import { cellDelay, cellNumber, cellsFromImageData, FACE_CROP, GRID, HIGHLIGHTS, showsNumber, stretchCells, tint, type Cell } from '../../features/explain/mosaic'
import type { NetworkEngine } from '../../features/network/engine'
import { drive, Timeline } from '../../features/network/timeline'
import type { Action } from '../../state/machine'
import { SKIP_AFTER_MS } from '../useScreenClock'
import './Learner.css'

/** The cat used for the explainer: a clear, front-facing training card. */
const CAT = TRAINING_EXAMPLES[0]

/** Each step advances on a tap or after 2.5 s; the last one holds for 2.5 s too, then the screen moves on (10 s in total). */
export const STEP_MS = 2500
export const CAPTIONS = [
  'This is a cat. To you, obviously.',
  'To an AI, a picture starts as just numbers.',
  'It has to find patterns.',
  'Like a kid who has only ever met white cats.',
] as const

/** Stage geometry (px). The card starts big and centred, then collapses to the left of the network. */
const BIG = { x: 483, y: 170, size: 400 }
const SMALL = { x: 150, y: 205, size: 300 }
const LABEL_X = 484
const LABEL_Y = [236, 272, 376, 466]
const ANCHOR_ANGLE = [-0.35, 0, 0, 0.78] // where the leader line leaves each ring (radians)
const PX = 480 // mosaic canvas backing size (20 px per cell)

const ease = (p: number) => 1 - Math.pow(1 - p, 3)
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))

type Props = {
  dispatch: Dispatch<Action>
  engineRef: MutableRefObject<NetworkEngine | null>
  /** The persistent network stays hidden until step 3, when the mosaic streams into it. */
  onNetworkHidden: (hidden: boolean) => void
}

export function Learner({ dispatch, engineRef, onNetworkHidden }: Props) {
  const [step, setStep] = useState(0)
  const [ready, setReady] = useState(false)
  const [lastReady, setLastReady] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cells = useRef<Cell[]>([])
  const accent = useRef<[number, number, number]>([47, 227, 122])
  const dissolved = useRef(0)

  const next = useCallback(() => setStep((s) => Math.min(3, s + 1)), [])

  // Sample the real image into 24 x 24 cells with a canvas (local file, no network).
  useEffect(() => {
    const rgb = getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb').trim()
    if (rgb) accent.current = rgb.split(',').map((n) => +n) as [number, number, number]
    const img = new Image()
    img.src = imageUrl(CAT) ?? ''
    let cancelled = false
    img
      .decode()
      .then(() => {
        if (cancelled) return
        const c = document.createElement('canvas')
        c.width = c.height = GRID
        const g = c.getContext('2d', { willReadFrequently: true })!
        g.imageSmoothingQuality = 'high'
        const side = FACE_CROP.size * img.naturalWidth
        g.drawImage(img, FACE_CROP.x * img.naturalWidth, FACE_CROP.y * img.naturalHeight, side, side, 0, 0, GRID, GRID)
        cells.current = stretchCells(cellsFromImageData(g.getImageData(0, 0, GRID, GRID).data))
        setReady(true)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  const paint = useCallback((p: number) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !cells.current.length) return
    dissolved.current = p
    ctx.clearRect(0, 0, PX, PX)
    const cs = PX / GRID
    ctx.font = '500 9px "JetBrains Mono", monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    cells.current.forEach((cell, i) => {
      const a = clamp((p - cellDelay(i) * 0.55) / 0.45, 0, 1)
      if (a <= 0) return
      const s = (cs - 2.5) * (0.6 + 0.4 * a)
      const x = (i % GRID) * cs + (cs - s) / 2
      const y = Math.floor(i / GRID) * cs + (cs - s) / 2
      const [r, g, b] = tint(cell, accent.current, 0.2)
      ctx.globalAlpha = a
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
      ctx.beginPath()
      ctx.roundRect(x, y, s, s, 3)
      ctx.fill()
      if (a > 0.8 && showsNumber(i)) {
        ctx.fillStyle = cell.lum > 140 ? 'rgba(7, 9, 10, 0.55)' : 'rgba(242, 245, 243, 0.5)'
        ctx.fillText(cellNumber(cell), x + s / 2, y + s / 2 + 0.5)
      }
    })
    ctx.globalAlpha = 1
  }, [])

  // photo -> mosaic dissolve
  useEffect(() => {
    if (step !== 1 || !ready) return
    const tl = new Timeline(1)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const apply = (p: number) => {
      paint(p)
      if (imgRef.current) imgRef.current.style.opacity = String(1 - ease(p))
    }
    if (reduced) apply(1)
    else tl.tween(0, 1.3, (p) => apply(ease(p)))
    const stop = drive(tl)
    return () => stop()
  }, [step, ready, paint])

  // if the visitor jumps ahead, make sure the mosaic is fully drawn
  useEffect(() => {
    if (step >= 2 && ready && dissolved.current < 1) {
      paint(1)
      if (imgRef.current) imgRef.current.style.opacity = '0'
    }
  }, [step, ready, paint])

  // step 3 (index 2): the mosaic streams into the network
  useEffect(() => {
    if (step !== 2) return
    let n = 0
    const timer = window.setInterval(() => {
      const engine = engineRef.current
      if (engine) {
        const inNodes = engine.layout.layers[0]
        inNodes.forEach((node, j) => engine.spark(-30, 150 + j * 38, node, 0.7, 0.8))
      }
      if (++n >= 7) window.clearInterval(timer)
    }, 330)
    return () => window.clearInterval(timer)
  }, [step, engineRef])

  useEffect(() => {
    onNetworkHidden(step < 2)
    return () => onNetworkHidden(false)
  }, [step, onNetworkHidden])

  // auto-advance: through the four captions, then on to Choose by itself (a tap moves on too, once the last line has had 1.5 s)
  const moved = useRef(false)
  const leave = useCallback(() => {
    if (moved.current) return
    moved.current = true
    dispatch({ type: 'ADVANCE' })
  }, [dispatch])
  useEffect(() => {
    const t = window.setTimeout(step >= 3 ? leave : next, STEP_MS)
    const r = step >= 3 ? window.setTimeout(() => setLastReady(true), SKIP_AFTER_MS) : undefined
    return () => {
      window.clearTimeout(t)
      window.clearTimeout(r)
    }
  }, [step, next, leave])

  const pos = step >= 2 ? `translate(${SMALL.x}px, ${SMALL.y}px) scale(${SMALL.size / BIG.size})` : `translate(${BIG.x}px, ${BIG.y}px)`

  return (
    <section className="wak" onPointerDown={step < 3 ? next : lastReady ? leave : undefined}>
      <h2 className="wak__headline">An AI doesn&apos;t know what a cat is.</h2>

      <div className="wak__card" style={{ transform: pos, width: BIG.size, height: BIG.size }}>
        {/* the photo is shown with the same head-and-shoulders crop that the mosaic is sampled from */}
        <img
          ref={imgRef}
          src={imageUrl(CAT)}
          alt="A fluffy white cat sitting and looking up"
          draggable={false}
          style={{ width: `${100 / FACE_CROP.size}%`, height: `${100 / FACE_CROP.size}%`, left: `${(-FACE_CROP.x / FACE_CROP.size) * 100}%`, top: `${(-FACE_CROP.y / FACE_CROP.size) * 100}%`, inset: 'auto' }}
        />
        <canvas ref={canvasRef} width={PX} height={PX} aria-hidden="true" />
      </div>

      {/* soft rings: patterns the model might learn to use, not detectors. Stage coordinates over the small mosaic. */}
      <svg className={`wak__rings ${step >= 2 ? 'is-on' : ''}`} viewBox="0 0 1366 768" aria-hidden={step < 2}>
        {HIGHLIGHTS.map((h, i) => {
          const last = h.rings[h.rings.length - 1]
          const ax = SMALL.x + (last.cx + last.rx * Math.cos(ANCHOR_ANGLE[i])) * SMALL.size
          const ay = SMALL.y + (last.cy + last.ry * Math.sin(ANCHOR_ANGLE[i])) * SMALL.size
          return (
            <g key={h.key} className="wak__ring" style={{ animationDelay: `${0.5 + i * 0.25}s` }}>
              {h.rings.map((r, k) => (
                <ellipse key={k} cx={SMALL.x + r.cx * SMALL.size} cy={SMALL.y + r.cy * SMALL.size} rx={r.rx * SMALL.size} ry={r.ry * SMALL.size} strokeDasharray={h.dashed ? '5 5' : undefined} />
              ))}
              <path d={`M${ax} ${ay}L${LABEL_X - 8} ${LABEL_Y[i]}`} />
              <text x={LABEL_X} y={LABEL_Y[i] + 4}>
                {h.label}
              </text>
            </g>
          )
        })}
      </svg>
      <p className={`wak__patterns ${step >= 2 ? 'is-on' : ''}`} style={{ left: LABEL_X, top: LABEL_Y[0] - 40 }}>
        Patterns it could use
      </p>

      <p className={`wak__tag ${step >= 1 ? 'is-on' : ''}`}>Simplified view</p>

      <p className={`wak__caption ${step >= 2 ? 'is-left' : ''}`} key={step} role="status">
        {CAPTIONS[step]}
      </p>

      {step < 3 || lastReady ? <p className="wak__hint">Tap to continue</p> : null}
    </section>
  )
}
