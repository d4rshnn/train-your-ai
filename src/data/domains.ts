// COC domains shown on the opener and the last screen. Edit this list to match the real domains:
// short names only, and exactly one entry flagged `current` (the domain this stall belongs to).

export type Domain = { name: string; current?: boolean }

export const DOMAINS: Domain[] = [
  { name: 'Web' },
  { name: 'App Dev' },
  { name: 'Competitive Programming' },
  { name: 'Cybersecurity' },
  { name: 'AI/ML', current: true },
]

/** Every domain except the one the visitor is standing in. */
export const otherDomains = (list: Domain[] = DOMAINS): Domain[] => list.filter((d) => !d.current)
