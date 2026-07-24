// Landing page mounted at "/" (src/landing-main.jsx) — picks between the 2D gallery
// (/gallery.html) and the 3D lab (/spatial.html), with small live particle previews.
import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import LivePreviewCanvas from "./components/LivePreviewCanvas";
import { Mark } from "./components/StudioControls";
import { Icon } from "./components/StudioIcons";
import { COLLECTIONS, MODES, PALETTES, UI_THEME } from "./config/studio";
import { createBloomPreviewDraw, createGalaxyPreviewDraw } from "./lib/landingPreviews";

const SPATIAL_SYSTEM_COUNT = 34;
const SPATIAL_FAMILIES = ["Cosmos", "Quantum", "Fields", "Structures", "Living", "Fluid", "Mechanical", "Light", "Future"];
const HIGHLIGHTS = [
  { label: "Black Hole Engine", href: "/spatial.html?scene=blackhole" },
  { label: "Starship Launch", href: "/spatial.html?scene=starshiplaunch3d" },
  { label: "Möbius Loop", href: "/gallery.html?scene=mobius" },
  { label: "Strange Attractor", href: "/gallery.html?scene=attractor" },
  { label: "Cymatics", href: "/gallery.html?scene=cymatics" },
  { label: "Wave Interference", href: "/gallery.html?scene=interference" },
];

function ParticlePreview({ spatial = false }) {
  const palette = PALETTES.find((item) => item.id === (spatial ? "obsidian" : "porcelain"));
  const draw = useMemo(
    () => (spatial ? createGalaxyPreviewDraw(palette.stageInk) : createBloomPreviewDraw(palette.stageInk)),
    [spatial, palette.stageInk],
  );

  return (
    <div
      className="relative h-52 overflow-hidden border-b border-current/15 sm:h-64"
      style={{ backgroundColor: palette.background, color: palette.stageInk }}
      aria-hidden="true"
    >
      <div className={`particle-preview-plane particle-preview-plane--${spatial ? "3d" : "2d"} absolute inset-0 transition-transform duration-150`}>
        <LivePreviewCanvas className="block size-full" draw={draw} />
      </div>
      <div className="absolute inset-x-5 bottom-4 flex items-center justify-between text-[9px] font-semibold uppercase opacity-60">
        <span>{spatial ? "Depth · Orbit · Zoom" : "Flow · Force · Time"}</span>
        <span className="tabular-nums">{spatial ? "03 AXES" : "02 AXES"}</span>
      </div>
    </div>
  );
}

function LabCard({ description, href, label, meta, spatial = false }) {
  return (
    <a
      href={href}
      className="lab-card control-button group block w-full min-w-0 overflow-hidden rounded-3xl border border-[var(--ui-border)] bg-[var(--ui-panel)] text-[var(--ui-ink)] shadow-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--ui-ink)]"
    >
      <ParticlePreview spatial={spatial} />
      <div className="flex items-end justify-between gap-6 p-5 sm:p-6">
        <div>
          <p className="text-[10px] font-semibold uppercase text-[var(--ui-muted)]">{meta}</p>
          <h2 className="mt-2 text-balance font-serif text-2xl sm:text-3xl">{label}</h2>
          <p className="mt-2 max-w-sm text-pretty text-xs leading-relaxed text-[var(--ui-muted)]">{description}</p>
        </div>
        <span className="lab-card-arrow grid size-11 shrink-0 place-items-center rounded-full bg-[var(--ui-ink)] text-[var(--page-bg)] transition-transform duration-150" aria-hidden="true">
          <Icon name={spatial ? "spatial" : "gallery"} className="size-4" />
        </span>
      </div>
    </a>
  );
}

function FeatureCard({ description, icon, index, label, shouldReduceMotion, value }) {
  return (
    <motion.article
      initial={{ opacity: 0, transform: shouldReduceMotion ? "translateY(0px)" : "translateY(8px)" }}
      whileInView={{ opacity: 1, transform: "translateY(0px)" }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.18, delay: shouldReduceMotion ? 0 : index * 0.045, ease: "easeOut" }}
      className="rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-panel)] p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <span className="grid size-10 place-items-center rounded-xl bg-[var(--ui-ink)] text-[var(--page-bg)]">
          <Icon name={icon} className="size-4" />
        </span>
        <span className="text-[10px] font-semibold tabular-nums text-[var(--ui-muted)]">{value}</span>
      </div>
      <h3 className="mt-8 text-balance font-serif text-2xl">{label}</h3>
      <p className="mt-2 text-pretty text-xs leading-relaxed text-[var(--ui-muted)]">{description}</p>
    </motion.article>
  );
}

export default function LandingApp() {
  const shouldReduceMotion = useReducedMotion();
  const themeStyle = {
    "--page-bg": UI_THEME.background,
    "--ui-panel": UI_THEME.panel,
    "--ui-ink": UI_THEME.ink,
    "--ui-muted": UI_THEME.muted,
    "--ui-border": UI_THEME.border,
    backgroundColor: UI_THEME.background,
  };

  return (
    <main style={themeStyle} className="min-h-dvh overflow-x-hidden text-[var(--ui-ink)] selection:bg-[var(--ui-ink)] selection:text-[var(--page-bg)]">
      <header className="border-b border-[var(--ui-border)]">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between px-4 pt-[env(safe-area-inset-top)] sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Mark />
            <div>
              <p className="text-sm font-semibold">Phenomena</p>
              <p className="hidden text-[10px] text-[var(--ui-muted)] sm:block">Particle laboratory</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <p className="hidden text-[10px] text-[var(--ui-muted)] md:block">{MODES.length + SPATIAL_SYSTEM_COUNT} SYSTEMS · {COLLECTIONS.length + 9} FAMILIES · {PALETTES.length} PALETTES</p>
            <span className="flex items-center gap-1.5 rounded-full border border-[var(--ui-border)] p-2 text-[10px] font-semibold sm:px-2.5 sm:py-1.5" aria-label="Choose a lab">
              <span className="size-1.5 rounded-full bg-zinc-400" />
              <span className="hidden sm:inline">CHOOSE A LAB</span>
            </span>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 pb-14 pt-10 sm:px-6 sm:pb-20 sm:pt-20 lg:px-8">
        <motion.div initial={{ opacity: 0, transform: "translateY(8px)" }} animate={{ opacity: 1, transform: "translateY(0px)" }} transition={{ duration: 0.18, ease: "easeOut" }} className="max-w-4xl">
          <p className="mb-5 text-[10px] font-semibold uppercase text-[var(--ui-muted)]">An interactive study of motion</p>
          <h1 className="text-balance font-serif text-4xl leading-none sm:text-7xl lg:text-8xl">Everything is made of particles.</h1>
          <p className="mt-6 max-w-2xl text-pretty text-sm leading-relaxed text-[var(--ui-muted)] sm:text-base">Observe cosmic systems, fluid motion, living structures, light, mathematics, and imagined futures—built live from points in motion.</p>
        </motion.div>

        <div className="mt-12 grid gap-4 lg:mt-16 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, transform: shouldReduceMotion ? "translateY(0px)" : "translateY(8px)" }} animate={{ opacity: 1, transform: "translateY(0px)" }} transition={{ duration: 0.18, delay: shouldReduceMotion ? 0 : 0.12, ease: "easeOut" }}>
            <LabCard href="/gallery.html" label="Explore in 2D" meta={`${MODES.length} systems · Canvas`} description="Direct, graphic particle studies shaped by movement, force, rhythm, and pointer interaction." />
          </motion.div>
          <motion.div initial={{ opacity: 0, transform: shouldReduceMotion ? "translateY(0px)" : "translateY(8px)" }} animate={{ opacity: 1, transform: "translateY(0px)" }} transition={{ duration: 0.18, delay: shouldReduceMotion ? 0 : 0.17, ease: "easeOut" }}>
            <LabCard href="/spatial.html" label="Enter the 3D Lab" meta={`${SPATIAL_SYSTEM_COUNT} systems · WebGL`} description="Spatial particle worlds with orbit, depth, camera movement, and an automatic Canvas fallback." spatial />
          </motion.div>
        </div>

        <div className="mt-8 grid gap-5 border-y border-[var(--ui-border)] py-5 lg:grid-cols-[10rem_minmax(0,1fr)] lg:items-start">
          <div>
            <p className="text-[10px] font-semibold uppercase text-[var(--ui-muted)]">A few to start with</p>
            <p className="mt-1 text-xs font-semibold tabular-nums">{COLLECTIONS.length + SPATIAL_FAMILIES.length} families</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {HIGHLIGHTS.map((item) => (
              <a key={item.label} href={item.href} className="control-button rounded-full border border-[var(--ui-border)] bg-[var(--ui-panel)] px-2.5 py-1.5 text-[9px] font-semibold text-[var(--ui-muted)] transition-colors duration-150 hover:border-[var(--ui-ink)] hover:text-[var(--ui-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-ink)]">{item.label}</a>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[var(--ui-border)] bg-[var(--ui-panel)]/45" style={{ contentVisibility: "auto", containIntrinsicSize: "700px" }}>
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:items-end">
            <div>
              <p className="text-[10px] font-semibold uppercase text-[var(--ui-muted)]">A live instrument</p>
              <h2 className="mt-3 max-w-lg text-balance font-serif text-4xl sm:text-5xl">Look closely. Then change the rules.</h2>
            </div>
            <p className="max-w-xl text-pretty text-sm leading-relaxed text-[var(--ui-muted)] lg:justify-self-end">Every scene begins as an observation and becomes an instrument. Move through it, change its forces, and find a different expression without leaving the particle language.</p>
          </div>

          <div className="mt-10 grid gap-3 md:grid-cols-3">
            <FeatureCard icon="systems" index={0} shouldReduceMotion={shouldReduceMotion} value="01" label="Choose a system" description="Move from cosmic structures to fluid flow, chemistry, light, life, and imagined futures." />
            <FeatureCard icon="attract" index={1} shouldReduceMotion={shouldReduceMotion} value="02" label="Shape the motion" description="Attract, repel, disturb, orbit, pan, and zoom with pointer or touch gestures." />
            <FeatureCard icon="tuning" index={2} shouldReduceMotion={shouldReduceMotion} value="03" label="Tune the instrument" description="Adjust speed, density, size, forces, camera, quality, and color without interrupting the scene." />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8" style={{ contentVisibility: "auto", containIntrinsicSize: "600px" }}>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-center">
          <div>
            <p className="text-[10px] font-semibold uppercase text-[var(--ui-muted)]">One system, many atmospheres</p>
            <h2 className="mt-3 text-balance font-serif text-4xl sm:text-5xl">Change the light. Keep the physics.</h2>
            <p className="mt-4 max-w-md text-pretty text-sm leading-relaxed text-[var(--ui-muted)]">Every palette is designed as a complete viewing environment—not a color filter—so particles, connections, and depth remain legible.</p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PALETTES.map((palette, index) => (
              <motion.div
                key={palette.id}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.16, delay: shouldReduceMotion ? 0 : index * 0.03, ease: "easeOut" }}
                className="overflow-hidden rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-panel)]"
              >
                <div className="relative h-24 border-b border-black/10" style={{ backgroundColor: palette.background }}>
                  {palette.colors.map((color, index) => (
                    <span key={color} className="absolute rounded-full" style={{ backgroundColor: color, height: `${6 + index * 2}px`, left: `${24 + index * 25}%`, top: `${28 + ((index * 17) % 34)}%`, width: `${6 + index * 2}px` }} />
                  ))}
                  <span className="absolute left-[18%] right-[15%] top-1/2 h-px -rotate-6 opacity-40" style={{ backgroundColor: palette.connection }} />
                </div>
                <p className="truncate px-3 py-2.5 text-[10px] font-semibold">{palette.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--ui-border)] bg-[var(--ui-ink)] text-[var(--page-bg)]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:px-8">
          <div>
            <p className="text-[10px] font-semibold uppercase opacity-55">Ready when you are</p>
            <h2 className="mt-3 max-w-2xl text-balance font-serif text-4xl sm:text-5xl">Begin with a single point.</h2>
            <p className="mt-3 text-pretty text-xs opacity-65">No account. No loading screen. The full 2D and 3D renderers only load once you enter a lab.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <a href="/gallery.html" className="control-button flex min-h-12 min-w-44 items-center justify-between rounded-full bg-[var(--page-bg)] px-5 text-xs font-semibold text-[var(--ui-ink)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--page-bg)]">Explore 2D<Icon name="gallery" className="size-4" /></a>
            <a href="/spatial.html" className="control-button flex min-h-12 min-w-44 items-center justify-between rounded-full border border-[var(--page-bg)]/35 px-5 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--page-bg)]">Enter 3D<Icon name="spatial" className="size-4" /></a>
          </div>
        </div>
      </section>

      <footer className="bg-[var(--ui-ink)] text-[var(--page-bg)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 border-t border-[var(--page-bg)]/15 px-4 py-5 text-[9px] opacity-55 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>Phenomena · A particle laboratory</p>
          <p>Motion pauses off-screen · Reduced motion supported · Canvas fallback included</p>
        </div>
      </footer>
    </main>
  );
}
