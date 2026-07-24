import { cn } from "../lib/utils";

const DIMENSIONS = [
  { id: "2d", href: "/gallery.html", label: "2D" },
  { id: "3d", href: "/spatial.html", label: "3D" },
];

function getDimensionHref(id, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const key = id === "2d" ? "phenomena:2d:v1" : "phenomena:3d:v1";
    const stored = JSON.parse(window.localStorage.getItem(key))?.data;
    if (!stored?.lastMode) return fallback;
    const url = new URL(fallback, window.location.origin);
    url.searchParams.set("scene", stored.lastMode);
    if (stored.paletteId) url.searchParams.set("palette", stored.paletteId);
    if (id === "3d" && stored.category) url.searchParams.set("category", stored.category);
    return `${url.pathname}${url.search}`;
  } catch {
    return fallback;
  }
}

function DimensionSwitch({ active }) {
  return (
    <nav
      className="flex shrink-0 rounded-full border border-[var(--ui-border)] bg-[var(--page-bg)] p-0.5"
      aria-label="Choose particle laboratory dimension"
    >
      {DIMENSIONS.map((dimension) => {
        const isActive = dimension.id === active;
        return (
          <a
            key={dimension.id}
            href={getDimensionHref(dimension.id, dimension.href)}
            className={cn(
              "control-button grid min-h-7 min-w-9 place-items-center rounded-full px-2 text-[10px] font-semibold transition-transform duration-150 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-ink)] sm:min-w-11",
              isActive
                ? "bg-[var(--ui-ink)] text-[var(--page-bg)]"
                : "text-[var(--ui-muted)] hover:text-[var(--ui-ink)]",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {dimension.label}
          </a>
        );
      })}
    </nav>
  );
}

export default DimensionSwitch;
