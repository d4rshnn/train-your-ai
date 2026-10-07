import { describe, expect, it } from 'vitest'
import { TRAINING_EXAMPLES } from '../../data/examples'
import { BEAT, CLOSING, pileOrder, DEFINITIONS, HONEST_NOTE, PIPELINE_LABELS, stageTime } from './content'

describe('payoff content', () => {
  it('uses the plan wording', () => {
    expect(PIPELINE_LABELS.map((l) => l.toUpperCase())).toEqual(['TRAINING DATA', 'MODEL LEARNS PATTERNS', 'TRAINED MODEL', 'NEW DATA', 'PREDICTION'])
    expect(DEFINITIONS).toEqual([
      { term: 'Training Data', text: 'Examples we give the model to learn from.' },
      { term: 'Model', text: 'The system that learns patterns from those examples.' },
      { term: 'Prediction', text: 'What the trained model thinks about new data.' },
      { term: 'Accuracy', text: 'How often those predictions are correct.' },
    ])
    expect(CLOSING).toBe('You just experienced the basic idea behind Machine Learning.')
    expect(HONEST_NOTE).toContain('This was a visual simulation.')
    expect(HONEST_NOTE).toContain('Real models train on far more data')
    expect(HONEST_NOTE).toContain('More examples and correct labels matter too.')
  })

  it('reveals the five stages left to right over the pulse, then the definitions', () => {
    const times = PIPELINE_LABELS.map((_, i) => stageTime(i))
    expect(times).toEqual([...times].sort((a, b) => a - b))
    expect(times[4] - times[0]).toBeCloseTo(BEAT.pulseDur, 5)
    expect(times[4]).toBeLessThan(BEAT.defs)
    expect(BEAT.defs).toBeLessThan(BEAT.closing)
    expect(BEAT.closing).toBeLessThan(BEAT.done)
  })

  it('puts a cat on top of the stack: the last-picked cat, never a non-cat', () => {
    const ex = (id: string) => TRAINING_EXAMPLES.find((e) => e.id === id)!
    // last pick is a raccoon (non-cat): the last cat (train-09) moves to the top, the rest keep their order
    const picks = ['train-01', 'train-17', 'train-09', 'train-20'].map(ex)
    const order = pileOrder(picks).map((c) => c.id)
    expect(order.at(-1)).toBe('train-09')
    expect(order).toEqual(['train-01', 'train-17', 'train-20', 'train-09'])
    // already a cat on top: unchanged
    const same = ['train-17', 'train-01'].map(ex)
    expect(pileOrder(same)).toBe(same)
    // no cats at all: unchanged (nothing better to show)
    const none = ['train-17', 'train-18'].map(ex)
    expect(pileOrder(none)).toEqual(none)
    // never loses a card
    expect(pileOrder(picks)).toHaveLength(picks.length)
  })
})
