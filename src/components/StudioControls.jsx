import { useState } from "react";
import { cn } from "../lib/utils";
import { COLLECTIONS, FAMILY_LABELS, INTERACTIONS, MAX_PARTICLES, MODES, PALETTES } from "../config/studio";
import { PremiumTabs, PremiumTabsContent, PremiumTabsList, PremiumTabsTrigger } from "./PremiumTabs";

import { Icon, MotionGlyph } from "./StudioIcons";

function SectionLabel({ number, children }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="grid size-5 place-items-center rounded-full border border-[var(--ui-border)] text-[9px] tabular-nums text-[var(--ui-muted)]">{number}</span>
      <p className="text-[11px] font-semibold uppercase text-[var(--ui-muted)]">{children}</p>
      <span className="h-px flex-1 bg-[var(--ui-border)] opacity-50" />
    </div>
  );
}

function Slider({ label, value, min, max, step, display, onChange, disabled = false }) {
  return (
    <label className={cn("grid grid-cols-[5.25rem_minmax(0,1fr)_3.25rem] items-center gap-2 rounded-xl border border-[var(--ui-border)]/60 bg-[var(--page-bg)]/40 px-3 py-2.5", disabled && "opacity-45")}>
      <span className="truncate text-[11px] font-medium text-[var(--ui-muted)]">{label}</span>
      <input
        className="studio-slider"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        disabled={disabled}
        aria-label={label}
      />
      <span className="rounded-md bg-[var(--ui-ink)] px-1.5 py-1 text-center text-[10px] tabular-nums text-[var(--page-bg)]">{display}</span>
    </label>
  );
}

function PaletteGrid({ ariaLabel = "Color palette", palette, setPaletteId }) {
  return (
    <div className="grid grid-cols-6 gap-2" role="group" aria-label={ariaLabel}>
      {PALETTES.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => setPaletteId(item.id)}
          className={cn(
            "palette-button relative col-span-2 flex h-16 flex-col gap-1.5 rounded-xl border bg-[var(--page-bg)]/35 p-1.5 transition-transform duration-150 active:scale-[0.95] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-ink)]",
            item.id === palette.id ? "border-[var(--ui-ink)] shadow-sm" : "border-[var(--ui-border)]",
          )}
          aria-label={`${item.label} palette`}
          aria-pressed={item.id === palette.id}
          title={item.label}
        >
          <span className="relative h-8 w-full overflow-hidden rounded-lg border border-black/10" style={{ backgroundColor: item.background }} aria-hidden="true">
            <span className="absolute inset-x-2 top-1/2 h-px -rotate-6 opacity-45" style={{ backgroundColor: item.connection }} />
            <span className="absolute left-3 top-2 size-1.5 rounded-full" style={{ backgroundColor: item.colors[0] }} />
            <span className="absolute left-1/2 top-4 size-1 rounded-full" style={{ backgroundColor: item.colors[1] }} />
            <span className="absolute right-3 top-1.5 size-1.5 rounded-full" style={{ backgroundColor: item.colors[2] }} />
          </span>
          <span className="truncate text-[9px] font-semibold text-[var(--ui-ink)]">{item.label}</span>
          {item.id === palette.id ? <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-[var(--ui-ink)]" /> : null}
        </button>
      ))}
    </div>
  );
}

function StudioPanel({ mode, palette, setPaletteId, settings, setSettings, onRandomize, onReset }) {
  const updateSetting = (key, value) => setSettings((current) => ({ ...current, [key]: value }));
  const isFireworks = mode === "fireworks";
  const simulationLabels = {
    fireworks: { energy: "Burst power" },
    cymatics: { energy: "Amplitude", density: "Frequency", size: "Grain size", trail: "Damping", force: "Sand disturbance" },
    levitation: { energy: "Amplitude", density: "Frequency", size: "Particle size", trail: "Phase stability", force: "Phase control" },
  };
  const simulation = simulationLabels[mode];
  const acousticAction = { cymatics: "Disturb", levitation: "Shift phase" }[mode];
  const interactionOptions = acousticAction
    ? [{ id: "attract", label: acousticAction }, { id: "none", label: "Observe" }]
    : INTERACTIONS;
  const densityDisplay = ["cymatics", "levitation"].includes(mode)
    ? `${Math.round(20 + settings.density * 480)} Hz`
    : isFireworks || simulation
      ? `${Math.round(settings.density * 100)}%`
      : `${Math.round(80 + settings.density * (MAX_PARTICLES - 80))}`;

  return (
    <section className="p-4 sm:p-5" aria-label="Motion tuning controls">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="relative grid size-10 place-items-center rounded-xl bg-[var(--ui-ink)] text-[var(--page-bg)]">
            <MotionGlyph mode="vortex" className="size-6" />
            <span className="absolute -right-1 -top-1 size-2.5 rounded-full border-2 border-[var(--ui-panel)] bg-emerald-500" />
          </span>
          <div>
            <p className="text-sm font-semibold">Motion studio</p>
            <p className="mt-0.5 text-[11px] text-[var(--ui-muted)]">Live simulation instrument</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => updateSetting("paused", !settings.paused)}
          className="control-button grid size-10 place-items-center rounded-full border border-[var(--ui-border)] bg-[var(--page-bg)]/40 transition-transform duration-150 active:scale-[0.94] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-ink)]"
          aria-label={settings.paused ? "Play animation" : "Pause animation"}
          title={settings.paused ? "Play" : "Pause"}
        >
          <Icon name={settings.paused ? "play" : "pause"} />
        </button>
      </div>

      <div className="mt-6">
        <SectionLabel number="01">Palette</SectionLabel>
        <PaletteGrid palette={palette} setPaletteId={setPaletteId} />
      </div>

      <div className="mt-6">
        <SectionLabel number="02">Dynamics</SectionLabel>
        <div className="grid gap-2">
        <Slider label="Speed" value={settings.speed} min="0.25" max="2.2" step="0.05" display={`${settings.speed.toFixed(2)}×`} onChange={(value) => updateSetting("speed", value)} />
        <Slider label={simulation?.energy ?? "Intensity"} value={settings.energy} min="0.25" max="2.2" step="0.05" display={`${settings.energy.toFixed(2)}×`} onChange={(value) => updateSetting("energy", value)} />
        <Slider label={simulation?.density ?? (isFireworks ? "Burst density" : "Density")} value={settings.density} min="0" max="1" step="0.05" display={densityDisplay} onChange={(value) => updateSetting("density", value)} />
        <Slider label={simulation?.size ?? (isFireworks ? "Spark size" : "Particle size")} value={settings.size} min="0.6" max="2.2" step="0.05" display={`${settings.size.toFixed(2)}×`} onChange={(value) => updateSetting("size", value)} />
        <Slider label={simulation?.trail ?? (isFireworks ? "Spark trails" : "Trails")} value={settings.trail} min="0" max="1" step="0.05" display={`${Math.round(settings.trail * 100)}%`} onChange={(value) => updateSetting("trail", value)} />
        </div>
      </div>

      <div className="mt-6">
        <SectionLabel number="03">{simulation?.force ?? (isFireworks ? "Spark field" : "Pointer interaction")}</SectionLabel>
        <div className={cn("grid gap-1.5", interactionOptions.length === 2 ? "grid-cols-2" : "grid-cols-4")} role="group" aria-label="Pointer response">
          {interactionOptions.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => updateSetting("interaction", item.id)}
              className={cn(
                "control-button flex flex-col items-center gap-1.5 rounded-xl border px-1 py-2.5 text-[9px] font-medium transition-transform duration-150 active:scale-[0.95] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-ink)]",
                settings.interaction === item.id ? "border-[var(--ui-ink)] bg-[var(--ui-ink)] text-[var(--page-bg)]" : "border-[var(--ui-border)] text-[var(--ui-muted)]",
              )}
              aria-pressed={settings.interaction === item.id}
            >
              <Icon name={item.id} className="size-4" />
              {item.label}
            </button>
          ))}
        </div>
        <div className="mt-2 grid gap-2">
          <Slider label="Strength" value={settings.interactionStrength} min="0" max="1" step="0.05" display={`${Math.round(settings.interactionStrength * 100)}%`} onChange={(value) => updateSetting("interactionStrength", value)} disabled={settings.interaction === "none"} />
          <Slider label="Radius" value={settings.interactionRadius} min="0.1" max="1" step="0.05" display={`${Math.round(settings.interactionRadius * 100)}%`} onChange={(value) => updateSetting("interactionRadius", value)} disabled={settings.interaction === "none"} />
        </div>
      </div>

      <div className="mt-6">
        <SectionLabel number="04">Advanced</SectionLabel>
        <details className="rounded-xl border border-[var(--ui-border)]/70 bg-[var(--page-bg)]/35">
          <summary className="flex items-center justify-between px-3 py-2.5 text-[11px] font-semibold text-[var(--ui-muted)]">
            Quality and variation
            <span className="text-[9px] font-normal uppercase">{settings.quality}</span>
          </summary>
          <div className="grid gap-3 border-t border-[var(--ui-border)]/60 p-3">
            <div>
              <p className="mb-2 text-[10px] font-medium text-[var(--ui-muted)]">Render quality</p>
              <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Render quality">
                {[{ id: "eco", label: "Eco" }, { id: "auto", label: "Auto" }, { id: "high", label: "High" }].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSettings((current) => ({ ...current, quality: item.id, revision: current.revision + 1 }))}
                    className={cn("control-button rounded-lg border px-2 py-2 text-[10px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-ink)]", settings.quality === item.id ? "border-[var(--ui-ink)] bg-[var(--ui-ink)] text-[var(--page-bg)]" : "border-[var(--ui-border)] text-[var(--ui-muted)]")}
                    aria-pressed={settings.quality === item.id}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-lg border border-[var(--ui-border)]/60 px-2.5 py-2">
              <div>
                <p className="text-[10px] font-medium">Variation</p>
                <p className="text-[9px] tabular-nums text-[var(--ui-muted)]">Seed {settings.seed}</p>
              </div>
              <div className="flex gap-1.5">
                <button type="button" onClick={() => setSettings((current) => ({ ...current, seedLocked: !current.seedLocked }))} className={cn("control-button rounded-lg border px-2.5 py-1.5 text-[9px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-ink)]", settings.seedLocked ? "border-[var(--ui-ink)] bg-[var(--ui-ink)] text-[var(--page-bg)]" : "border-[var(--ui-border)]")} aria-pressed={settings.seedLocked}>{settings.seedLocked ? "Locked" : "Lock"}</button>
                <button type="button" onClick={() => setSettings((current) => ({ ...current, seed: Math.floor(Math.random() * 9999) + 1, revision: current.revision + 1 }))} className="control-button rounded-lg border border-[var(--ui-border)] px-2.5 py-1.5 text-[9px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-ink)]">New</button>
              </div>
            </div>
            <button type="button" onClick={() => setSettings((current) => ({ ...current, revision: current.revision + 1 }))} className="control-button flex items-center justify-between rounded-lg border border-[var(--ui-border)] px-3 py-2 text-[10px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-ink)]">
              Restart simulation
              <Icon name="reset" className="size-3.5" />
            </button>
          </div>
        </details>
      </div>

      <div className="mt-6 flex gap-2">
        <button type="button" onClick={onRandomize} className="control-button flex flex-1 items-center justify-between rounded-xl bg-[var(--ui-ink)] px-4 py-3 text-xs font-semibold text-[var(--page-bg)] transition-transform duration-150 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-ink)]"><span>Surprise me</span><Icon name="shuffle" /></button>
        <button type="button" onClick={onReset} className="control-button grid size-10 place-items-center self-center rounded-xl border border-[var(--ui-border)] transition-transform duration-150 active:scale-[0.94] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-ink)]" aria-label="Reset all settings" title="Reset"><Icon name="reset" /></button>
      </div>
    </section>
  );
}

function PresetLibrary({ collection, favorites, mode, onSelectMode, recent, toggleFavorite }) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const collectionModes = MODES.filter((item) => (item.group ?? "thought") === collection);
  const visibleModes = MODES.filter((item) => {
    const matchesQuery = !normalizedQuery || `${item.label} ${item.note}`.toLowerCase().includes(normalizedQuery);
    if (!matchesQuery) return false;
    if (filter === "favorites") return favorites.includes(item.id);
    if (filter === "recent") return recent.includes(item.id);
    return normalizedQuery ? true : collectionModes.includes(item);
  }).sort((a, b) => filter === "recent" ? recent.indexOf(a.id) - recent.indexOf(b.id) : 0);

  return (
    <nav className="p-4" aria-label="Phenomenon presets">
        <div className="mb-5 flex items-center justify-between px-1">
          <div>
            <p className="text-sm font-semibold">Phenomena</p>
            <p className="mt-0.5 text-[11px] text-[var(--ui-muted)]">Choose a system to observe</p>
          </div>
          <span className="rounded-full border border-[var(--ui-border)] px-2 py-1 text-[9px] tabular-nums text-[var(--ui-muted)]">{MODES.length} SYSTEMS</span>
        </div>

        <label className="mb-3 flex items-center gap-2 rounded-xl border border-[var(--ui-border)] bg-[var(--page-bg)]/40 px-3">
          <Icon name="search" className="size-3.5 text-[var(--ui-muted)]" />
          <span className="sr-only">Search phenomena</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search all phenomena…"
            className="min-w-0 flex-1 bg-transparent py-2.5 text-xs outline-none placeholder:text-[var(--ui-muted)]"
          />
        </label>
        <div className="mb-4 grid grid-cols-3 gap-1.5" role="group" aria-label="Library filter">
          {[["all", "All"], ["favorites", `Favorites ${favorites.length}`], ["recent", "Recent"]].map(([id, label]) => (
            <button key={id} type="button" onClick={() => setFilter(id)} aria-pressed={filter === id} className={cn("control-button rounded-lg border px-2 py-2 text-[9px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-ink)]", filter === id ? "border-[var(--ui-ink)] bg-[var(--ui-ink)] text-[var(--page-bg)]" : "border-[var(--ui-border)] text-[var(--ui-muted)]")}>{label}</button>
          ))}
        </div>

        <PremiumTabs value={collection} onValueChange={(value) => {
          setFilter("all");
          setQuery("");
          onSelectMode(MODES.find((entry) => (entry.group ?? "thought") === value).id);
        }}>
          <PremiumTabsList className="mb-5 flex flex-wrap items-center gap-1.5 border-transparent bg-transparent p-0" aria-label="Phenomenon family">
          {COLLECTIONS.map((item) => (
            <PremiumTabsTrigger
              key={item.id}
              value={item.id}
              activeValue={collection}
              layoutId="family-indicator"
              indicatorClassName="rounded-full"
              className="shrink-0 rounded-full border border-[var(--ui-border)]/70 px-3 py-1.5 text-[10px]"
            >
              <span>{item.label}</span>
            </PremiumTabsTrigger>
          ))}
          </PremiumTabsList>
          <PremiumTabsContent value={collection}>
            <div className="mb-3 flex items-center justify-between px-1">
              <p className="text-[10px] font-semibold uppercase text-[var(--ui-muted)]">{FAMILY_LABELS[collection]}</p>
              <span className="text-[9px] tabular-nums text-[var(--ui-muted)]">{String(visibleModes.length).padStart(2, "0")}</span>
            </div>

            <div className="system-list grid h-96 content-start gap-1 overflow-y-auto pr-1">
              {visibleModes.length === 0 ? (
                <div className="grid place-items-center gap-2 rounded-xl border border-dashed border-[var(--ui-border)] px-4 py-8 text-center">
                  <p className="text-xs font-semibold">No phenomena found</p>
                  <button type="button" onClick={() => { setFilter("all"); setQuery(""); }} className="text-[10px] font-semibold underline underline-offset-4">Show all</button>
                </div>
              ) : null}
              {visibleModes.map((item, index) => (
                <div key={item.id} className={cn("group flex min-w-0 items-center rounded-xl border transition-colors duration-150", mode === item.id ? "border-[var(--ui-ink)] bg-[var(--ui-ink)] text-[var(--page-bg)]" : "border-transparent text-[var(--ui-muted)] hover:border-[var(--ui-border)]")}>
                  <button type="button" onClick={() => onSelectMode(item.id)} className="control-button flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2.5 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-ink)]" aria-pressed={mode === item.id}>
                    <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg border", mode === item.id ? "border-[var(--page-bg)]/25 bg-[var(--page-bg)]/10" : "border-[var(--ui-border)] bg-[var(--page-bg)]/40")}><MotionGlyph mode={item.id} className="size-5" /></span>
                    <span className="grid min-w-0 flex-1 gap-0.5">
                      <span className={cn("truncate text-[11px] font-semibold", mode === item.id ? "text-[var(--page-bg)]" : "text-[var(--ui-ink)]")}>{item.label}</span>
                      <span className={cn("truncate text-[9px]", mode === item.id ? "text-[var(--page-bg)]/65" : "text-[var(--ui-muted)]")}>{item.note}</span>
                    </span>
                    <span className="shrink-0 text-[9px] tabular-nums opacity-45">{String(index + 1).padStart(2, "0")}</span>
                  </button>
                  <button type="button" onClick={() => toggleFavorite(item.id)} className="control-button mr-1 grid size-9 shrink-0 place-items-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current" aria-label={`${favorites.includes(item.id) ? "Remove" : "Add"} ${item.label} ${favorites.includes(item.id) ? "from" : "to"} favorites`} aria-pressed={favorites.includes(item.id)}>
                    <Icon name={favorites.includes(item.id) ? "starFilled" : "star"} className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </PremiumTabsContent>
        </PremiumTabs>
    </nav>
  );
}

function ControlDock({ collection, favorites, mode, onSelectMode, palette, recent, setPaletteId, settings, setSettings, onRandomize, onReset, toggleFavorite }) {
  const [panel, setPanel] = useState("phenomena");

  return (
    <PremiumTabs
      value={panel}
      onValueChange={setPanel}
      className="overflow-hidden rounded-3xl border border-[var(--ui-border)] bg-[var(--ui-panel)] shadow-sm"
    >
      <div className="border-b border-[var(--ui-border)] p-2">
        <PremiumTabsList className="grid-cols-2 border-transparent bg-[var(--page-bg)]/55" aria-label="Studio workspace">
          <PremiumTabsTrigger
            value="phenomena"
            activeValue={panel}
            activeClassName="text-[var(--page-bg)]"
            indicatorClassName="border-[var(--ui-ink)] bg-[var(--ui-ink)] shadow-none"
            layoutId="workspace-tab-indicator"
          >
            <Icon name="systems" className="size-4" />
            Phenomena
          </PremiumTabsTrigger>
          <PremiumTabsTrigger
            value="tuning"
            activeValue={panel}
            activeClassName="text-[var(--page-bg)]"
            indicatorClassName="border-[var(--ui-ink)] bg-[var(--ui-ink)] shadow-none"
            layoutId="workspace-tab-indicator"
          >
            <Icon name="tuning" className="size-4" />
            Tuning
          </PremiumTabsTrigger>
        </PremiumTabsList>
      </div>

      <PremiumTabsContent value="phenomena">
        <PresetLibrary collection={collection} favorites={favorites} mode={mode} onSelectMode={onSelectMode} recent={recent} toggleFavorite={toggleFavorite} />
      </PremiumTabsContent>
      <PremiumTabsContent value="tuning">
        <StudioPanel
          mode={mode}
          palette={palette}
          setPaletteId={setPaletteId}
          settings={settings}
          setSettings={setSettings}
          onRandomize={onRandomize}
          onReset={onReset}
        />
      </PremiumTabsContent>
    </PremiumTabs>
  );
}

function Mark() {
  return (
    <div className="grid size-8 grid-cols-3 gap-1" aria-hidden="true">
      {Array.from({ length: 9 }, (_, index) => (
        <span key={index} className={cn("rounded-full bg-[var(--ui-ink)]", index === 4 && "opacity-30")} />
      ))}
    </div>
  );
}

export { ControlDock, Mark, PaletteGrid, SectionLabel, Slider };
