import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const tokens = readFileSync(join(__dirname, 'tokens.css'), 'utf8')

const hex = (name: string) => {
  const m = new RegExp(`--${name}: *(#[0-9a-fA-F]{6})`).exec(tokens)
  if (!m) throw new Error(`token --${name} not found`)
  const n = parseInt(m[1].slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as [number, number, number]
}
const accent = () => {
  const m = /--accent-rgb:\s*(\d+),\s*(\d+),\s*(\d+)/.exec(tokens)!
  return [+m[1], +m[2], +m[3]] as [number, number, number]
}
const lum = ([r, g, b]: [number, number, number]) => {
  const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
const ratio = (a: [number, number, number], b: [number, number, number]) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe('colour contrast (WCAG AA = 4.5:1 for text)', () => {
  const surfaces = ['bg-0', 'bg-1', 'bg-2'] as const
  for (const s of surfaces) {
    it(`text, dim text, accent, warn and bad read on --${s}`, () => {
      const bg = hex(s)
      expect(ratio(hex('text'), bg)).toBeGreaterThan(12)
      expect(ratio(hex('text-dim'), bg)).toBeGreaterThanOrEqual(4.5)
      expect(ratio(accent(), bg)).toBeGreaterThanOrEqual(4.5)
      expect(ratio(hex('warn'), bg)).toBeGreaterThanOrEqual(4.5)
      expect(ratio(hex('bad'), bg)).toBeGreaterThanOrEqual(4.5)
    })
  }

  it('dark label on the accent button is readable', () => {
    expect(ratio(hex('bg-0'), accent())).toBeGreaterThanOrEqual(7)
  })
})
