import { forwardRef } from 'react'

/** Transparent overlay for particles and glow sprites. The engine sizes the backing store (DPR clamped to 1.5). */
export const ParticleCanvas = forwardRef<HTMLCanvasElement>(function ParticleCanvas(_props, ref) {
  return <canvas ref={ref} className="net__canvas" aria-hidden="true" />
})
