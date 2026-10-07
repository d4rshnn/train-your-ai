import { describe, expect, it } from 'vitest'
import { cellDelay, cellNumber, cellsFromImageData, GRID, HIGHLIGHTS, luminance, showsNumber, stretchCells, tint, type Cell } from './mosaic'

describe('mosaic helpers', () => {
  it('reads a 24x24 RGBA buffer into 576 cells', () => {
    const data = new Uint8ClampedArray(GRID * GRID * 4).fill(255)
    const cells = cellsFromImageData(data)
    expect(cells).toHaveLength(576)
    expect(cells[0]).toEqual({ r: 255, g: 255, b: 255, lum: 255 })
  })

  it('computes luminance and two-digit numbers on a 0-99 scale', () => {
    expect(luminance(0, 0, 0)).toBe(0)
    expect(luminance(255, 255, 255)).toBe(255)
    expect(cellNumber({ r: 0, g: 0, b: 0, lum: 0 })).toBe('00')
    expect(cellNumber({ r: 255, g: 255, b: 255, lum: 255 })).toBe('99')
    expect(cellNumber({ r: 0, g: 0, b: 0, lum: 128 })).toHaveLength(2)
  })

  it('tints towards the accent without losing the original colour', () => {
    expect(tint({ r: 0, g: 0, b: 0 }, [100, 200, 50], 0)).toEqual([0, 0, 0])
    expect(tint({ r: 0, g: 0, b: 0 }, [100, 200, 50], 0.2)).toEqual([20, 40, 10])
    expect(tint({ r: 200, g: 200, b: 200 }, [100, 200, 50], 1)).toEqual([100, 200, 50])
  })

  it('shows numbers in roughly a third of the cells, the same ones every time', () => {
    const shown = Array.from({ length: 576 }, (_, i) => showsNumber(i))
    const n = shown.filter(Boolean).length
    expect(n).toBeGreaterThan(576 * 0.25)
    expect(n).toBeLessThan(576 * 0.43)
    expect(Array.from({ length: 576 }, (_, i) => showsNumber(i))).toEqual(shown)
    for (let i = 0; i < 576; i += 37) expect(cellDelay(i)).toBeGreaterThanOrEqual(0)
  })

  it('labels the highlights ears / eyes / fur / shape and never calls them detectors', () => {
    expect(HIGHLIGHTS.map((h) => h.label)).toEqual(['ears', 'eyes', 'fur', 'shape'])
    for (const h of HIGHLIGHTS) {
      expect(h.label).not.toMatch(/detect/i)
      for (const r of h.rings) {
        expect(r.cx).toBeGreaterThan(0)
        expect(r.cx).toBeLessThan(1)
        expect(r.cy).toBeGreaterThan(0)
        expect(r.cy).toBeLessThan(1)
      }
    }
  })

  it('stretches a dark, low-contrast photo so its lightest cells are near full brightness', () => {
    const dark: Cell[] = Array.from({ length: 576 }, (_, i) => {
      const v = 10 + (i % 24 < 12 ? 0 : 90) // dark background, a lighter (cat) half at ~100
      return { r: v, g: v, b: v, lum: v }
    })
    const out = stretchCells(dark)
    expect(Math.max(...out.map((c) => c.lum))).toBeGreaterThanOrEqual(240)
    expect(Math.min(...out.map((c) => c.lum))).toBeLessThanOrEqual(15)
    // order is preserved: lighter stays lighter
    expect(out[12].lum).toBeGreaterThan(out[0].lum)
  })

  it('leaves a flat image flat (no divide by zero)', () => {
    const flat: Cell[] = Array.from({ length: 576 }, () => ({ r: 80, g: 80, b: 80, lum: 80 }))
    const out = stretchCells(flat)
    expect(new Set(out.map((c) => c.lum)).size).toBe(1)
  })
})
