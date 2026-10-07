import { DOMAINS, otherDomains } from '../data/domains'
import './DomainChips.css'

/** Quiet chips for the COC domains. `current` is highlighted with a "You're here" tag; `onlyOthers` leaves it out. */
export function DomainChips({ onlyOthers = false, className = '' }: { onlyOthers?: boolean; className?: string }) {
  const list = onlyOthers ? otherDomains() : DOMAINS
  return (
    <ul className={`domains ${className}`} aria-label="COC domains">
      {list.map((d) => (
        <li key={d.name} className={`domains__chip ${d.current ? 'is-current' : ''}`}>
          {d.name}
          {d.current ? <em>You&apos;re here</em> : null}
        </li>
      ))}
    </ul>
  )
}
