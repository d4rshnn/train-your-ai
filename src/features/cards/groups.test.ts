import { describe, expect, it } from 'vitest'
import { GOOD_SET, worstAchievableSet } from '../sim/fixtures'
import { resolveSelection } from '../sim/predict'
import { similarGroups } from './groups'

describe('similarGroups', () => {
  it('stacks the 4 white fluffy cats of the worst set and keeps the other 6 as singles', () => {
    const { stacks, singles } = similarGroups(resolveSelection(worstAchievableSet()))
    expect(stacks).toHaveLength(1)
    expect(stacks[0].map((c) => c.id).sort()).toEqual(['train-01', 'train-02', 'train-03', 'train-04'])
    expect(singles).toHaveLength(6)
  })

  it('shows a varied selection with no stack', () => {
    const { stacks, singles } = similarGroups(resolveSelection(GOOD_SET))
    expect(stacks).toHaveLength(0)
    expect(singles).toHaveLength(10)
  })

  it('never loses or duplicates a card', () => {
    const cards = resolveSelection(worstAchievableSet())
    const { stacks, singles } = similarGroups(cards)
    expect(stacks.flat().length + singles.length).toBe(cards.length)
  })
})
