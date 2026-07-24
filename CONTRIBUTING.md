# Contributing

## Dev setup

```bash
npm install
npm run dev
```

Node 20+ required. There's no test runner configured — `npm run build` (exit code 0) is the mechanical pass/fail check for any change, plus `npm run lint`. For animation/visual changes, also open the affected mode in the browser and eyeball it — a passing build doesn't mean the motion looks right.

## Repo conventions

Full architecture notes (state flow, the two families of simulations, canvas rendering conventions) live in [`CLAUDE.md`](CLAUDE.md) — read that before touching `src/simulations/`.

## Adding a new mode

1. Add an entry to `MODES` in `src/config/studio.js` (id, group/family, label, note).
2. Most modes go through the shared canvas renderer: add a branch in `src/simulations/particleTargetRouter.js`, or a new `get*Target` function in `src/simulations/particleTargets.js`.
3. If the mode needs its own rendering approach (its own canvas pipeline, like `fireworks` or `cymatics`), build a dedicated component and wire it into `App.jsx`'s `DEDICATED_MODES` handling instead.
4. Route DPR and particle count through `src/simulations/quality.js` rather than hardcoding values, and respect `useReducedMotion()` — see the "Canvas rendering conventions" section of `CLAUDE.md`.

## Known-rough areas

Animation-quality issues that are known but not yet addressed: particle hierarchy/pacing, mode transitions, pointer physics, trail/network overlays, idle rendering. If you're picking one of these up, open an issue first so the approach can be discussed before a PR.

## Submitting changes

Open a PR against `main`. Keep changes scoped — a bug fix doesn't need an unrelated refactor riding along with it. Describe the visual/behavioral change if one is involved; a screen recording or GIF is helpful for anything animation-related.
