import { describe, expect, it } from 'vitest'
import { arrowLabel, compareLine, introLine, titles, trendOf } from './copy'

describe('what-if copy', () => {
  it('uses the PLAN_V2 intro lines', () => {
    expect(introLine('better')).toBe('Now watch the same AI with more variety.')
    expect(introLine('worse')).toBe('Now watch what happens if it had only seen very similar cats.')
  })

  it('titles the two sides by what actually differs', () => {
    expect(titles('better')).toEqual({ yours: 'Your examples', other: 'More variety' })
    expect(titles('worse').other).toBe('Very similar cats')
  })

  it('computes the trend from the real counts and words it honestly', () => {
    expect(trendOf(3, 7)).toBe('up')
    expect(trendOf(7, 3)).toBe('down')
    expect(trendOf(5, 5)).toBe('same')
    expect(compareLine('up', 'better')).toBe('With more variety, it got more right.')
    expect(compareLine('down', 'worse')).toBe('With only very similar cats, it got fewer right.')
    expect(compareLine('same', 'better')).toMatch(/equally well/)
    // the line never claims what the numbers do not show
    expect(compareLine('down', 'better')).toMatch(/did not help/)
    expect(compareLine('up', 'worse')).toMatch(/did not hurt/)
    expect(arrowLabel('up', 4)).toBe('4 more right')
    expect(arrowLabel('down', 4)).toBe('4 fewer right')
  })
})
