// Tiny standalone canvas draw functions for the landing page's live mode previews
// (LandingApp.jsx's ParticlePreview) — reuse the same target formulas as the real
// gallery/lab so the preview matches what you'd actually see, at a much smaller scale.
import { getTarget } from "../simulations/particleTargetRouter";
import { seeded, writeGalaxyPosition } from "../simulations/spatialFormulas";

const BLOOM_PARTICLE_COUNT = 70;
const GALAXY_PARTICLE_COUNT = 90;

export function createBloomPreviewDraw(inkColor) {
  return (context, width, height, time) => {
    const size = Math.min(width, height);
    const centerX = width / 2;
    const centerY = height / 2;
    context.fillStyle = inkColor;
    for (let index = 0; index < BLOOM_PARTICLE_COUNT; index += 1) {
      const target = getTarget("bloom", index, BLOOM_PARTICLE_COUNT, time);
      const x = centerX + target.x * size * 0.42;
      const y = centerY + target.y * size * 0.42;
      const radius = 1 + target.depth * 2.2;
      context.globalAlpha = 0.35 + target.depth * 0.5;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  };
}

// Full-bleed ambient field for the hero background: particles seeded across the
// entire canvas (not confined to a centered square like the mode previews above)
// so it reads as an instrument-panel starfield behind the headline, at any aspect ratio.
export function createFieldPreviewDraw(inkColor, accentColor, count = 170) {
  const seeds = new Float32Array(count * 4);
  for (let index = 0; index < count; index += 1) {
    const offset = index * 4;
    seeds[offset] = seeded(index, 21);
    seeds[offset + 1] = seeded(index, 22);
    seeds[offset + 2] = seeded(index, 23);
    seeds[offset + 3] = seeded(index, 24);
  }

  return (context, width, height, time) => {
    for (let index = 0; index < count; index += 1) {
      const offset = index * 4;
      const baseX = seeds[offset] * width;
      const baseY = seeds[offset + 1] * height;
      const depth = seeds[offset + 3];
      const orbitRadius = 8 + seeds[offset + 2] * 34;
      const angle = seeds[offset + 2] * Math.PI * 2 + time * (0.08 + depth * 0.14);
      const x = baseX + Math.cos(angle) * orbitRadius;
      const y = baseY + Math.sin(angle) * orbitRadius * 0.6;
      context.fillStyle = index % 6 === 0 ? accentColor : inkColor;
      context.globalAlpha = 0.15 + depth * 0.5;
      context.beginPath();
      context.arc(x, y, 0.8 + depth * 1.7, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  };
}

export function createGalaxyPreviewDraw(inkColor) {
  const seeds = new Float32Array(GALAXY_PARTICLE_COUNT * 3);
  const positions = new Float32Array(GALAXY_PARTICLE_COUNT * 3);
  for (let index = 0; index < GALAXY_PARTICLE_COUNT; index += 1) {
    const offset = index * 3;
    seeds[offset] = seeded(index, 1);
    seeds[offset + 1] = seeded(index, 2);
    seeds[offset + 2] = seeded(index, 3);
  }
  const tiltX = -0.5;
  const cosTilt = Math.cos(tiltX);
  const sinTilt = Math.sin(tiltX);

  return (context, width, height, time) => {
    const size = Math.min(width, height);
    const centerX = width / 2;
    const centerY = height / 2;
    const scale = size * 0.15;
    const rotation = time * 0.12;
    const cosRotation = Math.cos(rotation);
    const sinRotation = Math.sin(rotation);

    context.fillStyle = inkColor;
    for (let index = 0; index < GALAXY_PARTICLE_COUNT; index += 1) {
      const offset = index * 3;
      writeGalaxyPosition(positions, offset, index, time * 0.3, seeds);
      const x = positions[offset];
      const y = positions[offset + 1];
      const z = positions[offset + 2];
      const rotatedX = x * cosRotation + z * sinRotation;
      const rotatedZ = -x * sinRotation + z * cosRotation;
      const rotatedY = y * cosTilt - rotatedZ * sinTilt;
      const depth = y * sinTilt + rotatedZ * cosTilt;
      const screenX = centerX + rotatedX * scale;
      const screenY = centerY - rotatedY * scale;
      const pointRadius = Math.max(0.6, 1.8 - depth * 0.3);
      context.globalAlpha = Math.min(1, Math.max(0.2, (depth + 2.5) / 5));
      context.beginPath();
      context.arc(screenX, screenY, pointRadius, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  };
}

export function createOrigamiPreviewDraw(inkColor, accentColor) {
  return (context, width, height) => {
    const size = Math.min(width, height);
    const centerX = width / 2;
    const centerY = height / 2;
    const drawFacet = (points, fill, alpha = 1) => {
      context.fillStyle = fill;
      context.globalAlpha = alpha;
      context.beginPath();
      points.forEach(([x, y], index) => {
        const px = centerX + x * size;
        const py = centerY + y * size;
        if (index === 0) context.moveTo(px, py);
        else context.lineTo(px, py);
      });
      context.closePath();
      context.fill();
    };

    drawFacet([[-0.03, -0.02], [-0.7, -0.38], [-0.43, 0.08]], accentColor);
    drawFacet([[-0.03, -0.02], [-0.43, 0.08], [-0.18, 0.2]], inkColor, 0.72);
    drawFacet([[0.02, -0.02], [0.68, -0.36], [0.44, 0.08]], "#f8eee0");
    drawFacet([[0.02, -0.02], [0.44, 0.08], [0.19, 0.2]], inkColor, 0.48);
    drawFacet([[-0.19, 0.2], [0.19, 0.2], [0, -0.15]], accentColor, 0.82);
    drawFacet([[0.05, -0.06], [0.22, -0.47], [0.31, -0.53], [0.18, 0.03]], "#f8eee0");
    drawFacet([[0.28, -0.5], [0.38, -0.54], [0.31, -0.43]], accentColor);
    drawFacet([[-0.05, 0.16], [-0.34, 0.43], [-0.16, 0.15]], inkColor, 0.62);
    context.globalAlpha = 1;
  };
}
