import type { SimResult } from '../features/sim/types'
import { buildAlternate, type Alternate } from '../features/sim/alternate'
import { simulate } from '../features/sim/predict'

/**
 * Plan v2.1 flow: attract -> aiLayers -> quantumBit -> quantumRun -> quantumMeets -> bridge -> rules -> learner -> choose ->
 * training -> test -> why -> whatIf -> everywhere -> payoff. SKIP_INTRO goes from attract straight to rules.
 * Choose is the only screen that needs a decision; every other screen moves on with ADVANCE (the "Click for next" prompt).
 */
export type Screen =
  | 'attract'
  | 'aiLayers'
  | 'quantumBit'
  | 'quantumRun'
  | 'quantumMeets'
  | 'bridge'
  | 'rules'
  | 'learner'
  | 'choose'
  | 'training'
  | 'test'
  | 'why'
  | 'whatIf'
  | 'everywhere'
  | 'payoff'

/** How many ADVANCEs take the flow from the first screen after START (aiLayers) to choose. */
export const ADVANCES_TO_CHOOSE = 7
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
  | { type: 'SKIP_INTRO' }
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
      return state.screen === 'attract' ? { ...state, screen: 'aiLayers' } : state

    case 'SKIP_INTRO':
      return state.screen === 'attract' ? { ...state, screen: 'rules' } : state

    case 'ADVANCE':
      if (state.screen === 'aiLayers') return { ...state, screen: 'quantumBit' }
      if (state.screen === 'quantumBit') return { ...state, screen: 'quantumRun' }
      if (state.screen === 'quantumRun') return { ...state, screen: 'quantumMeets' }
      if (state.screen === 'quantumMeets') return { ...state, screen: 'bridge' }
      if (state.screen === 'bridge') return { ...state, screen: 'rules' }
      if (state.screen === 'rules') return { ...state, screen: 'learner' }
      if (state.screen === 'learner') return { ...state, screen: 'choose' }
      if (state.screen === 'why') return { ...state, screen: 'whatIf' }
      if (state.screen === 'whatIf') return { ...state, screen: 'everywhere' }
      if (state.screen === 'everywhere') return { ...state, screen: 'payoff' }
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
