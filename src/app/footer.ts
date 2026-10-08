import type { Screen } from '../state/machine'

/** Honesty tag shown in the footer from the rules screen onward (the cat demo is a simulation). */
export const FOOTER_NOTE = 'Simulation: the AI here is a conceptual demo.'

/** The intro chapter: real ideas, not the cat simulation. The quantum screens carry their own "Simplified view" tag. */
export const INTRO_SCREENS: readonly Screen[] = ['aiLayers', 'quantumBit', 'quantumRun', 'quantumMeets', 'bridge']

/** What the footer says on a screen: nothing on the intro chapter, the simulation line everywhere else. */
export const footerNoteFor = (screen: Screen): string | undefined => (INTRO_SCREENS.includes(screen) ? undefined : FOOTER_NOTE)
