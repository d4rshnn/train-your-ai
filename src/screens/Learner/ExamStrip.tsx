import type { CSSProperties } from 'react'
import './ExamStrip.css'

export const EXAM_COPY = {
  caption: 'Practise only one type of question, and a new type trips you up.',
  bridge: 'An AI is the same. The examples are its practice.',
} as const

/** Seconds into the strip when each beat starts (the strip is about 6 s: cards, new question, question mark, bridge). */
const CARD_AT = [0.3, 0.7, 1.1, 1.5]
const NEW_AT = 2.9
const MARK_AT = 3.7

const d = (s: number): CSSProperties => ({ animationDelay: `${s}s` })

/** A practice question: a card with a circle on it. Every practice question has the same shape. */
function Question({ x, at }: { x: number; at: number }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <g className="exam__card" style={d(at)}>
        <rect x="0" y="130" width="96" height="124" rx="12" />
        <circle cx="48" cy="178" r="22" className="exam__icon" />
        <path d="M18 218h60M18 234h40" />
      </g>
    </g>
  )
}

/**
 * The exam analogy as a short drawing: a student at a desk practises one type of question (all the same shape), then a
 * differently shaped question arrives and a question mark pops up. Plain line art in the existing tokens; no photos.
 */
export function ExamStrip({ finished = false }: { finished?: boolean }) {
  return (
    <div className={`exam ${finished ? 'is-final' : ''}`}>
      <svg className="exam__svg" viewBox="0 0 1000 330" aria-hidden="true">
        {/* desk and chair */}
        <path className="exam__desk" d="M220 262H990M240 262V326M960 262V326" />
        <path className="exam__chair" d="M82 294H152M86 294V200M92 294V326M146 294V326" />

        {/* student, seated side-on: head, neck and shoulders joined, one arm on the desk holding a pencil */}
        <g className="exam__student">
          <circle cx="121" cy="122" r="26" />
          <path d="M114 147V178M128 147V178" />
          <path d="M102 280V206C102 190 110 181 122 181C134 181 141 190 141 206V280" />
          <path d="M100 278H196a8 8 0 0 1 0 16H100" />
          <path d="M194 294V326M208 294V326M194 326h30" />
          <path d="M134 196L172 234L226 254" />
          <circle cx="229" cy="256" r="4.5" />
          <path d="M231 254L254 232M254 232l3-6" />
          <path d="M139 118v.1" className="exam__eyes" />
          <path d="M144 124l5 3h-5M134 136h9" />
        </g>

        {/* the practice stack: same shape, one after another */}
        {CARD_AT.map((t, i) => (
          <Question key={t} x={300 + i * 118} at={t} />
        ))}

        {/* the new type of question: a different shape, in amber */}
        <g transform="translate(790 0)">
          <g className="exam__new" style={d(NEW_AT)}>
            <rect x="0" y="130" width="96" height="124" rx="12" />
            <path d="M48 154l24 42H24z" className="exam__icon" />
            <path d="M18 218h60M18 234h40" />
          </g>
        </g>

        {/* the question mark over the student's head */}
        <g transform="translate(121 58)">
          <g className="exam__mark" style={d(MARK_AT)}>
            <path d="M-13 -8C-13 -30 15 -30 15 -8C15 4 1 6 1 20" />
            <circle cx="1" cy="34" r="2.6" />
          </g>
        </g>
      </svg>

      <span className="exam__label" style={{ left: 183 + 525, top: 290, animationDelay: `${CARD_AT[0]}s` }}>
        Practice
      </span>
      <span className="exam__label is-exam" style={{ left: 183 + 838, top: 290, animationDelay: `${NEW_AT}s` }}>
        Exam: a new type
      </span>

      <p className="exam__caption">{EXAM_COPY.caption}</p>
      <p className="exam__bridge">{EXAM_COPY.bridge}</p>
    </div>
  )
}
