import '@fontsource/space-grotesk/latin-600.css'
import '@fontsource/space-grotesk/latin-700.css'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/jetbrains-mono/latin-500.css'
import './styles/tokens.css'
import './styles/global.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'

/** Every face the UI uses. The app does not render until they are loaded, so there is no flash of fallback fonts. */
export const FONT_FACES = ['600 1em "Space Grotesk"', '700 1em "Space Grotesk"', '400 1em Inter', '500 1em Inter', '500 1em "JetBrains Mono"']
const FONT_TIMEOUT_MS = 2500

async function fontsReady(): Promise<boolean> {
  if (!('fonts' in document)) return true
  const loaded = Promise.all(FONT_FACES.map((f) => document.fonts.load(f))).then(() => true)
  const timeout = new Promise<boolean>((resolve) => window.setTimeout(() => resolve(false), FONT_TIMEOUT_MS))
  return Promise.race([loaded, timeout]).catch(() => false)
}

void fontsReady().then((ok) => {
  // exposed for the stall checks: were all five faces ready before the first paint of the app?
  ;(window as unknown as { __fontsAtFirstRender?: boolean }).__fontsAtFirstRender = ok
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
