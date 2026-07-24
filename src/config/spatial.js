export const SPATIAL_ZOOM_MIN = 0.15;
export const SPATIAL_ZOOM_MAX = 3.5;

export function clampSpatialZoom(value) {
  return Math.max(SPATIAL_ZOOM_MIN, Math.min(SPATIAL_ZOOM_MAX, value));
}
