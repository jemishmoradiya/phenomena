export const TAU = Math.PI * 2;

export function seeded(index, salt = 0) {
  const value = Math.sin(index * 91.733 + salt * 37.19) * 43758.5453;
  return value - Math.floor(value);
}

export function writeGalaxyPosition(target, offset, index, time, seeds) {
  const arm = index % 4;
  const radius = 0.06 + seeds[offset] ** 0.62 * 2.25;
  const angle = (arm / 4) * TAU + radius * 2.65 + time * (0.1 + (1 - radius / 2.4) * 0.16);
  const scatter = (seeds[offset + 1] - 0.5) * (0.08 + radius * 0.08);
  target[offset] = Math.cos(angle) * radius - Math.sin(angle) * scatter;
  target[offset + 1] = (seeds[offset + 2] - 0.5) * 0.28 * (1 - radius / 2.7);
  target[offset + 2] = Math.sin(angle) * radius + Math.cos(angle) * scatter;
}
