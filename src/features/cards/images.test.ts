import { describe, expect, it } from 'vitest'
import { ALL_EXAMPLES } from '../../data/examples'
import { imageUrl } from './images'

describe('example images', () => {
  it('resolves a bundled file for every one of the 28 examples', () => {
    expect(ALL_EXAMPLES).toHaveLength(28)
    for (const e of ALL_EXAMPLES) expect(imageUrl(e), e.id).toBeTruthy()
  })
})
