import { useRef } from 'react'
import './Chrome.css'

/** Optional logos: drop coc-logo.svg / vjti-logo.svg (or .png) into src/assets/brand/. Nothing is invented. */
const logos = import.meta.glob('../assets/brand/*.{svg,png}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>

function findLogo(base: string): string | undefined {
  const key = Object.keys(logos).find((k) => new RegExp(`/${base}\\.(svg|png)$`).test(k))
  return key ? logos[key] : undefined
}

const HOLD_MS = 2000

/** "COC × VJTI" lockup. Holding it for 2 s is the hidden operator reset. */
export function BrandMark({ onOperatorReset }: { onOperatorReset?: () => void }) {
  const timer = useRef<number | undefined>(undefined)
  const coc = findLogo('coc-logo')
  const vjti = findLogo('vjti-logo')

  const down = () => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => onOperatorReset?.(), HOLD_MS)
  }
  const up = () => window.clearTimeout(timer.current)

  return (
    <div className="brand" onPointerDown={down} onPointerUp={up} onPointerLeave={up} onPointerCancel={up} data-testid="brand-mark">
      {coc ? <img src={coc} alt="COC" className="brand__logo" /> : <span>COC</span>}
      <span className="brand__x">×</span>
      {vjti ? <img src={vjti} alt="VJTI" className="brand__logo" /> : <span>VJTI</span>}
    </div>
  )
}
