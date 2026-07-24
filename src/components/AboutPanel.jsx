import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import BottomSheet from "./BottomSheet";
import { COLLECTIONS, MODES, PALETTES } from "../config/studio";
import { Icon } from "./StudioIcons";

const STACK = [
  { name: "React 19", role: "UI and component state" },
  { name: "Vite", role: "dev server and production build" },
  { name: "Canvas 2D", role: "every simulation renders via requestAnimationFrame, no physics engine" },
  { name: "motion/react", role: "panel, control, and stage transitions" },
  { name: "Tailwind CSS v4", role: "styling" },
  { name: "Radix UI", role: "accessible tab primitives" },
];

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 639px)");
    const handleChange = (event) => setIsMobile(event.matches);
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  return isMobile;
}

function AboutBody({ onClose }) {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ui-muted)]">About</p>
          <h2 id="about-panel-title" className="text-lg font-semibold">Phenomena</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close about panel"
          className="grid size-8 shrink-0 place-items-center rounded-full border border-[var(--ui-border)] transition-transform duration-150 active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-ink)]"
        >
          <Icon name="close" className="size-3.5" />
        </button>
      </div>

      <p className="mt-3 text-sm text-[var(--ui-muted)]">
        A generative gallery of particle and physics simulations, rendered live and shaped by pointer interaction.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-[var(--ui-border)] py-2">
          <p className="text-base font-semibold tabular-nums">{MODES.length}</p>
          <p className="text-[9px] uppercase text-[var(--ui-muted)]">systems</p>
        </div>
        <div className="rounded-xl border border-[var(--ui-border)] py-2">
          <p className="text-base font-semibold tabular-nums">{COLLECTIONS.length}</p>
          <p className="text-[9px] uppercase text-[var(--ui-muted)]">families</p>
        </div>
        <div className="rounded-xl border border-[var(--ui-border)] py-2">
          <p className="text-base font-semibold tabular-nums">{PALETTES.length}</p>
          <p className="text-[9px] uppercase text-[var(--ui-muted)]">palettes</p>
        </div>
      </div>

      <p className="mt-4 text-[10px] font-semibold uppercase tracking-wide text-[var(--ui-muted)]">Built with</p>
      <ul className="mt-2 space-y-1.5">
        {STACK.map((item) => (
          <li key={item.name} className="flex items-baseline gap-2 text-xs">
            <span className="font-medium">{item.name}</span>
            <span className="text-[var(--ui-muted)]">{item.role}</span>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-[10px] text-[var(--ui-muted)]">
        Every motion is a pure function of time — no physics engine, no simulation dependencies.
      </p>
    </>
  );
}

function DesktopDialog({ onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4"
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-panel-title"
        initial={{ opacity: 0, transform: "scale(0.96) translateY(6px)" }}
        animate={{ opacity: 1, transform: "scale(1) translateY(0px)" }}
        exit={{ opacity: 0, transform: "scale(0.96) translateY(6px)" }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="max-h-[85dvh] w-full max-w-sm overflow-y-auto rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-panel)] p-5 text-[var(--ui-ink)] shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <AboutBody onClose={onClose} />
      </motion.div>
    </motion.div>
  );
}

function MobileSheet({ onClose }) {
  return (
    <BottomSheet onClose={onClose} labelledBy="about-panel-title" className="max-h-[85dvh]" contentClassName="px-5 pb-5">
      <AboutBody onClose={onClose} />
    </BottomSheet>
  );
}

export default function AboutPanel({ open, onClose }) {
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (isMobile ? <MobileSheet onClose={onClose} /> : <DesktopDialog onClose={onClose} />) : null}
    </AnimatePresence>
  );
}
