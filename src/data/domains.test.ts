import { describe, expect, it } from 'vitest'
import { DOMAINS, otherDomains } from './domains'

describe('COC domains', () => {
  it('has the placeholder list with exactly one current domain, AI/ML', () => {
    expect(DOMAINS.map((d) => d.name)).toEqual(['Web', 'App Dev', 'Competitive Programming', 'Cybersecurity', 'AI/ML'])
    expect(DOMAINS.filter((d) => d.current).map((d) => d.name)).toEqual(['AI/ML'])
  })

  it('leaves the current domain out of the signpost list', () => {
    expect(otherDomains().map((d) => d.name)).toEqual(['Web', 'App Dev', 'Competitive Programming', 'Cybersecurity'])
  })
})
