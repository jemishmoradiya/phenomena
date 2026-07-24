import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { clampSpatialZoom } from "./config/spatial";
import { PALETTES } from "./config/studio";
import { Mark } from "./components/StudioControls";
import { Icon } from "./components/StudioIcons";
import { cn } from "./lib/utils";

const OrigamiViewer = lazy(() => import("./simulations/OrigamiViewer"));

const MODELS = [
  { id: "origamicrane3d", group: "traditional", label: "Crane", japanese: "鶴 · Tsuru", note: "A symbol of peace, longevity, and good fortune." },
  { id: "origamikabuto3d", group: "traditional", label: "Kabuto", japanese: "兜 · Kabuto", note: "A traditional folded helmet inspired by samurai armor." },
  { id: "origamimasubox3d", group: "traditional", label: "Masu Box", japanese: "枡 · Masu", note: "A practical square vessel formed from precise symmetrical folds." },
  { id: "origamibutterfly3d", group: "nature", label: "Butterfly", japanese: "蝶 · Chō", note: "A light, balanced form built around mirrored wing folds." },
  { id: "origamilotus3d", group: "nature", label: "Lotus", japanese: "蓮 · Hasu", note: "Layered radial folds opening into a sculptural flower." },
  { id: "origamipigeon3d", group: "nature", label: "Pigeon", japanese: "鳩 · Hato", note: "A compact traditional bird with a folded beak, breast, and tail." },
  { id: "origamimouse3d", group: "nature", label: "Mouse", japanese: "鼠 · Nezumi", note: "A dimensional paper animal with raised ears, a tapered nose, and tail." },
  { id: "origamiowl3d", group: "nature", label: "Owl", japanese: "梟 · Fukurō", note: "A characterful bird shaped by small facial and wing folds." },
  { id: "origamiboat3d", group: "objects", label: "Sailboat", japanese: "舟 · Fune", note: "A simple paper boat with a crisp central sail." },
];
const MODEL_GROUPS = [
  { id: "traditional", label: "Traditional Japan" },
  { id: "nature", label: "Nature" },
  { id: "objects", label: "Objects" },
];

const THEME = {
  background: "#07111f",
  panel: "#0e1c30",
  ink: "#edf7ff",
  muted: "#8da7c2",
  border: "#1c3350",
  accent: "#e85d44",
};

function FoldControl({ fold, onChange }) {
  return (
    <div className="rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-panel)] p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold">Fold state</p>
          <p className="mt-0.5 text-[10px] text-[var(--ui-muted)]">{fold < 0.05 ? "Flat crease pattern" : fold > 0.95 ? "Finished form" : "Folding in progress"}</p>
        </div>
        <span className="rounded-full bg-[var(--ui-ink)] px-2.5 py-1 font-mono text-[10px] font-semibold tabular-nums text-[var(--page-bg)]">{Math.round(fold * 100)}%</span>
      </div>
      <label className="mt-4 block">
        <span className="sr-only">Origami fold progress</span>
        <input className="studio-slider w-full" type="range" min="0" max="1" step="0.01" value={fold} onChange={(event) => onChange(Number(event.target.value))} />
      </label>
      <div className="mt-2 grid grid-cols-2 gap-2" role="group" aria-label="Origami fold actions">
        <button type="button" onClick={() => onChange(0)} className={cn("control-button rounded-xl border px-3 py-2.5 text-[10px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-ink)]", fold === 0 ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--ui-border)] text-[var(--ui-muted)]")} aria-pressed={fold === 0}>Unfold paper</button>
        <button type="button" onClick={() => onChange(1)} className={cn("control-button rounded-xl border px-3 py-2.5 text-[10px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-ink)]", fold === 1 ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--ui-border)] text-[var(--ui-muted)]")} aria-pressed={fold === 1}>Fold artwork</button>
      </div>
    </div>
  );
}

export default function OrigamiApp() {
  const shouldReduceMotion = useReducedMotion();
  const initialModel = useMemo(() => {
    const value = new URLSearchParams(window.location.search).get("model");
    return MODELS.some((item) => item.id === value) ? value : MODELS[0].id;
  }, []);
  const [model, setModel] = useState(initialModel);
  const [fold, setFold] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [autoRotate, setAutoRotate] = useState(true);
  const [showAxes, setShowAxes] = useState(false);
  const [viewRevision, setViewRevision] = useState(0);
  const [backend, setBackend] = useState("idle");
  const activeModel = MODELS.find((item) => item.id === model) ?? MODELS[0];
  const palette = PALETTES.find((item) => item.id === "porcelain");
  const themeStyle = {
    "--page-bg": THEME.background,
    "--ui-panel": THEME.panel,
    "--ui-ink": THEME.ink,
    "--ui-muted": THEME.muted,
    "--ui-border": THEME.border,
    "--accent": THEME.accent,
    backgroundColor: THEME.background,
  };
  const stageStyle = {
    "--stage-bg": palette.background,
    "--stage-ink": palette.stageInk,
    "--stage-muted": palette.stageMuted,
    backgroundColor: palette.background,
  };

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("model", model);
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, [model]);

  const selectModel = (value) => {
    setModel(value);
    setFold(1);
    setViewRevision((current) => current + 1);
  };

  return (
    <main style={themeStyle} className="min-h-dvh overflow-x-hidden text-[var(--ui-ink)] selection:bg-[var(--accent)] selection:text-white">
      <header className="relative z-20 border-b border-[var(--ui-border)]">
        <div className="flex min-h-16 items-center justify-between px-4 pt-[env(safe-area-inset-top)] sm:px-6">
          <a href="/" className="flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--ui-ink)]" aria-label="Return to the Phenomena home page">
            <Mark />
            <div>
              <p className="text-sm font-semibold">Phenomena</p>
              <p className="hidden font-mono text-[10px] text-[var(--ui-muted)] sm:block">Origami playground</p>
            </div>
          </a>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-[var(--ui-border)] px-3 py-1.5 font-mono text-[9px] font-semibold sm:inline-flex">{MODELS.length} FORMS · INTERACTIVE 3D</span>
            <span className="flex items-center gap-1.5 rounded-full border border-[var(--ui-border)] px-3 py-1.5 font-mono text-[9px] font-semibold">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {backend.toUpperCase()}
            </span>
          </div>
        </div>
      </header>

      <div className="grid min-h-[calc(100dvh-4rem)] lg:h-[calc(100dvh-4rem)] lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section style={stageStyle} className="relative min-h-[68dvh] overflow-hidden border-b border-[var(--ui-border)] text-[var(--stage-ink)] lg:min-h-0 lg:border-b-0 lg:border-r" aria-label={`${activeModel.label} interactive 3D viewer`}>
          <div className="absolute inset-0">
            <Suspense fallback={<div className="grid size-full place-items-center text-xs text-[var(--stage-muted)]">Preparing paper model…</div>}>
              <OrigamiViewer
                autoRotate={autoRotate}
                fold={fold}
                onBackendChange={setBackend}
                onZoomChange={setZoom}
                model={model}
                showAxes={showAxes}
                viewRevision={viewRevision}
                zoom={zoom}
              />
            </Suspense>
          </div>

          <motion.div key={model} initial={{ opacity: 0, transform: shouldReduceMotion ? "translateY(0px)" : "translateY(6px)" }} animate={{ opacity: 1, transform: "translateY(0px)" }} transition={{ duration: 0.18, ease: "easeOut" }} className="pointer-events-none absolute left-5 top-5 z-10 max-w-sm sm:left-7 sm:top-7">
            <p className="font-mono text-[10px] font-semibold uppercase text-[var(--stage-muted)]">{activeModel.japanese}</p>
            <h1 className="mt-2 text-balance font-serif text-4xl leading-none sm:text-5xl">{activeModel.label}</h1>
            <p className="mt-2 max-w-xs text-pretty text-xs text-[var(--stage-muted)]">{activeModel.note}</p>
          </motion.div>

          <div className="absolute right-5 top-5 z-10 flex gap-2 sm:right-7 sm:top-7">
            <button type="button" onClick={() => setAutoRotate((current) => !current)} className={cn("control-button grid size-10 place-items-center rounded-full border shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--stage-ink)]", autoRotate ? "border-[var(--stage-ink)] bg-[var(--stage-ink)] text-[var(--stage-bg)]" : "border-[var(--stage-muted)] bg-[var(--stage-bg)] text-[var(--stage-ink)]")} aria-label={autoRotate ? "Stop automatic rotation" : "Start automatic rotation"} aria-pressed={autoRotate}><Icon name="orbit" className="size-4" /></button>
            <button type="button" onClick={() => setShowAxes((current) => !current)} className={cn("control-button grid size-10 place-items-center rounded-full border shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--stage-ink)]", showAxes ? "border-[var(--stage-ink)] bg-[var(--stage-ink)] text-[var(--stage-bg)]" : "border-[var(--stage-muted)] bg-[var(--stage-bg)] text-[var(--stage-ink)]")} aria-label={showAxes ? "Hide full XYZ study grid" : "Show full XYZ study grid"} aria-pressed={showAxes}><Icon name="axes" className="size-4" /></button>
            <button type="button" onClick={() => { setZoom(1); setViewRevision((current) => current + 1); }} className="control-button grid size-10 place-items-center rounded-full border border-[var(--stage-muted)] bg-[var(--stage-bg)] shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--stage-ink)]" aria-label="Reset 3D view"><Icon name="reset" className="size-4" /></button>
          </div>

          <div className="absolute bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-5 z-10 flex items-center rounded-full border border-[var(--stage-muted)] bg-[var(--stage-ink)] text-[var(--stage-bg)] shadow-sm sm:right-7">
            <button type="button" onClick={() => setZoom((current) => clampSpatialZoom(current / 1.25))} className="control-button grid size-10 place-items-center rounded-full text-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--stage-ink)]" aria-label="Zoom out">−</button>
            <span className="min-w-12 text-center font-mono text-[9px] font-semibold tabular-nums">{zoom.toFixed(2)}×</span>
            <button type="button" onClick={() => setZoom((current) => clampSpatialZoom(current * 1.25))} className="control-button grid size-10 place-items-center rounded-full text-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--stage-ink)]" aria-label="Zoom in">+</button>
          </div>
          <p className="pointer-events-none absolute bottom-6 left-5 font-mono text-[9px] font-semibold uppercase text-[var(--stage-muted)] sm:left-7">Drag to orbit · Pinch or scroll to zoom</p>
          {showAxes ? (
            <div className="pointer-events-none absolute bottom-12 left-5 z-10 flex items-center gap-3 rounded-full border border-[var(--stage-muted)] bg-[var(--stage-bg)]/90 px-3 py-2 font-mono text-[9px] font-semibold sm:left-7">
              <span className="text-[var(--stage-muted)]">STUDY GRID</span>
              <span className="text-red-600">X</span>
              <span className="text-green-600">Y</span>
              <span className="text-blue-600">Z</span>
            </div>
          ) : null}
        </section>

        <aside className="bg-[var(--page-bg)] p-4 sm:p-5 lg:h-full lg:overflow-y-auto" aria-label="Origami controls">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase text-[var(--accent)]">Paper collection</p>
            <h2 className="mt-2 text-balance font-serif text-3xl">Origami Playground</h2>
            <p className="mt-2 text-pretty text-xs leading-relaxed text-[var(--ui-muted)]">Study Japanese paper forms from every angle, then unfold each sculpture to reveal its original sheet.</p>
          </div>

          <div className="mt-6 grid gap-5" aria-label="Choose an origami model">
            {MODEL_GROUPS.map((group) => (
              <section key={group.id} aria-labelledby={`origami-group-${group.id}`}>
                <p id={`origami-group-${group.id}`} className="mb-2 font-mono text-[9px] font-semibold uppercase text-[var(--ui-muted)]">{group.label}</p>
                <div className="grid gap-2" role="group" aria-label={`${group.label} origami models`}>
                  {MODELS.filter((item) => item.group === group.id).map((item) => {
                    const index = MODELS.findIndex((entry) => entry.id === item.id);
                    return (
                      <button key={item.id} type="button" onClick={() => selectModel(item.id)} className={cn("control-button flex items-center gap-3 rounded-2xl border p-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-ink)]", model === item.id ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--ui-border)] bg-[var(--ui-panel)] text-[var(--ui-muted)]")} aria-pressed={model === item.id}>
                        <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl border font-serif text-lg", model === item.id ? "border-white/30 bg-white/10" : "border-[var(--ui-border)] text-[var(--ui-ink)]")}>{index + 1}</span>
                        <span className="min-w-0"><span className="block text-xs font-semibold">{item.label}</span><span className={cn("mt-0.5 block truncate font-mono text-[9px]", model === item.id ? "text-white/70" : "text-[var(--ui-muted)]")}>{item.japanese}</span></span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-4">
            <FoldControl fold={fold} onChange={setFold} />
          </div>

          <div className="mt-4 rounded-2xl border border-[var(--ui-border)] p-4">
            <p className="text-xs font-semibold">How to explore</p>
            <ol className="mt-3 grid gap-2 font-mono text-[9px] leading-relaxed text-[var(--ui-muted)]">
              <li>01 · Drag the model to inspect each fold.</li>
              <li>02 · Scroll or pinch to move closer.</li>
              <li>03 · Unfold, pause midway, and study the structure.</li>
            </ol>
          </div>
        </aside>
      </div>
    </main>
  );
}
