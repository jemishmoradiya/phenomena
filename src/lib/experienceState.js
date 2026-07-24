// Persistence, deep-linking, and favorites/recents helpers shared by the gallery
// and 3D lab: localStorage read/write (versioned, private-browsing-safe) and URL
// query param sync so a mode/palette/settings choice survives reload and can be shared.
const STORAGE_VERSION = 1;

/** Reads and validates a versioned localStorage entry, falling back to `fallback` if missing/stale/unavailable. */
export function readExperience(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const value = JSON.parse(window.localStorage.getItem(key));
    return value?.version === STORAGE_VERSION ? { ...fallback, ...value.data } : fallback;
  } catch {
    return fallback;
  }
}

export function writeExperience(key, data) {
  try {
    window.localStorage.setItem(key, JSON.stringify({ version: STORAGE_VERSION, data }));
  } catch {
    // Storage may be unavailable in private browsing; the live experience still works.
  }
}

export function readUrlChoice(name, validValues) {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get(name);
  return validValues.has(value) ? value : null;
}

export function syncExperienceUrl(values, method = "replaceState") {
  const url = new URL(window.location.href);
  Object.entries(values).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  });
  window.history[method]({}, "", `${url.pathname}${url.search}${url.hash}`);
}

export function updateRecent(current, id, limit = 6) {
  return [id, ...current.filter((item) => item !== id)].slice(0, limit);
}
