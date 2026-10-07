import './Chrome.css'

export function Footer({ note }: { note?: string }) {
  return (
    <div className="footer">
      <span>Community of Coders — VJTI</span>
      {note ? <span className="footer__note">{note}</span> : null}
    </div>
  )
}
