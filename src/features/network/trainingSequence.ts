import { stageScale } from '../../app/Stage'
import type { NetworkEngine } from './engine'
import { LAYERS } from './layout'
import { NET_POS } from './placement'
import { Timeline } from './timeline'
import type { TrainingPlan } from './training'

/** Beat times in seconds at 1x (plan section 4, S4). */
export const BEAT = {
  chip: 0.6,
  loop: 1.2,
  stagger: 0.45,
  cue: 3.0,
  settle: 5.7,
  settleDur: 1.5,
  sweep: 7.2,
  stamp: 8.0,
  settled: 8.5,
} as const

export const CAPTION_1 = 'We give the AI many labelled examples.'
export const CAPTION_2 = 'It looks for patterns that keep showing up.'

/** Left-hand feed of the 10 chosen cards, in stage coordinates. */
export const FEED_SIZE = 54
export const feedX = (i: number) => 48 + Math.round(16 * Math.sin((Math.PI * i) / 9))
export const feedY = (i: number) => 100 + i * 60

const HERO = NET_POS.hero
const PULSE_PX_S = 640
const ease = (p: number) => 1 - Math.pow(1 - p, 3)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export type SequenceUi = {
  /** The 10 feed card elements, in tray order. */
  feed: (HTMLElement | null)[]
  /** Overlay (stage coordinates) where label chips dock at the output nodes. */
  docks: HTMLElement
  setCaption(which: 1 | 2): void
  setChip(on: boolean): void
  /** Continuous 0..100; the component rounds it for display. */
  setProgress(pct: number): void
  setStamp(on: boolean): void
  /** Everything is on screen and settled (fires once, also after skip). */
  onSettled(): void
}

export type SequenceOptions = {
  engine: NetworkEngine
  plan: TrainingPlan
  /** 1 for round 1, 1/0.7 for round 2 (the visitor has seen it already). */
  speed: number
  /** Tray slot rects at the moment TRAIN was pressed (screen px), for the fly-in. */
  trayRects: Map<string, DOMRect>
  ui: SequenceUi
}

export type Sequence = { skip(): void; dispose(): void; readonly skipped: boolean }

export function startTrainingSequence({ engine, plan, speed, trayRects, ui }: SequenceOptions): Sequence {
  const { layout } = engine
  const tl = new Timeline(speed)
  const anims: Animation[] = []
  const temp: HTMLElement[] = []
  let skipped = false
  let settledFired = false

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const animate = (el: Element, keyframes: Keyframe[], ms: number, easing = 'cubic-bezier(.22,.8,.24,1)', delayMs = 0) => {
    const a = el.animate(keyframes, { duration: ms / speed, delay: delayMs / speed, easing, fill: 'both' })
    anims.push(a)
    return a
  }

  engine.resetLearning()
  engine.setAmbientScale(0.4)
  engine.setChaos(0)

  const inNodes = layout.layers[0]
  const outNodes = layout.layers[LAYERS.length - 1]
  const inX = inNodes.reduce((s, n) => s + layout.nodes[n].x, 0) / inNodes.length
  const inY = inNodes.reduce((s, n) => s + layout.nodes[n].y, 0) / inNodes.length
  const residualChaos = 0.12 * (1 - plan.crisp)
  const finalTarget = { memory: plan.finalMemory, suppress: plan.suppress, rest: plan.finalRest }

  // ---- t = 0: caption, chaos wakes up, cards fly from the tray into the feed ----
  ui.setCaption(1)
  ui.setProgress(0)
  tl.tween(0, 0.6, (p) => engine.setChaos(ease(p)))
  const scale = stageScale()
  plan.examples.forEach((ex, i) => {
    const el = ui.feed[i]
    const from = trayRects.get(ex.example.id)
    if (!el || !from) return
    const to = el.getBoundingClientRect()
    const dx = (from.left - to.left) / scale
    const dy = (from.top - to.top) / scale
    animate(el, [{ transform: `translate(${dx}px, ${dy}px) scale(${from.width / to.width})`, opacity: 0.9 }, { transform: 'none', opacity: 1 }], 520, undefined, i * 40)
  })

  // ---- 0.6 - 1.2: TRAINING chip, input nodes wake up one by one ----
  tl.at(BEAT.chip, () => ui.setChip(true))
  inNodes.forEach((n, k) => tl.at(BEAT.chip + k * 0.1, () => engine.flare(n, 0.9)))

  // ---- 1.2 - 5.7: the example loop (10 x 0.45 s, overlapping) ----
  plan.examples.forEach((ex, i) => {
    const s = BEAT.loop + i * BEAT.stagger
    const pathSeconds = Math.max(...ex.paths.map((p) => p.reduce((sum, e) => sum + layout.edges[e].len, 0))) / PULSE_PX_S
    const feedEl = ui.feed[i]
    const cx = feedX(i) + FEED_SIZE / 2
    const cy = feedY(i) + FEED_SIZE / 2

    // (a) the card slides to the input layer and shrinks to a chip
    tl.at(s, () => {
      if (!feedEl) return
      const tx = HERO.x + inX - 46 - cx
      const ty = HERO.y + inY - cy
      animate(feedEl, [{ transform: 'none', opacity: 1 }, { transform: `translate(${tx}px, ${ty}px) scale(0.3)`, opacity: 0.9, offset: 0.8 }, { transform: `translate(${tx}px, ${ty}px) scale(0.2)`, opacity: 0 }], 380, 'cubic-bezier(.45,0,.25,1)')
    })

    // (b) the chip bursts into 6-10 particles that stream into the input nodes
    tl.at(s + 0.3, () => {
      const count = 6 + (i % 5)
      for (let j = 0; j < count; j++) {
        const jitter = (((j * 37 + i * 11) % 13) - 6) * 1.6
        engine.spark(inX - 46 + jitter, inY + jitter * 1.4, inNodes[j % inNodes.length], 0.3 / speed)
      }
    })

    // (c) + (d) attribute-seeded pulses cross the network; nodes flare and their resting level creeps up
    tl.at(s + 0.5, () => {
      for (const path of ex.paths) engine.pulse(path, { speed: PULSE_PX_S * speed, restBump: 0.012, bright: 0.95 })
    })

    // (e) label chip docks at the matching output node, progress steps by 10%
    tl.at(s + 0.5 + pathSeconds + 0.05, () => {
      engine.flare(ex.outputNode, 1)
      engine.rest[ex.outputNode] = Math.min(0.5, engine.rest[ex.outputNode] + 0.03)
      const n = layout.nodes[ex.outputNode]
      const chip = document.createElement('div')
      chip.className = `dock ${ex.example.label === 'cat' ? 'is-cat' : ''}`
      chip.textContent = ex.example.label === 'cat' ? 'CAT' : 'NOT CAT'
      chip.style.left = `${HERO.x + n.x + 24}px`
      chip.style.top = `${HERO.y + n.y - 11}px`
      ui.docks.appendChild(chip)
      temp.push(chip)
      const a = animate(chip, [{ opacity: 0, transform: 'translateX(-10px) scale(0.9)' }, { opacity: 1, transform: 'none', offset: 0.2 }, { opacity: 1, transform: 'none', offset: 0.7 }, { opacity: 0, transform: 'translateX(6px)' }], 800)
      a.onfinish = () => chip.remove()
    })
    tl.tween(s + 0.5 + pathSeconds + 0.05, 0.35, (() => {
      const from = i * 10
      return (p: number) => ui.setProgress(lerp(from, from + 10, ease(p)))
    })())
  })

  // ---- ~3.0: the frequently used edges thicken and settle, rarely used ones thin ----
  const cueTarget = {
    memory: Float32Array.from(plan.finalMemory, (v) => v * 0.6),
    suppress: Float32Array.from(plan.suppress, (v) => v * 0.45),
  }
  tl.at(BEAT.cue, () => {
    ui.setCaption(2)
    engine.beginBlend()
  })
  tl.tween(BEAT.cue, 0.8, (p) => engine.blend(cueTarget, ease(p)))

  // ---- 5.7 - 7.2: settling. Chaos fades, the spine organises, outputs separate ----
  tl.at(BEAT.settle, () => engine.beginBlend())
  tl.tween(BEAT.settle, BEAT.settleDur, (p) => {
    engine.blend(finalTarget, ease(p))
    engine.setChaos(lerp(1, residualChaos, ease(p)))
  })

  // ---- 7.2 - 8.0: one clean wave left to right along the spine ----
  const spineByLayer = Array.from({ length: LAYERS.length - 1 }, (_, l) => plan.spine.filter((e) => layout.nodes[layout.edges[e].from].layer === l))
  spineByLayer.forEach((edges, l) =>
    tl.at(BEAT.sweep + l * 0.2, () => {
      for (const e of edges) engine.pulse([e], { speed: 900 * speed, bright: 1 })
      for (const n of layout.layers[l]) engine.flare(n, 0.7)
    }),
  )
  tl.at(BEAT.sweep + 0.8, () => outNodes.forEach((n) => engine.flare(n, 0.9)))

  // ---- 8.0 - 8.5: MODEL TRAINED ----
  tl.at(BEAT.stamp, () => {
    ui.setStamp(true)
    engine.setAmbientScale(1)
  })
  tl.at(BEAT.settled, () => {
    if (settledFired) return
    settledFired = true
    ui.onSettled()
  })

  const unhook = engine.addFrameHook((dt) => tl.tick(dt))

  const skip = () => {
    if (skipped) return
    skipped = true
    tl.skip()
    // land exactly on the settled state, whatever was in flight
    engine.clearTransient()
    engine.beginBlend()
    engine.blend(finalTarget, 1)
    engine.setChaos(residualChaos)
    engine.setAmbientScale(1)
    ui.setProgress(100)
    ui.setCaption(2)
    ui.setChip(true)
    ui.setStamp(true)
    anims.forEach((a) => a.finish())
    temp.forEach((el) => el.remove())
    if (!settledFired) {
      settledFired = true
      ui.onSettled()
    }
  }

  // Reduced motion (or a stopped engine): show the end state at once.
  if (reduced || engine.still) skip()

  return {
    skip,
    get skipped() {
      return skipped
    },
    dispose() {
      unhook()
      tl.cancel()
      anims.forEach((a) => a.cancel())
      temp.forEach((el) => el.remove())
      engine.clearTransient()
      engine.setAmbientScale(1)
    },
  }
}
