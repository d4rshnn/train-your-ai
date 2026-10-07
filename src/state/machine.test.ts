import { describe, expect, it } from 'vitest'
import { GOOD_SET, worstAchievableSet } from '../features/sim/fixtures'
import { simulate } from '../features/sim/predict'
import { ADVANCES_TO_CHOOSE, initialState, reducer, TRAY_SIZE, type Action, type State } from './machine'
import { stepIndex, struggled } from './selectors'

const run = (actions: Action[], from: State = initialState) => actions.reduce(reducer, from)
const pick = (ids: string[]): Action[] => ids.map((id) => ({ type: 'TOGGLE_CARD', id }))
const INTRO: Action[] = Array.from({ length: ADVANCES_TO_CHOOSE }, () => ({ type: 'ADVANCE' }))
const toChoose = () => run([{ type: 'START' }, ...INTRO])
const TO_WHY: Action[] = [{ type: 'TRAIN' }, { type: 'ANIM_DONE', stage: 'training' }, { type: 'ANIM_DONE', stage: 'test' }]

describe('flow (one pick, then the what-if)', () => {
  it('walks the whole flow: attract -> whatIsAi -> rules -> learner -> choose -> training -> test -> why -> whatIf -> everywhere -> payoff, and back', () => {
    const seen: string[] = [initialState.screen]
    let s: State = initialState
    const step = (a: Action[]) => {
      s = run(a, s)
      seen.push(s.screen)
    }
    step([{ type: 'START' }])
    step([{ type: 'ADVANCE' }])
    step([{ type: 'ADVANCE' }])
    step([{ type: 'ADVANCE' }])
    step([...pick(worstAchievableSet()), { type: 'TRAIN' }])
    step([{ type: 'ANIM_DONE', stage: 'training' }])
    step([{ type: 'ANIM_DONE', stage: 'test' }])
    step([{ type: 'ADVANCE' }])
    step([{ type: 'ADVANCE' }])
    step([{ type: 'ADVANCE' }])
    expect(seen).toEqual(['attract', 'whatIsAi', 'rules', 'learner', 'choose', 'training', 'test', 'why', 'whatIf', 'everywhere', 'payoff'])
    s = run([{ type: 'RESTART' }], s)
    expect(s).toEqual(initialState)
  })

  it('has no Round 2: there is no IMPROVE action and no way back to choose after TRAIN', () => {
    const s = run([...pick(worstAchievableSet()), ...TO_WHY], toChoose())
    expect(s.screen).toBe('why')
    expect(Object.keys(s)).not.toContain('round')
    for (const type of ['START', 'TRAIN', 'CLEAR', 'SKIP'] as const) expect(reducer(s, { type }).screen).not.toBe('choose')
    expect(reducer(s, { type: 'TOGGLE_CARD', id: 'train-01' })).toBe(s)
  })

  it('computes both results once at TRAIN: yours and the alternate, from the same pick', () => {
    const weak = run([...pick(worstAchievableSet()), { type: 'TRAIN' }], toChoose())
    expect(weak.results.yours).toEqual(simulate(worstAchievableSet()))
    expect(weak.alternate?.direction).toBe('better')
    expect(weak.results.alternate).toEqual(simulate(weak.alternate!.ids))
    expect(weak.results.alternate!.correctCount).toBeGreaterThan(weak.results.yours!.correctCount)
    expect(struggled(weak)).toBe(true)

    const good = run([...pick(GOOD_SET), { type: 'TRAIN' }], toChoose())
    expect(good.alternate?.direction).toBe('worse')
    expect(good.results.alternate!.correctCount).toBeLessThan(good.results.yours!.correctCount)
    expect(struggled(good)).toBe(false)
  })

  it('maps screens to step dots', () => {
    expect(stepIndex('attract')).toBe(-1)
    for (const s of ['whatIsAi', 'rules', 'learner'] as const) expect(stepIndex(s)).toBe(0) // Learn
    expect(stepIndex('choose')).toBe(1)
    expect(stepIndex('training')).toBe(2)
    expect(stepIndex('test')).toBe(3)
    for (const s of ['why', 'whatIf', 'everywhere', 'payoff'] as const) expect(stepIndex(s)).toBe(4) // Understand
  })

  it('takes exactly ADVANCES_TO_CHOOSE advances to get from the first screen to choose, and choose is the only screen that waits', () => {
    expect(run([{ type: 'START' }]).screen).toBe('whatIsAi')
    expect(toChoose().screen).toBe('choose')
    expect(run([{ type: 'START' }, ...INTRO.slice(1)]).screen).toBe('learner')
  })
})

describe('illegal transitions are no-ops', () => {
  it('ignores actions on the wrong screen', () => {
    expect(reducer(initialState, { type: 'ADVANCE' })).toBe(initialState)
    expect(reducer(initialState, { type: 'TRAIN' })).toBe(initialState)
    expect(reducer(initialState, { type: 'ANIM_DONE', stage: 'test' })).toBe(initialState)
    expect(reducer(initialState, { type: 'TOGGLE_CARD', id: 'train-01' })).toBe(initialState)
    const choose = toChoose()
    expect(reducer(choose, { type: 'START' })).toBe(choose)
    expect(reducer(choose, { type: 'ANIM_DONE', stage: 'training' })).toBe(choose)
    expect(reducer(choose, { type: 'ADVANCE' })).toBe(choose) // choose only leaves through TRAIN
    // the intro screens cannot train or pick
    const intro = run([{ type: 'START' }])
    expect(reducer(intro, { type: 'TRAIN' })).toBe(intro)
    expect(reducer(intro, { type: 'TOGGLE_CARD', id: 'train-01' })).toBe(intro)
  })

  it('needs exactly 10 cards to train', () => {
    const nine = run(pick(GOOD_SET.slice(0, 9)), toChoose())
    expect(reducer(nine, { type: 'TRAIN' })).toBe(nine)
  })

  it('refuses an 11th card and toggles cards off', () => {
    const full = run(pick(GOOD_SET), toChoose())
    expect(full.selection).toHaveLength(TRAY_SIZE)
    expect(reducer(full, { type: 'TOGGLE_CARD', id: 'train-01' })).toBe(full)
    expect(reducer(full, { type: 'TOGGLE_CARD', id: GOOD_SET[0] }).selection).toHaveLength(TRAY_SIZE - 1)
  })

  it('why and whatIf only move forward, one step at a time', () => {
    const why = run([...pick(GOOD_SET), ...TO_WHY], toChoose())
    expect(run([{ type: 'ADVANCE' }], why).screen).toBe('whatIf')
    expect(run([{ type: 'ADVANCE' }, { type: 'ADVANCE' }], why).screen).toBe('everywhere')
    expect(run([{ type: 'ADVANCE' }, { type: 'ADVANCE' }, { type: 'ADVANCE' }], why).screen).toBe('payoff')
    expect(run([{ type: 'ADVANCE' }, { type: 'ADVANCE' }, { type: 'ADVANCE' }, { type: 'ADVANCE' }], why).screen).toBe('payoff')
  })
})

describe('idle handling', () => {
  it('warns only off the attract screen and clears on activity', () => {
    expect(reducer(initialState, { type: 'IDLE_WARN' })).toBe(initialState)
    const s = reducer(toChoose(), { type: 'IDLE_WARN' })
    expect(s.idleWarn).toBe(true)
    expect(reducer(s, { type: 'ACTIVITY' }).idleWarn).toBe(false)
  })

  it('wipes everything on IDLE_RESET, with no leaked picks, results or alternate', () => {
    const s = run([...pick(GOOD_SET), { type: 'TRAIN' }, { type: 'IDLE_WARN' }, { type: 'IDLE_RESET' }], toChoose())
    expect(s).toEqual(initialState)
    expect(s.selection).toEqual([])
    expect(s.results).toEqual({ yours: null, alternate: null })
    expect(s.alternate).toBeNull()
  })
})
