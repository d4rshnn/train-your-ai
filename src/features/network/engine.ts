import { pointOnEdge, type Layout } from './layout'

export type Quality = 'high' | 'low'

type QualitySettings = {
  ambient: number // target ambient particles
  halos: boolean // glow sprites behind every node
  shimmer: boolean // low-contrast moving edge brightness
  dprCap: number
}
const QUALITY: Record<Quality, QualitySettings> = {
  high: { ambient: 30, halos: true, shimmer: true, dprCap: 1.5 },
  low: { ambient: 10, halos: false, shimmer: false, dprCap: 1 },
}

export const MAX_PARTICLES = 300
const SPRITE = 64

const AMBIENT = 0 // random walk along edges, left to right
const PULSE = 1 // follows a fixed chain of edges, then ends
const SPARK = 2 // straight burst from a point into a node

export type EngineOptions = {
  svg: SVGSVGElement
  canvas: HTMLCanvasElement
  layout: Layout
  accentRgb: string // "r, g, b"
  quality?: Quality
  /** prefers-reduced-motion: draw one still frame, no loop. */
  still?: boolean
}

export type EngineStats = { fps: number; frameMs: number; worstMs: number; workMs: number; particles: number; quality: Quality }

export type PulseOptions = {
  bright?: number
  /** px per second */
  speed?: number
  /** how much each node on the way raises its resting level (the "learning" accumulating) */
  restBump?: number
  onEnd?: () => void
}

type PathSlot = { edges: number[]; restBump: number; onEnd?: () => void }

function makeSprite(rgb: string, core = 1): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = c.height = SPRITE
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(SPRITE / 2, SPRITE / 2, 0, SPRITE / 2, SPRITE / 2, SPRITE / 2)
  grad.addColorStop(0, `rgba(${rgb}, ${core})`)
  grad.addColorStop(0.25, `rgba(${rgb}, ${0.45 * core})`)
  grad.addColorStop(1, `rgba(${rgb}, 0)`)
  g.fillStyle = grad
  g.fillRect(0, 0, SPRITE, SPRITE)
  return c
}

/**
 * One rAF loop owns all per-frame state. React never re-renders per frame: the SVG elements are mutated directly
 * (with a dirty check) and particles/glows are drawn on a canvas. Glow is a pre-rendered sprite, never shadowBlur.
 * Screens drive it through small imperative methods (pulse, spark, flare, blend...) and register frame hooks.
 */
export class NetworkEngine {
  readonly layout: Layout
  private readonly svg: SVGSVGElement
  private readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D
  private readonly sprite: HTMLCanvasElement
  private readonly spriteHot: HTMLCanvasElement
  private q: QualitySettings
  private quality: Quality
  readonly still: boolean
  private raf = 0
  private last = 0
  private time = 0
  private scale = 1
  private hooks = new Set<(dt: number) => void>()

  // when the network is off screen (opacity 0) nothing is simulated or drawn; frame hooks still run
  private suspended = false

  // global look controls
  private chaos = 0
  private ambientScale = 1
  private ambientOverride: number | null = null

  // node state
  readonly act: Float32Array // current activation 0..1
  readonly rest: Float32Array // resting level the node settles back to
  private readonly phase: Float32Array
  private readonly nodeRing: SVGCircleElement[] = []
  private readonly nodeCore: SVGCircleElement[] = []
  private readonly nodeRingR: Float32Array
  private readonly nodeOpacity: Float32Array
  private readonly nodeDx: Float32Array
  private readonly nodeDy: Float32Array

  // edge state
  readonly memory: Float32Array // learned weight 0..1 (thickens + brightens)
  readonly suppress: Float32Array // 0..1 dims edges that were not learned
  private readonly glow: Float32Array // transient brightness while a particle travels
  private readonly edgePhase: Float32Array
  private readonly edgeEls: SVGPathElement[] = []
  private readonly edgeOp: Float32Array
  private readonly edgeW: Float32Array
  private readonly m0: Float32Array
  private readonly s0: Float32Array
  private readonly r0: Float32Array

  // particle pool (struct of arrays)
  private readonly pOn = new Uint8Array(MAX_PARTICLES)
  private readonly pKind = new Uint8Array(MAX_PARTICLES)
  private readonly pEdge = new Int16Array(MAX_PARTICLES)
  private readonly pT = new Float32Array(MAX_PARTICLES)
  private readonly pSpeed = new Float32Array(MAX_PARTICLES) // px/s (edge kinds) or 1/duration (spark)
  private readonly pSize = new Float32Array(MAX_PARTICLES)
  private readonly pBright = new Float32Array(MAX_PARTICLES)
  private readonly pPath = new Int16Array(MAX_PARTICLES).fill(-1)
  private readonly pStep = new Uint8Array(MAX_PARTICLES)
  private readonly pAx = new Float32Array(MAX_PARTICLES)
  private readonly pAy = new Float32Array(MAX_PARTICLES)
  private readonly pBx = new Float32Array(MAX_PARTICLES)
  private readonly pBy = new Float32Array(MAX_PARTICLES)
  private readonly pNode = new Int16Array(MAX_PARTICLES)
  private readonly paths: (PathSlot | null)[] = []
  private activeCount = 0
  private spawnClock = 0
  private seed = 1234567
  private readonly tmp = { x: 0, y: 0 }

  // stats
  private readonly frames = new Float32Array(120)
  private readonly work = new Float32Array(120) // JS time per frame (update + draw)
  private frameN = 0
  private worst = 0
  private slowStreak = 0

  constructor(opts: EngineOptions) {
    this.layout = opts.layout
    this.svg = opts.svg
    this.canvas = opts.canvas
    this.ctx = opts.canvas.getContext('2d')!
    this.quality = opts.quality ?? 'high'
    this.q = QUALITY[this.quality]
    this.still = !!opts.still
    this.sprite = makeSprite(opts.accentRgb, 0.9)
    this.spriteHot = makeSprite('230, 255, 240', 1)

    const { nodes, edges } = this.layout
    this.act = new Float32Array(nodes.length)
    this.rest = new Float32Array(nodes.length).fill(0.08)
    this.phase = Float32Array.from(nodes, (_, i) => this.rand() * Math.PI * 2 + i)
    this.nodeRingR = Float32Array.from(nodes, (n) => n.r)
    this.nodeOpacity = new Float32Array(nodes.length).fill(-1)
    this.nodeDx = new Float32Array(nodes.length)
    this.nodeDy = new Float32Array(nodes.length)
    this.memory = new Float32Array(edges.length)
    this.suppress = new Float32Array(edges.length)
    this.glow = new Float32Array(edges.length)
    this.edgePhase = Float32Array.from(edges, () => this.rand() * Math.PI * 2)
    this.edgeOp = new Float32Array(edges.length).fill(-1)
    this.edgeW = new Float32Array(edges.length).fill(-1)
    this.m0 = new Float32Array(edges.length)
    this.s0 = new Float32Array(edges.length)
    this.r0 = new Float32Array(nodes.length)

    this.svg.querySelectorAll<SVGPathElement>('[data-edge]').forEach((el) => (this.edgeEls[+el.dataset.edge!] = el))
    this.svg.querySelectorAll<SVGCircleElement>('[data-ring]').forEach((el) => (this.nodeRing[+el.dataset.ring!] = el))
    this.svg.querySelectorAll<SVGCircleElement>('[data-core]').forEach((el) => (this.nodeCore[+el.dataset.core!] = el))

    this.resize()
    this.populate()
  }

  // ---- lifecycle ---------------------------------------------------------
  start() {
    if (this.still) {
      this.render()
      return
    }
    if (this.raf) return
    this.last = performance.now()
    this.raf = requestAnimationFrame(this.tick)
  }

  stop() {
    cancelAnimationFrame(this.raf)
    this.raf = 0
  }

  setQuality(q: Quality) {
    this.quality = q
    this.q = QUALITY[q]
    this.resize()
  }

  /** Stop simulating and drawing while the network is invisible (saves CPU/GPU on the other screens). */
  setSuspended(on: boolean) {
    this.suspended = on
  }

  getQuality(): Quality {
    return this.quality
  }

  /** Run fn(dt) inside the engine loop (this is how a Timeline is driven). Returns an unsubscribe function. */
  addFrameHook(fn: (dt: number) => void): () => void {
    this.hooks.add(fn)
    return () => this.hooks.delete(fn)
  }

  getStats(): EngineStats {
    const n = Math.min(this.frameN, this.frames.length)
    let sum = 0
    let w = 0
    for (let i = 0; i < n; i++) {
      sum += this.frames[i]
      w += this.work[i]
    }
    const avg = n ? sum / n : 0
    return { fps: avg ? 1000 / avg : 0, frameMs: avg, worstMs: this.worst, workMs: n ? w / n : 0, particles: this.activeCount, quality: this.quality }
  }

  resetStats() {
    this.frameN = 0
    this.worst = 0
  }

  /** Match the canvas backing store to its CSS size (DPR clamped to 1.5). */
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, this.q.dprCap)
    const cssW = this.canvas.clientWidth || this.layout.width
    this.canvas.width = Math.round(cssW * dpr)
    this.canvas.height = Math.round((cssW * dpr * this.layout.height) / this.layout.width)
    this.scale = this.canvas.width / this.layout.width
  }

  // ---- looks ---------------------------------------------------------------
  /** 0..1: random node wobble and edge flicker (the untrained, restless look). */
  setChaos(c: number) {
    this.chaos = c
  }

  /** Multiplier on the ambient particle target (training quiets the background flow). */
  setAmbientScale(s: number) {
    this.ambientScale = s
  }

  /** Force the number of free-roaming particles (stress test). null restores normal behaviour. */
  setAmbientOverride(n: number | null) {
    this.ambientOverride = n
  }

  /** Forget everything learned: weights, suppression, resting levels, in-flight non-ambient particles. */
  resetLearning() {
    this.memory.fill(0)
    this.suppress.fill(0)
    this.rest.fill(0.08)
    this.glow.fill(0)
    this.clearTransient()
    this.chaos = 0
    this.ambientScale = 1
  }

  /** Remove pulses and sparks (used when a sequence is skipped or cancelled). */
  clearTransient() {
    for (let i = 0; i < MAX_PARTICLES; i++) if (this.pOn[i] && this.pKind[i] !== AMBIENT) this.kill(i, false)
  }

  /** Light a node up now; it decays back to its resting level. */
  flare(node: number, amount = 1) {
    this.act[node] = Math.max(this.act[node], amount)
  }

  /** Snapshot the current learned state so blend() can ease from it. */
  beginBlend() {
    this.m0.set(this.memory)
    this.s0.set(this.suppress)
    this.r0.set(this.rest)
  }

  /** Ease the learned state from the snapshot towards a target; p is 0..1. */
  blend(target: { memory: Float32Array; suppress: Float32Array; rest?: Float32Array }, p: number) {
    for (let i = 0; i < this.memory.length; i++) {
      this.memory[i] = this.m0[i] + (target.memory[i] - this.m0[i]) * p
      this.suppress[i] = this.s0[i] + (target.suppress[i] - this.s0[i]) * p
    }
    if (target.rest) for (let i = 0; i < this.rest.length; i++) this.rest[i] = this.r0[i] + (target.rest[i] - this.r0[i]) * p
  }

  // ---- particles -----------------------------------------------------------
  private rand(): number {
    // xorshift32, deterministic
    let x = this.seed
    x ^= x << 13
    x ^= x >>> 17
    x ^= x << 5
    this.seed = x >>> 0
    return this.seed / 4294967296
  }

  private populate() {
    for (let i = 0; i < this.q.ambient; i++) this.spawnAmbient(this.randomEdge(), this.rand())
  }

  private randomEdge(): number {
    return Math.floor(this.rand() * this.layout.edges.length)
  }

  private firstLayerEdge(): number {
    const first = this.layout.layers[0]
    const outs = this.layout.outEdges[first[Math.floor(this.rand() * first.length)]]
    return outs[Math.floor(this.rand() * outs.length)]
  }

  /** A free slot; if the pool is full, a non-ambient request evicts an ambient particle so bursts still show. */
  private slot(evict: boolean): number {
    for (let i = 0; i < MAX_PARTICLES; i++) if (!this.pOn[i]) return i
    if (!evict) return -1
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (this.pOn[i] && this.pKind[i] === AMBIENT) {
        this.kill(i, false)
        return i
      }
    }
    return -1
  }

  private take(i: number, kind: number) {
    this.pOn[i] = 1
    this.pKind[i] = kind
    this.pPath[i] = -1
    this.pStep[i] = 0
    this.activeCount++
  }

  private kill(i: number, fireEnd: boolean) {
    this.pOn[i] = 0
    this.activeCount--
    const id = this.pPath[i]
    if (id >= 0) {
      const slot = this.paths[id]
      this.paths[id] = null
      this.pPath[i] = -1
      if (fireEnd) slot?.onEnd?.()
    }
  }

  private spawnAmbient(edge: number, t: number): number {
    const i = this.slot(false)
    if (i < 0) return -1
    this.take(i, AMBIENT)
    this.pEdge[i] = edge
    this.pT[i] = t
    this.pSpeed[i] = 55 + this.rand() * 45
    this.pSize[i] = 5 + this.rand() * 4
    this.pBright[i] = 0.5 * (0.7 + this.rand() * 0.5)
    return i
  }

  /** A bright pulse that follows a chain of consecutive edges, flaring each node it reaches. */
  pulse(edges: number[], opts: PulseOptions = {}): number {
    const i = this.slot(true)
    if (i < 0 || !edges.length) return -1
    this.take(i, PULSE)
    let id = this.paths.indexOf(null)
    if (id < 0) id = this.paths.length
    this.paths[id] = { edges, restBump: opts.restBump ?? 0, onEnd: opts.onEnd }
    this.pPath[i] = id
    this.pEdge[i] = edges[0]
    this.pT[i] = 0
    this.pSpeed[i] = opts.speed ?? 480
    this.pSize[i] = 9 + this.rand() * 4
    this.pBright[i] = opts.bright ?? 0.95
    return i
  }

  /** A short straight burst from a point (stage-local network coordinates) into a node. */
  spark(fromX: number, fromY: number, node: number, durationSec: number, bright = 0.9): number {
    const i = this.slot(true)
    if (i < 0) return -1
    const n = this.layout.nodes[node]
    this.take(i, SPARK)
    this.pAx[i] = fromX
    this.pAy[i] = fromY
    this.pBx[i] = n.x
    this.pBy[i] = n.y
    this.pNode[i] = node
    this.pT[i] = 0
    this.pSpeed[i] = 1 / Math.max(0.05, durationSec)
    this.pSize[i] = 5 + this.rand() * 3
    this.pBright[i] = bright
    return i
  }

  // ---- frame ---------------------------------------------------------------
  private tick = (now: number) => {
    const dtMs = now - this.last
    this.last = now
    const dt = Math.min(0.05, dtMs / 1000)
    this.time += dt

    this.frames[this.frameN % this.frames.length] = dtMs
    this.frameN++
    if (this.frameN > 10) this.worst = Math.max(this.worst, dtMs)
    this.adapt(dtMs)

    const w0 = performance.now()
    for (const h of this.hooks) h(dt)
    if (!this.suspended) {
      this.update(dt)
      this.render()
    }
    this.work[(this.frameN - 1) % this.work.length] = performance.now() - w0
    this.raf = requestAnimationFrame(this.tick)
  }

  /** If the machine is clearly struggling for ~2 s, drop to the low quality tier automatically. */
  private adapt(dtMs: number) {
    if (this.quality === 'low') return
    this.slowStreak = dtMs > 26 ? this.slowStreak + 1 : Math.max(0, this.slowStreak - 2)
    if (this.slowStreak > 90) {
      this.slowStreak = 0
      this.setQuality('low')
    }
  }

  private update(dt: number) {
    const { nodes, edges, outEdges } = this.layout
    const kAct = 1 - Math.exp(-dt * 3)
    for (let i = 0; i < nodes.length; i++) this.act[i] += (this.rest[i] - this.act[i]) * kAct
    const kGlow = Math.exp(-dt * 2.6)
    for (let i = 0; i < edges.length; i++) this.glow[i] *= kGlow

    let ambient = 0
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (!this.pOn[i]) continue
      const kind = this.pKind[i]
      if (kind === SPARK) {
        this.pT[i] += this.pSpeed[i] * dt
        if (this.pT[i] >= 1) {
          this.act[this.pNode[i]] = Math.min(1, this.act[this.pNode[i]] + 0.35 * this.pBright[i])
          this.kill(i, false)
        }
        continue
      }
      const e = edges[this.pEdge[i]]
      this.pT[i] += (this.pSpeed[i] / e.len) * dt
      this.glow[e.index] = Math.max(this.glow[e.index], this.pBright[i] * 0.9)
      if (kind === AMBIENT) ambient++
      if (this.pT[i] < 1) continue

      if (kind === PULSE) {
        this.act[e.to] = Math.min(1, this.act[e.to] + 0.7 * this.pBright[i])
        const slot = this.paths[this.pPath[i]]
        if (slot && slot.restBump) this.rest[e.to] = Math.min(0.4, this.rest[e.to] + slot.restBump)
        const step = ++this.pStep[i]
        if (slot && step < slot.edges.length) {
          this.pEdge[i] = slot.edges[step]
          this.pT[i] = 0
        } else this.kill(i, true)
      } else {
        this.act[e.to] = Math.min(1, this.act[e.to] + 0.22 * this.pBright[i])
        const outs = outEdges[e.to]
        if (outs.length) {
          this.pEdge[i] = outs[Math.floor(this.rand() * outs.length)]
          this.pT[i] = 0
        } else this.kill(i, false)
      }
    }

    // keep the ambient flow at its target density
    const target = this.ambientOverride ?? Math.round(this.q.ambient * this.ambientScale)
    this.spawnClock += dt
    const burst = this.ambientOverride !== null
    if (ambient < target && (burst || this.spawnClock > 0.1)) {
      this.spawnClock = 0
      for (let n = 0; n < (burst ? 25 : 1) && ambient + n < target; n++) this.spawnAmbient(burst ? this.randomEdge() : this.firstLayerEdge(), burst ? this.rand() : 0)
    }
  }

  // ---- drawing -------------------------------------------------------------
  private render() {
    const { nodes, edges } = this.layout
    const ctx = this.ctx
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0)
    ctx.globalCompositeOperation = 'lighter'

    // node halos (sprite glow, no shadowBlur)
    for (const n of nodes) {
      const a = this.act[n.index]
      const breathe = this.still ? 0 : 0.5 + 0.5 * Math.sin(this.time * 0.9 + this.phase[n.index])
      const out = n.layer === this.layout.layers.length - 1
      if (!this.q.halos && !out && a < 0.3) continue
      const alpha = Math.min(1, 0.1 + 0.07 * breathe + 0.75 * a)
      const size = (n.r * 5 + a * 30) * (out ? 1.5 : 1)
      ctx.globalAlpha = alpha
      ctx.drawImage(this.sprite, n.x + this.nodeDx[n.index] - size / 2, n.y + this.nodeDy[n.index] - size / 2, size, size)
    }

    // particles: bright head plus a fading tail (shorter tails when the pool is crowded, to stay cheap)
    const heavy = this.activeCount > 150
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (!this.pOn[i]) continue
      const kind = this.pKind[i]
      const head = Math.min(1, this.pT[i])
      const trail = kind === PULSE ? (heavy ? 3 : 5) : heavy ? 1 : 3
      const stepPx = kind === PULSE ? 12 : 9
      const e = kind === SPARK ? null : edges[this.pEdge[i]]
      const stepT = kind === SPARK ? 0.07 : stepPx / e!.len
      for (let k = 0; k < trail; k++) {
        const t = head - k * stepT
        if (t < 0) break
        if (kind === SPARK) {
          const u = 1 - (1 - t) * (1 - t) // ease-out
          this.tmp.x = this.pAx[i] + (this.pBx[i] - this.pAx[i]) * u
          this.tmp.y = this.pAy[i] + (this.pBy[i] - this.pAy[i]) * u
        } else pointOnEdge(e!, t, this.tmp)
        const f = 1 - k / trail
        const s = this.pSize[i] * (k === 0 ? 1 : 0.7 * f) * 2.6
        const fade = kind === AMBIENT ? (head < 0.06 ? head / 0.06 : 1) * (head > 0.94 ? (1 - head) / 0.06 : 1) : 1
        ctx.globalAlpha = Math.min(1, this.pBright[i] * f * fade)
        ctx.drawImage(k === 0 && this.pBright[i] > 0.75 ? this.spriteHot : this.sprite, this.tmp.x - s / 2, this.tmp.y - s / 2, s, s)
      }
    }
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'

    this.paintSvg(nodes.length, edges.length)
  }

  /** Imperative SVG updates with a dirty check so unchanged attributes are never touched. */
  private paintSvg(nodeCount: number, edgeCount: number) {
    const t = this.time
    const chaos = this.chaos
    for (let i = 0; i < edgeCount; i++) {
      const el = this.edgeEls[i]
      if (!el) continue
      const ph = this.edgePhase[i]
      const shimmer = this.q.shimmer && !this.still ? 0.05 * Math.sin(t * 0.7 + ph) : 0
      const flicker = chaos > 0.01 ? chaos * 0.16 * Math.sin(t * 7.3 + ph * 3.1) * Math.sin(t * 3.7 + ph * 1.3) : 0
      const m = this.memory[i]
      const sp = this.suppress[i]
      const op = Math.max(0.04, (0.2 + shimmer + flicker + 0.55 * this.glow[i] + 0.5 * m) * (1 - 0.75 * sp))
      const w = (0.9 + 1.7 * m + 1.1 * this.glow[i]) * (1 - 0.3 * sp)
      if (Math.abs(op - this.edgeOp[i]) > 0.01) {
        this.edgeOp[i] = op
        el.style.strokeOpacity = op.toFixed(3)
      }
      if (Math.abs(w - this.edgeW[i]) > 0.02) {
        this.edgeW[i] = w
        el.style.strokeWidth = w.toFixed(2)
      }
    }
    for (let i = 0; i < nodeCount; i++) {
      const a = this.act[i]
      const n = this.layout.nodes[i]
      const breathe = this.still ? 0 : Math.sin(t * 0.9 + this.phase[i]) * 0.025
      const r = n.r * (1 + breathe + 0.18 * a)
      if (Math.abs(r - this.nodeRingR[i]) > 0.02) {
        this.nodeRingR[i] = r
        this.nodeRing[i]?.setAttribute('r', r.toFixed(2))
      }
      // restless wobble while untrained; settles to exactly 0
      const dx = chaos > 0.005 ? chaos * 2.4 * Math.sin(t * 2.1 + this.phase[i]) : 0
      const dy = chaos > 0.005 ? chaos * 2.4 * Math.cos(t * 1.7 + this.phase[i] * 1.4) : 0
      if (Math.abs(dx - this.nodeDx[i]) > 0.05 || Math.abs(dy - this.nodeDy[i]) > 0.05 || (chaos <= 0.005 && (this.nodeDx[i] || this.nodeDy[i]))) {
        this.nodeDx[i] = dx
        this.nodeDy[i] = dy
        const cx = (n.x + dx).toFixed(2)
        const cy = (n.y + dy).toFixed(2)
        const ring = this.nodeRing[i]
        const core = this.nodeCore[i]
        if (ring) (ring.setAttribute('cx', cx), ring.setAttribute('cy', cy))
        if (core) (core.setAttribute('cx', cx), core.setAttribute('cy', cy))
      }
      const op = 0.55 + 0.45 * a
      if (Math.abs(op - this.nodeOpacity[i]) > 0.01) {
        this.nodeOpacity[i] = op
        const core = this.nodeCore[i]
        if (core) core.style.fillOpacity = (0.25 + 0.75 * a).toFixed(2)
        const ring = this.nodeRing[i]
        if (ring) ring.style.strokeOpacity = op.toFixed(2)
      }
    }
  }
}
