// Top-level app shell for the 3D particle lab, mounted at /spatial.html (src/spatial-main.jsx).
// Owns the 34-scene, nine-family UI and passes settings down to the imperative
// WebGL renderer in simulations/ThreeParticleLab.jsx, which is lazy-loaded so
// Three.js stays out of the main 2D gallery bundle.
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "./lib/utils";
import BottomSheet from "./components/BottomSheet";
import ErrorBoundary from "./components/ErrorBoundary";
import DimensionSwitch from "./components/DimensionSwitch";
import { Mark, PaletteGrid, SectionLabel, Slider } from "./components/StudioControls";
import { Icon } from "./components/StudioIcons";
import { PremiumTabs, PremiumTabsContent, PremiumTabsList, PremiumTabsTrigger } from "./components/PremiumTabs";
import { clampSpatialZoom, SPATIAL_ZOOM_MAX, SPATIAL_ZOOM_MIN } from "./config/spatial";
import { PALETTES, UI_THEME } from "./config/studio";
import { getQualityProfile } from "./simulations/quality";
import { readExperience, readUrlChoice, syncExperienceUrl, updateRecent, writeExperience } from "./lib/experienceState";

const ThreeParticleLab = lazy(() => import("./simulations/ThreeParticleLab"));

const SPATIAL_MODES = [
  { id: "orbital", group: "cosmos", label: "Orbital Atlas", note: "nested particle systems moving through inclined orbital planes" },
  { id: "galaxy", group: "cosmos", label: "Galactic Volume", note: "four stellar arms turning through a deep three-dimensional field" },
  { id: "blackhole", group: "cosmos", label: "Black Hole Engine", note: "an accretion disk feeding opposing relativistic jets" },
  { id: "nebula", group: "cosmos", label: "Nebula Volume", note: "stellar material gathering inside overlapping spatial clouds" },
  { id: "solarsystem3d", group: "cosmos", label: "Solar System", note: "the Sun, eight planets, moons, orbit trails, and an asteroid belt" },
  { id: "lunarorbit3d", group: "cosmos", label: "Earth & Moon", note: "a particle Earth and Moon moving through their shared orbital system" },
  { id: "satellites3d", group: "cosmos", label: "Satellite Network", note: "artificial satellites distributed across inclined orbital shells" },
  { id: "stellar3d", group: "cosmos", label: "Stellar Neighborhood", note: "nearby particle stars suspended through a deep local star field" },
  { id: "spacestation3d", group: "cosmos", label: "Space Station", note: "a modular orbital outpost receiving a particle-built docking craft" },
  { id: "starshiplaunch3d", group: "cosmos", label: "Starship Launch", note: "liftoff, exhaust, stage separation, and a returning particle booster" },
  { id: "quantum", group: "quantum", label: "Quantum Cloud", note: "probability lobes occupying a rotating spatial volume" },
  { id: "entangled", group: "quantum", label: "Entangled Pairs", note: "mirrored particles preserving one correlated spatial state" },
  { id: "wavelattice", group: "quantum", label: "Wave Lattice", note: "a three-dimensional field carrying a coherent travelling wave" },
  { id: "warp", group: "fields", label: "Warp Corridor", note: "particles accelerating through a responsive depth tunnel" },
  { id: "magnetic", group: "fields", label: "Magnetic Flux", note: "particles tracing nested dipole field lines in space" },
  { id: "vortex3d", group: "fields", label: "Vector Vortex", note: "five particle streams winding through a vertical flow field" },
  { id: "dna3d", group: "structures", label: "DNA Helix", note: "paired particle strands connected across a spatial backbone" },
  { id: "mobius3d", group: "structures", label: "Möbius Ribbon", note: "one particle surface returning through a half twist" },
  { id: "crystal3d", group: "structures", label: "Crystal Lattice", note: "ordered particles breathing inside a cubic mineral structure" },
  { id: "neural3d", group: "living", label: "Neural Volume", note: "signals travelling through a distributed three-dimensional network" },
  { id: "cellular3d", group: "living", label: "Cellular Bloom", note: "soft particle membranes gathering and dividing in space" },
  { id: "vine3d", group: "living", label: "Vine Growth", note: "a climbing particle structure extending branches around its stem" },
  { id: "fluidvortex3d", group: "fluid", label: "Fluid Vortex", note: "layered particle currents tightening through a vertical funnel" },
  { id: "dropletfusion3d", group: "fluid", label: "Droplet Fusion", note: "three volumetric droplets merging through surface tension" },
  { id: "ripplesphere3d", group: "fluid", label: "Ripple Sphere", note: "travelling waves displacing a spherical particle surface" },
  { id: "clockwork3d", group: "mechanical", label: "Clockwork Array", note: "interlocked particle gears preserving coordinated timing" },
  { id: "bridge3d", group: "mechanical", label: "Bridge Tension", note: "decks, towers, and particle cables balancing spatial load" },
  { id: "orchestra3d", group: "mechanical", label: "Orchestra Field", note: "instrument sections pulsing through a dimensional arrangement" },
  { id: "photonlens3d", group: "light", label: "Photon Lens", note: "volumetric particle rays converging through a precise focus" },
  { id: "doubleslit3d", group: "light", label: "Double Slit Volume", note: "particle paths expanding into a spatial interference field" },
  { id: "caustic3d", group: "light", label: "Caustic Volume", note: "layered photon sheets folding into concentrated surfaces" },
  { id: "dyson3d", group: "future", label: "Dyson Swarm", note: "particle collectors assembling across nested stellar shells" },
  { id: "teleport3d", group: "future", label: "Teleportation", note: "a volumetric structure dissolving and rebuilding elsewhere" },
  { id: "plasmatorus3d", group: "future", label: "Plasma Torus", note: "charged particles circulating inside magnetic containment" },
];
const SPATIAL_CATEGORIES = [
  { id: "cosmos", label: "Cosmos" },
  { id: "quantum", label: "Quantum" },
  { id: "fields", label: "Fields" },
  { id: "structures", label: "Structures" },
  { id: "living", label: "Living" },
  { id: "fluid", label: "Fluid" },
  { id: "mechanical", label: "Mechanical" },
  { id: "light", label: "Light" },
  { id: "future", label: "Future" },
];
const ZOOM_PRESETS = [
  { label: "Wide", value: 0.4 },
  { label: "Default", value: 1 },
  { label: "Close", value: 3 },
];
const SPATIAL_STORAGE_KEY = "phenomena:3d:v1";
const SPATIAL_MODE_IDS = new Set(SPATIAL_MODES.map((item) => item.id));
const SPATIAL_CATEGORY_IDS = new Set(SPATIAL_CATEGORIES.map((item) => item.id));
const PALETTE_IDS = new Set(PALETTES.map((item) => item.id));
const DEFAULT_SPATIAL_SETTINGS = {
  autoRotate: true,
  density: 2200,
  interactionMode: "orbit",
  paused: false,
  pointerStrength: 1,
  pointSize: 1,
  quality: "auto",
  speed: 1,
  viewRevision: 0,
  zoom: 1,
};

function SpatialPresetLibrary({ category, favorites, mode, onCategoryChange, onSelectMode, recent, toggleFavorite }) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const categoryModes = SPATIAL_MODES.filter((item) => item.group === category);
  const visibleModes = SPATIAL_MODES.filter((item) => {
    const matchesQuery = !normalizedQuery || `${item.label} ${item.note}`.toLowerCase().includes(normalizedQuery);
    if (!matchesQuery) return false;
    if (filter === "favorites") return favorites.includes(item.id);
    if (filter === "recent") return recent.includes(item.id);
    return normalizedQuery ? true : categoryModes.includes(item);
  }).sort((a, b) => filter === "recent" ? recent.indexOf(a.id) - recent.indexOf(b.id) : 0);

  return (
    <nav className="p-4" aria-label="Spatial phenomenon presets">
      <div className="mb-5 flex items-center justify-between px-1">
        <div>
          <p className="text-sm font-semibold">Spatial phenomena</p>
          <p className="mt-0.5 text-[11px] text-[var(--ui-muted)]">Choose a system to observe</p>
        </div>
        <span className="rounded-full border border-[var(--ui-border)] px-2 py-1 text-[9px] tabular-nums text-[var(--ui-muted)]">{SPATIAL_MODES.length} SYSTEMS</span>
      </div>

      <label className="mb-3 flex items-center gap-2 rounded-xl border border-[var(--ui-border)] bg-[var(--page-bg)]/40 px-3">
        <Icon name="search" className="size-3.5 text-[var(--ui-muted)]" />
        <span className="sr-only">Search 3D phenomena</span>
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search all 3D phenomena…" className="min-w-0 flex-1 bg-transparent py-2.5 text-xs outline-none placeholder:text-[var(--ui-muted)]" />
      </label>
      <div className="mb-4 grid grid-cols-3 gap-1.5" role="group" aria-label="3D library filter">
        {[["all", "All"], ["favorites", `Favorites ${favorites.length}`], ["recent", "Recent"]].map(([id, label]) => (
          <button key={id} type="button" onClick={() => setFilter(id)} aria-pressed={filter === id} className={cn("control-button rounded-lg border px-2 py-2 text-[9px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-ink)]", filter === id ? "border-[var(--ui-ink)] bg-[var(--ui-ink)] text-[var(--page-bg)]" : "border-[var(--ui-border)] text-[var(--ui-muted)]")}>{label}</button>
        ))}
      </div>

      <PremiumTabs value={category} onValueChange={(value) => { setFilter("all"); setQuery(""); onCategoryChange(value); }}>
        <PremiumTabsList className="mb-5 flex flex-wrap items-center gap-1.5 border-transparent bg-transparent p-0" aria-label="Spatial phenomenon family">
          {SPATIAL_CATEGORIES.map((item) => (
            <PremiumTabsTrigger
              key={item.id}
              value={item.id}
              activeValue={category}
              layoutId="spatial-family-indicator"
              indicatorClassName="rounded-full"
              className="shrink-0 rounded-full border border-[var(--ui-border)]/70 px-3 py-1.5 text-[10px]"
            >
              {item.label}
            </PremiumTabsTrigger>
          ))}
        </PremiumTabsList>
        <PremiumTabsContent value={category}>
          <div className="mb-3 flex items-center justify-between px-1">
            <p className="text-[10px] font-semibold uppercase text-[var(--ui-muted)]">{SPATIAL_CATEGORIES.find((item) => item.id === category)?.label}</p>
            <span className="text-[9px] tabular-nums text-[var(--ui-muted)]">{String(visibleModes.length).padStart(2, "0")}</span>
          </div>
          <div className="system-list grid h-96 content-start gap-1 overflow-y-auto pr-1">
            {visibleModes.length === 0 ? <div className="grid place-items-center gap-2 rounded-xl border border-dashed border-[var(--ui-border)] px-4 py-8 text-center"><p className="text-xs font-semibold">No phenomena found</p><button type="button" onClick={() => { setFilter("all"); setQuery(""); }} className="text-[10px] font-semibold underline underline-offset-4">Show all</button></div> : null}
            {visibleModes.map((item, index) => (
              <div key={item.id} className={cn("group flex min-w-0 items-center rounded-xl border transition-colors duration-150", mode === item.id ? "border-[var(--ui-ink)] bg-[var(--ui-ink)] text-[var(--page-bg)]" : "border-transparent text-[var(--ui-muted)] hover:border-[var(--ui-border)]")}>
                <button type="button" onClick={() => onSelectMode(item.id)} className="control-button flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2.5 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-ink)]" aria-pressed={mode === item.id}>
                  <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg border", mode === item.id ? "border-[var(--page-bg)]/25 bg-[var(--page-bg)]/10" : "border-[var(--ui-border)] bg-[var(--page-bg)]/40")}><Icon name="spatial" className="size-4" /></span>
                  <span className="grid min-w-0 flex-1 gap-0.5"><span className={cn("truncate text-[11px] font-semibold", mode === item.id ? "text-[var(--page-bg)]" : "text-[var(--ui-ink)]")}>{item.label}</span><span className={cn("truncate text-[9px]", mode === item.id ? "text-[var(--page-bg)]/65" : "text-[var(--ui-muted)]")}>{item.note}</span></span>
                  <span className="shrink-0 text-[9px] tabular-nums opacity-45">{String(index + 1).padStart(2, "0")}</span>
                </button>
                <button type="button" onClick={() => toggleFavorite(item.id)} className="control-button mr-1 grid size-9 shrink-0 place-items-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current" aria-label={`${favorites.includes(item.id) ? "Remove" : "Add"} ${item.label} ${favorites.includes(item.id) ? "from" : "to"} favorites`} aria-pressed={favorites.includes(item.id)}><Icon name={favorites.includes(item.id) ? "starFilled" : "star"} className="size-3.5" /></button>
              </div>
            ))}
          </div>
        </PremiumTabsContent>
      </PremiumTabs>
    </nav>
  );
}

function SpatialTuningPanel({ onRandomize, onReset, palette, resetView, setPaletteId, setSettings, settings }) {
  const updateSetting = (key, value) => setSettings((current) => ({
    ...current,
    [key]: typeof value === "function" ? value(current[key]) : value,
  }));

  return (
    <section className="p-4 sm:p-5" aria-label="Spatial tuning controls">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="relative grid size-10 place-items-center rounded-xl bg-[var(--ui-ink)] text-[var(--page-bg)]">
            <Icon name="spatial" className="size-5" />
            <span className="absolute -right-1 -top-1 size-2.5 rounded-full border-2 border-[var(--ui-panel)] bg-emerald-500" />
          </span>
          <div>
            <p className="text-sm font-semibold">Spatial studio</p>
            <p className="mt-0.5 text-[11px] text-[var(--ui-muted)]">Live 3D particle instrument</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => updateSetting("paused", !settings.paused)}
          className="control-button grid size-10 place-items-center rounded-full border border-[var(--ui-border)] bg-[var(--page-bg)]/40 transition-transform duration-150 active:scale-[0.94] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-ink)]"
          aria-label={settings.paused ? "Play 3D animation" : "Pause 3D animation"}
          title={settings.paused ? "Play" : "Pause"}
        >
          <Icon name={settings.paused ? "play" : "pause"} />
        </button>
      </div>

      <div className="mt-6">
        <SectionLabel number="01">Palette</SectionLabel>
        <PaletteGrid ariaLabel="3D color palette" palette={palette} setPaletteId={setPaletteId} />
      </div>

      <div className="mt-6">
        <SectionLabel number="02">Dynamics</SectionLabel>
        <div className="grid gap-2">
          <Slider label="Speed" value={settings.speed} min="0.25" max="2" step="0.05" display={`${settings.speed.toFixed(2)}×`} onChange={(value) => updateSetting("speed", value)} />
          <Slider label="Particles" value={settings.density} min="800" max="4000" step="200" display={settings.density.toLocaleString()} onChange={(value) => updateSetting("density", value)} />
          <Slider label="Particle size" value={settings.pointSize} min="0.65" max="2.2" step="0.05" display={`${settings.pointSize.toFixed(2)}×`} onChange={(value) => updateSetting("pointSize", value)} />
        </div>
      </div>

      <div className="mt-6">
        <SectionLabel number="03">Camera</SectionLabel>
        <div className="grid gap-2">
          <Slider label="Zoom" value={settings.zoom} min={SPATIAL_ZOOM_MIN} max={SPATIAL_ZOOM_MAX} step="0.05" display={`${settings.zoom.toFixed(2)}×`} onChange={(value) => updateSetting("zoom", value)} />
          <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Camera zoom presets">
            {ZOOM_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => updateSetting("zoom", preset.value)}
                className={cn(
                  "control-button rounded-lg border px-2 py-2 text-[9px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-ink)]",
                  settings.zoom === preset.value ? "border-[var(--ui-ink)] bg-[var(--ui-ink)] text-[var(--page-bg)]" : "border-[var(--ui-border)] text-[var(--ui-muted)]",
                )}
                aria-pressed={settings.zoom === preset.value}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="Drag navigation mode">
            {[
              { id: "orbit", label: "Orbit" },
              { id: "pan", label: "Pan" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => updateSetting("interactionMode", item.id)}
                className={cn(
                  "control-button rounded-xl border px-2 py-2.5 text-[9px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-ink)]",
                  settings.interactionMode === item.id ? "border-[var(--ui-ink)] bg-[var(--ui-ink)] text-[var(--page-bg)]" : "border-[var(--ui-border)] text-[var(--ui-muted)]",
                )}
                aria-pressed={settings.interactionMode === item.id}
              >
                Drag to {item.label}
              </button>
            ))}
          </div>
          <Slider label="Strength" value={settings.pointerStrength} min="0" max="1.5" step="0.05" display={`${settings.pointerStrength.toFixed(2)}×`} onChange={(value) => updateSetting("pointerStrength", value)} />
          <button
            type="button"
            onClick={() => updateSetting("autoRotate", !settings.autoRotate)}
            className={cn(
              "control-button flex items-center justify-between rounded-xl border px-3 py-2.5 text-[10px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-ink)]",
              settings.autoRotate ? "border-[var(--ui-ink)] bg-[var(--ui-ink)] text-[var(--page-bg)]" : "border-[var(--ui-border)] text-[var(--ui-muted)]",
            )}
            aria-pressed={settings.autoRotate}
          >
            Auto orbit
            <span className="text-[9px] uppercase opacity-70">{settings.autoRotate ? "On" : "Off"}</span>
          </button>
        </div>
      </div>

      <div className="mt-6">
        <SectionLabel number="04">Performance</SectionLabel>
        <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="3D render quality">
          {[{ id: "eco", label: "Eco" }, { id: "auto", label: "Auto" }, { id: "high", label: "Crisp" }].map((item) => (
            <button key={item.id} type="button" onClick={() => updateSetting("quality", item.id)} className={cn("control-button rounded-lg border px-2 py-2.5 text-[10px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-ink)]", settings.quality === item.id ? "border-[var(--ui-ink)] bg-[var(--ui-ink)] text-[var(--page-bg)]" : "border-[var(--ui-border)] text-[var(--ui-muted)]")} aria-pressed={settings.quality === item.id}>{item.label}</button>
          ))}
        </div>
        <p className="mt-2 text-pretty text-[9px] leading-relaxed text-[var(--ui-muted)]">Auto balances sharpness and GPU load. Crisp uses the display’s full pixel density; Eco favors battery life.</p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2">
        <button type="button" onClick={resetView} className="control-button flex items-center justify-between rounded-xl border border-[var(--ui-border)] px-3 py-3 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-ink)]">Reset camera<Icon name="reset" /></button>
        <button type="button" onClick={onReset} className="control-button flex items-center justify-between rounded-xl border border-[var(--ui-border)] px-3 py-3 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-ink)]">Reset all<Icon name="reset" /></button>
        <button type="button" onClick={onRandomize} className="control-button col-span-2 flex items-center justify-between rounded-xl bg-[var(--ui-ink)] px-4 py-3 text-xs font-semibold text-[var(--page-bg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-ink)]">Surprise me<Icon name="shuffle" /></button>
      </div>
    </section>
  );
}

function SpatialControlDock({ category, favorites, mode, onCategoryChange, onRandomize, onReset, onSelectMode, palette, recent, resetView, setPaletteId, setSettings, settings, toggleFavorite }) {
  const [panel, setPanel] = useState("phenomena");

  return (
    <PremiumTabs
      value={panel}
      onValueChange={setPanel}
      className="overflow-hidden rounded-3xl border border-[var(--ui-border)] bg-[var(--ui-panel)] shadow-sm"
    >
      <div className="border-b border-[var(--ui-border)] p-2">
        <PremiumTabsList className="grid-cols-2 border-transparent bg-[var(--page-bg)]/55" aria-label="Spatial studio workspace">
          <PremiumTabsTrigger value="phenomena" activeValue={panel} activeClassName="text-[var(--page-bg)]" indicatorClassName="border-[var(--ui-ink)] bg-[var(--ui-ink)] shadow-none" layoutId="spatial-workspace-tab-indicator">
            <Icon name="systems" className="size-4" />
            Phenomena
          </PremiumTabsTrigger>
          <PremiumTabsTrigger value="tuning" activeValue={panel} activeClassName="text-[var(--page-bg)]" indicatorClassName="border-[var(--ui-ink)] bg-[var(--ui-ink)] shadow-none" layoutId="spatial-workspace-tab-indicator">
            <Icon name="tuning" className="size-4" />
            Tuning
          </PremiumTabsTrigger>
        </PremiumTabsList>
      </div>
      <PremiumTabsContent value="phenomena">
        <SpatialPresetLibrary category={category} favorites={favorites} mode={mode} onCategoryChange={onCategoryChange} onSelectMode={onSelectMode} recent={recent} toggleFavorite={toggleFavorite} />
      </PremiumTabsContent>
      <PremiumTabsContent value="tuning">
        <SpatialTuningPanel onRandomize={onRandomize} onReset={onReset} palette={palette} resetView={resetView} setPaletteId={setPaletteId} setSettings={setSettings} settings={settings} />
      </PremiumTabsContent>
    </PremiumTabs>
  );
}

function getInitialSpatialExperience() {
  const stored = readExperience(SPATIAL_STORAGE_KEY, {
    category: "cosmos",
    favorites: [],
    lastMode: "orbital",
    paletteId: "obsidian",
    recent: [],
    settings: DEFAULT_SPATIAL_SETTINGS,
  });
  const urlMode = readUrlChoice("scene", SPATIAL_MODE_IDS);
  const urlCategory = readUrlChoice("category", SPATIAL_CATEGORY_IDS);
  const modeCategory = SPATIAL_MODES.find((item) => item.id === urlMode)?.group;
  return {
    ...stored,
    category: modeCategory ?? urlCategory ?? stored.category,
    mode: urlMode,
    paletteId: readUrlChoice("palette", PALETTE_IDS) ?? stored.paletteId,
    settings: {
      ...DEFAULT_SPATIAL_SETTINGS,
      ...stored.settings,
      paused: false,
      zoom: clampSpatialZoom(stored.settings?.zoom ?? DEFAULT_SPATIAL_SETTINGS.zoom),
    },
  };
}

export default function SpatialApp() {
  const initialExperience = useRef(null);
  if (!initialExperience.current) initialExperience.current = getInitialSpatialExperience();
  const [category, setCategory] = useState(initialExperience.current.category);
  const [isControlsOpen, setIsControlsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPseudoFullscreen, setIsPseudoFullscreen] = useState(false);
  const [mode, setMode] = useState(initialExperience.current.mode);
  const [paletteId, setPaletteId] = useState(initialExperience.current.paletteId);
  const [settings, setSettings] = useState(initialExperience.current.settings);
  const [favorites, setFavorites] = useState(initialExperience.current.favorites);
  const [recent, setRecent] = useState(initialExperience.current.recent);
  const [rendererPreference, setRendererPreference] = useState("auto");
  const [rendererBackend, setRendererBackend] = useState("idle");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const stageRef = useRef(null);
  const palette = PALETTES.find((item) => item.id === paletteId) ?? PALETTES[0];
  const activeMode = SPATIAL_MODES.find((item) => item.id === mode) ?? null;
  const activeCategory = SPATIAL_CATEGORIES.find((item) => item.id === category) ?? SPATIAL_CATEGORIES[0];
  const effectiveDensity = Math.round(settings.density * getQualityProfile(settings.quality).particles);
  const selectMode = (value) => {
    const nextCategory = SPATIAL_MODES.find((entry) => entry.id === value)?.group ?? category;
    if (value !== mode) syncExperienceUrl({ category: nextCategory, palette: paletteId, scene: value }, "pushState");
    setCategory(nextCategory);
    setMode(value);
    setRecent((current) => updateRecent(current, value));
    setRendererPreference("auto");
    setIsControlsOpen(false);
  };
  const selectCategory = (value) => {
    const firstMode = SPATIAL_MODES.find((entry) => entry.group === value)?.id ?? null;
    if (firstMode) selectMode(firstMode);
  };
  const toggleFavorite = (id) => setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const updateSetting = (key, value) => setSettings((current) => ({
    ...current,
    [key]: typeof value === "function" ? value(current[key]) : value,
  }));
  const resetView = () => setSettings((current) => ({
    ...current,
    autoRotate: true,
    interactionMode: "orbit",
    pointerStrength: 1,
    viewRevision: current.viewRevision + 1,
    zoom: 1,
  }));
  const resetAll = () => {
    setPaletteId("obsidian");
    setSettings((current) => ({ ...DEFAULT_SPATIAL_SETTINGS, viewRevision: current.viewRevision + 1 }));
    setRendererPreference("auto");
  };
  const randomize = () => {
    selectMode(SPATIAL_MODES[Math.floor(Math.random() * SPATIAL_MODES.length)].id);
    setPaletteId(PALETTES[Math.floor(Math.random() * PALETTES.length)].id);
  };
  const fullscreenActive = isFullscreen || isPseudoFullscreen;
  const themeStyle = {
    "--page-bg": UI_THEME.background,
    "--ui-panel": UI_THEME.panel,
    "--ui-ink": UI_THEME.ink,
    "--ui-muted": UI_THEME.muted,
    "--ui-border": UI_THEME.border,
    backgroundColor: UI_THEME.background,
  };
  const stageStyle = {
    "--stage-bg": palette.background,
    "--stage-ink": palette.stageInk,
    "--stage-muted": palette.stageMuted,
    backgroundColor: palette.background,
  };

  useEffect(() => {
    writeExperience(SPATIAL_STORAGE_KEY, { category, favorites, lastMode: mode ?? initialExperience.current.lastMode, paletteId, recent, settings });
    syncExperienceUrl({ category, palette: paletteId, scene: mode });
  }, [category, favorites, mode, paletteId, recent, settings]);

  useEffect(() => {
    const handleHistory = () => {
      const nextMode = readUrlChoice("scene", SPATIAL_MODE_IDS);
      const nextCategory = readUrlChoice("category", SPATIAL_CATEGORY_IDS);
      const nextPalette = readUrlChoice("palette", PALETTE_IDS);
      setMode(nextMode);
      if (nextCategory) setCategory(nextCategory);
      if (nextPalette) setPaletteId(nextPalette);
    };
    window.addEventListener("popstate", handleHistory);
    return () => window.removeEventListener("popstate", handleHistory);
  }, []);

  useEffect(() => {
    if (!mode || window.localStorage.getItem("phenomena:3d-onboarding")) return;
    setShowOnboarding(true);
  }, [mode]);

  useEffect(() => {
    const syncFullscreenState = () => {
      const fullscreenElement = document.fullscreenElement ?? document.webkitFullscreenElement;
      setIsFullscreen(fullscreenElement === stageRef.current);
    };
    document.addEventListener("fullscreenchange", syncFullscreenState);
    document.addEventListener("webkitfullscreenchange", syncFullscreenState);
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
      document.removeEventListener("webkitfullscreenchange", syncFullscreenState);
    };
  }, []);

  useEffect(() => {
    if (!isPseudoFullscreen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsPseudoFullscreen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPseudoFullscreen]);

  const toggleFullscreen = async () => {
    if (isPseudoFullscreen) {
      setIsPseudoFullscreen(false);
      return;
    }
    const fullscreenElement = document.fullscreenElement ?? document.webkitFullscreenElement;
    if (fullscreenElement) {
      const exitFullscreen = document.exitFullscreen ?? document.webkitExitFullscreen;
      await exitFullscreen?.call(document);
      return;
    }
    const requestFullscreen = stageRef.current?.requestFullscreen ?? stageRef.current?.webkitRequestFullscreen;
    if (requestFullscreen) {
      try {
        await requestFullscreen.call(stageRef.current);
        return;
      } catch {
        // Fall through to the CSS fullscreen path used by iOS Safari.
      }
    }
    setIsPseudoFullscreen(true);
  };
  const stopScene = async () => {
    setMode(null);
    setRendererBackend("idle");
    syncExperienceUrl({ category, palette: paletteId, scene: null }, "pushState");
    setIsPseudoFullscreen(false);
    const fullscreenElement = document.fullscreenElement ?? document.webkitFullscreenElement;
    if (fullscreenElement === stageRef.current) {
      const exitFullscreen = document.exitFullscreen ?? document.webkitExitFullscreen;
      try {
        await exitFullscreen?.call(document);
      } catch {
        // The renderer is already released even if the browser keeps fullscreen active.
      }
    }
  };

  return (
    <main style={themeStyle} className="min-h-dvh overflow-x-hidden text-[var(--ui-ink)] selection:bg-[var(--ui-ink)] selection:text-[var(--page-bg)]">
      <a href="#spatial-stage" className="fixed left-3 top-3 z-50 -translate-y-20 rounded-lg bg-[var(--ui-ink)] px-3 py-2 text-xs font-semibold text-[var(--page-bg)] focus:translate-y-0">Skip to 3D animation</a>
      <motion.header
        initial={{ opacity: 0, transform: "translateY(-8px)" }}
        animate={{ opacity: 1, transform: "translateY(0px)" }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="relative z-20 flex min-h-16 items-center justify-between border-b border-[var(--ui-border)] px-4 pt-[env(safe-area-inset-top)] sm:px-6"
      >
        <a
          href="/"
          className="flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--ui-ink)]"
          aria-label="Return to the Phenomena home page"
        >
          <Mark />
          <div>
            <p className="text-sm font-semibold">Phenomena</p>
            <p className="hidden text-[10px] text-[var(--ui-muted)] sm:block">3D particle laboratory</p>
          </div>
        </a>
        <div className="flex items-center gap-2 sm:gap-3">
          <DimensionSwitch active="3d" />
          <span className="hidden rounded-full border border-[var(--ui-border)] px-2.5 py-1.5 text-[10px] font-semibold sm:inline-flex">
            {SPATIAL_MODES.length} SYSTEMS · {SPATIAL_CATEGORIES.length} FAMILIES
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-[var(--ui-border)] px-2.5 py-1.5 text-[10px] font-semibold" aria-live="polite">
            <span className={cn("size-1.5 rounded-full", !mode ? "bg-zinc-400" : settings.paused ? "bg-amber-500" : "bg-emerald-500")} />
            {!mode ? "IDLE" : `${settings.paused ? "PAUSED" : "LIVE"} · ${rendererBackend.toUpperCase()}`}
          </span>
        </div>
      </motion.header>

      <div className="grid min-h-[calc(100dvh-4rem)] lg:h-[calc(100dvh-4rem)] lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section
          id="spatial-stage"
          ref={stageRef}
          style={stageStyle}
          className={cn(
            "spatial-stage relative min-h-[70dvh] overflow-hidden text-[var(--stage-ink)]",
            isPseudoFullscreen
              ? "fixed inset-0 z-50 min-h-dvh"
              : "border-b border-[var(--ui-border)] lg:min-h-0 lg:border-b-0 lg:border-r",
          )}
          aria-label="3D animation stage"
        >
          <div className="absolute inset-0">
            {mode ? (
              <ErrorBoundary resetKey={`${mode}-${rendererPreference}`} fallback={(retry) => <div className="grid size-full place-items-center px-6 text-center"><div><p className="text-pretty text-xs text-[var(--stage-muted)]">The 3D scene failed to render.</p><div className="mt-4 flex flex-wrap justify-center gap-2"><button type="button" onClick={() => { setRendererPreference("canvas"); retry(); }} className="rounded-full bg-[var(--stage-ink)] px-4 py-2 text-xs font-semibold text-[var(--stage-bg)]">Try Canvas</button><button type="button" onClick={retry} className="rounded-full border border-[var(--stage-muted)] px-4 py-2 text-xs font-semibold">Restart</button><button type="button" onClick={() => setIsControlsOpen(true)} className="rounded-full border border-[var(--stage-muted)] px-4 py-2 text-xs font-semibold">Choose another</button></div></div></div>}>
                <Suspense fallback={<div className="grid size-full place-items-center px-6 text-center text-xs text-[var(--stage-muted)]">Preparing particle renderer…</div>}>
                  <ThreeParticleLab
                    autoRotate={settings.autoRotate}
                    backendPreference={rendererPreference}
                    density={effectiveDensity}
                    interactionMode={settings.interactionMode}
                    mode={mode}
                    onBackendChange={setRendererBackend}
                    onZoomChange={(value) => updateSetting("zoom", value)}
                    palette={palette}
                    paused={settings.paused}
                    pointerStrength={settings.pointerStrength}
                    pointSize={settings.pointSize}
                    quality={settings.quality}
                    speed={settings.speed}
                    viewRevision={settings.viewRevision}
                    zoom={settings.zoom}
                  />
                </Suspense>
              </ErrorBoundary>
            ) : (
              <div className="grid size-full place-items-center px-6 text-center">
                <div className="max-w-xs">
                  <span className="mx-auto grid size-12 place-items-center rounded-xl border border-[var(--stage-muted)] text-[var(--stage-ink)]">
                    <Icon name="spatial" className="size-5" />
                  </span>
                  <h1 className="mt-4 text-balance font-serif text-3xl">3D Lab is idle</h1>
                  <p className="mt-2 text-pretty text-xs text-[var(--stage-muted)]">No renderer or GPU context is active. Choose a phenomenon when you are ready.</p>
                  <button
                    type="button"
                    onClick={() => selectMode("orbital")}
                    className="control-button mt-5 rounded-full bg-[var(--stage-ink)] px-4 py-2.5 text-xs font-semibold text-[var(--stage-bg)] transition-transform duration-150 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--stage-ink)]"
                  >
                    Start Orbital Atlas
                  </button>
                </div>
              </div>
            )}
          </div>

          {activeMode ? (
            <div className="pointer-events-none absolute left-5 top-5 z-10 max-w-sm sm:left-7 sm:top-7">
              <p className="mb-2 text-[10px] font-semibold uppercase text-[var(--stage-muted)]">{activeCategory.label} · Spatial phenomenon</p>
              <motion.div key={activeMode.id} initial={{ opacity: 0, transform: "translateY(5px)" }} animate={{ opacity: 1, transform: "translateY(0px)" }} transition={{ duration: 0.18, ease: "easeOut" }}>
                <h1 className="text-balance font-serif text-4xl leading-none sm:text-5xl">{activeMode.label}</h1>
                <p className="mt-2 max-w-xs text-pretty text-xs text-[var(--stage-muted)]">{activeMode.note}</p>
              </motion.div>
            </div>
          ) : null}

          {mode ? (
            <div className="absolute right-5 top-5 z-20 flex gap-2 sm:right-7 sm:top-7">
              <button type="button" onClick={() => updateSetting("paused", !settings.paused)} className="control-button grid size-10 place-items-center rounded-full border border-[var(--stage-muted)] bg-[var(--stage-ink)] text-[var(--stage-bg)] shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--stage-ink)]" aria-label={settings.paused ? "Play 3D animation" : "Pause 3D animation"}><Icon name={settings.paused ? "play" : "pause"} className="size-4" /></button>
              <button type="button" onClick={resetView} className={cn("control-button grid size-10 place-items-center rounded-full border border-[var(--stage-muted)] bg-[var(--stage-ink)] text-[var(--stage-bg)] shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--stage-ink)]", !fullscreenActive && "hidden sm:grid")} aria-label="Reset 3D camera"><Icon name="reset" className="size-4" /></button>
              <button
                type="button"
                onClick={stopScene}
                className="control-button grid size-10 place-items-center rounded-full border border-[var(--stage-muted)] bg-[var(--stage-ink)] text-[var(--stage-bg)] shadow-sm transition-transform duration-150 active:scale-[0.95] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--stage-ink)]"
                aria-label="Stop 3D scene and release GPU resources"
                title="Stop scene"
              >
                <Icon name="close" className="size-4" />
              </button>
              <button
                type="button"
                onClick={toggleFullscreen}
                className="control-button grid size-10 place-items-center rounded-full border border-[var(--stage-muted)] bg-[var(--stage-ink)] text-[var(--stage-bg)] shadow-sm transition-transform duration-150 active:scale-[0.95] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--stage-ink)]"
                aria-label={fullscreenActive ? "Exit fullscreen 3D animation" : "View 3D animation fullscreen"}
                title={fullscreenActive ? "Exit fullscreen" : "View fullscreen"}
              >
                <Icon name={fullscreenActive ? "collapse" : "expand"} className="size-4" />
              </button>
            </div>
          ) : null}

          {mode ? <div
            className={cn("absolute bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-5 z-20 items-center rounded-full border border-[var(--stage-muted)] bg-[var(--stage-ink)] text-[var(--stage-bg)] shadow-sm", fullscreenActive ? "flex" : "flex sm:hidden")}
            role="group"
            aria-label="Stage zoom controls"
          >
            <button
              type="button"
              onClick={() => updateSetting("zoom", (current) => clampSpatialZoom(current / 1.25))}
              className="control-button grid size-10 place-items-center rounded-full text-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--stage-ink)]"
              aria-label="Zoom out"
            >
              −
            </button>
            <span className="min-w-12 text-center text-[9px] font-semibold tabular-nums">{settings.zoom.toFixed(2)}×</span>
            <button
              type="button"
              onClick={() => updateSetting("zoom", (current) => clampSpatialZoom(current * 1.25))}
              className="control-button grid size-10 place-items-center rounded-full text-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--stage-ink)]"
              aria-label="Zoom in"
            >
              +
            </button>
          </div> : null}

          {mode ? <div className="pointer-events-none absolute bottom-5 left-5 z-10 flex items-center gap-4 text-[9px] text-[var(--stage-muted)] sm:bottom-7 sm:left-7">
            <span className="flex items-center gap-1.5"><span className="size-1 rounded-full bg-[var(--stage-ink)]" />DRAG TO {settings.interactionMode === "pan" ? "PAN" : "ORBIT"} · <span className="sm:hidden">PINCH</span><span className="hidden sm:inline">SCROLL</span> TO ZOOM</span>
            <span className="hidden tabular-nums sm:inline">{effectiveDensity.toLocaleString()} POINTS · {rendererBackend.toUpperCase()} · {settings.quality.toUpperCase()}</span>
          </div> : null}

          <AnimatePresence>
            {showOnboarding && mode ? (
              <motion.div initial={{ opacity: 0, transform: "translateY(8px)" }} animate={{ opacity: 1, transform: "translateY(0px)" }} exit={{ opacity: 0 }} transition={{ duration: 0.18, ease: "easeOut" }} className="absolute bottom-20 left-1/2 z-30 w-[min(22rem,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-[var(--stage-muted)] bg-[var(--stage-ink)] p-4 text-[var(--stage-bg)] shadow-lg">
                <p className="text-sm font-semibold">Explore the scene</p>
                <p className="mt-1 text-pretty text-[11px] opacity-75">Drag to orbit, pinch or scroll to zoom, and use Controls to tune particles and performance.</p>
                <button type="button" onClick={() => { window.localStorage.setItem("phenomena:3d-onboarding", "seen"); setShowOnboarding(false); }} className="mt-3 rounded-full border border-current px-3 py-1.5 text-[10px] font-semibold">Got it</button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </section>

        <motion.aside
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.18, delay: 0.08, ease: "easeOut" }}
          className="relative z-10 hidden bg-[var(--page-bg)] p-3 lg:block lg:h-full lg:overflow-y-auto"
          aria-label="3D lab controls"
        >
          <SpatialControlDock
            category={category}
            favorites={favorites}
            mode={mode}
            onCategoryChange={selectCategory}
            onRandomize={randomize}
            onReset={resetAll}
            onSelectMode={selectMode}
            palette={palette}
            recent={recent}
            resetView={resetView}
            setPaletteId={setPaletteId}
            setSettings={setSettings}
            settings={settings}
            toggleFavorite={toggleFavorite}
          />
        </motion.aside>
      </div>

      <button
        type="button"
        onClick={() => setIsControlsOpen(true)}
        className={cn(
          "fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-5 z-30 items-center gap-2 rounded-full border border-[var(--ui-border)] bg-[var(--ui-ink)] px-4 py-3 text-[var(--page-bg)] shadow-lg transition-transform duration-150 active:scale-95 lg:hidden",
          isControlsOpen || fullscreenActive ? "hidden" : "flex",
        )}
        aria-label="Open 3D animation controls"
      >
        <Icon name="tuning" className="size-4" />
        <span className="text-xs font-semibold">Controls</span>
      </button>

      <AnimatePresence>
        {isControlsOpen ? (
          <BottomSheet
            onClose={() => setIsControlsOpen(false)}
            labelledBy="spatial-controls-sheet-title"
            className="max-h-[88dvh]"
            contentClassName="px-3 pb-3"
          >
            <h2 id="spatial-controls-sheet-title" className="sr-only">3D animation controls</h2>
            <SpatialControlDock
              category={category}
              favorites={favorites}
              mode={mode}
              onCategoryChange={selectCategory}
              onRandomize={randomize}
              onReset={resetAll}
              onSelectMode={selectMode}
              palette={palette}
              recent={recent}
              resetView={resetView}
              setPaletteId={setPaletteId}
              setSettings={setSettings}
              settings={settings}
              toggleFavorite={toggleFavorite}
            />
          </BottomSheet>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
