/** Simple drawn cat head (not an emoji): used on the "CAT" verdict. */
export function CatIcon({ size = 34 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
      <path d="M5 5.5l5.2 4.2a11 11 0 0 1 11.6 0L27 5.5V18a11 9.5 0 0 1-22 0z" />
      <circle cx="12" cy="16.5" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="20" cy="16.5" r="1.4" fill="currentColor" stroke="none" />
      <path d="M14.6 20.6h2.8l-1.4 1.7z" fill="currentColor" />
      <path d="M3 19.5l5 1M3 23l5-1.2M29 19.5l-5 1M29 23l-5-1.2" strokeWidth="1.3" />
    </svg>
  )
}
