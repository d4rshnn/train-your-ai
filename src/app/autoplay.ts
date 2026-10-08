import { worstAchievableSet } from '../features/sim/presets'

/** ?autoplay runs the whole story by itself; ?autoplay&once plays one cycle and stops on the payoff (for recording). */
export function parseAutoplay(search: string): { enabled: boolean; once: boolean; fast: boolean } {
  const q = new URLSearchParams(search)
  return { enabled: q.has('autoplay'), once: q.has('once'), fast: q.has('fast') }
}

/**
 * Pauses (ms) between the scripted actions. Every non-interactive screen now waits for a click on "Click for next"; the
 * driver clicks that very prompt after a dwell time (so nothing waits for a human). The screens keep their own animations;
 * these are the extra times a person would spend reading before clicking, plus the pick pace.
 */
export const TIMING = {
  attract: 24_000, // title on screen before START
  layers: 6_000, // aiLayers: after each reveal's prompt appears, before the click (time to read the new circle)
  quantumRead: 3_000, // quantumBit / quantumRun: before pressing MEASURE or RUN 100 TIMES
  quantumHold: 4_500, // quantumBit / quantumRun: after the result, before the click (time to read the result)
  meets: 8_000, // quantumMeets: after the prompt appears, before the click
  bridge: 3_500, // bridge: after the prompt appears, before the click
  intro: 2_000, // rules and the four learner steps: after the prompt appears, before the click
  prePick: 5_000, // Choose: before the first card (read the screen)
  pick: 400, // between cards flying into the tray
  prePlay: 4_000, // tray full, before TRAIN
  result: 2_500, // training stamp, test verdict, why, everywhere: after the prompt appears, before the click
  compareHold: 5_000, // What if: after the side-by-side has counted up, before the click
  payoffHold: 5_000, // Payoff final state before looping
} as const

export type Timing = { [K in keyof typeof TIMING]: number }

/** ?autoplay&fast (test-only): the dwell times shrink to a tenth so the loop can be checked in a minute or two. */
export function scaleTiming(t: Timing, factor: number): Timing {
  return Object.fromEntries(Object.entries(t).map(([k, v]) => [k, Math.max(100, Math.round(v * factor))])) as Timing
}

export type AutoplayOptions = {
  once: boolean
  signal: AbortSignal
  timing?: Timing
  /** Called when a single (?once) cycle has finished on the payoff screen. */
  onFinished?: () => void
}

/** How long a scripted step waits for a screen before giving up. Generous on purpose: a hidden or throttled window pauses the
 * animations (and so the prompts) for a long time, and autoplay should simply wait, not quietly stop. */
const PATIENCE_MS = 10 * 60_000

class Aborted extends Error {}

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(new Aborted())
    // The abort listener must be removed when the timer fires normally, otherwise every poll in waitFor() leaves one
    // behind on the signal for the whole run (a slow listener leak that a 10-cycle soak test caught).
    const onAbort = () => {
      window.clearTimeout(t)
      reject(new Aborted())
    }
    const t = window.setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal.addEventListener('abort', onAbort, { once: true })
  })

/** Poll until `selector` matches an enabled element (the screens render when the state machine gets there). */
async function waitFor(selector: string, signal: AbortSignal, timeoutMs = PATIENCE_MS): Promise<HTMLElement> {
  const start = performance.now()
  for (;;) {
    const el = document.querySelector<HTMLElement>(selector)
    if (el && !(el as HTMLButtonElement).disabled) return el
    if (performance.now() - start > timeoutMs) throw new Error(`autoplay: timed out waiting for ${selector}`)
    await sleep(100, signal)
  }
}

/**
 * Clicks the real DOM controls (not state dispatches), so the very same handlers, fly-to-tray animation and tray-rect
 * handoff run as for a visitor. Synthetic clicks are untrusted, which is how the exit listener tells them apart.
 */
async function press(selector: string, signal: AbortSignal) {
  ;(await waitFor(selector, signal)).click()
}

async function pickCard(id: string, signal: AbortSignal) {
  ;(await waitFor(`.card[data-id="${id}"]`, signal)).click()
}

/** Wait for the screen's "Click for next" prompt, dwell like a reader, then click it (the same Next a visitor uses). */
async function clickNext(dwell: number, signal: AbortSignal, timeoutMs = PATIENCE_MS) {
  await waitFor('.next-prompt', signal, timeoutMs)
  await sleep(dwell, signal)
  await press('.next-prompt', signal)
}

/** Run the scripted visitor. Resolves after a ?once cycle; otherwise loops until aborted. */
export async function runAutoplay({ once, signal, timing = TIMING, onFinished }: AutoplayOptions): Promise<void> {
  const worst = worstAchievableSet()
  const t = timing
  try {
    for (;;) {
      // Attract
      await waitFor('.attract__start', signal)
      await sleep(t.attract, signal)
      await press('.attract__start', signal)

      // Intro chapter. AI layers: three clicks (two reveals, then on)
      for (let i = 0; i < 3; i++) await clickNext(t.layers, signal)

      // A bit and a qubit: flip the normal bit, MEASURE the coin once, then on
      await waitFor('.qbit__switch', signal)
      await sleep(t.quantumRead, signal)
      await press('.qbit__switch', signal)
      await sleep(t.quantumRead / 2, signal)
      await press('.qbit__measure', signal)
      await clickNext(t.quantumHold, signal)

      // Run it 100 times: two runs, so the answers visibly differ, then on
      await waitFor('.qrun__run', signal)
      await sleep(t.quantumRead, signal)
      await press('.qrun__run', signal)
      await sleep(t.quantumHold, signal)
      await press('.qrun__run', signal)
      await clickNext(t.quantumHold, signal)

      await clickNext(t.meets, signal) // quantum + ML
      await clickNext(t.bridge, signal) // the bridge to the cat demo

      // Rules, then the learner's four steps (cat, numbers, patterns, exam strip): each waits for its prompt
      await clickNext(t.intro, signal)
      for (let step = 0; step < 4; step++) await clickNext(t.intro, signal)

      // Choose: the one and only pick. The worst achievable set, so the story shows the struggle and then the what-if.
      await waitFor('.choose__grid', signal)
      await sleep(t.prePick, signal)
      for (const id of worst) {
        await pickCard(id, signal)
        await sleep(t.pick, signal)
      }
      await sleep(t.prePlay, signal)
      await press('.choose__train', signal)

      // Training stamp, test verdict and why each wait for a click
      for (let i = 0; i < 3; i++) await clickNext(t.result, signal)

      // The what-if replay plays by itself; after the side-by-side has counted up there is one more click
      await clickNext(t.compareHold, signal)

      // It's everywhere
      await clickNext(t.result, signal)

      // Payoff: hold on the finished state
      await waitFor('.payoff__restart.is-on', signal)
      await sleep(t.payoffHold, signal)
      if (once) {
        onFinished?.()
        return
      }
      await press('.payoff__restart', signal)
    }
  } catch (e) {
    if (!(e instanceof Aborted)) throw e
  }
}
