import { lazy, Suspense, useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { Background } from '../components/Background'
import { BrandMark } from '../components/BrandMark'
import { ALL_EXAMPLES } from '../data/examples'
import { preloadImages } from '../features/cards/images'
import { Footer } from '../components/Footer'
import { StepDots } from '../components/StepDots'
import type { NetworkEngine } from '../features/network/engine'
import { recordTrayRects } from '../features/cards/trayHandoff'
import { Network } from '../features/network/Network'
import { NET_POS, placeFor } from '../features/network/placement'
import { Attract } from '../screens/Attract/Attract'
import { Choose } from '../screens/Choose/Choose'
import { Everywhere } from '../screens/Everywhere/Everywhere'
import { Learner } from '../screens/Learner/Learner'
import { Payoff } from '../screens/Payoff/Payoff'
import { Placeholder } from '../screens/Placeholder'
import { Rules } from '../screens/Rules/Rules'
import { Test } from '../screens/Test/Test'
import { Training } from '../screens/Training/Training'
import { WhatIf } from '../screens/WhatIf/WhatIf'
import { WhatIsAi } from '../screens/WhatIsAi/WhatIsAi'
import { Why } from '../screens/Why/Why'
import { initialState, reducer } from '../state/machine'
import { stepIndex } from '../state/selectors'
import { parseAutoplay, scaleTiming, TIMING } from './autoplay'
import { IdleOverlay } from './IdleOverlay'
import { nextIdleStep, useIdleWatcher } from './idle'
import { Stage } from './Stage'
import './Overlay.css'

const DevPanel = lazy(() => import('../features/dev/DevPanel'))
const DEV_PANEL = new URLSearchParams(window.location.search).has('dev')
const AUTOPLAY = parseAutoplay(window.location.search)
/** While autoplay runs there is no visitor, so the idle reset must not fire. */
const NO_IDLE = () => null

/** Input a real person makes. Autoplay's own synthetic clicks are untrusted, so they never trigger an exit. */
const EXIT_EVENTS = ['pointerdown', 'mousedown', 'touchstart', 'keydown', 'click'] as const
const SWALLOW_EVENTS = ['pointerup', 'mouseup', 'touchend', 'keyup', 'click'] as const

/** After an exit, eat the rest of that same gesture (e.g. the click after pointerdown) so it cannot press START. */
function swallowGesture(ms: number) {
  const until = performance.now() + ms
  const eat = (e: Event) => {
    if (performance.now() > until) return cleanup()
    if (e.isTrusted) e.stopImmediatePropagation()
  }
  const cleanup = () => SWALLOW_EVENTS.forEach((n) => window.removeEventListener(n, eat, true))
  SWALLOW_EVENTS.forEach((n) => window.addEventListener(n, eat, true))
  window.setTimeout(cleanup, ms + 50)
}

function stripAutoplayFromUrl() {
  const u = new URL(window.location.href)
  u.searchParams.delete('autoplay')
  u.searchParams.delete('once')
  window.history.replaceState(null, '', u)
}

/** Honesty tag shown in the footer of every screen. */
export const FOOTER_NOTE = 'Simulation: the AI here is a conceptual demo.'

/** Operator reset: press R twice within this window, anywhere. */
const DOUBLE_R_MS = 800

export function App() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const { screen, idleWarn } = state
  const lastR = useRef(0)
  const engineRef = useRef<NetworkEngine | null>(null)
  const onEngine = useCallback((e: NetworkEngine | null) => {
    engineRef.current = e
  }, [])

  const [autoplayOn, setAutoplayOn] = useState(AUTOPLAY.enabled)
  // after a ?once cycle the payoff stays up (for recording) until someone restarts it
  const [holdOnPayoff, setHoldOnPayoff] = useState(false)
  useEffect(() => {
    if (screen === 'attract') setHoldOnPayoff(false)
  }, [screen])
  useIdleWatcher(screen, idleWarn, dispatch, autoplayOn || holdOnPayoff ? NO_IDLE : nextIdleStep)

  // ?autoplay: a scripted visitor clicks the real controls; any real keypress or click ends it with a clean attract screen
  useEffect(() => {
    if (!autoplayOn) return
    const ctrl = new AbortController()
    void import('./autoplay').then((m) =>
      m.runAutoplay({ once: AUTOPLAY.once, signal: ctrl.signal, timing: AUTOPLAY.fast ? scaleTiming(TIMING, 0.1) : TIMING, onFinished: () => (setHoldOnPayoff(true), setAutoplayOn(false)) }).catch((e) => console.error(e)),
    )
    const exit = (e: Event) => {
      if (!e.isTrusted) return
      e.stopImmediatePropagation()
      e.preventDefault()
      ctrl.abort()
      stripAutoplayFromUrl()
      swallowGesture(600)
      dispatch({ type: 'RESTART' })
      setAutoplayOn(false)
    }
    EXIT_EVENTS.forEach((n) => window.addEventListener(n, exit, true))
    return () => {
      ctrl.abort()
      EXIT_EVENTS.forEach((n) => window.removeEventListener(n, exit, true))
    }
  }, [autoplayOn])

  // decode all 28 local images while the visitor is on the attract screen
  useEffect(() => preloadImages(ALL_EXAMPLES), [])

  // Dev-only handle for the preview/test scripts (removed from production builds).
  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { __dispatch?: typeof dispatch }).__dispatch = dispatch
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'KeyR' || e.repeat) return
      const now = performance.now()
      if (now - lastR.current < DOUBLE_R_MS) dispatch({ type: 'RESTART' })
      lastR.current = now
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Nothing a visitor does should open a menu, zoom the page or drag things around.
  useEffect(() => {
    const stop = (e: Event) => e.preventDefault()
    const noZoom = (e: WheelEvent) => e.ctrlKey && e.preventDefault()
    window.addEventListener('contextmenu', stop)
    window.addEventListener('dragstart', stop)
    window.addEventListener('gesturestart', stop)
    window.addEventListener('wheel', noZoom, { passive: false })
    return () => {
      window.removeEventListener('contextmenu', stop)
      window.removeEventListener('dragstart', stop)
      window.removeEventListener('gesturestart', stop)
      window.removeEventListener('wheel', noZoom)
    }
  }, [])

  useEffect(() => {
    document.body.classList.toggle('kiosk', autoplayOn || new URLSearchParams(window.location.search).has('kiosk'))
  }, [autoplayOn])

  const start = useCallback(() => dispatch({ type: 'START' }), [])
  const restart = useCallback(() => dispatch({ type: 'RESTART' }), [])

  // A screen can ask for the network to step aside for a while (the learner screen until the mosaic streams in; the what-if side-by-side)
  const [netHidden, setNetHidden] = useState(false)
  const pos = NET_POS[netHidden ? 'hidden' : placeFor(screen)]

  // Back on the attract screen means everything from the previous visitor is gone. The reducer wiped the React state;
  // this clears the network's learned weights and the remembered tray positions too.
  useEffect(() => {
    if (screen !== 'attract') return
    engineRef.current?.resetLearning()
    recordTrayRects(new Map())
  }, [screen])

  // Park the network engine while it is faded out (after the fade), wake it the moment it is needed again.
  useEffect(() => {
    if (pos.opacity > 0) {
      engineRef.current?.setSuspended(false)
      return
    }
    const t = window.setTimeout(() => engineRef.current?.setSuspended(true), 800)
    return () => window.clearTimeout(t)
  }, [pos.opacity])

  return (
    <>
      <Stage>
        <Background />
        {/* One persistent network for the whole experience; it glides between places instead of remounting. */}
        <div className="net-layer" style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${pos.s})`, opacity: pos.opacity }}>
          <Network onEngine={onEngine} />
        </div>
        <BrandMark onOperatorReset={restart} />
        <StepDots current={stepIndex(screen)} />
        <Footer note={FOOTER_NOTE} />

        <div className="screen-layer" key={screen}>
          {screen === 'attract' ? (
            <Attract onStart={start} />
          ) : screen === 'whatIsAi' ? (
            <WhatIsAi dispatch={dispatch} />
          ) : screen === 'rules' ? (
            <Rules dispatch={dispatch} />
          ) : screen === 'learner' ? (
            <Learner dispatch={dispatch} engineRef={engineRef} onNetworkHidden={setNetHidden} />
          ) : screen === 'choose' ? (
            <Choose selection={state.selection} dispatch={dispatch} />
          ) : screen === 'training' ? (
            <Training selection={state.selection} onDone={() => dispatch({ type: 'ANIM_DONE', stage: 'training' })} engineRef={engineRef} />
          ) : screen === 'test' && state.results.yours ? (
            <Test result={state.results.yours} onDone={() => dispatch({ type: 'ANIM_DONE', stage: 'test' })} engineRef={engineRef} />
          ) : screen === 'why' && state.results.yours ? (
            <Why selection={state.selection} yours={state.results.yours} onContinue={() => dispatch({ type: 'ADVANCE' })} />
          ) : screen === 'whatIf' && state.results.yours && state.results.alternate && state.alternate ? (
            <WhatIf
              selection={state.selection}
              yours={state.results.yours}
              alternate={state.alternate}
              other={state.results.alternate}
              engineRef={engineRef}
              onNetworkHidden={setNetHidden}
              onContinue={() => dispatch({ type: 'ADVANCE' })}
            />
          ) : screen === 'everywhere' ? (
            <Everywhere dispatch={dispatch} />
          ) : screen === 'payoff' && state.results.yours ? (
            <Payoff selection={state.selection} result={state.results.yours} dispatch={dispatch} />
          ) : (
            <Placeholder screen={screen} onRestart={restart} />
          )}
        </div>

        {idleWarn ? <IdleOverlay onKeepGoing={() => dispatch({ type: 'ACTIVITY' })} /> : null}
      </Stage>
      {DEV_PANEL ? (
        <Suspense fallback={null}>
          <DevPanel dispatch={dispatch} engineRef={engineRef} screen={screen} />
        </Suspense>
      ) : null}
    </>
  )
}
