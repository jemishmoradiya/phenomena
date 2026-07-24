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
