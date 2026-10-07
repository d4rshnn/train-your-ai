import { describe, expect, it } from 'vitest'
import { GOOD_SET, worstAchievableSet } from '../features/sim/fixtures'
import { initialState, reducer, TRAY_SIZE, type Action, type State } from './machine'
import { roundOneResult, stepIndex, struggled } from './selectors'

const run = (actions: Action[], from: State = initialState) => actions.reduce(reducer, from)
const pick = (ids: string[]): Action[] => ids.map((id) => ({ type: 'TOGGLE_CARD', id }))
const toChoose = () => run([{ type: 'START' }, { type: 'ADVANCE' }])

describe('flow', () => {
  it('walks the whole happy path from attract to payoff and back', () => {
    let s = toChoose()
    expect(s.screen).toBe('choose')
    s = run([...pick(worstAchievableSet()), { type: 'TRAIN' }], s)
    expect(s.screen).toBe('training')
    s = run([{ type: 'ANIM_DONE', stage: 'training' }, { type: 'ANIM_DONE', stage: 'test' }], s)
    expect(s.screen).toBe('struggle')
    s = run([{ type: 'IMPROVE' }], s)
    expect(s).toMatchObject({ screen: 'choose', round: 2 })
    expect(s.selections[2]).toEqual(s.selections[1])
    s = run(
      [{ type: 'CLEAR' }, ...pick(GOOD_SET), { type: 'TRAIN' }, { type: 'ANIM_DONE', stage: 'training' }, { type: 'ANIM_DONE', stage: 'test' }],
      s,
    )
    expect(s.screen).toBe('accuracy')
    s = run([{ type: 'ADVANCE' }], s)
    expect(s.screen).toBe('payoff')
    s = run([{ type: 'RESTART' }], s)
    expect(s).toEqual(initialState)
  })

  it('computes the result once at TRAIN and reports whether the model struggled', () => {
    const bad = run([...pick(worstAchievableSet()), { type: 'TRAIN' }], toChoose())
    expect(bad.results[1]?.featured.correct).toBe(false)
    expect(struggled(bad)).toBe(true)
    const good = run([...pick(GOOD_SET), { type: 'TRAIN' }], toChoose())
    expect(struggled(good)).toBe(false)
  })

  it('maps screens to step dots', () => {
    expect(stepIndex('attract')).toBe(-1)
    expect(stepIndex('payoff')).toBe(4)
  })
})

describe('illegal transitions are no-ops', () => {
  it('ignores actions on the wrong screen', () => {
    expect(reducer(initialState, { type: 'ADVANCE' })).toBe(initialState)
    expect(reducer(initialState, { type: 'TRAIN' })).toBe(initialState)
    expect(reducer(initialState, { type: 'IMPROVE' })).toBe(initialState)
    expect(reducer(initialState, { type: 'ANIM_DONE', stage: 'test' })).toBe(initialState)
    expect(reducer(initialState, { type: 'TOGGLE_CARD', id: 'train-01' })).toBe(initialState)
    const choose = toChoose()
    expect(reducer(choose, { type: 'START' })).toBe(choose)
    expect(reducer(choose, { type: 'ANIM_DONE', stage: 'training' })).toBe(choose)
  })

  it('needs exactly 10 cards to train', () => {
    const nine = run(pick(GOOD_SET.slice(0, 9)), toChoose())
    expect(reducer(nine, { type: 'TRAIN' })).toBe(nine)
  })

  it('refuses an 11th card and toggles cards off', () => {
    const full = run(pick(GOOD_SET), toChoose())
    expect(full.selections[1]).toHaveLength(TRAY_SIZE)
    expect(reducer(full, { type: 'TOGGLE_CARD', id: 'train-01' })).toBe(full)
    const less = reducer(full, { type: 'TOGGLE_CARD', id: GOOD_SET[0] })
    expect(less.selections[1]).toHaveLength(TRAY_SIZE - 1)
  })

  it('allows exactly two rounds: IMPROVE only works from round 1', () => {
    const r2 = run([...pick(GOOD_SET), { type: 'TRAIN' }, { type: 'ANIM_DONE', stage: 'training' }], toChoose())
    expect(reducer(r2, { type: 'IMPROVE' })).toBe(r2)
  })
})

describe('idle handling', () => {
  it('warns only off the attract screen and clears on activity', () => {
    expect(reducer(initialState, { type: 'IDLE_WARN' })).toBe(initialState)
    const s = reducer(toChoose(), { type: 'IDLE_WARN' })
    expect(s.idleWarn).toBe(true)
    expect(reducer(s, { type: 'ACTIVITY' }).idleWarn).toBe(false)
  })

  it('wipes everything on IDLE_RESET, with no leaked picks', () => {
    const s = run([...pick(GOOD_SET), { type: 'TRAIN' }, { type: 'IDLE_WARN' }, { type: 'IDLE_RESET' }], toChoose())
    expect(s).toEqual(initialState)
    expect(s.selections[1]).toEqual([])
    expect(s.results[1]).toBeNull()
  })
})

describe('round 1 result for the comparison', () => {
  it('is stored at TRAIN and recomputed identically if it is missing', () => {
    const s = run([...pick(worstAchievableSet()), { type: 'TRAIN' }], toChoose())
    expect(roundOneResult(s)).toBe(s.results[1])
    const stripped: State = { ...s, results: { 1: null, 2: null } }
    expect(roundOneResult(stripped)).toEqual(s.results[1])
    expect(roundOneResult(toChoose())).toBeNull()
  })
})
