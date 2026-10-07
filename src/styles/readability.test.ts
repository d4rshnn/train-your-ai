import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(__dirname, '..')

function cssFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? cssFiles(p) : p.endsWith('.css') ? [p] : []
  })
}

/** Purely decorative micro-labels on thumbnails (the card itself carries the real label at a readable size). */
const DECORATIVE = ['.slot__label', '.feed__label', '.mini__label', '.slot--empty', '.dev', '.net__fps']

describe('readability at 1366x768 from about 1 m', () => {
  it('no real text is smaller than 14px (decorative thumbnail chips excepted)', () => {
    const small: string[] = []
    for (const file of cssFiles(SRC)) {
      const css = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
      for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const size = /font-size:\s*(\d+(?:\.\d+)?)px/.exec(m[2])
        if (!size || Number(size[1]) >= 14) continue
        const selector = m[1].trim()
        if (DECORATIVE.some((d) => selector.includes(d))) continue
        small.push(`${file.replace(SRC, '')}: ${selector} ${size[1]}px`)
      }
    }
    expect(small).toEqual([])
  })

  it('captions are at least 22px and honesty tags at least 14px', () => {
    const tokens = readFileSync(join(SRC, 'styles', 'tokens.css'), 'utf8')
    expect(Number(/--fs-caption:\s*(\d+)px/.exec(tokens)![1])).toBeGreaterThanOrEqual(22)
    expect(Number(/--fs-label:\s*(\d+)px/.exec(tokens)![1])).toBeGreaterThanOrEqual(14)
  })
})
