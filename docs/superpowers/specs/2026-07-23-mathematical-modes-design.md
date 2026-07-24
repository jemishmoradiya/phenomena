# Four new Mathematical-family modes

## Problem

The `mathematical` mode family currently has only 2 entries (`resolve`, `bloom`) — the thinnest family in the gallery (cosmic has 10, thought has 11). We're adding 4 more to round it out, drawing on distinct mathematical phenomena that don't repeat the shape language of the existing two (`resolve` = Fibonacci sphere, `bloom` = polar rose curve).

## Target

Four new modes, all `group: "mathematical"`, integrated through the existing generic particle field (`ThoughtField.jsx` via `particleTargetRouter.js` / `particleTargets.js`) — no new rendering machinery, no dedicated component. Each ships with a `MODES` entry, a motion formula, and an icon glyph, matching the conventions described in the repo's `CLAUDE.md`.

## Repo conventions to follow

- Motion is a **pure, stateless function of `(index, count, time)`** — no per-frame mutable state, no dependence on the previous frame's output. This matches every existing `get*Target` function and inline router branch.
- **Simple/one-shot formulas** go inline in `particleTargetRouter.js` as a new `if (mode === "...")` branch (see `resolve`, `bloom`, `signal` for precedent).
- **More involved formulas** go as a dedicated `get*Target(index, count, time)` function in `particleTargets.js`, imported into the router (see `getNebulaTarget`, `getConsensusTarget` for precedent).
- Cyclic phase-blending between sub-shapes uses the existing `mixTargets(a, b, blend)` helper with a `time % N` cycle (see `getNebulaTarget`, `getConsensusTarget`, `getVineTarget`).
- Per-particle deterministic pseudo-randomness uses the existing `seeded(index, salt)` helper (GLSL-style `sin`-hash), never `Math.random()`.
- Every mode needs a `MotionGlyph` dot-array entry in `StudioIcons.jsx` (`dots[mode]` is accessed unconditionally — a missing entry throws).
- `depth` is returned in roughly `[0, 1]` (not strictly clamped elsewhere in the codebase, so exact clamping isn't required, but values should stay in a sane range) and drives per-particle parallax/size/opacity in `ThoughtField.jsx`.
- Modes with a time-cyclic phase structure get an entry in `REDUCED_MOTION_TIMES` (`studio.js`) picking a representative mid-cycle time for the reduced-motion single-frame render.

## The four modes

### 1. Wave Interference (`interference`) — inline in router

Label: "Wave Interference". Note: "two rhythms discovering where they agree".

Particles sit on a fixed grid (same column/row layout style as the existing `signal` branch). Two point sources slowly orbit the field center. Each particle computes its distance to both sources and derives an interference amplitude from `cos(k·(d1 − d2) − time·ω)`. That amplitude drives `depth` and a small position bob (not a large migration), producing a shimmering moiré/ripple lattice — visually a grid pattern, distinct from the radial symmetry of `resolve`/`bloom`.

Concrete formula (illustrative, may be tuned during implementation):

```js
if (mode === "interference") {
  const columns = Math.ceil(Math.sqrt(count));
  const row = Math.floor(index / columns);
  const column = index % columns;
  const spacing = 1.7 / columns;
  const baseX = (column - columns / 2) * spacing;
  const baseY = (row - columns / 2) * spacing * 0.8;
  const sourceAngle = time * 0.05;
  const s1x = Math.cos(sourceAngle) * 0.32;
  const s1y = Math.sin(sourceAngle) * 0.32;
  const s2x = -s1x;
  const s2y = -s1y;
  const d1 = Math.hypot(baseX - s1x, baseY - s1y);
  const d2 = Math.hypot(baseX - s2x, baseY - s2y);
  const amplitude = Math.cos(14 * (d1 - d2) - time * 1.6);
  return {
    x: baseX + amplitude * 0.02,
    y: baseY + amplitude * 0.02,
    depth: 0.25 + 0.75 * ((amplitude + 1) / 2),
  };
}
```

No `REDUCED_MOTION_TIMES` entry needed — the pattern is continuous, not phase-cyclic; `time = 0` renders a representative frame.

### 2. Möbius Loop (`mobius`) — inline in router

Label: "Möbius Loop". Note: "a path returning to itself from the other side".

Standard Möbius-strip parametrization. Particles flow along the strip's single edge, which requires `u` to sweep `0..4π` (twice around) to close continuously. Each particle has a fixed seeded offset across the strip's width; the twist component (`z`) drives `depth`, giving the "flips to the other side" parallax read. Renders as a continuously twisting ribbon.

```js
if (mode === "mobius") {
  const width = 0.32;
  const u = ratio * TAU * 2 + time * 0.25;
  const v = seeded(index, 31) * 2 - 1;
  const radius = 1 + (width * v / 2) * Math.cos(u / 2);
  const z = (width * v / 2) * Math.sin(u / 2);
  return {
    x: Math.cos(u) * radius * 0.62,
    y: Math.sin(u) * radius * 0.62,
    depth: 0.3 + 0.7 * ((z / (width / 2) + 1) / 2),
  };
}
```

No `REDUCED_MOTION_TIMES` entry needed — continuous, not phase-cyclic.

### 3. Strange Attractor (`attractor`) — dedicated function in `particleTargets.js`

Label: "Strange Attractor". Note: "motion that never repeats, yet never breaks its shape".

Uses a Clifford attractor map (`x' = sin(a·y) + c·cos(a·x)`, `y' = sin(b·x) + d·cos(b·y)`) with fixed classic parameters (`a = -1.4, b = 1.6, c = 1, d = 0.7`). Each particle iterates the map a **fixed** ~40 times from its own `seeded(index, salt)` starting point — the iteration count does not depend on `time`, so the resulting point is stable frame-to-frame (chaotic maps are highly sensitive to parameter perturbation; varying `a/b/c/d` per-frame would cause jittery jumps between frames, which we're deliberately avoiding to keep the animation calm per the app's existing restraint-over-chaos direction). Liveliness comes from a slow, smooth global rotation of the resulting point cloud (`rotation = time * 0.035`), not from perturbing the chaotic system itself.

```js
const ATTRACTOR_A = -1.4;
const ATTRACTOR_B = 1.6;
const ATTRACTOR_C = 1;
const ATTRACTOR_D = 0.7;
const ATTRACTOR_ITERATIONS = 40;

function getStrangeAttractorTarget(index, time) {
  let x = seeded(index, 41) * 2 - 1;
  let y = seeded(index, 42) * 2 - 1;
  for (let i = 0; i < ATTRACTOR_ITERATIONS; i++) {
    const nx = Math.sin(ATTRACTOR_A * y) + ATTRACTOR_C * Math.cos(ATTRACTOR_A * x);
    const ny = Math.sin(ATTRACTOR_B * x) + ATTRACTOR_D * Math.cos(ATTRACTOR_B * y);
    x = nx;
    y = ny;
  }
  const rotation = time * 0.035;
  const cosR = Math.cos(rotation);
  const sinR = Math.sin(rotation);
  const scale = 0.34;
  return {
    x: (x * cosR - y * sinR) * scale,
    y: (x * sinR + y * cosR) * scale,
    depth: 0.3 + 0.7 * Math.min(1, Math.hypot(x, y) / 2.6),
  };
}
```

Performance note: 40 iterations × up to `MAX_PARTICLES` (420) × quality multiplier = a few thousand `sin`/`cos` calls per frame — trivial at 60fps, comparable in cost to other modes' per-particle trig.

No `REDUCED_MOTION_TIMES` entry needed — continuous rotation, not phase-cyclic (any fixed `time` gives a representative frame of the same stable shape).

### 4. Tessellation (`tessellation`) — dedicated function in `particleTargets.js`, with precomputed constants in `studio.js`

Label: "Tessellation". Note: "space dividing itself without a gap".

Two precomputed jittered cell-center arrangements, `TESSELLATION_CELLS_A` and `TESSELLATION_CELLS_B` (same style as the existing `NEURAL_PULSE_NODES` constant), each ~12 cells. Each particle is assigned to a cell via `index % cellCount` with a small `seeded()` offset inside it (same assignment style as `getCosmicWebTarget`'s cluster assignment). A `time % 14` cycle blends between arrangement A and B using the existing `mixTargets` helper — mostly settled in one arrangement, with a ~2s crossfade transition — reading as a periodic re-tiling of space. This is the one mode of the four with a phase-cycle structure, so it gets a `REDUCED_MOTION_TIMES` entry picking a representative "settled" time (e.g. `tessellation: 2`).

## Files touched

- `src/config/studio.js` — 4 new `MODES` entries; `TESSELLATION_CELLS_A`/`_B` constants; 1 new `REDUCED_MOTION_TIMES` entry (`tessellation`).
- `src/simulations/particleTargetRouter.js` — 2 new inline branches (`interference`, `mobius`); import + dispatch for `attractor` and `tessellation`.
- `src/simulations/particleTargets.js` — `getStrangeAttractorTarget`, `getTessellationTarget`.
- `src/components/StudioIcons.jsx` — 4 new `dots[mode]` glyph entries.

## Boundaries (do NOT)

- Do NOT touch `resolve` or `bloom`'s existing formulas.
- Do NOT introduce per-frame mutable state, `Math.random()`, or any dependency on the previous frame's computed position — every formula must be a pure function of `(index, count, time)`.
- Do NOT add a dedicated rendering component for any of these 4 — they all go through the generic `ThoughtField` particle router.
- Do NOT change `quality.js`, DPR handling, or `MAX_PARTICLES` — reuse existing particle-count/DPR plumbing as-is.
- Do NOT add new palettes, interactions, or settings fields — these modes use the existing shared `settings` object like every other particle-field mode.

## Verification

- Mechanical: `npm run build` exits 0.
- Feel check (manual, in browser via `npm run dev`): cycle to each of the 4 new modes and confirm — Wave Interference reads as a rippling grid (not a spinning shape); Möbius Loop reads as a continuous twisting ribbon with a visible "flip"; Strange Attractor is a stable, slowly-rotating fractal-ish cloud with **no per-frame jitter/flicker**; Tessellation shows a mosaic that periodically re-tiles on a ~14s cycle without an abrupt jump-cut. Also check reduced-motion (OS setting) renders one coherent static frame per mode, and that quality settings (`eco`/`auto`/`high`) still visibly change particle count/DPR without errors.
