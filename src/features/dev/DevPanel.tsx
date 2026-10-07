import { useEffect, useState, type Dispatch, type MutableRefObject } from 'react'
import type { NetworkEngine } from '../network/engine'
import { GOOD_SET, worstAchievableSet } from '../sim/fixtures'
import type { Action, Round, Screen } from '../../state/machine'
import './DevPanel.css'

type Props = { dispatch: Dispatch<Action>; engineRef: MutableRefObject<NetworkEngine | null>; screen: Screen; round: Round }

const WORST = worstAchievableSet()
const TARGETS = ['Training R1', 'Test R1', 'Struggle', 'Training R2', 'Test R2', 'Accuracy'] as const

/** Dev-only (?dev): jump straight into training with preset selections to compare the two end states. */
export default function DevPanel({ dispatch, engineRef, screen, round }: Props) {
  const [stats, setStats] = useState('')
  const [stress, setStress] = useState(false)
  const [target, setTarget] = useState<(typeof TARGETS)[number]>('Test R1')
  const [preset1, setPreset1] = useState<'worst' | 'good'>('worst')
  const [preset2, setPreset2] = useState<'worst' | 'good'>('good')

  useEffect(() => {
    const t = window.setInterval(() => {
      const s = engineRef.current?.getStats()
      if (s) setStats(`${s.fps.toFixed(0)} fps · ${s.workMs.toFixed(2)} ms JS · worst ${s.worstMs.toFixed(0)} ms · ${s.particles} particles · ${s.quality}`)
    }, 500)
    return () => window.clearInterval(t)
  }, [engineRef])

  const pick = (ids: string[]) => ids.forEach((id) => dispatch({ type: 'TOGGLE_CARD', id }))
  const start = () => {
    dispatch({ type: 'RESTART' })
    dispatch({ type: 'START' })
    dispatch({ type: 'ADVANCE' })
  }
  const round1 = (ids: string[]) => {
    start()
    pick(ids)
    dispatch({ type: 'TRAIN' })
  }
  /** Round 1 with the worst set is played through instantly, then Round 2 starts from those picks. */
  const round2 = (ids: string[]) => {
    round1(WORST)
    dispatch({ type: 'ANIM_DONE', stage: 'training' })
    dispatch({ type: 'ANIM_DONE', stage: 'test' })
    dispatch({ type: 'IMPROVE' })
    dispatch({ type: 'CLEAR' })
    pick(ids)
    dispatch({ type: 'TRAIN' })
  }

  /** Jump straight to a screen by playing the earlier steps instantly (Round 2 picks only matter for the later targets). */
  const jump = () => {
    const r1 = preset1 === 'worst' ? WORST : GOOD_SET
    const r2 = preset2 === 'worst' ? WORST : GOOD_SET
    round1(r1)
    if (target === 'Training R1') return
    dispatch({ type: 'ANIM_DONE', stage: 'training' })
    if (target === 'Test R1') return
    dispatch({ type: 'ANIM_DONE', stage: 'test' })
    if (target === 'Struggle') return
    dispatch({ type: 'IMPROVE' })
    dispatch({ type: 'CLEAR' })
    pick(r2)
    dispatch({ type: 'TRAIN' })
    if (target === 'Training R2') return
    dispatch({ type: 'ANIM_DONE', stage: 'training' })
    if (target === 'Test R2') return
    dispatch({ type: 'ANIM_DONE', stage: 'test' })
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
      <b>DEV</b> <span>{screen} · round {round}</span>
      <div className="dev__row">
        <button onClick={() => round1(WORST)}>R1 worst</button>
        <button onClick={() => round1(GOOD_SET)}>R1 good</button>
        <button onClick={() => round2(WORST)}>R2 worst</button>
        <button onClick={() => round2(GOOD_SET)}>R2 good</button>
      </div>
      <div className="dev__row">
        <select value={target} onChange={(e) => setTarget(e.target.value as typeof target)}>
          {TARGETS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <select value={preset1} onChange={(e) => setPreset1(e.target.value as 'worst' | 'good')} title="Round 1 picks">
          <option value="worst">R1 worst</option>
          <option value="good">R1 good</option>
        </select>
        <select value={preset2} onChange={(e) => setPreset2(e.target.value as 'worst' | 'good')} title="Round 2 picks">
          <option value="good">R2 good</option>
          <option value="worst">R2 worst</option>
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
