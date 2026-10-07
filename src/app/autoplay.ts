import { worstAchievableSet } from '../features/sim/presets'

/** ?autoplay runs the whole story by itself; ?autoplay&once plays one cycle and stops on the payoff (for recording). */
export function parseAutoplay(search: string): { enabled: boolean; once: boolean; fast: boolean } {
  const q = new URLSearchParams(search)
  return { enabled: q.has('autoplay'), once: q.has('once'), fast: q.has('fast') }
}

/**
 * Pauses (ms) between the scripted actions. The screens keep their own animations and auto-advance timers (the intro
 * screens, training, test, why, the what-if replay and everywhere move on by themselves); these are only the extra dwell times a person would spend
 * reading, plus the pick pace. PLAN_V2 target: one cycle of about 2 minutes.
 */
export const TIMING = {
  attract: 24_000, // S1 on screen before START
  prePick: 5_000, // Choose: before the first card (read the screen)
  pick: 400, // between cards flying into the tray
  prePlay: 4_000, // tray full, before TRAIN
  compareHold: 8_000, // What if: after the side-by-side has counted up, before CONTINUE
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

      // What is AI?, Rules and the learner move on by themselves (about 38 s), straight into Choose

      // Choose: the one and only pick. The worst achievable set, so the story shows the struggle and then the what-if.
      await waitFor('.choose__grid', signal)
      await sleep(t.prePick, signal)
      for (const id of worst) {
        await pickCard(id, signal)
        await sleep(t.pick, signal)
      }
      await sleep(t.prePlay, signal)
      await press('.choose__train', signal)

      // Training, Test and Why move on by themselves; the what-if replay then shows the side-by-side and CONTINUE.
      // After CONTINUE the "everywhere" screen moves on by itself too.
      await waitFor('.whatif__continue', signal, 150_000)
      await sleep(t.compareHold, signal)
      await press('.whatif__continue', signal)

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
