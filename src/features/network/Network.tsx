import { useEffect, useMemo, useRef } from 'react'
import { NetworkEngine, type EngineStats } from './engine'
import { buildLayout } from './layout'
import { NetworkSvg } from './NetworkSvg'
import { ParticleCanvas } from './ParticleCanvas'
import { initialQuality, prefersReducedMotion } from './quality'
import { NET_H, NET_W } from './placement'
import './Network.css'

type Props = {
  width?: number
  height?: number
  className?: string
  /** Receives the engine once mounted (null on unmount) so screens can drive it imperatively. */
  onEngine?: (engine: NetworkEngine | null) => void
}

declare global {
  interface Window {
    __net?: { stats: () => EngineStats | null }
  }
}

export function Network({ width = NET_W, height = NET_H, className = '', onEngine }: Props) {
  const layout = useMemo(() => buildLayout(width, height), [width, height])
  const wrapRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fpsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const svg = wrapRef.current?.querySelector('svg')
    const canvas = canvasRef.current
    if (!svg || !canvas) return
    const accentRgb = getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb').trim() || '47, 227, 122'
    const engine = new NetworkEngine({ svg, canvas, layout, accentRgb, quality: initialQuality(), still: prefersReducedMotion() })
    engine.start()
    onEngine?.(engine)
    window.__net = { stats: () => engine.getStats() }

    const showFps = new URLSearchParams(window.location.search).has('fps')
    const timer = showFps
      ? window.setInterval(() => {
          const s = engine.getStats()
          if (fpsRef.current) fpsRef.current.textContent = `${s.fps.toFixed(0)} fps · ${s.frameMs.toFixed(1)} ms frame · ${s.workMs.toFixed(2)} ms JS · worst ${s.worstMs.toFixed(0)} ms · ${s.particles} particles · ${s.quality}`
        }, 500)
      : 0
    const onResize = () => engine.resize()
    window.addEventListener('resize', onResize)

    return () => {
      window.clearInterval(timer)
      window.removeEventListener('resize', onResize)
      engine.stop()
      onEngine?.(null)
      window.__net = undefined
    }
  }, [layout, onEngine])

  return (
    <figure ref={wrapRef} className={`net ${className}`} style={{ width, height: height + 28 }}>
      <div className="net__stage" style={{ width, height }}>
        <NetworkSvg layout={layout} />
        <ParticleCanvas ref={canvasRef} />
      </div>
      <figcaption>The AI&apos;s brain, greatly simplified · Conceptual view</figcaption>
      {new URLSearchParams(window.location.search).has('fps') ? <div ref={fpsRef} className="net__fps" /> : null}
    </figure>
  )
}
