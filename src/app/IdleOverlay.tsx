import { useEffect, useState } from 'react'
import { Button } from '../components/Button'
import { secondsLeft, WARN_MS } from './idle'

/** "Still there?" with a visible 10 s countdown. After it runs out the app resets silently (see idle.ts). */
export function IdleOverlay({ onKeepGoing }: { onKeepGoing: () => void }) {
  const [left, setLeft] = useState(secondsLeft(0))
  useEffect(() => {
    const t0 = performance.now()
    const timer = window.setInterval(() => setLeft(secondsLeft(performance.now() - t0)), 250)
    return () => window.clearInterval(timer)
  }, [])
  return (
    <div className="overlay" role="alertdialog" aria-label="Still there?" onPointerDown={onKeepGoing}>
      <h2>Still there?</h2>
      <p>Tap anywhere to keep going.</p>
      <Button>Keep going</Button>
      <div className="overlay__count" aria-live="off">
        <span>Starting over in {left}</span>
        <i style={{ animationDuration: `${WARN_MS}ms` }} />
      </div>
    </div>
  )
}
