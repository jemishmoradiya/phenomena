# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Vite dev server
- `npm run build` — production build (used as the mechanical check for changes; expect exit code 0)
- `npm run preview` — preview the production build

There is no test runner or linter configured in this project. Treat `npm run build` as the pass/fail signal for a change, and visually verify animation changes in the browser (see "Feel check" note below).

## Architecture

This is a React + Vite app ("Phenomena") that renders a gallery of 84 generative particle/physics animations ("modes") on canvas, with a control panel for tuning shared parameters (speed, density, palette, interaction, quality, etc).

The project is a Vite multi-page app. `index.html` loads the 2D gallery through `src/main.jsx`; `spatial.html` loads the separate Three.js particle lab through `src/spatial-main.jsx`. The 3D page owns its 34-scene, nine-family UI in `src/SpatialApp.jsx` and its imperative WebGL renderer in `src/simulations/ThreeParticleLab.jsx`, keeping Three.js out of the main gallery entry.

### Two families of simulations

1. **Generic particle field** (`src/simulations/ThoughtField.jsx`) — a single shared canvas renderer used for the majority of modes. For each frame it asks `getTarget(mode, index, count, time)` (`src/simulations/particleTargetRouter.js`) for a target position/depth per particle, then eases each particle toward that target and draws it. `particleTargetRouter.js` dispatches by `mode` string to either an inline formula or a `get*Target` function imported from `src/simulations/particleTargets.js` (one function per mode — this file is the place to add or tweak per-mode motion formulas).
2. **Dedicated simulations** — a handful of modes (`fireworks`, `cymatics`, `levitation`) are complex enough to have their own component and rendering approach instead of going through the generic particle router: `FireworksField.jsx`, `CymaticsField.jsx`, `AcousticLevitationField.jsx`. `App.jsx` picks which component to mount based on `mode`; anything not in `DEDICATED_MODES` falls through to `ThoughtField`.

To add a new mode: add an entry to `MODES` in `src/config/studio.js`, then either add a branch in `particleTargetRouter.js` (simple/shared-canvas case) or a new dedicated component wired up in `App.jsx` (complex/standalone case).

### State and config flow

- `src/config/studio.js` is the single source of truth for static data: `MODES` (id, group/family, label, note), `PALETTES` (color sets), `DEFAULT_SETTINGS`, `INTERACTIONS`, quality-independent constants (`MAX_PARTICLES`, `REDUCED_MOTION_TIMES`, etc).
- `App.jsx` owns top-level state (`mode`, `paletteId`, `settings`) and passes it down; there's no external state library.
- `settings` is a flat object (speed, energy, density, size, trail, interaction, interactionStrength, interactionRadius, quality, seed, seedLocked, revision, paused) shared across all simulations, though not every field applies to every mode (`StudioControls.jsx` relabels/hides fields per-mode, e.g. density becomes "Hz" for cymatics/levitation).
- `src/simulations/quality.js` maps a `quality` setting (`eco`/`auto`/`high`) to a DPR cap and a particle-count multiplier; every canvas renderer should route DPR and particle count through this instead of hardcoding values.

### Canvas rendering conventions

Renderers in `src/simulations/*` are imperative (canvas 2D or WebGL) driven by `requestAnimationFrame`, not React state per frame — mutable refs hold mode/palette/settings so the rAF loop can read current values without re-subscribing. Common pattern to follow when touching or adding a renderer:

- Cap devicePixelRatio via `getRenderDpr`/`getQualityProfile` (`quality.js`), never assume `window.devicePixelRatio` directly.
- Use `IntersectionObserver` to stop/resume work when the canvas scrolls offscreen, and `ResizeObserver` for canvas sizing — don't poll size in the render loop.
- Respect `useReducedMotion()` (from `motion/react`): reduced-motion should render a single representative frame per mode (see `REDUCED_MOTION_TIMES` in `studio.js`), not a frozen mid-animation frame.
- Keep particle/physics state in plain JS objects/arrays in refs, not React state — React re-renders are for UI chrome only.

### `plans/`

`plans/` contains a numbered backlog of animation-quality improvement plans (not yet implemented — see `plans/README.md` for status and recommended execution order, and the individual `NNN-*.md` files for problem/target/steps/boundaries/verification per plan). Each plan file follows a fixed structure: Problem → Target → Repo conventions to follow → Steps → Boundaries (explicit "do NOT" list) → Verification (mechanical build check + a manual "feel check"). If asked to implement one of these plans, follow that file's Boundaries section closely — they exist to prevent scope creep into unrelated visual/behavioral changes, and respect the stated plan dependencies in `plans/README.md` (e.g. plan 002 depends on 001, should follow 004, etc).
