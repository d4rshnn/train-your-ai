import { it } from 'vitest'
import { GOOD_SET, ids, worstAchievableSet } from './fixtures'
import { simulate } from './predict'

// Prints a table of sample selections. Run: npm run sim:report
it('sample selections', () => {
  const samples: [string, string[]][] = [
    ['Worst achievable (4 white + fluffy/front-sit)', worstAchievableSet()],
    ['Good variety (9 cats + raccoon)', GOOD_SET],
    ['Diverse cats, no non-cats', ids(1, 5, 7, 8, 9, 10, 12, 13, 14, 16)],
    ['White fluffy x4 + 4 non-cats + 2 cats', ids(1, 2, 3, 4, 17, 18, 19, 20, 10, 15)],
    ['Middling: 6 colours, one pose, 1 non-cat', ids(1, 6, 10, 12, 13, 15, 3, 7, 18, 11)],
  ]
  const rows = samples.map(([name, sel]) => {
    const r = simulate(sel)
    return { selection: name, 'black-cat p_cat': r.featured.probs.cat.toFixed(3), predicted: r.featured.predicted, accuracy: `${r.correctCount}/8`, variety: r.variety.toFixed(2) }
  })
  console.table(rows)
})
