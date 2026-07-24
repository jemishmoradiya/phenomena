// Per-frame target position/depth for every 2D gallery mode, consumed by
// ThoughtField.jsx. Simple modes are inlined below; more elaborate ones
// delegate to a `get*Target` function in particleTargets.js. See CLAUDE.md's
// "Two families of simulations" section for how this fits into the renderer.
import { TAU } from "../config/studio";
import { getAuroraTarget, getBridgeTarget, getCacheWarmupTarget, getClockworkTarget, getConsensusTarget, getContextWindowTarget, getCosmicWebTarget, getCountdownTarget, getDnaTarget, getEclipseTarget, getEmergentTarget, getExpandedCategoryTarget, getFissionTarget, getGarbageCollectorTarget, getHeartbeatTarget, getMolecularDockingTarget, getNebulaTarget, getNeuralPulseTarget, getNeuralTarget, getOrchestraTarget, getRainTarget, getStrangeAttractorTarget, getTessellationTarget, getVectorFieldTarget, getVineTarget, seeded } from "./particleTargets";

// Modes whose formulas live in getExpandedCategoryTarget (particleTargets.js),
// grouped by family: optical, chemical, atmospheric, earth, quantum, future/cosmic.
const EXPANDED_CATEGORY_MODES = new Set([
  "refraction", "prism", "lens", "doubleslit", "caustics",
  "brownian", "reaction", "crystallization", "catalysis", "diffusion",
  "windtunnel", "convection", "stormcell", "snowfall", "pressurefront",
  "sanddunes", "erosion", "sedimentation", "crystalgrowth", "tectonic",
  "quantumtunnel", "probabilitycloud", "entanglement", "quantumwell", "waveparticle",
  "warpfield", "nanobot", "teleportation", "plasma", "swarmintelligence", "dysonswarm",
  "solarsystem", "spiralgalaxy", "blackholelensing", "cometpassage", "pulsar", "planetformation",
]);

/**
 * Returns the target { x, y, depth } (normalized -1..1-ish coordinates, depth 0..1)
 * for a single particle of the given mode at the given moment in time.
 */
function getTarget(mode, index, count, time) {
  const ratio = index / Math.max(count, 1);
  const angle = ratio * TAU;
  const seed = seeded(index, 2);

  // Loose elliptical drift with a slow wandering wobble.
  if (mode === "drift") {
    const radius = 0.16 + ratio * 0.76;
    const drift = Math.sin(time * 0.42 + index * 0.29) * 0.08;
    return {
      x: Math.cos(angle * 5.4 + time * 0.13) * (radius + drift),
      y: Math.sin(angle * 3.9 - time * 0.1) * (radius * 0.72 + drift),
      depth: 0.35 + seed * 0.65,
    };
  }

  // Four concentric rings orbiting at alternating directions and speeds.
  if (mode === "orbit") {
    const ring = index % 4;
    const radius = 0.24 + ring * 0.17;
    const a = ratio * TAU * 4 + time * (ring % 2 ? -0.36 : 0.29);
    return {
      x: Math.cos(a) * radius,
      y: Math.sin(a) * radius * (0.25 + ring * 0.16),
      depth: 0.25 + 0.75 * ((Math.sin(a + ring) + 1) / 2),
    };
  }

  // Particles settle onto a Fibonacci-sphere lattice, slowly rotating and pulsing.
  if (mode === "resolve") {
    const latitude = Math.acos(1 - 2 * ((index + 0.5) / count));
    const longitude = Math.PI * (1 + Math.sqrt(5)) * index + time * 0.16;
    const pulse = 0.78 + Math.sin(time * 1.4) * 0.025;
    return {
      x: Math.cos(longitude) * Math.sin(latitude) * pulse,
      y: Math.cos(latitude) * pulse,
      depth: 0.25 + 0.75 * ((Math.sin(longitude) * Math.sin(latitude) + 1) / 2),
    };
  }

  // A blooming polar-rose (flower) pattern that breathes in and out.
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

  // Two-source wave interference pattern (ripple tank) laid out on a grid.
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

  // Points traced along a rotating Möbius strip.
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

  // Particles flow in banked lanes around a ring, like a current.
  if (mode === "current") {
    const lane = index % 9;
    const laneRatio = lane / 8;
    const flowAngle = seeded(index, 91) * TAU + time * (0.32 + laneRatio * 0.16);
    const streamY = (laneRatio - 0.5) * 1.15;
    const bend = Math.sin(flowAngle * 2 + lane * 0.72) * 0.075;
    return {
      x: Math.cos(flowAngle) * 0.82,
      y: streamY + Math.sin(flowAngle) * 0.11 + bend,
      depth: 0.34 + 0.66 * ((Math.cos(flowAngle - 0.4) + 1) / 2),
    };
  }

  // Three ink plumes spreading and curling outward from shifting centers.
  if (mode === "inkdrift") {
    const plume = index % 3;
    const plumeAngle = (plume / 3) * TAU + time * 0.075;
    const centerRadius = 0.2 + plume * 0.055;
    const centerX = Math.cos(plumeAngle) * centerRadius;
    const centerY = Math.sin(plumeAngle * 0.8) * 0.17;
    const spread = 0.035 + Math.sqrt(seeded(index, 92)) * 0.38;
    const curl = seeded(index, 93) * TAU + time * (0.12 + seeded(index, 94) * 0.16) + spread * 5.5;
    const breathe = 0.88 + Math.sin(time * 0.35 + plume * 1.7) * 0.12;
    return {
      x: centerX + Math.cos(curl) * spread * breathe,
      y: centerY + Math.sin(curl) * spread * 0.68 * breathe,
      depth: 0.28 + (1 - Math.min(1, spread / 0.42)) * 0.72,
    };
  }

  // Three droplets that periodically merge into one and separate again.
  if (mode === "droplet") {
    const drop = index % 3;
    const merge = (1 - Math.cos(time * 0.48)) / 2;
    const dropAngle = (drop / 3) * TAU - Math.PI / 2 + time * 0.045;
    const separation = 0.43 * (1 - merge);
    const localAngle = seeded(index, 95) * TAU + time * (drop % 2 ? -0.05 : 0.05);
    const localRadius = Math.sqrt(seeded(index, 96)) * (0.13 + merge * 0.13);
    const wobble = 1 + Math.sin(time * 0.9 + drop * 2.1) * 0.055;
    return {
      x: Math.cos(dropAngle) * separation + Math.cos(localAngle) * localRadius * wobble,
      y: Math.sin(dropAngle) * separation * 0.72 + Math.sin(localAngle) * localRadius / wobble,
      depth: 0.42 + (1 - localRadius / 0.27) * 0.58,
    };
  }

  // A grid surface rippling outward from a moving point source, like a pool.
  if (mode === "ripplepool") {
    const columns = Math.ceil(Math.sqrt(count));
    const row = Math.floor(index / columns);
    const column = index % columns;
    const spacing = 1.55 / Math.max(columns - 1, 1);
    const baseX = (column - (columns - 1) / 2) * spacing;
    const baseY = (row - (columns - 1) / 2) * spacing * 0.78;
    const sourceX = Math.sin(time * 0.18) * 0.22;
    const sourceY = Math.cos(time * 0.14) * 0.13;
    const dx = baseX - sourceX;
    const dy = baseY - sourceY;
    const distance = Math.max(0.001, Math.hypot(dx, dy));
    const wave = Math.sin(distance * 18 - time * 2.4) * Math.exp(-distance * 0.85);
    const displacement = wave * 0.035;
    return {
      x: baseX + (dx / distance) * displacement,
      y: baseY + (dy / distance) * displacement,
      depth: 0.3 + ((wave + 1) / 2) * 0.7,
    };
  }

  if (EXPANDED_CATEGORY_MODES.has(mode)) {
    return getExpandedCategoryTarget(mode, index, count, time);
  }

  // A signal/waveform grid where each column oscillates as a wave sweeps across it.
  if (mode === "signal") {
    const columns = Math.ceil(Math.sqrt(count));
    const row = Math.floor(index / columns);
    const column = index % columns;
    const spacing = 1.5 / columns;
    const x = (column - columns / 2) * spacing;
    const wave = Math.sin(column * 0.62 - time * 2.1 + row * 0.22);
    return {
      x,
      y: (row - columns / 2) * spacing * 0.7 + wave * 0.12,
      depth: 0.3 + ((wave + 1) / 2) * 0.7,
    };
  }

  // Multi-armed spiral vortex, arms spinning faster the closer they are to the center.
  if (mode === "vortex") {
    const arms = 3;
    const armIndex = index % arms;
    const armRatio = Math.floor(index / arms) / Math.max(Math.floor(count / arms), 1);
    const radius = 0.05 + armRatio * 0.74;
    const spin = (1 - armRatio) * 3.4;
    const a = (armIndex / arms) * TAU + spin + time * (0.55 + (1 - armRatio) * 1.1);
    return {
      x: Math.cos(a) * radius,
      y: Math.sin(a) * radius * 0.85,
      depth: 0.3 + (1 - armRatio) * 0.7,
    };
  }

  // A sweeping, flocking-like cloud of loosely bound particles (murmuration).
  if (mode === "murmuration") {
    const offset = seeded(index, 3) - 0.5;
    const a = angle * 2.8 + time * (0.5 + seed * 0.24);
    const sweep = Math.sin(time * 0.24) * 0.22;
    return {
      x: Math.cos(a) * (0.45 + offset * 0.3) + sweep + Math.sin(time * 0.8 + seed * 6) * 0.08,
      y: Math.sin(a * 0.72) * 0.24 + offset * 0.42 + Math.cos(time * 0.48 + seed * 5) * 0.07,
      depth: 0.3 + 0.7 * ((Math.sin(a) + 1) / 2),
    };
  }

  // Small star-clusters, each orbiting its own point on a larger ring.
  if (mode === "constellation") {
    const cluster = index % 7;
    const clusterAngle = (cluster / 7) * TAU + time * (cluster % 2 ? -0.035 : 0.045);
    const localAngle = seeded(index, 4) * TAU + time * 0.08;
    const localRadius = 0.04 + seeded(index, 6) * 0.17;
    return {
      x: Math.cos(clusterAngle) * 0.55 + Math.cos(localAngle) * localRadius,
      y: Math.sin(clusterAngle) * 0.4 + Math.sin(localAngle) * localRadius,
      depth: 0.4 + seed * 0.6,
    };
  }

  // Banded field-line shapes oscillating like magnetic field lines.
  if (mode === "magnetic") {
    const band = (index % 14) / 13;
    const a = angle * 3 + time * (0.18 + band * 0.1);
    const spread = 0.2 + band * 0.56;
    return {
      x: Math.sin(a) * spread,
      y: Math.sin(a * 2) * (0.14 + band * 0.28),
      depth: 0.3 + 0.7 * ((Math.cos(a) + 1) / 2),
    };
  }

  // A grid of points that periodically dissolves into a diffuse gas and reforms.
  if (mode === "phase") {
    const columns = Math.ceil(Math.sqrt(count));
    const row = Math.floor(index / columns);
    const column = index % columns;
    const spacing = 1.45 / columns;
    const gridX = (column - (columns - 1) / 2) * spacing;
    const gridY = (row - (columns - 1) / 2) * spacing;
    const gasAngle = seeded(index, 7) * TAU + time * (0.05 + seed * 0.08);
    const gasRadius = 0.18 + seeded(index, 9) * 0.68;
    const rawPhase = (Math.sin(time * 0.55) + 1) / 2;
    const phase = rawPhase * rawPhase * (3 - 2 * rawPhase);
    return {
      x: gridX * (1 - phase) + Math.cos(gasAngle) * gasRadius * phase,
      y: gridY * (1 - phase) + Math.sin(gasAngle) * gasRadius * phase,
      depth: 0.35 + seed * 0.65,
    };
  }

  if (mode === "neural") {
    return getNeuralTarget(index, time);
  }

  if (mode === "vectorfield") {
    return getVectorFieldTarget(index, time);
  }

  if (mode === "neuralpulse") {
    return getNeuralPulseTarget(index, time);
  }

  if (mode === "aurora") {
    return getAuroraTarget(index, count, time);
  }

  if (mode === "emergent") {
    return getEmergentTarget(index, count, time);
  }

  if (mode === "garbage") return getGarbageCollectorTarget(index, time);
  if (mode === "context") return getContextWindowTarget(index, time);
  if (mode === "cache") return getCacheWarmupTarget(index, time);
  if (mode === "consensus") return getConsensusTarget(index, count, time);
  if (mode === "vine") return getVineTarget(index, count, time);
  if (mode === "nebula") return getNebulaTarget(index, time);
  if (mode === "docking") return getMolecularDockingTarget(index, time);
  if (mode === "bridge") return getBridgeTarget(index, time);
  if (mode === "orchestra") return getOrchestraTarget(index, time);
  if (mode === "attractor") return getStrangeAttractorTarget(index, time);
  if (mode === "tessellation") return getTessellationTarget(index, count, time);

  // Particles spiral inward like matter falling into an accretion disk.
  if (mode === "accretion") {
    const inward = ((seed - time * (0.018 + seed * 0.025)) % 1 + 1) % 1;
    const radius = 0.055 + inward * 0.78;
    const a = seeded(index, 4) * TAU + time * (0.35 + 0.7 / (radius + 0.12));
    return {
      x: Math.cos(a) * radius,
      y: Math.sin(a) * radius * 0.32,
      depth: 0.35 + (1 - inward) * 0.65,
    };
  }

  // A binary star system: two companions each with their own orbiting particles, plus a shared outer halo.
  if (mode === "binary") {
    const systemAngle = time * 0.3;
    const side = index % 5 === 0 ? 0 : index % 2 === 0 ? 1 : -1;
    if (side === 0) {
      const radius = 0.48 + seed * 0.25;
      const a = seeded(index, 5) * TAU + time * (0.18 + seed * 0.08);
      return {
        x: Math.cos(a) * radius,
        y: Math.sin(a) * radius * 0.55,
        depth: 0.35 + seed * 0.65,
      };
    }
    const centerX = Math.cos(systemAngle) * 0.28 * side;
    const centerY = Math.sin(systemAngle) * 0.13 * side;
    const localRadius = 0.045 + seed * 0.2;
    const localAngle = seeded(index, 6) * TAU + time * (0.7 + (1 - seed) * 1.2) * side;
    return {
      x: centerX + Math.cos(localAngle) * localRadius,
      y: centerY + Math.sin(localAngle) * localRadius * 0.58,
      depth: 0.4 + seed * 0.6,
    };
  }

  // Two clusters colliding and passing through each other, distorting on impact.
  if (mode === "collision") {
    const side = index % 2 === 0 ? 1 : -1;
    const separation = Math.cos(time * 0.16) * 0.47;
    const radius = 0.035 + seed * 0.42;
    const distortion = 1 - Math.min(1, Math.abs(separation) * 2.4);
    const arm = seeded(index, 7) * TAU + radius * 10 + time * 0.2 * side;
    return {
      x: side * separation + Math.cos(arm) * radius + Math.sin(arm * 0.5) * distortion * 0.16,
      y: Math.sin(arm) * radius * 0.48 + side * Math.cos(arm) * distortion * 0.12,
      depth: 0.3 + (1 - radius) * 0.7,
    };
  }

  // A star that collapses, explodes, and expands outward in a repeating cycle.
  if (mode === "supernova") {
    const cycle = time % 9;
    const direction = seeded(index, 8) * TAU;
    let radius;
    if (cycle < 1.2) {
      radius = 0.7 - (cycle / 1.2) * 0.62;
    } else if (cycle < 3) {
      const expansion = (cycle - 1.2) / 1.8;
      radius = 0.08 + (1 - (1 - expansion) ** 3) * 0.86;
    } else {
      radius = 0.94 - ((cycle - 3) / 6) * 0.42;
    }
    const turbulence = Math.sin(time * 1.5 + index * 0.37) * 0.045;
    return {
      x: Math.cos(direction) * (radius + turbulence) * (0.55 + seed * 0.45),
      y: Math.sin(direction) * (radius + turbulence) * (0.55 + seed * 0.45),
      depth: 0.35 + (1 - seed) * 0.65,
    };
  }

  if (mode === "cosmicweb") {
    return getCosmicWebTarget(index, time);
  }

  if (mode === "countdown") {
    return getCountdownTarget(index, time);
  }

  if (mode === "eclipse") {
    return getEclipseTarget(index, count, time);
  }

  if (mode === "dna") {
    return getDnaTarget(index, count, time);
  }

  if (mode === "rain") {
    return getRainTarget(index, time);
  }

  if (mode === "fission") {
    return getFissionTarget(index, count, time);
  }

  if (mode === "heartbeat") {
    return getHeartbeatTarget(index, count, time);
  }

  if (mode === "clockwork") {
    return getClockworkTarget(index, count, time);
  }

  // Default fallback for any mode not handled above: a rotating multi-arm spiral.
  const turns = 5.5;
  const radius = 0.06 + ratio * 0.78;
  const a = angle * turns - time * (0.42 + (1 - ratio) * 0.7);
  return {
    x: Math.cos(a) * radius,
    y: Math.sin(a) * radius * 0.78,
    depth: 0.25 + (1 - ratio) * 0.75,
  };
}

export { getTarget };
