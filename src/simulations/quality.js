// Maps the user-facing `quality` setting to a devicePixelRatio cap and a particle-count
// multiplier. Every canvas/WebGL renderer should route DPR and particle count through
// these instead of hardcoding values or reading window.devicePixelRatio directly.
const QUALITY_PROFILES = {
  eco: { dpr: 1, particles: 0.65 },
  auto: { dpr: 3, particles: 1 },
  high: { dpr: 3.5, particles: 1.25 },
};

const MAX_RENDER_DIMENSION = 4096;
const MAX_RENDER_PIXELS = 10_000_000;

/** Resolves "auto" to a lighter profile on low-memory/low-core/small-screen devices. */
export function getQualityProfile(quality = "auto") {
  if (quality !== "auto" || typeof navigator === "undefined") return QUALITY_PROFILES[quality] ?? QUALITY_PROFILES.auto;
  const lowMemory = navigator.deviceMemory && navigator.deviceMemory <= 4;
  const lowConcurrency = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
  const compactScreen = typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches;
  return lowMemory || lowConcurrency
    ? { dpr: compactScreen ? 1.5 : 2, particles: 0.7 }
    : { dpr: 3, particles: compactScreen ? 0.85 : 1 };
}

/** DPR to render at for the given quality setting, capped per QUALITY_PROFILES. */
export function getRenderDpr(quality = "auto", nativeDpr = window.devicePixelRatio || 1) {
  if (quality === "eco") return 1;
  if (quality === "high") return Math.min(Math.max(2, nativeDpr * 1.25), QUALITY_PROFILES.high.dpr);
  return Math.min(nativeDpr, getQualityProfile("auto").dpr);
}

/** Like getRenderDpr, but also clamps so width*height*dpr² can't produce an oversized render target. */
export function getSafeRenderDpr(quality, width, height, nativeDpr = window.devicePixelRatio || 1) {
  const requestedDpr = getRenderDpr(quality, nativeDpr);
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const dimensionDpr = MAX_RENDER_DIMENSION / Math.max(safeWidth, safeHeight);
  const areaDpr = Math.sqrt(MAX_RENDER_PIXELS / (safeWidth * safeHeight));
  return Math.max(0.5, Math.min(requestedDpr, dimensionDpr, areaDpr));
}
