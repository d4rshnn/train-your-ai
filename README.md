# Train Your AI

An interactive exhibition piece for the COC × VJTI stall. A visitor picks 10 labelled cat photos, watches a conceptual
neural network "learn" from them, then sees it predict on a picture it has never seen. A poor choice of examples makes it
stumble and a better one fixes it, so the lesson is that training data matters.

This is an honest **simulation**: the network visual is conceptual and the predictions come from a hand-designed rule that
rewards variety. Every screen says so. It runs fully offline: no backend, no network requests, fonts and photos are bundled.
The full design is in [docs/PLAN.md](docs/PLAN.md); photo sources and licences are in [CREDITS.md](CREDITS.md).
Running the stall? Read [docs/OPERATOR.md](docs/OPERATOR.md) (one page).

## At the stall (Windows)

1. Copy this whole folder to the stall laptop. It must contain the `dist` folder (the built app).
2. Double-click **`start-stall.bat`**. It serves `dist` from the laptop itself (`127.0.0.1` only, nothing leaves the machine) and opens the app full screen in Edge or Chrome, whichever is installed. Close the browser (Alt+F4) to stop it.
3. Options (run from a Command Prompt in this folder): `--autoplay` starts the self-playing demo loop; `--record` plays one cycle and stops on the last screen (for recording the fallback video); `--dry` only reports what it would do.

No Node.js is needed on the stall laptop, only the `dist` folder. If `dist` is missing and Node.js is installed, the script builds it first (it runs `npm install` once, which needs internet that one time).
The local server (`scripts/serve.ps1`) answers every page with a Content-Security-Policy that forbids requests to any other host, so the page cannot reach the internet even by accident.

## Build and develop

```bash
npm install
npm run dev        # http://localhost:5173/
npm run build      # static build in dist/
npm run preview    # serve dist/ with Vite's own server
npm test           # unit tests (vitest)
npm run typecheck
npm run sim:report # prints sample selections with their predictions and variety
```

The stage is a fixed 1366×768 canvas scaled to fit the window (letterboxed).

## URL options

Add these to the address, for example `http://localhost:5173/?autoplay`. Combine with `&`.

| URL | What it does |
|---|---|
| `?autoplay` | Runs the whole story by itself in a loop, with no input: start screen, "What does the AI know?", the one pick (the worst achievable set, cards flying into the tray about 0.4 s apart), training, the new cat's guess, "why", the what-if replay with the better examples side by side, the payoff, a 6 s hold, then back to the start. It uses the real screens and animations and clicks the real buttons; only the clicks are scripted. One cycle takes about **1 minute 55 seconds**. **Any real key press or click exits** autoplay and returns to the normal start screen with a clean state (that click is swallowed, so it does not also press START). The cursor is hidden while it runs and the idle reset is off. |
| `?autoplay&once` | Plays a single cycle and stops on the payoff screen (for screen recording). The RESTART button still works afterwards. |
| `?kiosk` | Hides the mouse cursor. (`start-stall.bat` adds it.) |
| `?quality=low` | Lighter rendering (fewer particles, no node halos, pixel ratio 1). **Remembered on this laptop**, so every later load keeps it. `?quality=high` remembers the full tier; `?quality=auto` forgets the choice. With nothing remembered, a machine with 2 or fewer CPU cores or 2 GB or less of memory starts light, and the app also drops to light by itself if frames are slow. |
| `?fps` | Shows a small frame-rate readout under the network. |
| `?dev` | Developer panel (bottom left): pick the worst or the good preset (optionally start training), jump to Training / Test / Why / What if / Payoff, stress-test the 300-particle cap, toggle quality. |

(`?autoplay&fast` shrinks the pauses to a tenth. It exists only to test the loop quickly.)
Reduced motion: if the computer asks for reduced motion (Windows: Settings, Accessibility, Visual effects, Animation effects off), the animations are skipped and each screen shows its end state.

## Operator controls

- **Idle reset:** after 60 s without input on any screen except attract, a "Still there?" prompt with a 10 s countdown appears; then the app resets silently to attract. Nothing from the previous group is kept (the picks, results, and the network's learned look are all wiped).
- **Hidden reset:** press **R** twice, or hold the "COC × VJTI" mark for 2 s, on any screen.
- Right-click menus, pinch zoom and image dragging are blocked.

## Customising

- **Logos:** put `coc-logo.svg` and `vjti-logo.svg` (or `.png`) into `src/assets/brand/` and rebuild (`npm run build`). The top-left mark then shows them instead of the "COC × VJTI" text. If the files are missing the text is used.
- **Accent colour:** change the three numbers in `--accent-rgb` at the top of `src/styles/tokens.css` (red, green, blue), then rebuild. Everything green on screen follows it. Check that the text on the accent button stays readable (`npm test` includes a contrast check).
- **Swap an image:** replace the file in `src/assets/images/train/` or `test/` with a **512×512 square WebP** of the same name (crop so the animal is centred; keep it under about 60 KB). If the new photo shows a different colour, pose, fur, age, size or background, edit that card's line in `src/data/examples.ts` to match, because those attributes drive the prediction rule. Record the source and licence in `CREDITS.md`. Keep the black-cat test image (`test-01`) as a short-haired side-walking cat and keep every training card from being short-haired and side-walking, otherwise Round 1 will no longer fail on purpose. Then run `npm test` and `npm run build`.
- **Copy:** the screen texts live in each `src/screens/*` file; the payoff wording is in `src/features/payoff/content.ts`. `npm test` fails if wording that overclaims (for example "detector", "stores", "real trained model") is added.

## Layout of the code

- `src/app` stage, idle watcher, autoplay driver
- `src/state` reducer for the screen flow
- `src/features/sim` the deterministic prediction rule (and its tests)
- `src/features/network` the network visual and the training / test sequences
- `src/features/cards`, `explain`, `payoff` cards and tray, the S2 mosaic, S8 content
- `src/screens` one folder per screen
- `src/data/examples.ts` the 28 example photos and their attributes
- `scripts/serve.ps1`, `start-stall.bat` the offline stall launcher
