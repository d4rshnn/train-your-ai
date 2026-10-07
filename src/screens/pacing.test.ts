import { describe, expect, it } from 'vitest'
import { EXAM_MS, STEP_MS } from './Learner/Learner'
import { RULES_END_SEC } from './Rules/Rules'
import { WHAT_IS_AI_END_SEC } from './WhatIsAi/WhatIsAi'
import { SKIP_AFTER_MS } from './useScreenClock'

/** The three opening screens were slowed down by 3-4 s each; none may run past the 14 s hard maximum. */
describe('opening pace', () => {
  const learner = (3 * STEP_MS + EXAM_MS) / 1000

  it('runs about 3-4 s longer than before and never past 14 s', () => {
    expect(WHAT_IS_AI_END_SEC).toBeGreaterThanOrEqual(11)
    expect(RULES_END_SEC).toBeGreaterThanOrEqual(13)
    expect(learner).toBeGreaterThanOrEqual(13)
    for (const s of [WHAT_IS_AI_END_SEC, RULES_END_SEC, learner]) expect(s).toBeLessThanOrEqual(14)
  })

  it('keeps tap-to-skip at 1.5 s', () => {
    expect(SKIP_AFTER_MS).toBe(1500)
  })
})
