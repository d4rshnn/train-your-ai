import type { Quality } from './engine'

const KEY = 'tya.quality'

export type QualityDecision = { quality: Quality; save: Quality | 'clear' | null }

const lowSpec = (hw: { cores?: number; memoryGb?: number }) => (hw.cores !== undefined && hw.cores <= 2) || (hw.memoryGb !== undefined && hw.memoryGb <= 2)

/**
 * ?quality=low or ?quality=high is remembered on this machine (so the stall's start script can set it once and every
 * later load keeps it); ?quality=auto forgets it. With nothing remembered, a machine with 2 or fewer CPU cores or 2 GB
 * or less of memory starts on the light tier. The engine can still drop to low by itself if frames are slow.
 */
export function resolveQuality(search: string, stored: string | null, hw: { cores?: number; memoryGb?: number } = {}): QualityDecision {
  const param = new URLSearchParams(search).get('quality')
  if (param === 'low' || param === 'high') return { quality: param, save: param }
  if (param === 'auto') return { quality: lowSpec(hw) ? 'low' : 'high', save: 'clear' }
  if (stored === 'low' || stored === 'high') return { quality: stored, save: null }
  return { quality: lowSpec(hw) ? 'low' : 'high', save: null }
}

function readStore(): string | null {
  try {
    return window.localStorage.getItem(KEY)
  } catch {
    return null // storage can be blocked (kiosk profiles); the page works without it
  }
}

function writeStore(v: Quality | 'clear') {
  try {
    if (v === 'clear') window.localStorage.removeItem(KEY)
    else window.localStorage.setItem(KEY, v)
  } catch {
    /* ignore */
  }
}

export function initialQuality(): Quality {
  const nav = navigator as Navigator & { deviceMemory?: number }
  const d = resolveQuality(window.location.search, readStore(), { cores: nav.hardwareConcurrency, memoryGb: nav.deviceMemory })
  if (d.save) writeStore(d.save)
  return d.quality
}

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
