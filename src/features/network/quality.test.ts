import { describe, expect, it } from 'vitest'
import { resolveQuality } from './quality'

describe('resolveQuality', () => {
  it('?quality=low / high wins and is remembered', () => {
    expect(resolveQuality('?quality=low', null)).toEqual({ quality: 'low', save: 'low' })
    expect(resolveQuality('?quality=high', 'low')).toEqual({ quality: 'high', save: 'high' })
  })

  it('a remembered setting is kept on later loads without the parameter', () => {
    expect(resolveQuality('', 'low')).toEqual({ quality: 'low', save: null })
    expect(resolveQuality('?kiosk', 'high')).toEqual({ quality: 'high', save: null })
  })

  it('?quality=auto forgets the remembered setting', () => {
    expect(resolveQuality('?quality=auto', 'low')).toEqual({ quality: 'high', save: 'clear' })
  })

  it('starts on the light tier on a low-spec machine when nothing is remembered', () => {
    expect(resolveQuality('', null, { cores: 2 })).toEqual({ quality: 'low', save: null })
    expect(resolveQuality('', null, { memoryGb: 2 })).toEqual({ quality: 'low', save: null })
    expect(resolveQuality('', null, { cores: 8, memoryGb: 8 })).toEqual({ quality: 'high', save: null })
    expect(resolveQuality('', 'high', { cores: 2 })).toEqual({ quality: 'high', save: null })
  })

  it('ignores junk values', () => {
    expect(resolveQuality('?quality=ultra', null)).toEqual({ quality: 'high', save: null })
  })
})
