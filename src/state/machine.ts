import type { SimResult } from '../features/sim/types'
import { buildAlternate, type Alternate } from '../features/sim/alternate'
import { simulate } from '../features/sim/predict'

/**
 * Plan v2 flow (Step A): attract -> whatAiKnows -> choose -> training -> test -> why -> whatIf -> payoff.
 * Step B adds whatIsAi, rules, learner and everywhere around it.
 */
export type Screen = 'attract' | 'whatAiKnows' | 'choose' | 'training' | 'test' | 'why' | 'whatIf' | 'payoff'
export const TRAY_SIZE = 10

export type State = {
  screen: Screen
  /** The visitor's 10 picks: the one and only real decision. */
  selection: string[]
  /** `yours` is the simulation of the picks; `alternate` the simulation of the what-if selection (computed at TRAIN). */
  results: { yours: SimResult | null; alternate: SimResult | null }
  /** The what-if selection and which way it differs from the visitor's (see sim/alternate.ts). */
  alternate: Alternate | null
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
  | { type: 'RESTART' }
  | { type: 'ACTIVITY' }
  | { type: 'IDLE_WARN' }
  | { type: 'IDLE_RESET' }

export const initialState: State = {
  screen: 'attract',
  selection: [],
  results: { yours: null, alternate: null },
  alternate: null,
  skipped: false,
  idleWarn: false,
}

/** Full wipe: nothing from the previous group survives a reset. */
const fresh = (): State => ({ ...initialState, selection: [], results: { yours: null, alternate: null } })

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'START':
      return state.screen === 'attract' ? { ...state, screen: 'whatAiKnows' } : state

    case 'ADVANCE':
      if (state.screen === 'whatAiKnows') return { ...state, screen: 'choose' }
      if (state.screen === 'why') return { ...state, screen: 'whatIf' }
      if (state.screen === 'whatIf') return { ...state, screen: 'payoff' }
      return state

    case 'TOGGLE_CARD': {
      if (state.screen !== 'choose') return state
      if (state.selection.includes(action.id)) return { ...state, selection: state.selection.filter((id) => id !== action.id) }
      if (state.selection.length >= TRAY_SIZE) return state
      return { ...state, selection: [...state.selection, action.id] }
    }

    case 'CLEAR':
      return state.screen === 'choose' ? { ...state, selection: [] } : state

    case 'TRAIN': {
      if (state.screen !== 'choose' || state.selection.length !== TRAY_SIZE) return state
      // Both outcomes are computed once, here. The animations only reveal them, so they can never disagree.
      const alternate = buildAlternate(state.selection)
      return {
        ...state,
        screen: 'training',
        skipped: false,
        alternate,
        results: { yours: simulate(state.selection), alternate: simulate(alternate.ids) },
      }
    }

    case 'ANIM_DONE':
      if (action.stage === 'training' && state.screen === 'training') return { ...state, screen: 'test', skipped: false }
      if (action.stage === 'test' && state.screen === 'test') return { ...state, screen: 'why', skipped: false }
      return state

    case 'SKIP':
      return state.screen === 'training' || state.screen === 'test' ? { ...state, skipped: true } : state

    case 'RESTART':
    case 'IDLE_RESET':
      return fresh()

    case 'ACTIVITY':
      return state.idleWarn ? { ...state, idleWarn: false } : state

    case 'IDLE_WARN':
      return state.screen === 'attract' || state.idleWarn ? state : { ...state, idleWarn: true }
  }
}
