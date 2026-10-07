import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = __dirname
const read = (rel: string) => readFileSync(join(SRC, rel), 'utf8')

/**
 * PLAN_V2 section 6: before the payoff screen the app speaks plainly. These words are reserved for the payoff screen,
 * where they are introduced as vocabulary. Before it the screens say "the AI's brain", "learns", "guess", "examples"
 * and "how often it's right". Only visible text is checked (string literals and JSX text), not identifiers.
 */
const RESERVED_BEFORE_PAYOFF: [RegExp, string][] = [
  [/neural\s+network/i, 'say "the AI\'s brain"'],
  [/\bmodel\b/i, 'say "the AI"'],
  [/training\s+data/i, 'say "examples"'],
  [/prediction/i, 'say "guess"'],
  [/accuracy/i, 'say "how often it\'s right"'],
]

/** Every file whose text a visitor can see before the payoff screen. */
const PRE_PAYOFF_FILES = [
  'app/App.tsx',
  'app/IdleOverlay.tsx',
  'components/BrandMark.tsx',
  'components/Footer.tsx',
  'components/StepDots.tsx',
  'components/Button.tsx',
  'features/cards/Card.tsx',
  'features/cards/Tray.tsx',
  'features/explain/mosaic.ts',
  'features/map/MemoryMap.tsx',
  'features/network/Network.tsx',
  'features/network/NetworkSvg.tsx',
  'features/network/layout.ts',
  'features/network/testSequence.ts',
  'features/network/trainingSequence.ts',
  'features/why/copy.ts',
  'features/whatif/copy.ts',
  'screens/Attract/Attract.tsx',
  'screens/WhatIsAi/WhatIsAi.tsx',
  'screens/Rules/Rules.tsx',
  'screens/Learner/Learner.tsx',
  'screens/Choose/Choose.tsx',
  'screens/Training/Training.tsx',
  'screens/Test/Test.tsx',
  'screens/Why/Why.tsx',
  'screens/WhatIf/WhatIf.tsx',
  'screens/Everywhere/Everywhere.tsx',
]

function withoutComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
}

/** Everything a visitor could read: quoted strings (not import paths) and text between JSX tags. */
export function visibleText(code: string): string[] {
  const src = withoutComments(code)
    .split('\n')
    .filter((l) => !/^\s*(import|export)\b.*\bfrom\b/.test(l))
    .join('\n')
  const out: string[] = []
  for (const m of src.matchAll(/(['"`])((?:\\.|(?!\1).)*)\1/g)) out.push(m[2])
  for (const m of src.matchAll(/>([^<>{}()=;]*[A-Za-z][^<>{}()=;]*)</g)) out.push(m[1].trim())
  return out.filter((t) => /[A-Za-z]{3}/.test(t))
}

describe('plain language before the payoff screen', () => {
  it('reads the screens it should and the extractor sees the deck copy', () => {
    const text = PRE_PAYOFF_FILES.flatMap((f) => visibleText(read(f)))
    expect(text.length).toBeGreaterThan(120)
    expect(text).toContain('Choose 10 examples to teach your AI.')
    expect(text).toContain('To an AI, a picture starts as just numbers.')
    expect(text).toContain('Same AI. Different examples.')
  })

  for (const [re, instead] of RESERVED_BEFORE_PAYOFF) {
    it(`never shows ${re} before the payoff (${instead})`, () => {
      const hits = PRE_PAYOFF_FILES.flatMap((f) => visibleText(read(f)).filter((t) => re.test(t)).map((t) => `${f}: "${t}"`))
      expect(hits).toEqual([])
    })
  }

  it('uses the deck wording', () => {
    const all = PRE_PAYOFF_FILES.flatMap((f) => visibleText(read(f))).join('\n')
    for (const line of [
      'Most software follows rules people write.',
      'AI is different. It learns from examples.',
      'At COC, we build things like this.',
      'Pointy ears? A fox has them.',
      'Whiskers? Not always visible.',
      'Rules break. So we show it examples instead.',
      'Like a kid who has only ever met white cats.',
      'Same idea. Different examples.',
      'Choose 10 examples to teach your AI.',
      'A new cat. It has never seen this one.',
      'Now watch the same AI with more variety.',
      'Now watch what happens if it had only seen very similar cats.',
      'It had only seen cats like these.',
      'This one looked different, so it guessed.',
      'It had seen enough different cats to recognise a new one.',
      'The new cat landed outside the cats it knew.',
      'The new cat landed inside the cats it knew.',
      'sure it',
    ])
      expect(all, line).toContain(line)
  })

  it('still lets the payoff screen use the vocabulary', () => {
    const payoff = read('features/payoff/content.ts')
    expect(payoff).toMatch(/Training Data/)
    expect(payoff).toMatch(/Prediction/)
    expect(payoff).toMatch(/Accuracy/)
  })
})
