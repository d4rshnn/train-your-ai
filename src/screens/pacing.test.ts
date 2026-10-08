import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { NEXT_FADE_MS, NEXT_LABEL } from '../components/NextPrompt'
import { WHY_READY_MS } from '../features/why/copy'
import { STEP_READY_MS } from './Learner/Learner'
import { RULES_READY_SEC } from './Rules/Rules'
import { EVERYWHERE_READY_SEC } from './Everywhere/Everywhere'
import { REVEAL_READY_MS } from './AiLayers/AiLayers'
import { BRIDGE_READY_SEC } from './Bridge/Bridge'
import { QMEETS_READY_SEC } from './QuantumMeets/QuantumMeets'
import { FLIP_MS } from './QuantumBit/QuantumBit'
import { FILL_MS } from './QuantumRun/QuantumRun'
import { SKIP_AFTER_MS } from './useScreenClock'

const read = (rel: string) => readFileSync(join(__dirname, rel), 'utf8')

/** Nothing moves on by itself any more: every screen plays, then waits for a click on the "Click for next" prompt. */
describe('click-to-advance', () => {
  it('shows the prompt once the animation has played, never later than the 14 s ceiling', () => {
    for (const s of [RULES_READY_SEC, EVERYWHERE_READY_SEC, WHY_READY_MS / 1000, QMEETS_READY_SEC, BRIDGE_READY_SEC, FLIP_MS / 1000, FILL_MS / 1000, ...STEP_READY_MS.map((m) => m / 1000), ...REVEAL_READY_MS.map((m) => m / 1000)]) {
      expect(s).toBeGreaterThan(0)
      expect(s).toBeLessThanOrEqual(14)
    }
  })

  it('keeps click-to-skip at 1.5 s and a 300 ms fade for the prompt', () => {
    expect(SKIP_AFTER_MS).toBe(1500)
    expect(NEXT_FADE_MS).toBe(300)
  })

  it('labels the prompt "Click for next"', () => {
    expect(NEXT_LABEL).toBe('Click for next')
  })

  it('uses the shared prompt on every non-interactive screen', () => {
    for (const f of ['AiLayers/AiLayers.tsx', 'QuantumBit/QuantumBit.tsx', 'QuantumRun/QuantumRun.tsx', 'QuantumMeets/QuantumMeets.tsx', 'Bridge/Bridge.tsx', 'Rules/Rules.tsx', 'Learner/Learner.tsx', 'Training/Training.tsx', 'Test/Test.tsx', 'Why/Why.tsx', 'WhatIf/WhatIf.tsx', 'Everywhere/Everywhere.tsx'])
      expect(read(f), f).toMatch(/<NextPrompt /)
  })

  it('has no auto-advance timers left on those screens', () => {
    for (const f of ['AiLayers/AiLayers.tsx', 'QuantumBit/QuantumBit.tsx', 'QuantumRun/QuantumRun.tsx', 'QuantumMeets/QuantumMeets.tsx', 'Bridge/Bridge.tsx', 'Rules/Rules.tsx', 'Everywhere/Everywhere.tsx', 'Why/Why.tsx', 'Learner/Learner.tsx']) {
      expect(read(f), f).not.toMatch(/WHY_AUTO_MS|_END_SEC|STEP_MS|EXAM_MS|HOLD_MS/)
      expect(read(f), f).not.toMatch(/why__auto|why__continue|Tap to continue|Tap for next/)
    }
    expect(read('WhatIf/WhatIf.tsx')).not.toMatch(/WHATIF_HOLD_MS|WHATIF_AFTER_SKIP_MS|whatif__continue/)
  })
})
