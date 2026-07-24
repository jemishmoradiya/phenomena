# Four New Mathematical Modes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 4 new modes (Wave Interference, Möbius Loop, Strange Attractor, Tessellation) to the `mathematical` family in the Phenomena particle-gallery app.

**Architecture:** All 4 modes run through the existing generic particle field (`ThoughtField.jsx` → `particleTargetRouter.js` → optionally `particleTargets.js`). No new components, no new state, no new settings fields. Wave Interference and Möbius Loop are simple one-shot formulas added as inline branches in the router (same tier as `resolve`/`bloom`). Strange Attractor and Tessellation are more involved and added as dedicated `get*Target` functions in `particleTargets.js` (same tier as `getNebulaTarget`/`getConsensusTarget`).

**Tech Stack:** React + Vite, canvas 2D rendering, no test runner/linter configured.

## Global Constraints

- This project has **no test runner or linter**. Per `CLAUDE.md`, `npm run build` (expect exit code 0) is the mechanical pass/fail signal for every task — use it in place of a test suite.
- Every motion formula must be a **pure, stateless function of `(index, count, time)`** — no per-frame mutable state, no `Math.random()` (use the existing `seeded(index, salt)` hash helper instead), no dependence on the previous frame's output.
- `depth` should be returned roughly in `[0, 1]`.
- Every mode id used in `MODES` (`studio.js`) must have a matching `dots[mode]` entry in `StudioIcons.jsx` — `MotionGlyph` accesses it unconditionally and will throw if missing, so the icon must land in the **same task** as the mode.
- Do not modify the existing `resolve` or `bloom` formulas, any dedicated-component mode (`ferrofluid`, `fireworks`, `lensing`, `cymatics`, `levitation`), `quality.js`, or `DEFAULT_SETTINGS`.
- Manual "feel check" (per `CLAUDE.md`) requires running `npm run dev` and selecting the new mode in the browser — this is a human-verification step, not scriptable, and should be called out explicitly rather than skipped.

---

## Task 1: Wave Interference (`interference`)

**Files:**
- Modify: `src/config/studio.js` (MODES array, ends at line 42)
- Modify: `src/components/StudioIcons.jsx` (dots object, ends at line 65)
- Modify: `src/simulations/particleTargetRouter.js` (inline branch, after `bloom` branch at line 51, before `signal` branch at line 53)

**Interfaces:**
- Produces: mode id `"interference"`, selectable via the existing `MODES`/`ThoughtField` flow. No other task depends on this one.

- [ ] **Step 1: Add the `MODES` entry**

In `src/config/studio.js`, find:

```js
  { id: "orchestra", group: "mechanical", label: "Orchestra Assembly", note: "independent voices becoming one system" },
];
```

Replace with:

```js
  { id: "orchestra", group: "mechanical", label: "Orchestra Assembly", note: "independent voices becoming one system" },
  { id: "interference", group: "mathematical", label: "Wave Interference", note: "two rhythms discovering where they agree" },
];
```

- [ ] **Step 2: Add the icon glyph**

In `src/components/StudioIcons.jsx`, find:

```js
    orchestra: [[4, 15], [7, 10], [10, 7], [14, 7], [17, 10], [20, 15], [8, 17], [12, 18], [16, 17]],
  };
```

Replace with:

```js
    orchestra: [[4, 15], [7, 10], [10, 7], [14, 7], [17, 10], [20, 15], [8, 17], [12, 18], [16, 17]],
    interference: [[4, 12], [8, 8], [8, 16], [12, 4], [12, 12], [12, 20], [16, 8], [16, 16], [20, 12]],
  };
```

- [ ] **Step 3: Add the motion formula**

In `src/simulations/particleTargetRouter.js`, find:

```js
  if (mode === "bloom") {
    const petals = 7;
    const a = angle * 2.2 + time * 0.12;
    const radius = 0.2 + 0.55 * Math.abs(Math.sin((petals * a) / 2));
    const breathe = 0.96 + Math.sin(time * 0.8) * 0.04;
    return {
      x: Math.cos(a) * radius * breathe,
      y: Math.sin(a) * radius * breathe,
      depth: 0.35 + seed * 0.65,
    };
  }

  if (mode === "signal") {
```

Replace with:

```js
  if (mode === "bloom") {
    const petals = 7;
    const a = angle * 2.2 + time * 0.12;
    const radius = 0.2 + 0.55 * Math.abs(Math.sin((petals * a) / 2));
    const breathe = 0.96 + Math.sin(time * 0.8) * 0.04;
    return {
      x: Math.cos(a) * radius * breathe,
      y: Math.sin(a) * radius * breathe,
      depth: 0.35 + seed * 0.65,
    };
  }

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

  if (mode === "signal") {
```

- [ ] **Step 4: Build check**

Run: `npm run build`
Expected: exits 0, no errors.

- [ ] **Step 5: Manual feel check**

Run: `npm run dev`, open the app, select "Wave Interference" from the Math collection. Confirm particles form a rippling grid (moiré pattern of dim/bright bands) rather than a static grid or a radial shape, and that it stays calm (no jitter, no particles flying off).

- [ ] **Step 6: Commit**

```bash
git add src/config/studio.js src/components/StudioIcons.jsx src/simulations/particleTargetRouter.js
git commit -m "Add Wave Interference mathematical mode"
```

---

## Task 2: Möbius Loop (`mobius`)

**Files:**
- Modify: `src/config/studio.js` (MODES array — anchor on the line Task 1 added)
- Modify: `src/components/StudioIcons.jsx` (dots object — anchor on the line Task 1 added)
- Modify: `src/simulations/particleTargetRouter.js` (inline branch, after the `interference` branch added in Task 1, before `signal`)

**Interfaces:**
- Consumes: nothing from Task 1 except that Task 1's edits must already be applied (this task's anchors are the lines Task 1 added).
- Produces: mode id `"mobius"`. No other task depends on this one.

- [ ] **Step 1: Add the `MODES` entry**

In `src/config/studio.js`, find:

```js
  { id: "interference", group: "mathematical", label: "Wave Interference", note: "two rhythms discovering where they agree" },
];
```

Replace with:

```js
  { id: "interference", group: "mathematical", label: "Wave Interference", note: "two rhythms discovering where they agree" },
  { id: "mobius", group: "mathematical", label: "Möbius Loop", note: "a path returning to itself from the other side" },
];
```

- [ ] **Step 2: Add the icon glyph**

In `src/components/StudioIcons.jsx`, find:

```js
    interference: [[4, 12], [8, 8], [8, 16], [12, 4], [12, 12], [12, 20], [16, 8], [16, 16], [20, 12]],
  };
```

Replace with:

```js
    interference: [[4, 12], [8, 8], [8, 16], [12, 4], [12, 12], [12, 20], [16, 8], [16, 16], [20, 12]],
    mobius: [[12, 12], [8, 6], [4, 11], [7, 17], [12, 13], [17, 17], [20, 11], [16, 6]],
  };
```

- [ ] **Step 3: Add the motion formula**

In `src/simulations/particleTargetRouter.js`, find:

```js
    return {
      x: baseX + amplitude * 0.02,
      y: baseY + amplitude * 0.02,
      depth: 0.25 + 0.75 * ((amplitude + 1) / 2),
    };
  }

  if (mode === "signal") {
```

Replace with:

```js
    return {
      x: baseX + amplitude * 0.02,
      y: baseY + amplitude * 0.02,
      depth: 0.25 + 0.75 * ((amplitude + 1) / 2),
    };
  }

  if (mode === "mobius") {
    const width = 0.32;
    const u = ratio * TAU * 2 + time * 0.25;
    const v = seeded(index, 31) * 2 - 1;
    const radius = 1 + ((width * v) / 2) * Math.cos(u / 2);
    const z = ((width * v) / 2) * Math.sin(u / 2);
    return {
      x: Math.cos(u) * radius * 0.62,
      y: Math.sin(u) * radius * 0.62,
      depth: 0.3 + 0.7 * ((z / (width / 2) + 1) / 2),
    };
  }

  if (mode === "signal") {
```

- [ ] **Step 4: Build check**

Run: `npm run build`
Expected: exits 0, no errors.

- [ ] **Step 5: Manual feel check**

Run: `npm run dev`, select "Möbius Loop". Confirm particles form a single continuous twisting ribbon (not two separate rings), with a visible "flip" as depth cycles — i.e. particles appear to travel to the far side of the loop and back, not just bob in place.

- [ ] **Step 6: Commit**

```bash
git add src/config/studio.js src/components/StudioIcons.jsx src/simulations/particleTargetRouter.js
git commit -m "Add Möbius Loop mathematical mode"
```

---

## Task 3: Strange Attractor (`attractor`)

**Files:**
- Modify: `src/config/studio.js` (MODES array — anchor on the line Task 2 added)
- Modify: `src/components/StudioIcons.jsx` (dots object — anchor on the line Task 2 added)
- Modify: `src/simulations/particleTargets.js` (new function, added before the `export` line at line 818; export list updated)
- Modify: `src/simulations/particleTargetRouter.js` (import list at line 2; dispatch one-liner added after the `orchestra` dispatch at line 161)

**Interfaces:**
- Consumes: `seeded(index, salt)` from `particleTargets.js` (already defined and exported at that file's top, `seeded(index, salt = 0)` → float in `[0, 1)`).
- Produces: `getStrangeAttractorTarget(index, time)` → `{ x, y, depth }`, exported from `particleTargets.js`, imported and dispatched in `particleTargetRouter.js` under mode id `"attractor"`. No other task depends on this.

- [ ] **Step 1: Add the `MODES` entry**

In `src/config/studio.js`, find:

```js
  { id: "mobius", group: "mathematical", label: "Möbius Loop", note: "a path returning to itself from the other side" },
];
```

Replace with:

```js
  { id: "mobius", group: "mathematical", label: "Möbius Loop", note: "a path returning to itself from the other side" },
  { id: "attractor", group: "mathematical", label: "Strange Attractor", note: "motion that never repeats, yet never breaks its shape" },
];
```

- [ ] **Step 2: Add the icon glyph**

In `src/components/StudioIcons.jsx`, find:

```js
    mobius: [[12, 12], [8, 6], [4, 11], [7, 17], [12, 13], [17, 17], [20, 11], [16, 6]],
  };
```

Replace with:

```js
    mobius: [[12, 12], [8, 6], [4, 11], [7, 17], [12, 13], [17, 17], [20, 11], [16, 6]],
    attractor: [[12, 12], [9, 7], [15, 6], [18, 10], [16, 15], [11, 18], [6, 15], [5, 9], [14, 11], [9, 13]],
  };
```

- [ ] **Step 3: Add `getStrangeAttractorTarget` to `particleTargets.js`**

In `src/simulations/particleTargets.js`, find the final line:

```js
export { getAuroraTarget, getBridgeTarget, getCacheWarmupTarget, getClockworkTarget, getConsensusTarget, getContextWindowTarget, getCosmicWebTarget, getCountdownTarget, getDnaTarget, getEclipseTarget, getEmergentTarget, getFissionTarget, getGarbageCollectorTarget, getHeartbeatTarget, getMolecularDockingTarget, getNebulaTarget, getNeuralPulseTarget, getNeuralTarget, getOrchestraTarget, getRainTarget, getVectorFieldTarget, getVineTarget, seeded, hexToRgb, hexToRgbArray };
```

Replace with:

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

export { getAuroraTarget, getBridgeTarget, getCacheWarmupTarget, getClockworkTarget, getConsensusTarget, getContextWindowTarget, getCosmicWebTarget, getCountdownTarget, getDnaTarget, getEclipseTarget, getEmergentTarget, getFissionTarget, getGarbageCollectorTarget, getHeartbeatTarget, getMolecularDockingTarget, getNebulaTarget, getNeuralPulseTarget, getNeuralTarget, getOrchestraTarget, getRainTarget, getStrangeAttractorTarget, getVectorFieldTarget, getVineTarget, seeded, hexToRgb, hexToRgbArray };
```

- [ ] **Step 4: Wire it up in the router**

In `src/simulations/particleTargetRouter.js`, find:

```js
import { getAuroraTarget, getBridgeTarget, getCacheWarmupTarget, getClockworkTarget, getConsensusTarget, getContextWindowTarget, getCosmicWebTarget, getCountdownTarget, getDnaTarget, getEclipseTarget, getEmergentTarget, getFissionTarget, getGarbageCollectorTarget, getHeartbeatTarget, getMolecularDockingTarget, getNebulaTarget, getNeuralPulseTarget, getNeuralTarget, getOrchestraTarget, getRainTarget, getVectorFieldTarget, getVineTarget, seeded } from "./particleTargets";
```

Replace with:

```js
import { getAuroraTarget, getBridgeTarget, getCacheWarmupTarget, getClockworkTarget, getConsensusTarget, getContextWindowTarget, getCosmicWebTarget, getCountdownTarget, getDnaTarget, getEclipseTarget, getEmergentTarget, getFissionTarget, getGarbageCollectorTarget, getHeartbeatTarget, getMolecularDockingTarget, getNebulaTarget, getNeuralPulseTarget, getNeuralTarget, getOrchestraTarget, getRainTarget, getStrangeAttractorTarget, getVectorFieldTarget, getVineTarget, seeded } from "./particleTargets";
```

Then find:

```js
  if (mode === "orchestra") return getOrchestraTarget(index, time);

  if (mode === "accretion") {
```

Replace with:

```js
  if (mode === "orchestra") return getOrchestraTarget(index, time);
  if (mode === "attractor") return getStrangeAttractorTarget(index, time);

  if (mode === "accretion") {
```

- [ ] **Step 5: Build check**

Run: `npm run build`
Expected: exits 0, no errors.

- [ ] **Step 6: Manual feel check**

Run: `npm run dev`, select "Strange Attractor". Confirm the particle cloud forms a stable, asymmetric fractal-ish shape (not a symmetric circle/blob) that rotates slowly and smoothly — **specifically watch for absence of frame-to-frame jitter or flicker**, since that would indicate the chaotic map is being re-evaluated with changing parameters rather than staying fixed.

- [ ] **Step 7: Commit**

```bash
git add src/config/studio.js src/components/StudioIcons.jsx src/simulations/particleTargets.js src/simulations/particleTargetRouter.js
git commit -m "Add Strange Attractor mathematical mode"
```

---

## Task 4: Tessellation (`tessellation`)

**Files:**
- Modify: `src/config/studio.js` (MODES array — anchor on the line Task 3 added; new `TESSELLATION_CELLS_A`/`TESSELLATION_CELLS_B` constants; `REDUCED_MOTION_TIMES` entry)
- Modify: `src/components/StudioIcons.jsx` (dots object — anchor on the line Task 3 added)
- Modify: `src/simulations/particleTargets.js` (import list; new function; export list updated)
- Modify: `src/simulations/particleTargetRouter.js` (import list; dispatch one-liner added after the `attractor` dispatch added in Task 3)

**Interfaces:**
- Consumes: `mixTargets(from, to, progress)` (already defined in `particleTargets.js`, local to that module — no import needed) → `{ x, y, depth }`; `seeded(index, salt)` as in Task 3; `TESSELLATION_CELLS_A`/`TESSELLATION_CELLS_B` (`{ x, y }[]`, defined in this task in `studio.js`).
- Produces: `getTessellationTarget(index, count, time)` → `{ x, y, depth }`, exported from `particleTargets.js`, imported and dispatched under mode id `"tessellation"`. No other task depends on this.

- [ ] **Step 1: Add the `MODES` entry**

In `src/config/studio.js`, find:

```js
  { id: "attractor", group: "mathematical", label: "Strange Attractor", note: "motion that never repeats, yet never breaks its shape" },
];
```

Replace with:

```js
  { id: "attractor", group: "mathematical", label: "Strange Attractor", note: "motion that never repeats, yet never breaks its shape" },
  { id: "tessellation", group: "mathematical", label: "Tessellation", note: "space dividing itself without a gap" },
];
```

- [ ] **Step 2: Add the `TESSELLATION_CELLS_A`/`TESSELLATION_CELLS_B` constants**

In `src/config/studio.js`, find:

```js
export const NEURAL_PULSE_EDGES = [[0, 1], [0, 2], [1, 3], [2, 3], [2, 4], [3, 4], [3, 5], [3, 6], [4, 6], [5, 7], [6, 7]];
```

Replace with:

```js
export const NEURAL_PULSE_EDGES = [[0, 1], [0, 2], [1, 3], [2, 3], [2, 4], [3, 4], [3, 5], [3, 6], [4, 6], [5, 7], [6, 7]];

export const TESSELLATION_CELLS_A = [
  { x: -0.62, y: -0.58 }, { x: 0.02, y: -0.66 }, { x: 0.6, y: -0.54 },
  { x: -0.58, y: 0.04 }, { x: 0.06, y: 0 }, { x: 0.56, y: 0.06 },
  { x: -0.6, y: 0.58 }, { x: 0, y: 0.62 }, { x: 0.58, y: 0.56 },
];

export const TESSELLATION_CELLS_B = [
  { x: -0.36, y: -0.7 }, { x: 0.3, y: -0.62 }, { x: 0.68, y: -0.2 },
  { x: -0.7, y: -0.24 }, { x: -0.1, y: -0.06 }, { x: 0.34, y: 0.22 },
  { x: -0.34, y: 0.32 }, { x: 0.06, y: 0.66 }, { x: 0.62, y: 0.6 },
];
```

- [ ] **Step 3: Add the `REDUCED_MOTION_TIMES` entry**

In `src/config/studio.js`, find:

```js
  vine: 7, nebula: 8, docking: 7, bridge: 8, orchestra: 8,
};
```

Replace with:

```js
  vine: 7, nebula: 8, docking: 7, bridge: 8, orchestra: 8, tessellation: 2,
};
```

- [ ] **Step 4: Add the icon glyph**

In `src/components/StudioIcons.jsx`, find:

```js
    attractor: [[12, 12], [9, 7], [15, 6], [18, 10], [16, 15], [11, 18], [6, 15], [5, 9], [14, 11], [9, 13]],
  };
```

Replace with:

```js
    attractor: [[12, 12], [9, 7], [15, 6], [18, 10], [16, 15], [11, 18], [6, 15], [5, 9], [14, 11], [9, 13]],
    tessellation: [[5, 5], [11, 5], [17, 5], [5, 11], [11, 11], [17, 11], [5, 17], [11, 17], [17, 17]],
  };
```

- [ ] **Step 5: Add `getTessellationTarget` to `particleTargets.js`**

In `src/simulations/particleTargets.js`, find:

```js
import { NEURAL_PULSE_EDGES, NEURAL_PULSE_NODES, RAIN_CLOUD_LOBES, TAU } from "../config/studio";
```

Replace with:

```js
import { NEURAL_PULSE_EDGES, NEURAL_PULSE_NODES, RAIN_CLOUD_LOBES, TAU, TESSELLATION_CELLS_A, TESSELLATION_CELLS_B } from "../config/studio";
```

Then find the final line (as amended in Task 3):

```js
export { getAuroraTarget, getBridgeTarget, getCacheWarmupTarget, getClockworkTarget, getConsensusTarget, getContextWindowTarget, getCosmicWebTarget, getCountdownTarget, getDnaTarget, getEclipseTarget, getEmergentTarget, getFissionTarget, getGarbageCollectorTarget, getHeartbeatTarget, getMolecularDockingTarget, getNebulaTarget, getNeuralPulseTarget, getNeuralTarget, getOrchestraTarget, getRainTarget, getStrangeAttractorTarget, getVectorFieldTarget, getVineTarget, seeded, hexToRgb, hexToRgbArray };
```

Replace with:

```js
function getTessellationTarget(index, count, time) {
  const cellIndex = index % TESSELLATION_CELLS_A.length;
  const cellA = TESSELLATION_CELLS_A[cellIndex];
  const cellB = TESSELLATION_CELLS_B[cellIndex % TESSELLATION_CELLS_B.length];
  const localAngle = seeded(index, 61) * TAU;
  const localRadius = seeded(index, 62) * 0.24;
  const offsetX = Math.cos(localAngle) * localRadius;
  const offsetY = Math.sin(localAngle) * localRadius;
  const depth = 0.35 + seeded(index, 63) * 0.6;

  const arrangementA = { x: cellA.x + offsetX, y: cellA.y + offsetY, depth };
  const arrangementB = { x: cellB.x + offsetX, y: cellB.y + offsetY, depth };

  const cycle = time % 14;
  if (cycle < 5) return arrangementA;
  if (cycle < 7) return mixTargets(arrangementA, arrangementB, (cycle - 5) / 2);
  if (cycle < 12) return arrangementB;
  return mixTargets(arrangementB, arrangementA, (cycle - 12) / 2);
}

export { getAuroraTarget, getBridgeTarget, getCacheWarmupTarget, getClockworkTarget, getConsensusTarget, getContextWindowTarget, getCosmicWebTarget, getCountdownTarget, getDnaTarget, getEclipseTarget, getEmergentTarget, getFissionTarget, getGarbageCollectorTarget, getHeartbeatTarget, getMolecularDockingTarget, getNebulaTarget, getNeuralPulseTarget, getNeuralTarget, getOrchestraTarget, getRainTarget, getStrangeAttractorTarget, getTessellationTarget, getVectorFieldTarget, getVineTarget, seeded, hexToRgb, hexToRgbArray };
```

- [ ] **Step 6: Wire it up in the router**

In `src/simulations/particleTargetRouter.js`, find (as amended in Task 3):

```js
import { getAuroraTarget, getBridgeTarget, getCacheWarmupTarget, getClockworkTarget, getConsensusTarget, getContextWindowTarget, getCosmicWebTarget, getCountdownTarget, getDnaTarget, getEclipseTarget, getEmergentTarget, getFissionTarget, getGarbageCollectorTarget, getHeartbeatTarget, getMolecularDockingTarget, getNebulaTarget, getNeuralPulseTarget, getNeuralTarget, getOrchestraTarget, getRainTarget, getStrangeAttractorTarget, getVectorFieldTarget, getVineTarget, seeded } from "./particleTargets";
```

Replace with:

```js
import { getAuroraTarget, getBridgeTarget, getCacheWarmupTarget, getClockworkTarget, getConsensusTarget, getContextWindowTarget, getCosmicWebTarget, getCountdownTarget, getDnaTarget, getEclipseTarget, getEmergentTarget, getFissionTarget, getGarbageCollectorTarget, getHeartbeatTarget, getMolecularDockingTarget, getNebulaTarget, getNeuralPulseTarget, getNeuralTarget, getOrchestraTarget, getRainTarget, getStrangeAttractorTarget, getTessellationTarget, getVectorFieldTarget, getVineTarget, seeded } from "./particleTargets";
```

Then find:

```js
  if (mode === "orchestra") return getOrchestraTarget(index, time);
  if (mode === "attractor") return getStrangeAttractorTarget(index, time);

  if (mode === "accretion") {
```

Replace with:

```js
  if (mode === "orchestra") return getOrchestraTarget(index, time);
  if (mode === "attractor") return getStrangeAttractorTarget(index, time);
  if (mode === "tessellation") return getTessellationTarget(index, count, time);

  if (mode === "accretion") {
```

- [ ] **Step 7: Build check**

Run: `npm run build`
Expected: exits 0, no errors.

- [ ] **Step 8: Manual feel check**

Run: `npm run dev`, select "Tessellation". Confirm particles settle into 9 loose clusters (cells) covering the canvas, and that roughly every 14 seconds they smoothly cross-fade into a different cell arrangement (not an instant jump-cut, not a chaotic scatter). Also spot-check reduced motion: enable "reduce motion" in OS accessibility settings, reload, and confirm Tessellation renders one coherent static frame (settled arrangement A) rather than a mid-transition blend.

- [ ] **Step 9: Commit**

```bash
git add src/config/studio.js src/components/StudioIcons.jsx src/simulations/particleTargets.js src/simulations/particleTargetRouter.js
git commit -m "Add Tessellation mathematical mode"
```

---

## Final Verification

- [ ] Run `npm run build` once more from a clean state to confirm all 4 tasks together still build cleanly.
- [ ] Run `npm run dev`, open the Math collection tab, and cycle through all 6 modes (`resolve`, `bloom`, `interference`, `mobius`, `attractor`, `tessellation`) back-to-back to confirm no mode crashes and the collection filter/tab UI lists all 6 correctly.
- [ ] Confirm the browser console shows no errors/warnings (in particular, no React "duplicate key" warnings from any of the new `MotionGlyph` dot arrays) while cycling through the new modes.
