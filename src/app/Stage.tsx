import { useEffect, useState, type ReactNode } from 'react'

export const STAGE_W = 1366
export const STAGE_H = 768

/** Uniform scale that fits the fixed canvas inside the window (letterboxed). */
export function fitScale(viewportW: number, viewportH: number): number {
  return Math.min(viewportW / STAGE_W, viewportH / STAGE_H)
}

/** Current on-screen scale of the stage, read from the DOM (for FLIP maths inside the scaled stage). */
export function stageScale(): number {
  const el = document.querySelector('.stage')
  return el ? el.getBoundingClientRect().width / STAGE_W : 1
}

function useFitScale(): number {
  const [scale, setScale] = useState(() => fitScale(window.innerWidth, window.innerHeight))
  useEffect(() => {
    const onResize = () => setScale(fitScale(window.innerWidth, window.innerHeight))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return scale
}

export function Stage({ children }: { children: ReactNode }) {
  const scale = useFitScale()
  return (
    <div className="viewport">
      <div className="stage" style={{ transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  )
}
