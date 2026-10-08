import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { FOOTER_NOTE, footerNoteFor, INTRO_SCREENS } from './app/footer'

const SRC = __dirname

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    if (statSync(p).isDirectory()) return sourceFiles(p)
    return /\.(ts|tsx)$/.test(n) && !/\.test\.tsx?$/.test(n) ? [p] : []
  })
}

/** The visible text of the app is whatever is in the source outside comments. */
function withoutComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
}

/**
 * Educational-accuracy rules (plan 6, 10): this is a simulation, not a real trained model, and the highlighted patterns
 * on screen 2 are patterns, never "detectors". No wording that claims otherwise may appear in the UI source.
 */
/**
 * Each rule may list files where it does not apply. The intro chapter's AI-layers screen names real fields and examples
 * ("deep learning", ChatGPT); everywhere else those stay banned.
 */
const INTRO_ALLOWED = ['/screens/AiLayers/AiLayers.tsx']

const BANNED: [RegExp, string, string[]?][] = [
  [/detector/i, 'the S2 highlights are patterns, not detectors'],
  [/millions?\b/i, 'no "stores millions of ..." claims'],
  [/\bstores?\b/i, 'the model does not store photos or ears'],
  [/\bmemori[sz]/i, 'the model does not memorise images'],
  [/(this|it|that) (is|was) (a )?real|real (neural network|trained model|AI)/i, 'no claim of a real trained model'],
  [/\b(exactly|always|never) (looks|learns|knows)/i, 'no absolute claims about what a network looks for'],
  [/\bGPT|ChatGPT|deep learning\b/i, 'no claims that this is how big AI products work', INTRO_ALLOWED],
  // quantum honesty (PLAN_V2 addendum v2.1): no "every answer at once", no "beats normal AI today"
  [/(every|all)( possible)? (answers?|states?|options?|solutions?|values?) (at once|simultaneously|in parallel)/i, 'quantum does not "try every answer at once"'],
  [/\bsimultaneous(ly)?\b/i, 'no "at the same time" claims about quantum'],
  [/quantum[^.]{0,60}\b(beats?|outperforms?|faster than|better than)\b/i, 'no claim that quantum beats normal AI or computers today'],
  [/\bquantum supremacy\b/i, 'no "quantum supremacy" claims'],
]

describe('copy audit', () => {
  const files = sourceFiles(SRC)

  it('finds the app source', () => {
    expect(files.length).toBeGreaterThan(40)
  })

  for (const [re, why, allowedIn = []] of BANNED) {
    it(`never says ${re} (${why})`, () => {
      const hits = files
        .filter((f) => re.test(withoutComments(readFileSync(f, 'utf8'))))
        .map((f) => f.replace(SRC, '').split('\\').join('/'))
        .filter((f) => !allowedIn.includes(f))
      expect(hits).toEqual([])
    })
  }

  it('shows the simulation line from the title and the rules screen onward, but not on the intro chapter', () => {
    for (const s of INTRO_SCREENS) expect(footerNoteFor(s), s).toBeUndefined()
    for (const s of ['attract', 'rules', 'learner', 'choose', 'training', 'test', 'why', 'whatIf', 'everywhere', 'payoff'] as const) expect(footerNoteFor(s), s).toBe(FOOTER_NOTE)
    // the quantum screens carry their own honesty tag instead
    expect(INTRO_SCREENS).toEqual(['aiLayers', 'quantumBit', 'quantumRun', 'quantumMeets', 'bridge'])
  })

  it('keeps the honesty tags in the code that renders them', () => {
    const read = (rel: string) => readFileSync(join(SRC, rel), 'utf8')
    expect(read('app/footer.ts')).toMatch(/Simulation: the AI here is a conceptual demo\./)
    expect(read('app/App.tsx')).toMatch(/<Footer note=\{footerNoteFor\(screen\)\}/)
    expect(read('features/network/Network.tsx')).toContain('Conceptual view')
    expect(read('screens/Learner/Learner.tsx')).toContain('Simplified view')
    expect(read('features/map/MemoryMap.tsx')).toContain('Simplified view')
    for (const f of ['QuantumBit/QuantumBit.tsx', 'QuantumRun/QuantumRun.tsx', 'QuantumMeets/QuantumMeets.tsx']) expect(read(`screens/${f}`), f).toContain('Simplified view')
    expect(read('screens/Test/Test.tsx')).toContain('How sure (simulated)')
    expect(read('screens/WhatIf/WhatIf.tsx')).toContain('Simulated')
    expect(read('screens/WhatIf/WhatIf.tsx')).toContain('How sure it was about the new cat (simulated)')
    expect(read('features/payoff/content.ts')).toContain('This was a visual simulation.')
  })
})
