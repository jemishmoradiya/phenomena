// One get*Target function per non-trivial 2D gallery mode (dispatched from
// particleTargetRouter.js), plus the small helpers/lookup tables they share.
// Each returns a per-particle { x, y, depth } for the current frame.
import { NEURAL_PULSE_EDGES, NEURAL_PULSE_NODES, RAIN_CLOUD_LOBES, TAU, TESSELLATION_CELLS_A, TESSELLATION_CELLS_B } from "../config/studio";

/** Deterministic pseudo-random value in [0, 1) for a given particle index + salt, stable across frames. */
function seeded(index, salt = 0) {
  const value = Math.sin(index * 91.733 + salt * 37.19) * 43758.5453;
  return value - Math.floor(value);
}

// Helper: converts a "#rrggbb" hex color string into a "r, g, b" CSS-ready component string.
function hexToRgb(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  return `${value >> 16}, ${(value >> 8) & 255}, ${value & 255}`;
}

// Helper: converts a "#rrggbb" hex color string into a normalized [r, g, b] float array (0..1), used by WebGL/shader consumers.
function hexToRgbArray(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

const GLYPH_BITMAPS = {
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["11110", "00001", "00001", "01110", "10000", "10000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  G: ["01110", "10000", "10000", "10111", "10001", "10001", "01110"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
};

// Helper: converts a string's pixel-font bitmaps (GLYPH_BITMAPS) into a flat list of {x, y} points, used to render text-like shapes such as digits or "AI".
function createGlyphPoints(text) {
  const glyphWidth = 5;
  const gap = 1;
  const totalWidth = text.length * glyphWidth + (text.length - 1) * gap;
  const points = [];

  for (let characterIndex = 0; characterIndex < text.length; characterIndex += 1) {
    const bitmap = GLYPH_BITMAPS[text[characterIndex]];
    for (let row = 0; row < bitmap.length; row += 1) {
      for (let column = 0; column < bitmap[row].length; column += 1) {
        if (bitmap[row][column] === "1") {
          points.push({
            x: (characterIndex * (glyphWidth + gap) + column - (totalWidth - 1) / 2) * 0.13,
            y: (row - 3) * 0.13,
          });
        }
      }
    }
  }
  return points;
}

const GLYPH_POINTS = {
  "1": createGlyphPoints("1"),
  "2": createGlyphPoints("2"),
  "3": createGlyphPoints("3"),
  A: createGlyphPoints("A"),
  AI: createGlyphPoints("AI"),
  C: createGlyphPoints("C"),
  GO: createGlyphPoints("GO"),
  G: createGlyphPoints("G"),
  T: createGlyphPoints("T"),
};

// Helper: places a particle on (or near) a point of a precomputed text glyph shape, with light jitter; used by modes that flash numerals/letters like "3", "2", "1", "GO", or "AI".
function getGlyphTarget(glyph, index) {
  const points = GLYPH_POINTS[glyph];
  const point = points[index % points.length];
  const jitterAngle = seeded(index, 31) * TAU;
  const jitterRadius = 0.008 + seeded(index, 32) * 0.022;
  return {
    x: point.x + Math.cos(jitterAngle) * jitterRadius,
    y: point.y + Math.sin(jitterAngle) * jitterRadius,
    depth: 0.62 + seeded(index, 33) * 0.38,
  };
}

// A web of galaxy clusters linked by faint connecting filaments, like the universe's large-scale structure.
function getCosmicWebTarget(index, time) {
  const seed = seeded(index, 2);
  const cluster = index % 9;
  const nextCluster = (cluster + 1 + (index % 3)) % 9;
  const clusterX = (seeded(cluster, 21) - 0.5) * 1.45;
  const clusterY = (seeded(cluster, 22) - 0.5) * 1.15;
  const nextX = (seeded(nextCluster, 21) - 0.5) * 1.45;
  const nextY = (seeded(nextCluster, 22) - 0.5) * 1.15;
  const localAngle = seeded(index, 23) * TAU + time * 0.06;
  const localRadius = seeded(index, 24) * 0.11;

  if (index % 4 === 0) {
    const position = seeded(index, 25);
    return {
      x: clusterX + (nextX - clusterX) * position + Math.sin(time * 0.15 + index) * 0.018,
      y: clusterY + (nextY - clusterY) * position + Math.cos(time * 0.13 + index) * 0.018,
      depth: 0.3 + seed * 0.7,
    };
  }
  return {
    x: clusterX + Math.cos(localAngle) * localRadius,
    y: clusterY + Math.sin(localAngle) * localRadius,
    depth: 0.4 + seed * 0.6,
  };
}

// Helper: smoothly eases a particle's position/depth from one target to another, used throughout this file to blend between the phases of multi-stage animations.
function mixTargets(from, to, progress) {
  const clamped = Math.max(0, Math.min(1, progress));
  const smooth = clamped * clamped * (3 - 2 * clamped);
  return {
    x: from.x + (to.x - from.x) * smooth,
    y: from.y + (to.y - from.y) * smooth,
    depth: from.depth + (to.depth - from.depth) * smooth,
  };
}

// The cosmic web gathers into glyphs counting down "3", "2", "1", then flashes "GO" before dissolving back into the web.
function getCountdownTarget(index, time) {
  const cycle = time % 9;
  const web = getCosmicWebTarget(index, time);
  const three = getGlyphTarget("3", index);
  const two = getGlyphTarget("2", index);
  const one = getGlyphTarget("1", index);
  const go = getGlyphTarget("GO", index);

  if (cycle < 1.2) return web;
  if (cycle < 1.8) return mixTargets(web, three, (cycle - 1.2) / 0.6);
  if (cycle < 2.7) return three;
  if (cycle < 3.2) return mixTargets(three, two, (cycle - 2.7) / 0.5);
  if (cycle < 4.1) return two;
  if (cycle < 4.6) return mixTargets(two, one, (cycle - 4.1) / 0.5);
  if (cycle < 5.5) return one;
  if (cycle < 6.1) return mixTargets(one, go, (cycle - 5.5) / 0.6);
  if (cycle < 7.2) return go;
  return mixTargets(go, web, (cycle - 7.2) / 1.8);
}

// Helper: builds a double-helix ladder (two strands plus connecting rungs) that can rotate/twist, unzip apart, and be offset/scaled; shared by all DNA-related modes.
function getDnaStructureTarget(index, count, time, twist = 1, unzip = 0, centerX = 0, strandWidth = 0.34) {
  const rowCount = Math.ceil(count / 6);
  const row = Math.floor(index / 6);
  const lane = index % 6;
  const ratio = row / Math.max(1, rowCount - 1);
  const y = (ratio - 0.5) * 1.42;
  const theta = y * TAU * 1.45 + time * 0.42;
  const twistedX = Math.cos(theta) * strandWidth;
  const leftX = (-strandWidth) * (1 - twist) + twistedX * twist;
  const rightX = strandWidth * (1 - twist) - twistedX * twist;
  const opened = Math.max(0, Math.min(1, (unzip - ratio) * 5));
  const separatedLeft = leftX - opened * 0.24;
  const separatedRight = rightX + opened * 0.24;
  const leftDepth = 0.3 + 0.7 * ((Math.sin(theta) + 1) / 2);
  const rightDepth = 1.3 - leftDepth;

  if (lane === 0) return { x: centerX + separatedLeft, y, depth: leftDepth };
  if (lane === 1) return { x: centerX + separatedRight, y, depth: rightDepth };

  const bridgePosition = (lane - 1) / 5;
  return {
    x: centerX + separatedLeft + (separatedRight - separatedLeft) * bridgePosition,
    y,
    depth: leftDepth + (rightDepth - leftDepth) * bridgePosition,
  };
}

// Helper: two smaller double helices side by side (built from getDnaStructureTarget), used as the "replicated" late phase of the DNA sequence mode.
function getTwinHelixTarget(index, count, time) {
  const side = index % 2 === 0 ? -1 : 1;
  const localIndex = Math.floor(index / 2);
  return getDnaStructureTarget(localIndex, Math.ceil(count / 2), time * 1.1, 1, 0, side * 0.38, 0.16);
}

// A DNA molecule cycling through phases: flat ladder, twisting into a double helix, unzipping into two separate strands, splitting into twin replicated helices, then back to a single helix and ladder.
function getDnaTarget(index, count, time) {
  const cycle = time % 13;
  const ladder = getDnaStructureTarget(index, count, time, 0, 0);
  const helix = getDnaStructureTarget(index, count, time, 1, 0);
  const unzipped = getDnaStructureTarget(index, count, time, 1, 1);
  const twins = getTwinHelixTarget(index, count, time);

  if (cycle < 1.4) return ladder;
  if (cycle < 3.2) return mixTargets(ladder, helix, (cycle - 1.4) / 1.8);
  if (cycle < 5) return helix;
  if (cycle < 7) return mixTargets(helix, unzipped, (cycle - 5) / 2);
  if (cycle < 9) return mixTargets(unzipped, twins, (cycle - 7) / 2);
  if (cycle < 10.8) return twins;
  if (cycle < 12.2) return mixTargets(twins, helix, (cycle - 10.8) / 1.4);
  return mixTargets(helix, ladder, (cycle - 12.2) / 0.8);
}

// Helper: arranges particles into vertical columns (network layers) with a highlight pulse sweeping left to right across the layers; used as the "thinking" phase of the neural mode.
function getNeuralLayerTarget(index, time) {
  const layer = index % 5;
  const node = Math.floor(index / 5) % 8;
  const pulsePosition = (time * 0.9) % 7 - 1;
  const pulse = Math.max(0, 1 - Math.abs(layer - pulsePosition));
  const jitterAngle = seeded(index, 41) * TAU;
  const jitterRadius = 0.012 + seeded(index, 42) * 0.025;

  return {
    x: (layer - 2) * 0.28 + Math.cos(jitterAngle) * jitterRadius,
    y: (node / 7 - 0.5) * 1.12 + Math.sin(jitterAngle) * jitterRadius,
    depth: 0.34 + pulse * 0.66,
  };
}

// A layered neural network with a signal pulse sweeping through it, which periodically resolves into the glyph "AI" before returning to the network.
function getNeuralTarget(index, time) {
  const cycle = time % 8;
  const network = getNeuralLayerTarget(index, time);
  const answer = getGlyphTarget("AI", index);

  if (cycle < 4.8) return network;
  if (cycle < 5.8) return mixTargets(network, answer, cycle - 4.8);
  if (cycle < 7) return answer;
  return mixTargets(answer, network, cycle - 7);
}

// Helper: evenly distributes localCount points around a circle of the given radius/rotation, used to build clustered body shapes (e.g. sun/planet/moon spheres).
function getBodyTarget(localIndex, localCount, centerX, centerY, radius, rotation = 0) {
  const ratio = (localIndex + 0.5) / Math.max(1, localCount);
  const angle = localIndex * Math.PI * (3 - Math.sqrt(5)) + rotation;
  const distance = Math.sqrt(ratio) * radius;

  return {
    x: centerX + Math.cos(angle) * distance,
    y: centerY + Math.sin(angle) * distance,
    depth: 0.42 + (1 - ratio) * 0.58,
  };
}

// A Sun, an Earth, and an orbiting Moon (each a cluster of particles) drifting into alignment for an eclipse.
function getEclipseTarget(index, count, time) {
  const role = index % 10;
  const group = Math.floor(index / 10);
  const earthX = 0.34 + Math.cos(time * 0.11) * 0.025;
  const earthY = Math.sin(time * 0.11) * 0.018;
  const moonAngle = time * 0.45;

  if (role < 5) {
    return getBodyTarget(group * 5 + role, Math.ceil(count * 0.5), -0.48, 0, 0.2, time * 0.04);
  }

  if (role < 9) {
    return getBodyTarget(group * 4 + role - 5, Math.ceil(count * 0.4), earthX, earthY, 0.11, -time * 0.08);
  }

  return getBodyTarget(
    group,
    Math.ceil(count * 0.1),
    earthX + Math.cos(moonAngle) * 0.27,
    earthY + Math.sin(moonAngle) * 0.14,
    0.045,
    time * 0.18,
  );
}

// The water cycle: particles rise from the ground into a cloud, gather, fall as rain, and splash on landing before repeating.
function getRainTarget(index, time) {
  const cycle = time % 10;
  const sourceX = (seeded(index, 51) - 0.5) * 1.5;
  const lobe = RAIN_CLOUD_LOBES[index % RAIN_CLOUD_LOBES.length];
  const cloudAngle = seeded(index, 52) * TAU;
  const cloudRadius = Math.sqrt(seeded(index, 53));
  const cloudX = lobe.x + Math.cos(cloudAngle) * lobe.rx * cloudRadius;
  const cloudY = lobe.y + Math.sin(cloudAngle) * lobe.ry * cloudRadius;
  const ground = { x: sourceX, y: 0.72 + seeded(index, 53) * 0.025, depth: 0.4 };
  const cloud = {
    x: cloudX + Math.sin(time * 0.32) * 0.015,
    y: cloudY + Math.cos(time * 0.28 + index) * 0.008,
    depth: 0.45 + seeded(index, 54) * 0.45,
  };
  const landing = {
    x: cloud.x + 0.1 + seeded(index, 56) * 0.08,
    y: ground.y,
    depth: 0.45,
  };

  if (cycle < 0.8) return ground;
  if (cycle < 2.5) return mixTargets(ground, cloud, (cycle - 0.8) / 1.7);
  if (cycle < 4) return cloud;

  if (cycle < 7) {
    const delay = seeded(index, 55) * 1.1;
    const fall = Math.max(0, Math.min(1, (cycle - 4 - delay) / 1.8));
    return {
      x: cloud.x + fall * (landing.x - cloud.x),
      y: cloud.y + fall * (landing.y - cloud.y),
      depth: cloud.depth + (0.45 - cloud.depth) * fall,
    };
  }

  const direction = (seeded(index, 57) - 0.5) * 0.7;
  const splashEnd = {
    x: landing.x + Math.sin(direction) * 0.18,
    y: landing.y,
    depth: 0.38 + seeded(index, 59) * 0.28,
  };

  if (cycle < 8.2) {
    const splash = (cycle - 7) / 1.2;
    return {
      x: landing.x + Math.sin(direction) * splash * 0.18,
      y: landing.y - Math.sin(Math.PI * splash) * (0.05 + seeded(index, 58) * 0.11),
      depth: landing.depth + (splashEnd.depth - landing.depth) * splash,
    };
  }

  return mixTargets(splashEnd, ground, (cycle - 8.2) / 1.8);
}

// Helper: renders one or more round cell shapes (membrane shell + an internal nucleoid strand) at the given center points; shared by the bacterial fission mode's stages.
function getCellTarget(index, count, centers, radiusX, radiusY, time) {
  const cell = index % centers.length;
  const localIndex = Math.floor(index / centers.length);
  const localCount = Math.ceil(count / centers.length);
  const angle = localIndex * Math.PI * (3 - Math.sqrt(5)) + time * 0.06;
  const membraneParticle = localIndex % 3 === 0;
  const nucleoidParticle = localIndex % 7 === 1;
  const radialSeed = seeded(index, 64);
  const distance = membraneParticle ? 0.88 + radialSeed * 0.12 : Math.sqrt(radialSeed) * 0.78;
  const breathe = 1 + Math.sin(time * 0.7 + cell) * 0.018;
  const center = centers[cell];

  if (nucleoidParticle) {
    const strandPosition = seeded(localIndex, cell + 66) - 0.5;
    return {
      x: center.x + strandPosition * radiusX * 1.05,
      y: center.y + Math.sin(strandPosition * TAU * 1.5 + time * 0.35) * radiusY * 0.24,
      depth: 0.72,
    };
  }

  return {
    x: center.x + Math.cos(angle) * radiusX * distance * breathe,
    y: center.y + Math.sin(angle) * radiusY * distance * breathe,
    depth: membraneParticle ? 0.95 : 0.42 + (1 - localIndex / Math.max(1, localCount)) * 0.42,
  };
}

// A bacterial cell stretching, pinching in the middle, and splitting in two, repeating until a small colony has formed, then collapsing back to a single cell.
function getFissionTarget(index, count, time) {
  const cycle = time % 15;
  const collapsed = { x: 0, y: 0, depth: 0.08 };
  const single = getCellTarget(index, count, [{ x: 0, y: 0 }], 0.34, 0.3, time);
  const elongated = getCellTarget(index, count, [{ x: 0, y: 0 }], 0.56, 0.25, time);
  const firstPinch = getCellTarget(
    index,
    count,
    [{ x: -0.17, y: 0 }, { x: 0.17, y: 0 }],
    0.3,
    0.25,
    time,
  );
  const pair = getCellTarget(
    index,
    count,
    [{ x: -0.34, y: 0 }, { x: 0.34, y: 0 }],
    0.24,
    0.22,
    time,
  );
  const elongatedPair = getCellTarget(
    index,
    count,
    [{ x: -0.34, y: 0 }, { x: 0.34, y: 0 }],
    0.21,
    0.38,
    time,
  );
  const secondPinch = getCellTarget(
    index,
    count,
    [
      { x: -0.34, y: -0.14 },
      { x: 0.34, y: -0.14 },
      { x: -0.34, y: 0.14 },
      { x: 0.34, y: 0.14 },
    ],
    0.2,
    0.21,
    time,
  );
  const colony = getCellTarget(
    index,
    count,
    [
      { x: -0.36, y: -0.25 },
      { x: 0.36, y: -0.25 },
      { x: -0.36, y: 0.25 },
      { x: 0.36, y: 0.25 },
    ],
    0.18,
    0.17,
    time,
  );

  if (cycle < 0.8) return mixTargets(collapsed, single, cycle / 0.8);
  if (cycle < 1.6) return single;
  if (cycle < 2.8) return mixTargets(single, elongated, (cycle - 1.6) / 1.2);
  if (cycle < 4) return mixTargets(elongated, firstPinch, (cycle - 2.8) / 1.2);
  if (cycle < 5) return mixTargets(firstPinch, pair, cycle - 4);
  if (cycle < 6) return pair;
  if (cycle < 7.3) return mixTargets(pair, elongatedPair, (cycle - 6) / 1.3);
  if (cycle < 8.7) return mixTargets(elongatedPair, secondPinch, (cycle - 7.3) / 1.4);
  if (cycle < 10) return mixTargets(secondPinch, colony, (cycle - 8.7) / 1.3);
  if (cycle < 12.8) return colony;
  return mixTargets(colony, collapsed, (cycle - 12.8) / 2.2);
}

// Particles flowing along invisible, swirling force lines, like iron filings tracing a field.
function getVectorFieldTarget(index, time) {
  const seed = seeded(index, 71);
  const phase = seed * TAU + time * (0.16 + seeded(index, 72) * 0.08);
  const field = Math.sin(phase * 2 + time * 0.22 + seeded(index, 73) * TAU);
  const radius = 0.48 + seeded(index, 74) * 0.34;

  return {
    x: Math.cos(phase + field * 0.22) * radius,
    y: Math.sin(phase * 2) * 0.32 + Math.sin(phase - time * 0.12) * 0.18,
    depth: 0.32 + ((field + 1) / 2) * 0.68,
  };
}

// A fixed network of nodes connected by curved edges, with a pulse of light traveling along the connections.
function getNeuralPulseTarget(index, time) {
  if (index % 7 === 0) {
    const nodeIndex = Math.floor(index / 7) % NEURAL_PULSE_NODES.length;
    const node = NEURAL_PULSE_NODES[nodeIndex];
    const orbit = seeded(index, 75) * TAU;
    return {
      x: node.x + Math.cos(orbit) * 0.025,
      y: node.y + Math.sin(orbit) * 0.025,
      depth: 0.72 + Math.sin(time * 1.4 - nodeIndex * 0.7) * 0.22,
    };
  }

  const edgeIndex = index % NEURAL_PULSE_EDGES.length;
  const [fromIndex, toIndex] = NEURAL_PULSE_EDGES[edgeIndex];
  const from = NEURAL_PULSE_NODES[fromIndex];
  const to = NEURAL_PULSE_NODES[toIndex];
  const position = seeded(index, 76);
  const bend = (seeded(edgeIndex, 77) - 0.5) * 0.18;
  const controlX = (from.x + to.x) / 2 - (to.y - from.y) * bend;
  const controlY = (from.y + to.y) / 2 + (to.x - from.x) * bend;
  const inverse = 1 - position;
  const pulse = (time * 0.42) % 1;
  const pulseDistance = Math.min(Math.abs(position - pulse), 1 - Math.abs(position - pulse));

  return {
    x: inverse * inverse * from.x + 2 * inverse * position * controlX + position * position * to.x,
    y: inverse * inverse * from.y + 2 * inverse * position * controlY + position * position * to.y,
    depth: 0.28 + Math.max(0, 1 - pulseDistance / 0.12) * 0.72,
  };
}

// Multiple horizontal ribbon bands undulating side by side, like curtains of aurora borealis light.
function getAuroraTarget(index, count, time) {
  const bands = 6;
  const band = index % bands;
  const localIndex = Math.floor(index / bands);
  const localCount = Math.ceil(count / bands);
  const position = localIndex / Math.max(1, localCount - 1);
  const x = (position - 0.5) * 1.7;
  const twist = Math.sin(position * TAU * 2.2 - time * 0.52 + band * 0.42);
  const wave = Math.sin(position * TAU * 1.15 + time * 0.34) * 0.22;

  return {
    x: x + Math.sin(time * 0.18 + band) * 0.012,
    y: wave + twist * 0.11 + (band - (bands - 1) / 2) * 0.018,
    depth: 0.28 + ((twist + 1) / 2) * 0.72,
  };
}

// An anatomically shaped heart (ventricles, atria, aorta, pulmonary artery, coronary vessel) contracting and recoiling in a steady beat.
function getHeartbeatTarget(index, count, time) {
  const component = index % 20;
  const localIndex = Math.floor(index / 20);
  const cycle = time % 1.3;
  const systole = Math.exp(-Math.pow((cycle - 0.22) / 0.11, 2));
  const recoil = Math.exp(-Math.pow((cycle - 0.48) / 0.13, 2));
  const contraction = systole * 0.13 - recoil * 0.025;
  let x;
  let y;
  let depth;

  if (component < 8) {
    // Thick, tapered left ventricle ending at the apex.
    const vertical = seeded(index, 91);
    const horizontal = seeded(index, 92) * 2 - 1;
    const boundary = localIndex % 3 === 0;
    const width = 0.055 + Math.pow(1 - vertical, 0.58) * 0.31;
    const fill = boundary ? Math.sign(horizontal || 1) : horizontal * Math.sqrt(seeded(index, 93));
    x = 0.08 - vertical * 0.1 + fill * width;
    y = -0.12 + vertical * 0.82;
    x *= 1 - contraction;
    y *= 1 - contraction * 0.42;
    depth = boundary ? 0.94 : 0.48 + seeded(index, 94) * 0.38;
  } else if (component < 13) {
    // The rounder right ventricle overlaps the upper-left myocardium.
    const angle = seeded(index, 95) * TAU;
    const boundary = localIndex % 3 === 0;
    const radius = boundary ? 0.9 + seeded(index, 96) * 0.1 : Math.sqrt(seeded(index, 96)) * 0.82;
    x = -0.2 + Math.cos(angle) * 0.3 * radius;
    y = 0.04 + Math.sin(angle) * 0.35 * radius;
    x = -0.03 + (x + 0.03) * (1 - contraction * 0.82);
    y *= 1 - contraction * 0.36;
    depth = boundary ? 0.9 : 0.42 + seeded(index, 97) * 0.4;
  } else if (component < 16) {
    // Two atrial chambers sit above the ventricles and expand during systole.
    const side = component % 2 === 0 ? -1 : 1;
    const angle = seeded(index, 98) * TAU;
    const radius = localIndex % 3 === 0 ? 0.92 : Math.sqrt(seeded(index, 99)) * 0.8;
    const atrialExpansion = 1 + systole * 0.035;
    x = side * 0.19 + Math.cos(angle) * 0.19 * radius * atrialExpansion;
    y = -0.24 + Math.sin(angle) * 0.16 * radius * atrialExpansion;
    depth = 0.5 + seeded(index, 100) * 0.43;
  } else if (component < 18) {
    // Aorta rises from the ventricle and curves over the top of the organ.
    const position = seeded(index, 101);
    const tubeOffset = (seeded(index, 102) - 0.5) * 0.075;
    if (position < 0.56) {
      const progress = position / 0.56;
      x = 0.1 + tubeOffset;
      y = -0.14 - progress * 0.47;
    } else {
      const progress = (position - 0.56) / 0.44;
      const arc = Math.PI - progress * Math.PI * 0.78;
      x = 0.24 + Math.cos(arc) * 0.17 + tubeOffset;
      y = -0.53 - Math.sin(arc) * 0.13;
    }
    x *= 1 + systole * 0.025;
    depth = 0.72 + seeded(index, 103) * 0.27;
  } else if (component === 18) {
    // Pulmonary artery branches across the upper-left silhouette.
    const position = seeded(index, 104);
    x = 0.02 - position * 0.53;
    y = -0.28 - Math.sin(position * Math.PI) * 0.16 + (seeded(index, 105) - 0.5) * 0.05;
    depth = 0.78 + seeded(index, 106) * 0.2;
  } else {
    // A coronary strand tracks down the surface toward the apex.
    const position = seeded(index, 107);
    x = -0.13 + position * 0.2 + Math.sin(position * TAU * 1.4) * 0.055;
    y = -0.12 + position * 0.7;
    depth = 0.92 + systole * 0.08;
  }

  const rotation = -0.1;
  const rotatedX = x * Math.cos(rotation) - y * Math.sin(rotation);
  const rotatedY = x * Math.sin(rotation) + y * Math.cos(rotation);
  return { x: rotatedX, y: rotatedY, depth: Math.min(1, depth + systole * 0.06) };
}

// Helper: nine loosely bound particle clusters with a highlight pulse traveling from cluster to cluster; used as the "clustering" phase of the emergent-intelligence mode.
function getEmergentClusterTarget(index, time) {
  const cluster = index % 9;
  const centerX = (seeded(cluster, 111) - 0.5) * 1.35;
  const centerY = (seeded(cluster, 112) - 0.5) * 0.95;
  const localAngle = seeded(index, 113) * TAU + time * 0.08;
  const localRadius = 0.035 + seeded(index, 114) * 0.12;
  const travellingPulse = (time * 0.62) % 9;
  const pulseDistance = Math.min(
    Math.abs(cluster - travellingPulse),
    9 - Math.abs(cluster - travellingPulse),
  );

  return {
    x: centerX + Math.cos(localAngle) * localRadius,
    y: centerY + Math.sin(localAngle) * localRadius,
    depth: 0.38 + Math.max(0, 1 - pulseDistance) * 0.62,
  };
}

// Helper: concentric rotating rings of particles with brightness pulsing outward ring by ring, representing an "organized" resolved state; used as the final phase of the emergent-intelligence mode.
function getResolvedIntelligenceTarget(index, count, time) {
  const rings = 5;
  const ring = index % rings;
  const localIndex = Math.floor(index / rings);
  const localCount = Math.ceil(count / rings);
  const angle = (localIndex / Math.max(1, localCount)) * TAU + time * (ring % 2 === 0 ? 0.09 : -0.07);
  const radius = 0.14 + ring * 0.13;
  const pulse = (Math.sin(time * 1.25 - ring * 0.7) + 1) / 2;

  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius * 0.72,
    depth: 0.4 + pulse * 0.6,
  };
}

// Cycles from a diffuse flowing field, through loosely forming clusters, into organized concentric rings, and back — information self-organizing into understanding.
function getEmergentTarget(index, count, time) {
  const cycle = time % 13;
  const field = getVectorFieldTarget(index, time);
  const clusters = getEmergentClusterTarget(index, time);
  const resolved = getResolvedIntelligenceTarget(index, count, time);

  if (cycle < 2) return field;
  if (cycle < 4.4) return mixTargets(field, clusters, (cycle - 2) / 2.4);
  if (cycle < 7.2) return clusters;
  if (cycle < 9.4) return mixTargets(clusters, resolved, (cycle - 7.2) / 2.2);
  if (cycle < 10.8) return resolved;
  return mixTargets(resolved, field, (cycle - 10.8) / 2.2);
}

// Rotating clock hands surrounded by concentric gear-like rings of particles, with a glint of light traveling around the rings.
function getClockworkTarget(index, count, time) {
  const component = index % 13;

  if (component === 0 || component === 7) {
    const length = 0.14 + seeded(index, 121) * 0.54;
    const speed = component === 0 ? 0.34 : -0.21;
    const angle = time * speed + (component === 0 ? -0.5 : 1.15);
    return {
      x: Math.cos(angle) * length,
      y: Math.sin(angle) * length * 0.72,
      depth: 0.78 + seeded(index, 122) * 0.22,
    };
  }

  const rings = 5;
  const ring = index % rings;
  const localIndex = Math.floor(index / rings);
  const localCount = Math.ceil(count / rings);
  const direction = ring % 2 === 0 ? 1 : -1;
  const speed = 0.08 + ring * 0.025;
  const angle = (localIndex / Math.max(1, localCount)) * TAU + time * speed * direction;
  const tooth = localIndex % 4 === 0 ? 0.025 : 0;
  const radius = 0.15 + ring * 0.13 + tooth;
  const travellingLight = (Math.sin(angle * 2 - time * 0.9) + 1) / 2;

  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius * 0.72,
    depth: 0.4 + travellingLight * 0.6,
  };
}

// A garbage-collection sweep: "live" particles anchor into a tight cluster while "dead" ones drift diffusely and get swept off-screen, then the survivors settle back.
function getGarbageCollectorTarget(index, time) {
  const cycle = time % 10;
  const liveObject = index % 5 < 2;
  const cluster = index % 6;
  const diffuse = {
    x: (seeded(index, 131) - 0.5) * 1.55 + Math.sin(time * 0.22 + index) * 0.05,
    y: (seeded(index, 132) - 0.5) * 1.15 + Math.cos(time * 0.18 + index) * 0.04,
    depth: liveObject ? 0.82 : 0.34,
  };
  const anchored = {
    x: (seeded(cluster, 133) - 0.5) * 0.95 + (seeded(index, 134) - 0.5) * 0.1,
    y: (seeded(cluster, 135) - 0.5) * 0.7 + (seeded(index, 136) - 0.5) * 0.1,
    depth: 0.9,
  };

  if (cycle < 2) return diffuse;
  if (cycle < 4) return liveObject ? mixTargets(diffuse, anchored, (cycle - 2) / 2) : diffuse;
  if (cycle < 7) {
    if (liveObject) return anchored;
    const sweep = (cycle - 4) / 3;
    return { x: diffuse.x + sweep * 1.9, y: diffuse.y + Math.sin(sweep * Math.PI) * 0.08, depth: 0.34 * (1 - sweep) };
  }
  if (cycle < 8) return liveObject ? anchored : { x: 1.4, y: diffuse.y, depth: 0.05 };
  return liveObject ? mixTargets(anchored, diffuse, (cycle - 8) / 2) : mixTargets({ x: -1.3, y: diffuse.y, depth: 0.05 }, diffuse, (cycle - 8) / 2);
}

// A row of token blocks sliding across the screen and fading with age as new tokens push the oldest ones out, like a sliding context window.
function getContextWindowTarget(index, time) {
  const slots = 7;
  const token = Math.floor(index / 12) % slots;
  const local = index % 12;
  const offset = ((token - time * 0.42) % slots + slots) % slots;
  const x = 0.8 - offset * 0.27;
  const column = local % 4;
  const row = Math.floor(local / 4);
  const age = offset / (slots - 1);

  return {
    x: x + (column - 1.5) * 0.035,
    y: (row - 1) * 0.055 + (token % 2 === 0 ? -0.18 : 0.18),
    depth: 0.92 - age * 0.72,
  };
}

// A grid of cells lighting up one at a time as they're "accessed", then dimming again, repeating in a warmup cycle.
function getCacheWarmupTarget(index, time) {
  const columns = 9;
  const rows = 6;
  const cell = index % (columns * rows);
  const column = cell % columns;
  const row = Math.floor(cell / columns);
  const cycle = time % 10;
  const accessAt = seeded(cell, 141) * 6.2;
  const warm = cycle < 8
    ? Math.max(0, Math.min(1, (cycle - accessAt) / 0.75))
    : Math.max(0, 1 - (cycle - 8) / 2);

  return {
    x: (column - (columns - 1) / 2) * 0.17 + (seeded(index, 142) - 0.5) * 0.035,
    y: (row - (rows - 1) / 2) * 0.16 + (seeded(index, 143) - 0.5) * 0.035,
    depth: 0.2 + warm * 0.8,
  };
}

// Cycles between scattered, disagreeing clusters spread around a ring and a single converged, orbiting formation once consensus is reached.
function getConsensusTarget(index, count, time) {
  const cycle = time % 12;
  const cluster = index % 5;
  const localAngle = seeded(index, 151) * TAU + time * (cluster % 2 === 0 ? 0.15 : -0.12);
  const clusterAngle = (cluster / 5) * TAU;
  const disagreement = {
    x: Math.cos(clusterAngle) * 0.62 + Math.cos(localAngle) * (0.04 + seeded(index, 152) * 0.12),
    y: Math.sin(clusterAngle) * 0.42 + Math.sin(localAngle) * (0.04 + seeded(index, 152) * 0.12),
    depth: 0.42 + seeded(index, 153) * 0.45,
  };
  const ratio = index / Math.max(1, count);
  const agreementAngle = ratio * TAU * 3 + time * 0.12;
  const agreement = {
    x: Math.cos(agreementAngle) * (0.24 + (index % 3) * 0.13),
    y: Math.sin(agreementAngle) * (0.18 + (index % 3) * 0.09),
    depth: 0.45 + ((Math.sin(time * 1.3 - ratio * TAU) + 1) / 2) * 0.55,
  };

  if (cycle < 3) return disagreement;
  if (cycle < 7) return mixTargets(disagreement, agreement, (cycle - 3) / 4);
  if (cycle < 9.5) return agreement;
  return mixTargets(agreement, disagreement, (cycle - 9.5) / 2.5);
}

// A vine stem growing upward along a wavering path with leaves sprouting along its length, then withering back down.
function getVineTarget(index, count, time) {
  const cycle = time % 12;
  const role = index % 5;
  const localIndex = Math.floor(index / 5);
  const localCount = Math.ceil(count / 5);
  const position = localIndex / Math.max(1, localCount - 1);
  const growth = cycle < 8 ? cycle / 8 : cycle < 10 ? 1 : 1 - (cycle - 10) / 2;
  const visiblePosition = Math.min(position, Math.max(0, growth));
  const stemX = Math.sin(visiblePosition * 8.2) * 0.16 + Math.sin(visiblePosition * 3.1) * 0.08;
  const stemY = 0.7 - visiblePosition * 1.4;
  const leafSide = role % 2 === 0 ? -1 : 1;
  const leafGrowth = Math.max(0, Math.min(1, (growth - position) * 12));
  const leafOffset = role === 0 ? 0 : leafSide * (0.045 + (role > 2 ? 0.1 : 0.06)) * leafGrowth;

  return {
    x: stemX + leafOffset,
    y: stemY + (role === 0 ? 0 : Math.abs(leafOffset) * 0.35),
    depth: position <= growth ? 0.48 + leafGrowth * 0.48 : 0.08,
  };
}

// A diffuse gas cloud that condenses into small clusters, with some particles igniting into bright stars, then dispersing back into cloud.
function getNebulaTarget(index, time) {
  const cycle = time % 12;
  const cloud = {
    x: (seeded(index, 171) - 0.5) * 1.55 + Math.sin(time * 0.12 + index) * 0.04,
    y: (seeded(index, 172) - 0.5) * 1.08 + Math.cos(time * 0.1 + index) * 0.035,
    depth: 0.26 + seeded(index, 173) * 0.34,
  };
  const star = index % 17 === 0;
  const cluster = index % 7;
  const centerX = (seeded(cluster, 174) - 0.5) * 0.9;
  const centerY = (seeded(cluster, 175) - 0.5) * 0.58;
  const angle = seeded(index, 176) * TAU;
  const radius = (star ? 0.012 : 0.035 + seeded(index, 177) * 0.14);
  const condensed = {
    x: centerX + Math.cos(angle) * radius,
    y: centerY + Math.sin(angle) * radius,
    depth: star ? 1 : 0.38 + seeded(index, 178) * 0.42,
  };

  if (cycle < 3) return cloud;
  if (cycle < 7) return mixTargets(cloud, condensed, (cycle - 3) / 4);
  if (cycle < 10) return { ...condensed, depth: Math.min(1, condensed.depth + (star ? (cycle - 7) / 3 : 0)) };
  return mixTargets(condensed, cloud, (cycle - 10) / 2);
}

// Two irregular molecular shapes rotating toward each other, locking together into a matched interface, then separating again.
function getMolecularDockingTarget(index, time) {
  const cycle = time % 10;
  const side = index % 2 === 0 ? -1 : 1;
  const localIndex = Math.floor(index / 2);
  const angle = seeded(localIndex, 181) * TAU;
  const irregularity = 0.15 + Math.sin(angle * 3 + side) * 0.035;
  const bind = cycle < 2 ? 0 : cycle < 6 ? (cycle - 2) / 4 : cycle < 8 ? 1 : 1 - (cycle - 8) / 2;
  const rotation = side * (1 - bind) * 0.9;
  const rotatedAngle = angle + rotation;
  const separation = 0.5 - bind * 0.27;
  const interfaceNotch = Math.max(0, Math.cos(rotatedAngle * side)) * bind * 0.04;

  return {
    x: side * separation + Math.cos(rotatedAngle) * (irregularity - interfaceNotch),
    y: Math.sin(rotatedAngle) * irregularity * 1.35,
    depth: 0.46 + bind * 0.42 + seeded(index, 182) * 0.1,
  };
}

// Loose scattered particles assembling into a suspension bridge (towers, deck, curved main cables, hangers), then dispersing back into loose motion.
function getBridgeTarget(index, time) {
  const cycle = time % 11;
  const role = index % 10;
  const position = seeded(index, 191);
  let structure;

  if (role < 2) {
    const side = role === 0 ? -1 : 1;
    structure = { x: side * 0.48 + (seeded(index, 192) - 0.5) * 0.05, y: 0.42 - position * 0.92, depth: 0.88 };
  } else if (role < 5) {
    structure = { x: (position - 0.5) * 1.5, y: 0.32 + (seeded(index, 193) - 0.5) * 0.045, depth: 0.82 };
  } else if (role < 9) {
    const x = (position - 0.5) * 1.5;
    structure = { x, y: -0.48 + 1.38 * x * x, depth: 0.9 };
  } else {
    const x = (position - 0.5) * 1.35;
    const cableY = -0.48 + 1.38 * x * x;
    structure = { x, y: cableY + seeded(index, 194) * (0.32 - cableY), depth: 0.62 };
  }

  const loose = getVectorFieldTarget(index, time);
  if (cycle < 2) return loose;
  if (cycle < 7) return mixTargets(loose, structure, (cycle - 2) / 5);
  if (cycle < 9) return structure;
  return mixTargets(structure, loose, (cycle - 9) / 2);
}

// Clustered "sections" of particles that walk in one by one from a waiting position and pulse together once assembled, like orchestra sections taking the stage.
function getOrchestraTarget(index, time) {
  const cycle = time % 12;
  const section = index % 5;
  const sectionAngle = Math.PI * (0.12 + section * 0.19);
  const centerX = Math.cos(sectionAngle) * 0.63;
  const centerY = 0.32 - Math.sin(sectionAngle) * 0.48;
  const localAngle = seeded(index, 201) * TAU;
  const radius = 0.035 + seeded(index, 202) * 0.12;
  const assembled = {
    x: centerX + Math.cos(localAngle) * radius,
    y: centerY + Math.sin(localAngle) * radius,
    depth: cycle >= 6 && cycle < 10
      ? 0.42 + ((Math.sin(time * 2 - section * 0.75) + 1) / 2) * 0.58
      : 0.68,
  };
  const waiting = { x: 0, y: 0.68, depth: 0.1 };
  const entranceStart = section * 0.85;

  if (cycle < entranceStart) return waiting;
  if (cycle < entranceStart + 1.2) return mixTargets(waiting, assembled, (cycle - entranceStart) / 1.2);
  if (cycle < 10) return assembled;
  return mixTargets(assembled, waiting, (cycle - 10) / 2);
}

const ATTRACTOR_A = -1.4;
const ATTRACTOR_B = 1.6;
const ATTRACTOR_C = 1;
const ATTRACTOR_D = 0.7;
const ATTRACTOR_ITERATIONS = 40;

// Points plotted by iterating a chaotic (Clifford-style) attractor map, tracing a strange-attractor shape that slowly rotates but never repeats.
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

// Particles cycle between two different tessellated cell-grid arrangements, morphing back and forth between the two tiling patterns.
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

// Parallel light rays bending sharply as they cross a vertical boundary into a new medium.
function getRefractionTarget(index, count, time) {
  const lane = index % 7;
  const progress = seeded(Math.floor(index / 7), 211);
  const x = -0.82 + progress * 1.64;
  const laneY = (lane - 3) * 0.105;
  const incidentSlope = (lane - 3) * 0.035;
  const boundaryY = laneY + incidentSlope * 0.82;
  const y = x < 0
    ? laneY + incidentSlope * (x + 0.82)
    : boundaryY + incidentSlope * 0.46 * x;
  const pulse = (Math.sin(progress * TAU * 3 - time * 2.8) + 1) / 2;
  return { x, y, depth: 0.3 + pulse * 0.7 };
}

// A single beam entering a prism and fanning out into separate colored bands.
function getPrismTarget(index, count, time) {
  const band = index % 7;
  const progress = seeded(Math.floor(index / 7), 212);
  const x = -0.82 + progress * 1.64;
  const bandOffset = (band - 3) * 0.065;
  let y;
  if (x < -0.14) {
    y = bandOffset * 0.12;
  } else if (x < 0.1) {
    y = bandOffset * ((x + 0.14) / 0.24) * 0.35;
  } else {
    y = bandOffset * (0.35 + ((x - 0.1) / 0.72) * 2.6);
  }
  const pulse = (Math.sin(progress * TAU * 2.5 - time * 2.4 + band * 0.25) + 1) / 2;
  return { x, y, depth: 0.34 + pulse * 0.66 };
}

// Diverging rays bending as they pass through a lens and converging to a focal point.
function getLensTarget(index, count, time) {
  const ray = index % 9;
  const progress = seeded(Math.floor(index / 9), 213);
  const x = -0.82 + progress * 1.64;
  const startY = (ray - 4) * 0.105;
  let y;
  if (x < 0) {
    y = startY * (1 - ((x + 0.82) / 0.82) * 0.35);
  } else if (x < 0.38) {
    y = startY * 0.65 * (1 - x / 0.38);
  } else {
    y = -startY * ((x - 0.38) / 0.44) * 0.48;
  }
  const pulse = (Math.sin(progress * TAU * 3 - time * 2.7) + 1) / 2;
  return { x, y, depth: 0.28 + pulse * 0.72 };
}

// Particles passing through two slits and landing in a banded interference pattern.
function getDoubleSlitTarget(index, count, time) {
  const slit = index % 2 === 0 ? -1 : 1;
  const progress = seeded(Math.floor(index / 2), 214);
  const x = -0.82 + progress * 1.64;
  const slitY = slit * 0.13;
  const sourceY = (seeded(index, 215) - 0.5) * 0.22;
  let y;
  if (x < -0.08) {
    const approach = (x + 0.82) / 0.74;
    y = sourceY + (slitY - sourceY) * approach;
  } else {
    const spread = (x + 0.08) / 0.9;
    const fringe = Math.sin((bandedIndex(index, 11) - 5) * 1.45) * 0.26;
    y = slitY * (1 - spread) + fringe * spread;
  }
  const pulse = (Math.sin(progress * TAU * 2.8 - time * 2.5) + 1) / 2;
  return { x, y, depth: 0.3 + pulse * 0.7 };
}

function bandedIndex(index, bands) {
  return Math.floor(index / 2) % bands;
}

// Rippling light-focus bands, like the shifting bright lines seen on a pool floor.
function getCausticsTarget(index, count, time) {
  const layer = index % 4;
  const progress = seeded(Math.floor(index / 4), 216);
  const x = -0.82 + progress * 1.64;
  const phase = time * 0.16 + layer * 0.78;
  const y = Math.sin(x * 3.4 + phase) * (0.2 + layer * 0.025)
    + Math.sin(x * 7.2 - phase * 1.3) * 0.07
    + (layer - 1.5) * 0.045;
  const focus = Math.abs(Math.cos(x * 3.4 + phase));
  return { x, y, depth: 0.3 + focus * 0.7 };
}

// Particles scattered across the field, each jittering randomly in place like molecules under constant collision.
function getBrownianTarget(index, count, time) {
  const baseX = (seeded(index, 221) - 0.5) * 1.5;
  const baseY = (seeded(index, 222) - 0.5) * 1.15;
  const phase = seeded(index, 223) * TAU;
  return {
    x: baseX + Math.sin(time * (1.1 + seeded(index, 224)) + phase) * 0.055 + Math.sin(time * 2.7 + index) * 0.018,
    y: baseY + Math.cos(time * (1.25 + seeded(index, 225)) + phase) * 0.055 + Math.cos(time * 2.4 + index) * 0.018,
    depth: 0.35 + seeded(index, 226) * 0.65,
  };
}

// Two clusters of reactants drifting together and morphing into a shared product cluster, repeating.
function getReactionTarget(index, count, time) {
  const side = index % 2 === 0 ? -1 : 1;
  const reaction = (1 - Math.cos(time * 0.48)) / 2;
  const localAngle = seeded(index, 227) * TAU + time * side * 0.12;
  const localRadius = Math.sqrt(seeded(index, 228)) * (0.24 - reaction * 0.08);
  const reactant = {
    x: side * 0.48 + Math.cos(localAngle) * localRadius,
    y: Math.sin(localAngle) * localRadius,
    depth: 0.42 + seeded(index, 229) * 0.38,
  };
  const productAngle = localAngle + time * 0.18;
  const product = {
    x: Math.cos(productAngle) * (0.08 + localRadius * 1.1),
    y: Math.sin(productAngle) * (0.08 + localRadius * 1.1),
    depth: 0.62 + seeded(index, 229) * 0.38,
  };
  return mixTargets(reactant, product, reaction);
}

// Randomly scattered particles gradually snapping into a neat, brick-like crystal lattice.
function getCrystallizationTarget(index, count, time) {
  const columns = Math.ceil(Math.sqrt(count));
  const row = Math.floor(index / columns);
  const column = index % columns;
  const spacing = 1.38 / Math.max(columns - 1, 1);
  const crystal = {
    x: (column - (columns - 1) / 2) * spacing + (row % 2) * spacing * 0.5,
    y: (row - (columns - 1) / 2) * spacing * 0.86,
    depth: 0.58 + seeded(index, 230) * 0.42,
  };
  const liquid = {
    x: (seeded(index, 231) - 0.5) * 1.5,
    y: (seeded(index, 232) - 0.5) * 1.12,
    depth: 0.28 + seeded(index, 230) * 0.48,
  };
  const crystallized = (1 - Math.cos(time * 0.26)) / 2;
  return mixTargets(liquid, crystal, crystallized);
}

// Small orbiting particle clusters swarming around a few fixed catalyst sites.
function getCatalysisTarget(index, count, time) {
  const catalyst = index % 9 === 0;
  const site = index % 5;
  const siteAngle = (site / 5) * TAU;
  const siteX = Math.cos(siteAngle) * 0.32;
  const siteY = Math.sin(siteAngle) * 0.24;
  if (catalyst) {
    return {
      x: siteX,
      y: siteY,
      depth: 1,
    };
  }
  const orbit = seeded(index, 233) * TAU + time * (0.38 + seeded(index, 234) * 0.34);
  const radius = 0.045 + seeded(index, 235) * 0.14;
  return {
    x: siteX + Math.cos(orbit) * radius,
    y: siteY + Math.sin(orbit) * radius,
    depth: 0.36 + (1 - radius / 0.19) * 0.64,
  };
}

// Two separate clouds of particles on either side that gradually intermix into one even spread.
function getDiffusionTarget(index, count, time) {
  const side = index % 2 === 0 ? -1 : 1;
  const mixed = (1 - Math.cos(time * 0.22)) / 2;
  const centerX = side * 0.48 * (1 - mixed);
  const spreadX = 0.16 + mixed * 0.5;
  return {
    x: centerX + (seeded(index, 236) - 0.5) * spreadX,
    y: (seeded(index, 237) - 0.5) * (0.72 + mixed * 0.3),
    depth: 0.34 + seeded(index, 238) * 0.66,
  };
}

// Horizontal streamlines flowing left to right, deflecting up or down around a central obstacle.
function getWindTunnelTarget(index, count, time) {
  const lane = index % 13;
  const progress = seeded(Math.floor(index / 13), 241);
  const x = -0.84 + progress * 1.68;
  const laneY = (lane - 6) * 0.085;
  const proximity = Math.max(0, 1 - Math.abs(x) / 0.42);
  const direction = laneY === 0 ? (index % 2 ? -1 : 1) : Math.sign(laneY);
  const y = laneY + direction * proximity * (0.2 - Math.min(0.16, Math.abs(laneY) * 0.35));
  const pulse = (Math.sin(progress * TAU * 2.6 - time * 2.2) + 1) / 2;
  return { x, y, depth: 0.3 + pulse * 0.7 };
}

// Two side-by-side convection cells, each circulating particles up one side and down the other.
function getConvectionTarget(index, count, time) {
  const cell = index % 2 === 0 ? -1 : 1;
  const angle = seeded(index, 242) * TAU + time * 0.34 * -cell;
  return {
    x: cell * 0.34 + Math.cos(angle) * 0.3,
    y: Math.sin(angle) * 0.58,
    depth: 0.3 + ((Math.sin(angle) + 1) / 2) * 0.7,
  };
}

// A rotating storm system with a calm eye at the center and swirling bands spinning outward.
function getStormCellTarget(index, count, time) {
  const radiusSeed = Math.sqrt(seeded(index, 243));
  const radius = 0.08 + radiusSeed * 0.7;
  const band = index % 4;
  const angle = seeded(index, 244) * TAU + time * (0.32 + (1 - radiusSeed) * 0.9) + radius * 5 + band * 0.22;
  const eyePulse = 0.96 + Math.sin(time * 0.42) * 0.04;
  return {
    x: Math.cos(angle) * radius * eyePulse,
    y: Math.sin(angle) * radius * 0.72,
    depth: 0.32 + (1 - radiusSeed) * 0.68,
  };
}

// Light particles drifting downward across the field, swaying side to side on shifting wind.
function getSnowfallTarget(index, count, time) {
  const cycle = (time * (0.07 + seeded(index, 245) * 0.035) + seeded(index, 246)) % 1;
  const y = -0.78 + cycle * 1.56;
  const wind = Math.sin(time * 0.55 + seeded(index, 247) * TAU) * (0.035 + seeded(index, 248) * 0.05);
  return {
    x: (seeded(index, 249) - 0.5) * 1.5 + wind,
    y,
    depth: 0.32 + seeded(index, 250) * 0.68,
  };
}

// Two air masses meeting along a wavy, slowly shifting boundary line.
function getPressureFrontTarget(index, count, time) {
  const side = index % 2 === 0 ? -1 : 1;
  const row = (seeded(index, 251) - 0.5) * 1.2;
  const pressure = Math.sin(time * 0.32) * 0.13;
  const boundary = Math.sin(row * 5 + time * 0.4) * 0.12 + pressure;
  const distance = 0.08 + seeded(index, 252) * 0.62;
  return {
    x: boundary + side * distance + Math.sin(time * 0.5 + index) * 0.025,
    y: row + side * Math.sin(row * 3 - time * 0.28) * 0.055,
    depth: 0.34 + (1 - distance / 0.7) * 0.66,
  };
}

// Layered wavy ridges of sand slowly migrating sideways like dunes shaped by steady wind.
function getSandDunesTarget(index, count, time) {
  const progress = seeded(index, 261);
  const x = -0.82 + progress * 1.64;
  const layer = index % 7;
  const dune = Math.sin(x * 4.2 - time * 0.16) * 0.16 + Math.sin(x * 8.4 - time * 0.09) * 0.055;
  return {
    x,
    y: 0.34 + dune + layer * 0.025,
    depth: 0.34 + (6 - layer) / 6 * 0.66,
  };
}

// A jagged rock cliff gradually softening and slumping down into a smooth sloped hillside.
function getErosionTarget(index, count, time) {
  const progress = seeded(index, 262);
  const x = -0.8 + progress * 1.6;
  const layer = seeded(index, 263);
  const cliffY = -0.28 + layer * 0.8 + (x > 0.12 ? 0.18 : 0);
  const slopeY = 0.48 - Math.abs(x + 0.08) * 0.48 + (layer - 0.5) * 0.18;
  const eroded = (1 - Math.cos(time * 0.2)) / 2;
  return {
    x: x + eroded * Math.sin(index * 0.7) * 0.035,
    y: cliffY + (slopeY - cliffY) * eroded,
    depth: 0.36 + (1 - layer) * 0.64,
  };
}

// Loosely suspended particles sinking and settling into flat horizontal layers over time.
function getSedimentationTarget(index, count, time) {
  const layer = index % 6;
  const settled = Math.min(1, (time % 9) / 4.5);
  const looseY = (seeded(index, 264) - 0.5) * 1.25;
  const layerY = 0.63 - layer * 0.13 + (seeded(index, 265) - 0.5) * 0.06;
  return {
    x: (seeded(index, 266) - 0.5) * 1.5,
    y: looseY + (layerY - looseY) * settled,
    depth: 0.38 + (5 - layer) / 5 * 0.62,
  };
}

// A snowflake-like crystal extending outward along symmetric branching arms as it grows.
function getCrystalGrowthTarget(index, count, time) {
  const arm = index % 6;
  const branch = Math.floor(index / 6) % 5;
  const progress = seeded(index, 267);
  const growth = 0.22 + ((time * 0.1) % 1) * 0.78;
  const radius = progress * (0.18 + branch * 0.12) * growth;
  const angle = (arm / 6) * TAU + (branch - 2) * 0.12;
  const branchOffset = Math.sin(progress * Math.PI) * (branch % 2 ? -1 : 1) * 0.055;
  return {
    x: Math.cos(angle) * radius - Math.sin(angle) * branchOffset,
    y: Math.sin(angle) * radius + Math.cos(angle) * branchOffset,
    depth: 0.42 + (1 - progress) * 0.58,
  };
}

// Two plates on either side of a central fault line building up stress, then jolting in a sudden slip.
function getTectonicTarget(index, count, time) {
  const side = index % 2 === 0 ? -1 : 1;
  const cycle = time % 10;
  const stress = cycle < 7 ? cycle / 7 : 1 - (cycle - 7) / 3;
  const localX = seeded(index, 268) * 0.62;
  const baseX = side * (0.72 - localX);
  const distanceToFault = Math.abs(baseX);
  const uplift = Math.max(0, 1 - distanceToFault / 0.34) * stress;
  const slip = cycle >= 7 ? side * (cycle - 7) * 0.035 : 0;
  return {
    x: baseX - side * stress * 0.13 + slip,
    y: (seeded(index, 269) - 0.5) * 0.92 - uplift * 0.16 * side,
    depth: 0.36 + uplift * 0.64,
  };
}

// A stream of particles hitting a barrier, most bouncing back while a few "tunnel" straight through.
function getQuantumTunnelTarget(index, count, time) {
  const tunneled = seeded(index, 271) > 0.68;
  const progress = seeded(index, 272);
  const x = tunneled ? -0.82 + progress * 1.64 : -0.82 + progress * 0.68;
  const wave = Math.sin(x * 14 - time * 2.2 + seeded(index, 273) * 0.5);
  const decay = x > -0.14 && !tunneled ? Math.exp(-(x + 0.14) * 10) : 1;
  return {
    x,
    y: (seeded(index, 274) - 0.5) * 0.5 + wave * 0.055 * decay,
    depth: 0.24 + decay * 0.76,
  };
}

// A fuzzy, lobed cloud of points density-mapping where a quantum particle is likely to be found.
function getProbabilityCloudTarget(index, count, time) {
  const orbital = index % 3;
  const angle = seeded(index, 275) * TAU + time * (0.08 + orbital * 0.035);
  const radius = Math.sqrt(seeded(index, 276)) * (0.3 + orbital * 0.16);
  const lobe = orbital === 0 ? 1 : Math.cos(angle * orbital);
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius * (0.55 + Math.abs(lobe) * 0.35),
    depth: 0.25 + Math.abs(lobe) * 0.75,
  };
}

// Paired particles mirrored on opposite sides of the field, moving in lockstep with each other.
function getEntanglementTarget(index, count, time) {
  const pairIndex = Math.floor(index / 2);
  const side = index % 2 === 0 ? -1 : 1;
  const angle = seeded(pairIndex, 277) * TAU + time * (0.18 + seeded(pairIndex, 278) * 0.12);
  const radius = 0.12 + seeded(pairIndex, 279) * 0.46;
  const sharedX = Math.cos(angle) * radius;
  const sharedY = Math.sin(angle) * radius * 0.72;
  return {
    x: side * (0.25 + Math.abs(sharedX) * 0.7),
    y: side * sharedY,
    depth: 0.38 + ((Math.sin(angle) + 1) / 2) * 0.62,
  };
}

// Particles stacked on discrete horizontal energy levels, some jumping up and down between rungs.
function getQuantumWellTarget(index, count, time) {
  const levelCount = 6;
  const baseLevel = index % levelCount;
  const transition = (Math.sin(time * 0.7 + seeded(index, 280) * TAU) + 1) / 2;
  const jumping = index % 11 === 0;
  const level = jumping ? baseLevel + transition : baseLevel;
  return {
    x: (seeded(index, 281) - 0.5) * 1.35 + Math.sin(time * 0.32 + index) * 0.025,
    y: 0.58 - level * 0.2,
    depth: jumping ? 0.65 + transition * 0.35 : 0.36 + baseLevel / (levelCount - 1) * 0.5,
  };
}

// The same particles morphing back and forth between straight discrete lanes and a flowing wave shape.
function getWaveParticleTarget(index, count, time) {
  const progress = seeded(index, 282);
  const x = -0.82 + progress * 1.64;
  const lane = (index % 9) - 4;
  const particle = {
    x,
    y: lane * 0.085,
    depth: 0.38 + seeded(index, 283) * 0.42,
  };
  const wave = {
    x,
    y: Math.sin(x * 8 - time * 1.7 + lane * 0.34) * 0.32,
    depth: 0.3 + ((Math.sin(x * 8 - time * 1.7) + 1) / 2) * 0.7,
  };
  const duality = (1 - Math.cos(time * 0.34)) / 2;
  return mixTargets(particle, wave, duality);
}

// Parallel lanes of particles compressing ahead of and stretching behind a moving warp bubble.
function getWarpFieldTarget(index, count, time) {
  const lane = index % 15;
  const progress = seeded(Math.floor(index / 15), 291);
  const x = -0.84 + progress * 1.68;
  const laneY = (lane - 7) * 0.075;
  const field = Math.exp(-(((x - 0.12) / 0.3) ** 2));
  const compression = x < 0.12 ? 1 + field * 0.38 : 1 - field * 0.32;
  const pulse = (Math.sin(progress * TAU * 3.2 - time * 3.1) + 1) / 2;
  return {
    x: x - field * 0.055,
    y: laneY * compression + Math.sin(x * 5 - time * 0.35 + lane) * 0.018,
    depth: 0.26 + pulse * 0.74,
  };
}

// Loosely scattered particles converging into an orderly circuit-like grid, then dispersing again.
function getNanobotAssemblyTarget(index, count, time) {
  const columns = Math.ceil(Math.sqrt(count));
  const row = Math.floor(index / columns);
  const column = index % columns;
  const spacing = 1.25 / Math.max(columns - 1, 1);
  const gridX = (column - (columns - 1) / 2) * spacing;
  const gridY = (row - (columns - 1) / 2) * spacing;
  const circuitOffset = Math.sin(column * 1.7) * 0.025 + Math.cos(row * 1.4) * 0.025;
  const assembled = {
    x: gridX,
    y: gridY * 0.72 + circuitOffset,
    depth: index % 11 === 0 ? 1 : 0.54 + seeded(index, 292) * 0.32,
  };
  const loose = {
    x: (seeded(index, 293) - 0.5) * 1.5 + Math.sin(time * 0.22 + index) * 0.04,
    y: (seeded(index, 294) - 0.5) * 1.12 + Math.cos(time * 0.19 + index) * 0.04,
    depth: 0.3 + seeded(index, 292) * 0.5,
  };
  const assembly = (1 - Math.cos(time * 0.24)) / 2;
  return mixTargets(loose, assembled, assembly);
}

// A cluster that holds at one spot, dissolves into a scattering burst mid-transit, then reforms at a second spot.
function getTeleportationTarget(index, count, time) {
  const cycle = time % 12;
  const angle = seeded(index, 295) * TAU;
  const radius = Math.sqrt(seeded(index, 296)) * 0.23;
  const localX = Math.cos(angle) * radius;
  const localY = Math.sin(angle) * radius;
  const source = { x: -0.5 + localX, y: localY, depth: 0.44 + seeded(index, 297) * 0.48 };
  const destination = { x: 0.5 + localX, y: localY, depth: 0.58 + seeded(index, 297) * 0.42 };

  if (cycle < 3) return source;
  if (cycle < 7) {
    const delay = seeded(index, 298) * 0.9;
    const progress = Math.max(0, Math.min(1, (cycle - 3 - delay) / 3.1));
    const transit = mixTargets(source, destination, progress);
    return {
      ...transit,
      y: transit.y + Math.sin(progress * Math.PI) * Math.sin(index * 1.9) * 0.12,
      depth: 0.28 + Math.sin(progress * Math.PI) * 0.72,
    };
  }
  if (cycle < 10) return destination;
  return mixTargets(destination, source, (cycle - 10) / 2);
}

// Charged particles circulating around a torus (donut) shape, as if held by a magnetic containment field.
function getPlasmaContainmentTarget(index, count, time) {
  const u = seeded(index, 299) * TAU + time * (0.28 + seeded(index, 300) * 0.16);
  const v = (index % 17) / 17 * TAU + time * 0.72;
  const majorRadius = 0.52;
  const minorRadius = 0.11 + seeded(index, 301) * 0.07;
  const ringRadius = majorRadius + Math.cos(v) * minorRadius;
  const x = Math.cos(u) * ringRadius;
  const y3d = Math.sin(u) * ringRadius;
  const z = Math.sin(v) * minorRadius;
  return {
    x,
    y: y3d * 0.42 + z * 1.35,
    depth: 0.3 + ((Math.sin(u) + 1) / 2) * 0.7,
  };
}

// Independent free-flying agents gradually self-organizing into a symmetric V-shaped flock formation.
function getSwarmIntelligenceTarget(index, count, time) {
  const ratio = index / Math.max(count - 1, 1);
  const wing = index % 2 === 0 ? -1 : 1;
  const rank = Math.floor(index / 2) / Math.max(Math.floor(count / 2), 1);
  const formation = {
    x: (rank - 0.5) * 1.3,
    y: wing * Math.abs(rank - 0.5) * 0.72 + (seeded(index, 302) - 0.5) * 0.045,
    depth: 0.52 + (1 - Math.abs(ratio - 0.5) * 2) * 0.48,
  };
  const freeAngle = seeded(index, 303) * TAU + time * (0.18 + seeded(index, 304) * 0.16);
  const freeRadius = 0.14 + seeded(index, 305) * 0.6;
  const free = {
    x: Math.cos(freeAngle) * freeRadius + Math.sin(time * 0.17) * 0.1,
    y: Math.sin(freeAngle * 0.82) * freeRadius * 0.66,
    depth: 0.3 + seeded(index, 306) * 0.62,
  };
  const organize = (1 - Math.cos(time * 0.22)) / 2;
  return mixTargets(free, formation, organize);
}

// A bright central star encircled by nested tilted rings of orbiting energy-collector particles.
function getDysonSwarmTarget(index, count, time) {
  const stellar = index % 13 === 0;
  if (stellar) {
    const angle = seeded(index, 307) * TAU + time * 0.12;
    const radius = Math.sqrt(seeded(index, 308)) * 0.12;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      depth: 0.82 + seeded(index, 309) * 0.18,
    };
  }
  const shell = index % 4;
  const radius = 0.25 + shell * 0.13;
  const angle = seeded(index, 310) * TAU + time * (0.18 + shell * 0.055) * (shell % 2 ? -1 : 1);
  const tilt = 0.28 + shell * 0.1;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius * tilt,
    depth: 0.28 + ((Math.sin(angle) + 1) / 2) * 0.72,
  };
}

// A central star with several planets, each trailed by its own tight orbiting moons, circling at different speeds.
function getSolarSystemTarget(index, count, time) {
  const stellar = index % 17 === 0;
  if (stellar) {
    const angle = seeded(index, 321) * TAU + time * 0.1;
    const radius = Math.sqrt(seeded(index, 322)) * 0.1;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      depth: 0.86 + seeded(index, 323) * 0.14,
    };
  }
  const planet = index % 8;
  const orbitRadius = 0.17 + planet * 0.082;
  const orbitAngle = planet * 1.73 + time * (0.1 + (7 - planet) * 0.035);
  const localAngle = seeded(index, 324) * TAU + time * 0.16;
  const localRadius = 0.008 + seeded(index, 325) * (0.018 + planet * 0.002);
  return {
    x: Math.cos(orbitAngle) * orbitRadius + Math.cos(localAngle) * localRadius,
    y: Math.sin(orbitAngle) * orbitRadius * 0.42 + Math.sin(localAngle) * localRadius,
    depth: 0.32 + ((Math.sin(orbitAngle) + 1) / 2) * 0.68,
  };
}

// A galaxy with four curved spiral arms of stars winding out from a dense rotating core.
function getSpiralGalaxyTarget(index, count, time) {
  const arm = index % 4;
  const radiusSeed = Math.sqrt(seeded(index, 326));
  const radius = 0.035 + radiusSeed * 0.72;
  const angle = (arm / 4) * TAU + radius * 6.2 + time * (0.14 + (1 - radiusSeed) * 0.22);
  const jitter = (seeded(index, 327) - 0.5) * (0.025 + radius * 0.08);
  return {
    x: Math.cos(angle) * radius - Math.sin(angle) * jitter,
    y: (Math.sin(angle) * radius + Math.cos(angle) * jitter) * 0.74,
    depth: 0.32 + (1 - radiusSeed) * 0.68,
  };
}

// Straight background light rays bending as they pass near a central black hole's gravity.
function getBlackHoleLensingTarget(index, count, time) {
  const lane = index % 15;
  const progress = seeded(Math.floor(index / 15), 328);
  const x = -0.84 + progress * 1.68;
  const baseY = (lane - 7) * 0.075;
  const side = baseY === 0 ? (index % 2 ? -1 : 1) : Math.sign(baseY);
  const lens = Math.exp(-((x / 0.27) ** 2)) * 0.055 / (Math.abs(baseY) + 0.18);
  const pulse = (Math.sin(progress * TAU * 2.8 - time * 2.1) + 1) / 2;
  return {
    x,
    y: baseY + side * lens,
    depth: 0.24 + pulse * 0.76,
  };
}

// A comet orbiting a star with a luminous tail streaming away from the star behind it.
function getCometPassageTarget(index, count, time) {
  const orbitAngle = time * 0.14;
  const headX = Math.cos(orbitAngle) * 0.24;
  const headY = Math.sin(orbitAngle) * 0.16;
  const distanceFromStar = Math.max(0.01, Math.hypot(headX, headY));
  const awayX = headX / distanceFromStar;
  const awayY = headY / distanceFromStar;
  const tailDistance = (index % 13 === 0 ? 0.015 : seeded(index, 329) ** 1.7 * 0.5);
  const spread = (seeded(index, 330) - 0.5) * 0.11 * (tailDistance / 0.5);
  return {
    x: headX + awayX * tailDistance - awayY * spread,
    y: headY + awayY * tailDistance + awayX * spread,
    depth: 0.3 + (1 - tailDistance / 0.52) * 0.7,
  };
}

// A spinning neutron star sweeping two narrow opposite beams of particles around like a lighthouse.
function getPulsarTarget(index, count, time) {
  const core = index % 8 === 0;
  const axis = time * 0.62;
  if (core) {
    const angle = seeded(index, 331) * TAU + time * 0.8;
    const radius = Math.sqrt(seeded(index, 332)) * 0.12;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      depth: 0.72 + seeded(index, 333) * 0.28,
    };
  }
  const side = index % 2 === 0 ? -1 : 1;
  const distance = 0.08 + seeded(index, 334) * 0.66;
  const spread = (seeded(index, 335) - 0.5) * 0.07 * (1 - distance * 0.45);
  return {
    x: Math.cos(axis) * distance * side - Math.sin(axis) * spread,
    y: Math.sin(axis) * distance * side + Math.cos(axis) * spread,
    depth: 0.3 + (1 - distance / 0.74) * 0.7,
  };
}

// A diffuse ring of dust gradually clumping into a family of discrete orbiting planets.
function getPlanetFormationTarget(index, count, time) {
  const group = index % 5;
  const looseRadius = 0.12 + seeded(index, 336) * 0.64;
  const looseAngle = seeded(index, 337) * TAU + time * (0.16 + (1 - looseRadius) * 0.28);
  const dust = {
    x: Math.cos(looseAngle) * looseRadius,
    y: Math.sin(looseAngle) * looseRadius * 0.34,
    depth: 0.3 + (1 - looseRadius) * 0.55,
  };
  const planetRadius = 0.2 + group * 0.11;
  const planetAngle = (group / 5) * TAU + time * (0.09 + (4 - group) * 0.018);
  const localAngle = seeded(index, 338) * TAU;
  const localRadius = Math.sqrt(seeded(index, 339)) * (0.035 + group * 0.006);
  const planet = {
    x: Math.cos(planetAngle) * planetRadius + Math.cos(localAngle) * localRadius,
    y: Math.sin(planetAngle) * planetRadius * 0.34 + Math.sin(localAngle) * localRadius,
    depth: 0.58 + seeded(index, 340) * 0.42,
  };
  const formation = (1 - Math.cos(time * 0.2)) / 2;
  return mixTargets(dust, planet, formation);
}

// Dispatches to the optical/chemical/atmospheric/earth/quantum/cosmic mode functions above by mode id.
function getExpandedCategoryTarget(mode, index, count, time) {
  if (mode === "refraction") return getRefractionTarget(index, count, time);
  if (mode === "prism") return getPrismTarget(index, count, time);
  if (mode === "lens") return getLensTarget(index, count, time);
  if (mode === "doubleslit") return getDoubleSlitTarget(index, count, time);
  if (mode === "caustics") return getCausticsTarget(index, count, time);
  if (mode === "brownian") return getBrownianTarget(index, count, time);
  if (mode === "reaction") return getReactionTarget(index, count, time);
  if (mode === "crystallization") return getCrystallizationTarget(index, count, time);
  if (mode === "catalysis") return getCatalysisTarget(index, count, time);
  if (mode === "diffusion") return getDiffusionTarget(index, count, time);
  if (mode === "windtunnel") return getWindTunnelTarget(index, count, time);
  if (mode === "convection") return getConvectionTarget(index, count, time);
  if (mode === "stormcell") return getStormCellTarget(index, count, time);
  if (mode === "snowfall") return getSnowfallTarget(index, count, time);
  if (mode === "pressurefront") return getPressureFrontTarget(index, count, time);
  if (mode === "sanddunes") return getSandDunesTarget(index, count, time);
  if (mode === "erosion") return getErosionTarget(index, count, time);
  if (mode === "sedimentation") return getSedimentationTarget(index, count, time);
  if (mode === "crystalgrowth") return getCrystalGrowthTarget(index, count, time);
  if (mode === "tectonic") return getTectonicTarget(index, count, time);
  if (mode === "quantumtunnel") return getQuantumTunnelTarget(index, count, time);
  if (mode === "probabilitycloud") return getProbabilityCloudTarget(index, count, time);
  if (mode === "entanglement") return getEntanglementTarget(index, count, time);
  if (mode === "quantumwell") return getQuantumWellTarget(index, count, time);
  if (mode === "waveparticle") return getWaveParticleTarget(index, count, time);
  if (mode === "warpfield") return getWarpFieldTarget(index, count, time);
  if (mode === "nanobot") return getNanobotAssemblyTarget(index, count, time);
  if (mode === "teleportation") return getTeleportationTarget(index, count, time);
  if (mode === "plasma") return getPlasmaContainmentTarget(index, count, time);
  if (mode === "swarmintelligence") return getSwarmIntelligenceTarget(index, count, time);
  if (mode === "dysonswarm") return getDysonSwarmTarget(index, count, time);
  if (mode === "solarsystem") return getSolarSystemTarget(index, count, time);
  if (mode === "spiralgalaxy") return getSpiralGalaxyTarget(index, count, time);
  if (mode === "blackholelensing") return getBlackHoleLensingTarget(index, count, time);
  if (mode === "cometpassage") return getCometPassageTarget(index, count, time);
  if (mode === "pulsar") return getPulsarTarget(index, count, time);
  if (mode === "planetformation") return getPlanetFormationTarget(index, count, time);
  return null;
}

export { getAuroraTarget, getBridgeTarget, getCacheWarmupTarget, getClockworkTarget, getConsensusTarget, getContextWindowTarget, getCosmicWebTarget, getCountdownTarget, getDnaTarget, getEclipseTarget, getEmergentTarget, getExpandedCategoryTarget, getFissionTarget, getGarbageCollectorTarget, getHeartbeatTarget, getMolecularDockingTarget, getNebulaTarget, getNeuralPulseTarget, getNeuralTarget, getOrchestraTarget, getRainTarget, getStrangeAttractorTarget, getTessellationTarget, getVectorFieldTarget, getVineTarget, seeded, hexToRgb, hexToRgbArray };
