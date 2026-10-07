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
export function ExamStrip() {
  return (
    <div className="exam">
      <svg className="exam__svg" viewBox="0 0 1000 330" aria-hidden="true">
        {/* desk */}
        <path className="exam__desk" d="M10 262h980M40 262v60M960 262v60" />

        {/* student, seen from the side, facing the questions */}
        <g className="exam__student">
          <circle cx="150" cy="116" r="30" />
          <path d="M96 262c0-62 24-92 54-92s54 30 54 92" />
          <path d="M196 214l50 30" />
          <path d="M146 112v.1M168 112v.1" className="exam__eyes" />
          <path d="M148 130h14" />
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
        <g transform="translate(150 54)">
          <g className="exam__mark" style={d(MARK_AT)}>
            <path d="M-13 -8C-13 -30 15 -30 15 -8C15 4 1 6 1 20" />
            <circle cx="1" cy="34" r="2.6" />
          </g>
        </g>
      </svg>

      <p className="exam__caption">{EXAM_COPY.caption}</p>
      <p className="exam__bridge">{EXAM_COPY.bridge}</p>
    </div>
  )
}
