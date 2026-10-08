import type { Dispatch } from 'react'
import { CatIcon } from '../../components/CatIcon'
import { NextPrompt } from '../../components/NextPrompt'
import type { Action } from '../../state/machine'
import { useScreenClock } from '../useScreenClock'
import './Bridge.css'

const PHASE_AT = [0.3, 1.8] as const
export const BRIDGE_READY_SEC = 2.8

export const BRIDGE_COPY = {
  lead: "Let's see how a machine actually learns.",
  example: "Today's example: cats.",
} as const

/** The hinge between the intro chapter and the cat demo. */
export function Bridge({ dispatch }: { dispatch: Dispatch<Action> }) {
  const { phase, ready, onTap, next } = useScreenClock(PHASE_AT, BRIDGE_READY_SEC, () => dispatch({ type: 'ADVANCE' }))

  return (
    <section className="bridge" onPointerDown={onTap}>
      <h2 className={`bridge__lead ${phase >= 1 ? 'is-on' : ''}`}>{BRIDGE_COPY.lead}</h2>
      <p className={`bridge__example ${phase >= 2 ? 'is-on' : ''}`}>
        <span className="bridge__cat">
          <CatIcon size={64} />
        </span>
        {BRIDGE_COPY.example}
      </p>
      <NextPrompt ready={ready} onNext={next} />
    </section>
  )
}
