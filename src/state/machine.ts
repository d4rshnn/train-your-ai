import type { SimResult } from '../features/sim/types'
import { simulate } from '../features/sim/predict'

export type Screen = 'attract' | 'whatAiKnows' | 'choose' | 'training' | 'test' | 'struggle' | 'accuracy' | 'payoff'
export type Round = 1 | 2
export const TRAY_SIZE = 10

export type State = {
  screen: Screen
  round: Round
  selections: Record<Round, string[]>
  results: Record<Round, SimResult | null>
  skipped: boolean
  idleWarn: boolean
}

export type Action =
  | { type: 'START' }
  | { type: 'ADVANCE' }
  | { type: 'TOGGLE_CARD'; id: string }
  | { type: 'CLEAR' }
  | { type: 'TRAIN' }
  | { type: 'ANIM_DONE'; stage: 'training' | 'test' }
  | { type: 'SKIP' }
  | { type: 'IMPROVE' }
  | { type: 'RESTART' }
  | { type: 'ACTIVITY' }
  | { type: 'IDLE_WARN' }
  | { type: 'IDLE_RESET' }

export const initialState: State = {
  screen: 'attract',
  round: 1,
  selections: { 1: [], 2: [] },
  results: { 1: null, 2: null },
  skipped: false,
  idleWarn: false,
}

/** Full wipe: nothing from the previous group survives a reset. */
const fresh = (): State => ({ ...initialState, selections: { 1: [], 2: [] }, results: { 1: null, 2: null } })

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'START':
      return state.screen === 'attract' ? { ...state, screen: 'whatAiKnows' } : state

    case 'ADVANCE':
      if (state.screen === 'whatAiKnows') return { ...state, screen: 'choose' }
      if (state.screen === 'accuracy') return { ...state, screen: 'payoff' }
      return state

    case 'TOGGLE_CARD': {
      if (state.screen !== 'choose') return state
      const current = state.selections[state.round]
      let next: string[]
      if (current.includes(action.id)) next = current.filter((id) => id !== action.id)
      else if (current.length >= TRAY_SIZE) return state
      else next = [...current, action.id]
      return { ...state, selections: { ...state.selections, [state.round]: next } }
    }

    case 'CLEAR':
      if (state.screen !== 'choose') return state
      return { ...state, selections: { ...state.selections, [state.round]: [] } }

    case 'TRAIN': {
      if (state.screen !== 'choose') return state
      const picked = state.selections[state.round]
      if (picked.length !== TRAY_SIZE) return state
      return { ...state, screen: 'training', skipped: false, results: { ...state.results, [state.round]: simulate(picked) } }
    }

    case 'ANIM_DONE':
      if (action.stage === 'training' && state.screen === 'training') return { ...state, screen: 'test', skipped: false }
      if (action.stage === 'test' && state.screen === 'test') {
        return { ...state, screen: state.round === 1 ? 'struggle' : 'accuracy', skipped: false }
      }
      return state

    case 'SKIP':
      return state.screen === 'training' || state.screen === 'test' ? { ...state, skipped: true } : state

    case 'IMPROVE':
      if (state.screen !== 'struggle' || state.round !== 1) return state
      // Round-1 picks are kept so the visitor edits rather than starts over.
      return { ...state, screen: 'choose', round: 2, selections: { ...state.selections, 2: [...state.selections[1]] } }

    case 'RESTART':
      return fresh()

    case 'ACTIVITY':
      return state.idleWarn ? { ...state, idleWarn: false } : state

    case 'IDLE_WARN':
      return state.screen === 'attract' || state.idleWarn ? state : { ...state, idleWarn: true }

    case 'IDLE_RESET':
      return fresh()
  }
}
