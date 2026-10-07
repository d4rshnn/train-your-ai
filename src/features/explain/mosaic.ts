import { mulberry32 } from '../../util/rand'

/** Well-mixed 0..1 value per index (the FNV hash used elsewhere clusters for near-identical strings). */
const seeded = (index: number, salt: number) => mulberry32(index * 7919 + salt)()

/** The cat becomes a coarse 24 x 24 grid of cells. */
export const GRID = 24

export type Cell = { r: number; g: number; b: number; lum: number }

export const luminance = (r: number, g: number, b: number) => Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b)

/** Read an n x n RGBA buffer (e.g. the image drawn onto a 24 x 24 canvas) into cells. */
export function cellsFromImageData(data: ArrayLike<number>, n = GRID): Cell[] {
  const cells: Cell[] = []
  for (let i = 0; i < n * n; i++) {
    const r = data[i * 4]
    const g = data[i * 4 + 1]
    const b = data[i * 4 + 2]
    cells.push({ r, g, b, lum: luminance(r, g, b) })
  }
  return cells
}

/**
 * Stretch the cells' brightness so the lightest cells are near full white and the darkest near black (histogram
 * stretch between two percentiles, plus a gentle gamma). A dark photo then still reads as its subject.
 */
export function stretchCells(cells: Cell[], low = 0.04, high = 0.96, gamma = 0.8): Cell[] {
  const sorted = cells.map((c) => c.lum).sort((a, b) => a - b)
  const lo = sorted[Math.floor(low * (sorted.length - 1))]
  const hi = Math.max(lo + 1, sorted[Math.floor(high * (sorted.length - 1))])
  const f = (v: number) => Math.round(255 * Math.pow(Math.min(1, Math.max(0, (v - lo) / (hi - lo))), gamma))
  return cells.map((c) => {
    const r = f(c.r)
    const g = f(c.g)
    const b = f(c.b)
    return { r, g, b, lum: luminance(r, g, b) }
  })
}

/** A light green tint over the sampled colour: still clearly the cat, but it reads as data. */
export function tint(c: Pick<Cell, 'r' | 'g' | 'b'>, accent: [number, number, number], amount = 0.2): [number, number, number] {
  const mix = (a: number, b: number) => Math.round(a * (1 - amount) + b * amount)
  return [mix(c.r, accent[0]), mix(c.g, accent[1]), mix(c.b, accent[2])]
}

/** About a third of the cells show their number; which ones is fixed (seeded), not random per load. */
export const showsNumber = (index: number) => seeded(index, 11) < 0.34

/** The "number" a cell would be to a computer: its brightness on a 0-99 scale. */
export const cellNumber = (c: Cell) => String(Math.min(99, Math.round((c.lum / 255) * 99))).padStart(2, '0')

/** 0..1 seeded delay so the cells appear in a scattered, not left-to-right, order while the photo dissolves. */
export const cellDelay = (index: number) => seeded(index, 23)

/**
 * Soft rings over the mosaic. These are PATTERNS a model might pick up on, not detectors or rules, so the screen
 * labels them neutrally and carries a "Simplified view" tag. Coordinates are fractions of the (square) cat image.
 */
export type Highlight = { key: 'ears' | 'eyes' | 'fur' | 'shape'; label: string; rings: { cx: number; cy: number; rx: number; ry: number }[]; dashed?: boolean }

/**
 * The explainer crops the cat photo to the head and shoulders so a 24 x 24 grid still reads as a cat.
 * Fractions of the source image (square). Highlights below are in coordinates of this crop.
 */
export const FACE_CROP = { x: 0.1, y: 0, size: 0.7 }

export const HIGHLIGHTS: Highlight[] = [
  { key: 'ears', label: 'ears', rings: [{ cx: 0.285, cy: 0.17, rx: 0.15, ry: 0.13 }, { cx: 0.64, cy: 0.07, rx: 0.14, ry: 0.11 }] },
  { key: 'eyes', label: 'eyes', rings: [{ cx: 0.41, cy: 0.33, rx: 0.1, ry: 0.08 }, { cx: 0.57, cy: 0.25, rx: 0.1, ry: 0.08 }] },
  { key: 'fur', label: 'fur', rings: [{ cx: 0.48, cy: 0.8, rx: 0.27, ry: 0.17 }] },
  { key: 'shape', label: 'shape', rings: [{ cx: 0.5, cy: 0.52, rx: 0.47, ry: 0.5 }], dashed: true },
]
