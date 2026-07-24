// Dedicated canvas simulation for the "cymatics" mode: sand-like grains settle into
// the standing-wave (Chladni) nodal pattern of a vibrating plate, driven by the
// "density" setting relabeled as frequency (Hz) — see StudioControls.jsx's per-mode relabeling.
import { useCallback, useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { getQualityProfile, getRenderDpr } from "./quality";

const MAX_GRAINS = 920;
const TAU = Math.PI * 2;

function seeded(index, salt = 0) {
  const value = Math.sin(index * 83.17 + salt * 47.23) * 43758.5453;
  return value - Math.floor(value);
}

function plateMode(x, y, firstMode, secondMode) {
  return Math.sin(firstMode * Math.PI * x) * Math.sin(secondMode * Math.PI * y)
    - Math.sin(secondMode * Math.PI * x) * Math.sin(firstMode * Math.PI * y);
}

function nodeGradient(x, y, firstMode, secondMode) {
  const epsilon = 0.0025;
  const horizontal = (Math.abs(plateMode(x + epsilon, y, firstMode, secondMode)) - Math.abs(plateMode(x - epsilon, y, firstMode, secondMode))) / (epsilon * 2);
  const vertical = (Math.abs(plateMode(x, y + epsilon, firstMode, secondMode)) - Math.abs(plateMode(x, y - epsilon, firstMode, secondMode))) / (epsilon * 2);
  return { x: horizontal, y: vertical };
}

export default function CymaticsField({ palette, settings }) {
  const canvasRef = useRef(null);
  const paletteRef = useRef(palette);
  const settingsRef = useRef(settings);
  const pointerRef = useRef({ x: 0.5, y: 0.5, active: false });
  const reduceMotion = useReducedMotion();
  paletteRef.current = palette;
  settingsRef.current = settings;

  const updatePointer = useCallback((event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    pointerRef.current = { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height, active: true };
  }, []);
  const releasePointer = useCallback(() => { pointerRef.current.active = false; }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const seedOffset = settingsRef.current.seed * MAX_GRAINS;
    const grains = Array.from({ length: MAX_GRAINS }, (_, index) => ({
      x: seeded(index + seedOffset, 1),
      y: seeded(index + seedOffset, 2),
      vx: 0,
      vy: 0,
      size: 0.45 + seeded(index + seedOffset, 3) * 0.9,
      phase: seeded(index + seedOffset, 4) * TAU,
    }));
    let width = 1;
    let height = 1;
    let elapsed = 0;
    let previous = 0;
    let frame = 0;
    let visible = true;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = getRenderDpr(settingsRef.current.quality);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const resizeObserver = new ResizeObserver(resize);
    const intersectionObserver = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; previous = 0; });
    resizeObserver.observe(canvas);
    intersectionObserver.observe(canvas);
    resize();

    const render = (timestamp) => {
      if (visible) {
        const currentSettings = settingsRef.current;
        const currentPalette = paletteRef.current;
        const pointer = pointerRef.current;
        const delta = previous ? Math.min((timestamp - previous) / 1000, 0.032) : 0;
        previous = timestamp;
        if (!currentSettings.paused && !reduceMotion) elapsed += delta * currentSettings.speed;
        const frequencyControl = pointer.active && currentSettings.interaction !== "none" ? pointer.x : currentSettings.density;
        const firstMode = 2 + Math.floor(frequencyControl * 4);
        const secondMode = firstMode + 1 + Math.floor(frequencyControl * 3);
        const quality = getQualityProfile(currentSettings.quality);
        const count = Math.min(MAX_GRAINS, Math.round((360 + currentSettings.density * (MAX_GRAINS - 360)) * quality.particles));
        const damping = 0.82 + currentSettings.trail * 0.13;
        const plateSize = Math.min(width * 0.72, height * 0.72);
        const plateX = (width - plateSize) / 2;
        const plateY = (height - plateSize) / 2;
        const pointerX = (pointer.x * width - plateX) / plateSize;
        const pointerY = (pointer.y * height - plateY) / plateSize;

        if (!currentSettings.paused && !reduceMotion) {
          for (let index = 0; index < count; index += 1) {
            const grain = grains[index];
            const gradient = nodeGradient(grain.x, grain.y, firstMode, secondMode);
            const fieldStrength = Math.abs(plateMode(grain.x, grain.y, firstMode, secondMode));
            const vibration = fieldStrength * currentSettings.energy * 0.00055;
            grain.vx = (grain.vx - gradient.x * delta * 0.032 + Math.cos(elapsed * 23 + grain.phase) * vibration) * Math.pow(damping, delta * 60);
            grain.vy = (grain.vy - gradient.y * delta * 0.032 + Math.sin(elapsed * 19 + grain.phase) * vibration) * Math.pow(damping, delta * 60);

            if (pointer.active && currentSettings.interaction !== "none") {
              const dx = grain.x - pointerX;
              const dy = grain.y - pointerY;
              const distance = Math.max(0.018, Math.hypot(dx, dy));
              const radius = 0.05 + currentSettings.interactionRadius * 0.22;
              const force = Math.max(0, 1 - distance / radius) * delta * (0.08 + currentSettings.interactionStrength * 0.46);
              grain.vx += (dx / distance) * force;
              grain.vy += (dy / distance) * force;
            }
            grain.x += grain.vx;
            grain.y += grain.vy;
            if (grain.x < 0 || grain.x > 1) { grain.x = Math.max(0, Math.min(1, grain.x)); grain.vx *= -0.55; }
            if (grain.y < 0 || grain.y > 1) { grain.y = Math.max(0, Math.min(1, grain.y)); grain.vy *= -0.55; }
          }
        }

        context.clearRect(0, 0, width, height);
        context.fillStyle = currentPalette.stageInk;
        context.globalAlpha = 0.055;
        context.fillRect(plateX, plateY, plateSize, plateSize);
        context.strokeStyle = currentPalette.connection;
        context.globalAlpha = 0.38;
        context.lineWidth = 1;
        context.strokeRect(plateX, plateY, plateSize, plateSize);

        context.fillStyle = currentPalette.colors[0];
        for (let index = 0; index < count; index += 1) {
          const grain = grains[index];
          const fieldStrength = Math.abs(plateMode(grain.x, grain.y, firstMode, secondMode));
          context.globalAlpha = 0.32 + (1 - Math.min(1, fieldStrength * 4)) * 0.64;
          context.beginPath();
          context.arc(plateX + grain.x * plateSize, plateY + grain.y * plateSize, grain.size * currentSettings.size, 0, TAU);
          context.fill();
        }

        const centerPulse = 3 + Math.abs(Math.sin(elapsed * firstMode)) * 4 * currentSettings.energy;
        context.fillStyle = currentPalette.colors[2];
        context.globalAlpha = 0.72;
        context.beginPath();
        context.arc(width / 2, height / 2, centerPulse, 0, TAU);
        context.fill();
        context.globalAlpha = 1;
      }
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
    };
  }, [reduceMotion]);

  return <canvas ref={canvasRef} className="size-full touch-none cursor-crosshair" role="img" aria-label={`Interactive cymatics sand plate in the ${palette.label} palette`} onPointerMove={updatePointer} onPointerDown={updatePointer} onPointerLeave={releasePointer} />;
}
