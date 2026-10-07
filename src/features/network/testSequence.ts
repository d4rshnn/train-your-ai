import type { Prediction } from '../sim/types'
import type { NetworkEngine } from './engine'
import type { InferencePlan } from './inference'
import { LAYERS } from './layout'
import { NET_POS } from './placement'
import { Timeline } from './timeline'
import type { Sequence } from './trainingSequence'

/** Beat times in seconds at 1x (plan section 4, S5). */
export const TEST_BEAT = { card: 0, shrink: 0.8, shrinkDur: 0.6, burst: 1.1, pulse: 1.4, pulseDur: 1.9, bars: 3.4, barsDur: 1.2, verdict: 4.6, settled: 5.0 } as const

export const CAPTION_NEW = 'A new cat. It has never seen this one.'
/** "Sure", never "accuracy": how sure the AI is is a different thing from how often it is right. */
export const sureCaption = (catPercent: number) => `It's ${catPercent}% sure this is a cat.`

/** Where the unseen card rests (stage px). */
export const TEST_CARD = { x: 1102, y: 150, size: 170 }

const HERO = NET_POS.hero
const ease = (p: number) => 1 - Math.pow(1 - p, 3)

export type TestUi = {
  card: HTMLElement | null
  setCaption(which: 'new' | 'done'): void
  /** Bars fade in. */
  showBars(): void
  /** p in 0..1: widths and numbers count up to the final percentages. */
  setBars(p: number): void
  showVerdict(): void
  onSettled(): void
}

export type TestSequenceOptions = {
  engine: NetworkEngine
  plan: InferencePlan
  prediction: Prediction
  speed: number
  ui: TestUi
}

export function startTestSequence({ engine, plan, prediction, speed, ui }: TestSequenceOptions): Sequence {
  const { layout } = engine
  const tl = new Timeline(speed)
  const anims: Animation[] = []
  let skipped = false
  let settledFired = false
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const animate = (el: Element, keyframes: Keyframe[], ms: number, easing = 'cubic-bezier(.22,.8,.24,1)') => {
    const a = el.animate(keyframes, { duration: ms / speed, easing, fill: 'both' })
    anims.push(a)
    return a
  }

  engine.clearTransient()
  engine.setChaos(0)
  engine.setAmbientScale(0.4)

  const inNodes = layout.layers[0]
  const outNodes = layout.layers[LAYERS.length - 1]
  const inX = inNodes.reduce((s, n) => s + layout.nodes[n].x, 0) / inNodes.length
  const inY = inNodes.reduce((s, n) => s + layout.nodes[n].y, 0) / inNodes.length
  const cardCx = TEST_CARD.x + TEST_CARD.size / 2
  const cardCy = TEST_CARD.y + TEST_CARD.size / 2
  const lenOf = (edges: number[]) => edges.reduce((s, e) => s + layout.edges[e].len, 0)
  const predictedIdx = ['cat', 'dog', 'other'].indexOf(prediction.predicted)
  const probs = [prediction.probs.cat, prediction.probs.dog, prediction.probs.other]

  ui.setCaption('new')
  ui.setBars(0)

  // 0 - 0.8: the unseen card arrives from the right
  if (ui.card) animate(ui.card, [{ transform: 'translateX(340px)', opacity: 0 }, { transform: 'none', opacity: 1 }], TEST_BEAT.shrink * 1000)

  // 0.8 - 1.4: it shrinks into the input layer as a burst of particles (like training, but one card, brighter)
  tl.at(TEST_BEAT.shrink, () => {
    if (!ui.card) return
    const tx = HERO.x + inX - 46 - cardCx
    const ty = HERO.y + inY - cardCy
    animate(ui.card, [{ transform: 'none', opacity: 1 }, { transform: `translate(${tx}px, ${ty}px) scale(0.22)`, opacity: 0.9, offset: 0.82 }, { transform: `translate(${tx}px, ${ty}px) scale(0.12)`, opacity: 0 }], TEST_BEAT.shrinkDur * 1000, 'cubic-bezier(.45,0,.25,1)')
  })
  tl.at(TEST_BEAT.burst, () => {
    for (let j = 0; j < 14; j++) {
      const jitter = (((j * 37) % 13) - 6) * 1.6
      engine.spark(inX - 46 + jitter, inY + jitter * 1.4, inNodes[j % inNodes.length], 0.32 / speed, 1)
    }
  })

  // 1.4 - 3.4: the inference pulse. Right answer: one coherent bright wave. Wrong answer: it hesitates, splits, stays weak.
  tl.at(TEST_BEAT.pulse, () => {
    if (plan.coherent) {
      for (const path of plan.paths) engine.pulse(path, { speed: (lenOf(path) / TEST_BEAT.pulseDur) * speed, bright: plan.strength })
    } else {
      for (const path of plan.paths) {
        const first = path.slice(0, 2)
        engine.pulse(first, { speed: (lenOf(first) / 0.6) * speed, bright: 0.5 })
      }
      // hesitation: the middle layer flickers, then the pulses go on to different outputs
      tl.at(TEST_BEAT.pulse + 0.7, () => layout.layers[2].forEach((n) => engine.flare(n, 0.55)))
      tl.at(TEST_BEAT.pulse + 1.0, () => {
        for (const path of plan.paths) {
          const rest = path.slice(2)
          engine.pulse(rest, { speed: (lenOf(rest) / 0.9) * speed, bright: 0.4 })
        }
      })
    }
  })
  tl.at(TEST_BEAT.bars - 0.1, () => outNodes.forEach((n, i) => engine.flare(n, plan.coherent ? (i === predictedIdx ? 1 : 0.2) : 0.35 + 0.6 * probs[i])))

  // 3.4 - 4.6: bars appear and count up. 4.6 - 5.0: verdict.
  tl.at(TEST_BEAT.bars, () => ui.showBars())
  tl.tween(TEST_BEAT.bars, TEST_BEAT.barsDur, (p) => ui.setBars(ease(p)))
  tl.at(TEST_BEAT.verdict, () => {
    ui.setCaption('done')
    ui.showVerdict()
    engine.setAmbientScale(1)
  })
  tl.at(TEST_BEAT.settled, () => {
    if (settledFired) return
    settledFired = true
    ui.onSettled()
  })

  const unhook = engine.addFrameHook((dt) => tl.tick(dt))

  const skip = () => {
    if (skipped) return
    skipped = true
    tl.skip()
    engine.clearTransient()
    ui.setBars(1)
    ui.showBars()
    ui.showVerdict()
    ui.setCaption('done')
    engine.setAmbientScale(1)
    anims.forEach((a) => a.finish())
    if (!settledFired) {
      settledFired = true
      ui.onSettled()
    }
  }
  // reduced motion: show the result at once
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
      engine.clearTransient()
      engine.setAmbientScale(1)
    },
  }
}
