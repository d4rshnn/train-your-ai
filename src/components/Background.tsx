import { useEffect, useMemo, useRef } from 'react'
import { mulberry32 } from '../util/rand'
import './Background.css'

const W = 1366
const H = 768
const POINTS = 40
const MAX_SPEED = 12 // px/s, nothing animates faster than this

/** 256x256 noise tile, generated at runtime (no asset, no network). */
function makeNoiseUrl(): string {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const ctx = c.getContext('2d')
  if (!ctx) return ''
  const img = ctx.createImageData(256, 256)
  const rnd = mulberry32(7)
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rnd() * 255)
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v
    img.data[i + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  return c.toDataURL('image/png')
}

/** Persistent layers: gradient, grid, drifting data points, noise. Never unmounts. */
export function Background() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const noiseUrl = useMemo(makeNoiseUrl, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const rnd = mulberry32(42)
    const points = Array.from({ length: POINTS }, () => {
      const angle = rnd() * Math.PI * 2
      const speed = (0.3 + rnd() * 0.7) * MAX_SPEED
      return { x: rnd() * W, y: rnd() * H, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: 1 + rnd(), a: 0.1 + rnd() * 0.15 }
    })
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb').trim() || '47, 227, 122'
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      for (const p of points) {
        ctx.fillStyle = `rgba(${accent}, ${p.a})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    draw()
    if (reduce) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      for (const p of points) {
        p.x = (p.x + p.vx * dt + W) % W
        p.y = (p.y + p.vy * dt + H) % H
      }
      draw()
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="bg" aria-hidden="true">
      <div className="bg__gradient" />
      <div className="bg__grid" />
      <canvas ref={canvasRef} className="bg__points" width={W} height={H} />
      <div className="bg__noise" style={noiseUrl ? { backgroundImage: `url(${noiseUrl})` } : undefined} />
    </div>
  )
}
