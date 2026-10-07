import { GOOD_SET, worstAchievableSet } from '../features/sim/fixtures'

/** ?autoplay runs the whole story by itself; ?autoplay&once plays one cycle and stops on the payoff (for recording). */
export function parseAutoplay(search: string): { enabled: boolean; once: boolean; fast: boolean } {
  const q = new URLSearchParams(search)
  return { enabled: q.has('autoplay'), once: q.has('once'), fast: q.has('fast') }
}

/**
 * Pauses (ms) between the scripted actions. The screens keep their own animations and auto-advance timers; these are
 * only the extra dwell times a person would spend reading, plus the pick pace. Tuned so one cycle is ~3 to 3.5 minutes.
 */
export const TIMING = {
  attract: 28_000, // S1 on screen before START
  explainerHold: 13_000, // S2 after the last caption appears, before CHOOSE EXAMPLES
  prePick: 8_000, // S3 before the first card (read the screen)
  pick: 400, // between cards flying into the tray
  prePickRound2: 8_000,
  swap: 800, // between swaps in round 2 (remove / add)
  prePlay: 6_000, // tray full, before TRAIN
  struggleHold: 30_000, // S6 reading time
  accuracyHold: 26_000, // S7 after the count-up, before CONTINUE
  payoffHold: 6_000, // S8 final state before looping (plan: hold ~6 s)
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
async function waitFor(selector: string, signal: AbortSignal, timeoutMs = 60_000): Promise<HTMLElement> {
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

export function swapPlan(from: string[], to: string[]): { remove: string[]; add: string[] } {
  return { remove: from.filter((id) => !to.includes(id)), add: to.filter((id) => !from.includes(id)) }
}

/** Run the scripted visitor. Resolves after a ?once cycle; otherwise loops until aborted. */
export async function runAutoplay({ once, signal, timing = TIMING, onFinished }: AutoplayOptions): Promise<void> {
  const worst = worstAchievableSet()
  const good = GOOD_SET
  const t = timing
  try {
    for (;;) {
      // S1 Attract
      await waitFor('.attract__start', signal)
      await sleep(t.attract, signal)
      await press('.attract__start', signal)

      // S2 What does the AI know? (its own steps advance by themselves, then the button appears)
      await waitFor('.wak__cta', signal)
      await sleep(t.explainerHold, signal)
      await press('.wak__cta', signal)

      // S3 Round 1: the worst achievable set, one card at a time
      await waitFor('.choose__grid', signal)
      await sleep(t.prePick, signal)
      for (const id of worst) {
        await pickCard(id, signal)
        await sleep(t.pick, signal)
      }
      await sleep(t.prePlay, signal)
      await press('.choose__train', signal)

      // S4 Training and S5 Test run on their own; S6 Struggle
      await waitFor('.struggle__cta', signal, 90_000)
      await sleep(t.struggleHold, signal)
      await press('.struggle__cta', signal)

      // S3 Round 2: the Round-1 picks are visibly swapped for the good set
      await waitFor('.choose__grid', signal)
      await sleep(t.prePickRound2, signal)
      const { remove, add } = swapPlan(worst, good)
      for (const id of remove) {
        await pickCard(id, signal) // clicking a selected card takes it out of the tray
        await sleep(t.swap, signal)
      }
      for (const id of add) {
        await pickCard(id, signal)
        await sleep(t.swap, signal)
      }
      await sleep(t.prePlay, signal)
      await press('.choose__train', signal)

      // S4, S5, then S7 Accuracy: wait for the count-up and the comparison, then CONTINUE
      await waitFor('.accuracy__after.is-on', signal, 90_000)
      await sleep(t.accuracyHold, signal)
      await press('.accuracy__cta', signal)

      // S8 Payoff: hold on the finished state
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
