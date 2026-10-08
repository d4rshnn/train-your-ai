import { useEffect, useState, type Dispatch, type MutableRefObject } from 'react'
import type { NetworkEngine } from '../network/engine'
import { GOOD_SET, worstAchievableSet } from '../sim/presets'
import { ADVANCES_TO_CHOOSE, type Action, type Screen } from '../../state/machine'
import './DevPanel.css'

type Props = { dispatch: Dispatch<Action>; engineRef: MutableRefObject<NetworkEngine | null>; screen: Screen }

const WORST = worstAchievableSet()
const TARGETS = ['AI layers', 'Qubit', 'Run 100', 'Quantum + ML', 'Bridge', 'Rules', 'Learner', 'Training', 'Test', 'Why', 'What if', 'Everywhere', 'Payoff'] as const
type Target = (typeof TARGETS)[number]
/** AI layers, Qubit, Run 100, Quantum + ML, Bridge, Rules, Learner: each is that many ADVANCEs after START. */
const INTRO_TARGETS = ADVANCES_TO_CHOOSE

/** Dev-only (?dev): pick a preset and either watch it play from Training or jump straight to a later screen. */
export default function DevPanel({ dispatch, engineRef, screen }: Props) {
  const [stats, setStats] = useState('')
  const [stress, setStress] = useState(false)
  const [target, setTarget] = useState<Target>('Why')
  const [preset, setPreset] = useState<'worst' | 'good'>('worst')

  useEffect(() => {
    const t = window.setInterval(() => {
      const s = engineRef.current?.getStats()
      if (s) setStats(`${s.fps.toFixed(0)} fps · ${s.workMs.toFixed(2)} ms JS · worst ${s.worstMs.toFixed(0)} ms · ${s.particles} particles · ${s.quality}`)
    }, 500)
    return () => window.clearInterval(t)
  }, [engineRef])

  /** From anywhere: reset, pass the intro screens, fill the tray with the preset and (optionally) start the run. */
  const pick = (ids: string[], andTrain: boolean) => {
    dispatch({ type: 'RESTART' })
    dispatch({ type: 'START' })
    for (let i = 0; i < ADVANCES_TO_CHOOSE; i++) dispatch({ type: 'ADVANCE' })
    ids.forEach((id) => dispatch({ type: 'TOGGLE_CARD', id }))
    if (andTrain) dispatch({ type: 'TRAIN' })
  }

  /** Jump to a screen by playing the earlier steps instantly. */
  const jump = () => {
    // the three intro screens come before any pick, so these targets only walk forward from the start
    const intro = TARGETS.indexOf(target)
    if (intro < INTRO_TARGETS) {
      dispatch({ type: 'RESTART' })
      dispatch({ type: 'START' })
      for (let i = 0; i < intro; i++) dispatch({ type: 'ADVANCE' })
      return
    }
    pick(preset === 'worst' ? WORST : GOOD_SET, true)
    if (target === 'Training') return
    dispatch({ type: 'ANIM_DONE', stage: 'training' })
    if (target === 'Test') return
    dispatch({ type: 'ANIM_DONE', stage: 'test' })
    if (target === 'Why') return
    dispatch({ type: 'ADVANCE' })
    if (target === 'What if') return
    dispatch({ type: 'ADVANCE' })
    if (target === 'Everywhere') return
    dispatch({ type: 'ADVANCE' })
  }

  const toggleStress = () => {
    const next = !stress
    setStress(next)
    engineRef.current?.setAmbientOverride(next ? 300 : null)
  }
  const toggleQuality = () => {
    const e = engineRef.current
    if (e) e.setQuality(e.getQuality() === 'high' ? 'low' : 'high')
  }

  return (
    <div className="dev" role="region" aria-label="Developer panel">
      <b>DEV</b> <span>{screen}</span>
      <div className="dev__row">
        <button onClick={() => pick(WORST, false)}>Pick worst</button>
        <button onClick={() => pick(GOOD_SET, false)}>Pick good</button>
        <button onClick={() => pick(WORST, true)}>Pick worst + train</button>
        <button onClick={() => pick(GOOD_SET, true)}>Pick good + train</button>
      </div>
      <div className="dev__row">
        <select value={target} onChange={(e) => setTarget(e.target.value as Target)} title="Screen to jump to">
          {TARGETS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <select value={preset} onChange={(e) => setPreset(e.target.value as 'worst' | 'good')} title="Which picks to jump with">
          <option value="worst">worst picks</option>
          <option value="good">good picks</option>
        </select>
        <button onClick={jump}>Jump</button>
      </div>
      <div className="dev__row">
        <button onClick={toggleStress} className={stress ? 'on' : ''}>
          Stress 300
        </button>
        <button onClick={toggleQuality}>Quality</button>
        <button onClick={() => dispatch({ type: 'RESTART' })}>Restart</button>
      </div>
      <code>{stats}</code>
    </div>
  )
}
