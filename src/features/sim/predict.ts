import { TEST_EXAMPLES, TRAINING_EXAMPLES, type Example } from '../../data/examples'
import { evidence, hash01, jitter, P_MAX, P_MIN, pCatBase, selectionKey, varietyScore } from './score'
import type { Outcome, Prediction, SimResult } from './types'

export const HERO_TEST_ID = 'test-01'

export type DetailedPrediction = Prediction & { pCatBase: number; evidence: number }

const byId = new Map(TRAINING_EXAMPLES.map((e) => [e.id, e]))

export function resolveSelection(ids: string[]): Example[] {
  return [...new Set(ids)].flatMap((id) => byId.get(id) ?? [])
}

/** Share of the non-cat probability that goes to DOG; the rest goes to OTHER. */
function dogShare(test: Example): number {
  if (test.species === 'dog') return 0.7
  if (test.species === 'cat') return 0.6
  return 0.3
}

export function predictOne(test: Example, selected: Example[], key: string): DetailedPrediction {
  const cats = selected.filter((s) => s.label === 'cat')
  const hasNonCat = selected.some((s) => s.label === 'notcat')
  let base: number
  let pCat: number
  let e = 0

  if (test.label === 'cat') {
    e = evidence(test, cats).e
    base = pCatBase(e)
    pCat = Math.min(P_MAX, Math.max(P_MIN, base + jitter(`${key}|${test.id}`)))
  } else {
    // A non-cat test is only recognised as "not a cat" if the model has seen any non-cat.
    const u = hash01(`${key}|${test.id}`)
    base = hasNonCat ? 0.06 + 0.09 * u : 0.55 + 0.15 * u
    pCat = base
  }

  const rest = 1 - pCat
  const dog = rest * dogShare(test)
  const probs = { cat: pCat, dog, other: rest - dog }
  const predicted = (Object.entries(probs).sort((a, b) => b[1] - a[1])[0][0]) as Outcome
  const correct = (predicted === 'cat') === (test.label === 'cat')
  return { testId: test.id, probs, predicted, correct, pCatBase: base, evidence: e }
}

export function simulateDetailed(selectionIds: string[]): SimResult & { details: DetailedPrediction[] } {
  const selected = resolveSelection(selectionIds)
  const key = selectionKey(selected.map((s) => s.id))
  const details = TEST_EXAMPLES.map((t) => predictOne(t, selected, key))
  const predictions: Prediction[] = details.map(({ testId, probs, predicted, correct }) => ({ testId, probs, predicted, correct }))
  const correctCount = predictions.filter((p) => p.correct).length
  return {
    variety: varietyScore(selected),
    predictions,
    accuracy: correctCount / predictions.length,
    correctCount,
    featured: predictions.find((p) => p.testId === HERO_TEST_ID)!,
    details,
  }
}

/** Pure, instant, deterministic: same set of ids (any order) => identical result. */
export function simulate(selectionIds: string[]): SimResult {
  const { details: _details, ...result } = simulateDetailed(selectionIds)
  return result
}
