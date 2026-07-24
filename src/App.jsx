// Top-level app shell for the 2D gallery, mounted at /gallery.html (src/main.jsx).
// Owns mode/palette/settings state and picks which renderer to mount per mode:
// a DEDICATED_MODES component (fireworks/cymatics/levitation) or the shared
// ThoughtField renderer for everything else — see CLAUDE.md's architecture notes.
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "./lib/utils";
import AboutPanel from "./components/AboutPanel";
import BottomSheet from "./components/BottomSheet";
import ErrorBoundary from "./components/ErrorBoundary";
import { ControlDock, Mark } from "./components/StudioControls";
import { Icon } from "./components/StudioIcons";
import DimensionSwitch from "./components/DimensionSwitch";
import { COLLECTIONS, DEFAULT_SETTINGS, FAMILY_LABELS, INTERACTIONS, MAX_PARTICLES, MODES, PALETTES, UI_THEME } from "./config/studio";
import AcousticLevitationField from "./simulations/AcousticLevitationField";
import CymaticsField from "./simulations/CymaticsField";
import FireworksField from "./simulations/FireworksField";
import ThoughtField from "./simulations/ThoughtField";
import { getQualityProfile } from "./simulations/quality";
import { readExperience, readUrlChoice, syncExperienceUrl, updateRecent, writeExperience } from "./lib/experienceState";

const STAGE_INSTRUCTIONS = {
  fireworks: "CLICK TO LAUNCH",
  cymatics: "MOVE TO DISTURB",
  levitation: "MOVE TO SHIFT PHASE",
};
const DEDICATED_MODES = new Set(Object.keys(STAGE_INSTRUCTIONS));
const TWO_D_STORAGE_KEY = "phenomena:2d:v1";
const MODE_IDS = new Set(MODES.map((item) => item.id));
const PALETTE_IDS = new Set(PALETTES.map((item) => item.id));

function getInitialExperience() {
  const stored = readExperience(TWO_D_STORAGE_KEY, {
    favorites: [],
    lastMode: "drift",
    paletteId: "porcelain",
    recent: [],
    settings: DEFAULT_SETTINGS,
  });
  return {
    ...stored,
    mode: readUrlChoice("scene", MODE_IDS) ?? "drift",
    paletteId: readUrlChoice("palette", PALETTE_IDS) ?? stored.paletteId,
    settings: { ...DEFAULT_SETTINGS, ...stored.settings, paused: false },
  };
}

export default function App() {
  const initialExperience = useRef(null);
  if (!initialExperience.current) initialExperience.current = getInitialExperience();
  const [mode, setMode] = useState(initialExperience.current.mode);
  const [paletteId, setPaletteId] = useState(initialExperience.current.paletteId);
  const [settings, setSettings] = useState(initialExperience.current.settings);
  const [favorites, setFavorites] = useState(initialExperience.current.favorites);
  const [recent, setRecent] = useState(() => updateRecent(initialExperience.current.recent, initialExperience.current.mode));
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPseudoFullscreen, setIsPseudoFullscreen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isControlsOpen, setIsControlsOpen] = useState(false);
  const stageRef = useRef(null);
  const palette = PALETTES.find((item) => item.id === paletteId) ?? PALETTES[0];
  const activeMode = MODES.find((item) => item.id === mode) ?? MODES[0];
  const collection = activeMode.group ?? "thought";
  const collectionLabel = FAMILY_LABELS[collection];
  const hasLongTitle = activeMode.label.length > 9;
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
    writeExperience(TWO_D_STORAGE_KEY, { favorites, lastMode: mode, paletteId, recent, settings });
    syncExperienceUrl({ palette: paletteId, scene: mode });
  }, [favorites, mode, paletteId, recent, settings]);

  useEffect(() => {
    const handleHistory = () => {
      const nextMode = readUrlChoice("scene", MODE_IDS);
      const nextPalette = readUrlChoice("palette", PALETTE_IDS);
      if (nextMode) setMode(nextMode);
      if (nextPalette) setPaletteId(nextPalette);
    };
    window.addEventListener("popstate", handleHistory);
    return () => window.removeEventListener("popstate", handleHistory);
  }, []);

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

  // iOS Safari has no Fullscreen API for regular elements (only <video>), so
  // requestFullscreen/webkitRequestFullscreen are both undefined there. Fall
  // back to a CSS-driven pseudo-fullscreen (fixed, full-viewport stage) in
  // that case instead of silently doing nothing.
  useEffect(() => {
    if (!isPseudoFullscreen) return;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsPseudoFullscreen(false);
    };
    const previousOverflow = document.body.style.overflow;
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
        // Browser rejected the request (e.g. requires a user gesture it didn't see) — fall back below.
      }
    }

    setIsPseudoFullscreen(true);
  };

  const reset = () => {
    selectMode("drift");
    setPaletteId("porcelain");
    setSettings(DEFAULT_SETTINGS);
  };

  const selectMode = (nextMode) => {
    if (nextMode !== mode) syncExperienceUrl({ palette: paletteId, scene: nextMode }, "pushState");
    setMode(nextMode);
    setRecent((current) => updateRecent(current, nextMode));
    setIsControlsOpen(false);
  };
  const toggleFavorite = (id) => setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  const randomize = () => {
    selectMode(MODES[Math.floor(Math.random() * MODES.length)].id);
    setPaletteId(PALETTES[Math.floor(Math.random() * PALETTES.length)].id);
    setSettings((current) => ({
      speed: Number((0.55 + Math.random() * 1.35).toFixed(2)),
      energy: Number((0.55 + Math.random() * 1.35).toFixed(2)),
      density: Number((0.2 + Math.random() * 0.75).toFixed(2)),
      size: Number((0.75 + Math.random() * 1.1).toFixed(2)),
      trail: Number((Math.random() * 0.75).toFixed(2)),
      interaction: INTERACTIONS[Math.floor(Math.random() * (INTERACTIONS.length - 1))].id,
      interactionStrength: Number((0.25 + Math.random() * 0.7).toFixed(2)),
      interactionRadius: Number((0.2 + Math.random() * 0.7).toFixed(2)),
      quality: current.quality,
      seed: current.seedLocked ? current.seed : Math.floor(Math.random() * 9999) + 1,
      seedLocked: current.seedLocked,
      revision: current.revision + 1,
      paused: false,
    }));
  };

  const stageInstruction = STAGE_INSTRUCTIONS[mode] ?? "MOVE POINTER";
  const isDedicatedSimulation = DEDICATED_MODES.has(mode);
  const fullscreenActive = isFullscreen || isPseudoFullscreen;
  const displayedParticleCount = Math.round((80 + settings.density * (MAX_PARTICLES - 80)) * getQualityProfile(settings.quality).particles);

  return (
    <main style={themeStyle} className="min-h-dvh overflow-x-hidden text-[var(--ui-ink)] selection:bg-[var(--ui-ink)] selection:text-[var(--page-bg)]">
      <a href="#animation-stage" className="fixed left-3 top-3 z-50 -translate-y-20 rounded-lg bg-[var(--ui-ink)] px-3 py-2 text-xs font-semibold text-[var(--page-bg)] focus:translate-y-0">Skip to animation</a>
      <motion.header
        initial={{ opacity: 0, transform: "translateY(-8px)" }}
        animate={{ opacity: 1, transform: "translateY(0px)" }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative z-20 flex min-h-16 items-center justify-between border-b border-[var(--ui-border)] px-4 pt-[env(safe-area-inset-top)] sm:px-6"
      >
        <a href="/" className="flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--ui-ink)]" aria-label="Return to the Phenomena home page">
          <Mark />
          <div>
            <p className="text-sm font-semibold">Phenomena</p>
            <p className="hidden text-[10px] text-[var(--ui-muted)] sm:block">Interactive physics laboratory</p>
          </div>
        </a>
        <div className="flex items-center gap-2 sm:gap-3">
          <DimensionSwitch active="2d" />
          <span className="hidden text-[10px] text-[var(--ui-muted)] sm:block">{MODES.length} systems · {COLLECTIONS.length} families · {PALETTES.length} palettes</span>
          <span className="flex items-center gap-1.5 rounded-full border border-[var(--ui-border)] px-2.5 py-1.5 text-[10px] font-semibold" aria-live="polite">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            {settings.paused ? "PAUSED" : "LIVE"}
          </span>
          <button
            type="button"
            onClick={() => setIsAboutOpen(true)}
            aria-label="About Phenomena"
            className="grid size-8 shrink-0 place-items-center rounded-full border border-[var(--ui-border)] transition-transform duration-150 active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-ink)]"
          >
            <Icon name="info" className="size-4" />
          </button>
        </div>
      </motion.header>

      <AboutPanel open={isAboutOpen} onClose={() => setIsAboutOpen(false)} />

      <div className="grid min-h-[calc(100dvh-4rem)] lg:h-[calc(100dvh-4rem)] lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section
          id="animation-stage"
          ref={stageRef}
          style={stageStyle}
          className={cn(
            "stage-shell relative min-h-[70dvh] overflow-hidden text-[var(--stage-ink)]",
            isPseudoFullscreen
              ? "fixed inset-0 z-[100] min-h-dvh"
              : "border-b border-[var(--ui-border)] lg:min-h-0 lg:border-b-0 lg:border-r"
          )}
          aria-label="Animation stage"
        >
          <div key={`${mode}-${settings.seed}-${settings.revision}`} className="absolute inset-0 z-0">
            <ErrorBoundary resetKey={`${mode}-${settings.revision}`} fallback={(retry) => <div className="grid size-full place-items-center px-6 text-center"><div><p className="text-pretty text-xs text-[var(--stage-muted)]">This system failed to render.</p><div className="mt-4 flex justify-center gap-2"><button type="button" onClick={retry} className="rounded-full bg-[var(--stage-ink)] px-4 py-2 text-xs font-semibold text-[var(--stage-bg)]">Restart</button><button type="button" onClick={() => selectMode("drift")} className="rounded-full border border-[var(--stage-muted)] px-4 py-2 text-xs font-semibold">Open Drift</button></div></div></div>}>
              {mode === "fireworks" ? <FireworksField palette={palette} settings={settings} /> : null}
              {mode === "cymatics" ? <CymaticsField palette={palette} settings={settings} /> : null}
              {mode === "levitation" ? <AcousticLevitationField palette={palette} settings={settings} /> : null}
              {!DEDICATED_MODES.has(mode) ? <ThoughtField mode={mode} palette={palette} settings={settings} /> : null}
            </ErrorBoundary>
          </div>

          <motion.div
            initial={{ opacity: 0, transform: "translateY(8px)" }}
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            transition={{ duration: 0.45, delay: 0.08, ease: "easeOut" }}
            className="pointer-events-none absolute left-5 top-5 z-10 max-w-sm sm:left-7 sm:top-7"
          >
            <p className="mb-2 text-[10px] font-semibold uppercase text-[var(--stage-muted)]">{collectionLabel}</p>
            <motion.div key={activeMode.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.18, ease: "easeOut" }}>
              <h1 className={cn("text-balance font-serif leading-none", hasLongTitle ? "text-3xl sm:text-4xl" : "text-4xl sm:text-5xl")}>{activeMode.label}</h1>
              <p className="mt-2 max-w-xs text-pretty text-xs text-[var(--stage-muted)]">{activeMode.note}</p>
            </motion.div>
          </motion.div>

          <div className="absolute right-5 top-5 z-20 flex gap-2 sm:right-7 sm:top-7">
            <button type="button" onClick={() => setSettings((current) => ({ ...current, paused: !current.paused }))} className="control-button grid size-10 place-items-center rounded-full border border-[var(--stage-muted)] bg-[var(--stage-ink)] text-[var(--stage-bg)] shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--stage-ink)]" aria-label={settings.paused ? "Play animation" : "Pause animation"}><Icon name={settings.paused ? "play" : "pause"} className="size-4" /></button>
            <button type="button" onClick={() => setSettings((current) => ({ ...current, revision: current.revision + 1 }))} className={cn("control-button grid size-10 place-items-center rounded-full border border-[var(--stage-muted)] bg-[var(--stage-ink)] text-[var(--stage-bg)] shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--stage-ink)]", !fullscreenActive && "hidden sm:grid")} aria-label="Restart animation"><Icon name="reset" className="size-4" /></button>
            <button type="button" onClick={toggleFullscreen} className="control-button grid size-10 place-items-center rounded-full border border-[var(--stage-muted)] bg-[var(--stage-ink)] text-[var(--stage-bg)] shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--stage-ink)]" aria-label={fullscreenActive ? "Exit fullscreen animation" : "View animation fullscreen"}><Icon name={fullscreenActive ? "collapse" : "expand"} className="size-4" /></button>
          </div>

          <div className="pointer-events-none absolute bottom-5 left-5 z-10 flex items-center gap-4 text-[9px] text-[var(--stage-muted)] sm:bottom-7 sm:left-7">
            <span className="flex items-center gap-1.5"><span className="size-1 rounded-full bg-[var(--stage-ink)]" />{stageInstruction}</span>
            <span className="tabular-nums">{isDedicatedSimulation ? "REAL-TIME SIMULATION" : `${displayedParticleCount} PARTICLES`}</span>
          </div>
        </section>

        <motion.aside
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.12, ease: "easeOut" }}
          className="relative z-10 hidden bg-[var(--page-bg)] p-3 lg:block lg:h-full lg:overflow-y-auto"
          aria-label="Animation controls"
        >
          <ControlDock
            collection={collection}
            favorites={favorites}
            mode={mode}
            onSelectMode={selectMode}
            palette={palette}
            recent={recent}
            setPaletteId={setPaletteId}
            settings={settings}
            setSettings={setSettings}
            onRandomize={randomize}
            onReset={reset}
            toggleFavorite={toggleFavorite}
          />
        </motion.aside>
      </div>

      <button
        type="button"
        onClick={() => setIsControlsOpen(true)}
        className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-5 z-30 flex items-center gap-2 rounded-full border border-[var(--ui-border)] bg-[var(--ui-ink)] px-4 py-3 text-[var(--page-bg)] shadow-lg transition-transform duration-150 active:scale-95 lg:hidden"
        aria-label="Open animation controls"
      >
        <Icon name="tuning" className="size-4" />
        <span className="text-xs font-semibold">Controls</span>
      </button>

      <AnimatePresence>
        {isControlsOpen ? (
          <BottomSheet
            onClose={() => setIsControlsOpen(false)}
            labelledBy="controls-sheet-title"
            className="max-h-[88dvh]"
            contentClassName="px-3 pb-3"
          >
            <h2 id="controls-sheet-title" className="sr-only">Animation controls</h2>
            <ControlDock
              collection={collection}
              favorites={favorites}
              mode={mode}
              onSelectMode={selectMode}
              palette={palette}
              recent={recent}
              setPaletteId={setPaletteId}
              settings={settings}
              setSettings={setSettings}
              onRandomize={randomize}
              onReset={reset}
              toggleFavorite={toggleFavorite}
            />
          </BottomSheet>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
