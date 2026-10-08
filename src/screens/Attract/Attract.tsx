import { useEffect } from 'react'
import { Button } from '../../components/Button'
import './Attract.css'

export function Attract({ onStart, onSkipIntro }: { onStart: () => void; onSkipIntro: () => void }) {
  // Space / Enter also start (the button handles Enter/Space itself when focused).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault()
        onStart()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onStart])

  return (
    <section className="attract">
      <div className="attract__copy">
        <h1 className="attract__title">
          <span className="attract__line">Train</span>
          <span className="attract__line">
            Your <em>AI</em>
          </span>
        </h1>
        <p className="attract__subtitle">Can you teach an AI to recognize a cat?</p>
        <Button className="btn--pulse attract__start" onClick={onStart} autoFocus>
          Start
        </Button>
        <button type="button" className="attract__skip" onClick={onSkipIntro}>
          Skip intro
        </button>
      </div>
    </section>
  )
}
