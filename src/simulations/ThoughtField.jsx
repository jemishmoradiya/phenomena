// Shared canvas renderer for the majority of 2D gallery modes (anything not in
// App.jsx's DEDICATED_MODES). Each frame it asks particleTargetRouter's getTarget()
// for a target position per particle, then eases each particle toward that target
// and draws it — see CLAUDE.md's "Generic particle field" section.
import { useCallback, useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { MAX_PARTICLES, REDUCED_MOTION_TIMES, TAU } from "../config/studio";
import { hexToRgb, seeded } from "./particleTargets";
import { getTarget } from "./particleTargetRouter";
import { getQualityProfile, getRenderDpr } from "./quality";

function ThoughtField({ mode, palette, settings }) {
  const canvasRef = useRef(null);
  const pointerRef = useRef({ x: 0, y: 0, active: false });
  const modeRef = useRef(mode);
  const paletteRef = useRef(palette);
  const settingsRef = useRef(settings);
  const reduceMotion = useReducedMotion();

  modeRef.current = mode;
  paletteRef.current = palette;
  settingsRef.current = settings;

  const handlePointerMove = useCallback((event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    pointerRef.current = {
      x: (event.clientX - rect.left - rect.width / 2) / (Math.min(rect.width, rect.height) * 0.34),
      y: (event.clientY - rect.top - rect.height / 2) / (Math.min(rect.width, rect.height) * 0.34),
      active: true,
    };
  }, []);

  const handlePointerLeave = useCallback(() => {
    pointerRef.current.active = false;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d", { alpha: true });
    let frame = 0;
    let visible = true;
    let width = 0;
    let height = 0;
    let elapsed = 0;
    let previousTimestamp = 0;
    const particleCapacity = Math.round(MAX_PARTICLES * 1.25);
    const seedOffset = settingsRef.current.seed * particleCapacity;
    const particles = Array.from({ length: particleCapacity }, (_, index) => ({
      x: (seeded(index + seedOffset, 5) - 0.5) * 1.6,
      y: (seeded(index + seedOffset, 8) - 0.5) * 1.6,
      size: 0.65 + seeded(index + seedOffset, 11) * 1.5,
      color: seeded(index + seedOffset, 14),
    }));

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = getRenderDpr(settingsRef.current.quality);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      previousTimestamp = 0;
    });
    const resizeObserver = new ResizeObserver(resize);
    observer.observe(canvas);
    resizeObserver.observe(canvas);
    resize();

    const render = (timestamp = 0) => {
      const currentSettings = settingsRef.current;
      const currentPalette = paletteRef.current;

      if (visible) {
        const delta = previousTimestamp ? Math.min((timestamp - previousTimestamp) / 1000, 0.05) : 0;
        previousTimestamp = timestamp;
        if (!currentSettings.paused && !reduceMotion) elapsed += delta * currentSettings.speed;

        if (currentSettings.trail > 0 && !reduceMotion) {
          context.fillStyle = `rgba(${hexToRgb(currentPalette.background)}, ${0.5 - currentSettings.trail * 0.38})`;
          context.fillRect(0, 0, width, height);
        } else {
          context.clearRect(0, 0, width, height);
        }

        const quality = getQualityProfile(currentSettings.quality);
        const count = Math.min(particleCapacity, Math.round((80 + currentSettings.density * (MAX_PARTICLES - 80)) * quality.particles));
        const scale = Math.min(width, height) * 0.34;
        const centerX = width / 2;
        const centerY = height / 2;
        const pointer = pointerRef.current;

        for (let index = 0; index < count; index += 1) {
          const particle = particles[index];
          const renderTime = reduceMotion
            ? REDUCED_MOTION_TIMES[modeRef.current] ?? elapsed
            : elapsed;
          const target = getTarget(modeRef.current, index, count, renderTime);
          let targetX = target.x;
          let targetY = target.y;
          const intensityScale = 0.76 + currentSettings.energy * 0.24;
          targetX *= intensityScale;
          targetY *= intensityScale;

          if (pointer.active && currentSettings.interaction !== "none") {
            const dx = pointer.x - targetX;
            const dy = pointer.y - targetY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const radius = 0.45 + currentSettings.interactionRadius * 1.35;
            const strength = 0.06 + currentSettings.interactionStrength * 0.38;
            const influence = Math.max(0, 1 - distance / radius) * strength;

            if (currentSettings.interaction === "attract") {
              targetX += dx * influence;
              targetY += dy * influence;
            } else if (currentSettings.interaction === "repel") {
              targetX -= dx * influence;
              targetY -= dy * influence;
            } else {
              targetX += -dy * influence;
              targetY += dx * influence;
            }
          }

          const smoothing = reduceMotion ? 1 : 0.055;
          particle.x += (targetX - particle.x) * smoothing;
          particle.y += (targetY - particle.y) * smoothing;

          const px = centerX + particle.x * scale;
          const py = centerY + particle.y * scale;
          const radius = particle.size * currentSettings.size * (0.55 + target.depth * 0.75);
          const isAccent = particle.color >= 0.95 || (target.depth >= 0.96 && particle.color >= 0.88);
          const colorIndex = isAccent ? 2 : particle.color >= 0.7 ? 1 : 0;
          context.beginPath();
          context.arc(px, py, radius, 0, TAU);
          context.fillStyle = currentPalette.colors[Math.min(colorIndex, currentPalette.colors.length - 1)];
          context.globalAlpha = 0.3 + target.depth * 0.7;
          context.fill();
        }

        if (["constellation", "cosmicweb", "emergent"].includes(modeRef.current)) {
          const isCosmicWeb = modeRef.current === "cosmicweb";
          const isEmergent = modeRef.current === "emergent";
          const linkedCount = Math.min(count, isCosmicWeb ? 240 : 210);
          const neighborLimit = isCosmicWeb ? 18 : isEmergent ? 10 : 12;
          const distanceLimit = isCosmicWeb ? 0.022 : isEmergent ? 0.011 : 0.014;
          context.strokeStyle = currentPalette.connection;
          context.lineWidth = 0.6;
          context.globalAlpha = isCosmicWeb ? 0.11 : isEmergent ? 0.1 : 0.14;
          for (let index = 0; index < linkedCount; index += 1) {
            const particle = particles[index];
            for (let offset = 1; offset <= neighborLimit && index + offset < linkedCount; offset += 1) {
              const neighbor = particles[index + offset];
              const dx = particle.x - neighbor.x;
              const dy = particle.y - neighbor.y;
              if (dx * dx + dy * dy < distanceLimit) {
                context.beginPath();
                context.moveTo(centerX + particle.x * scale, centerY + particle.y * scale);
                context.lineTo(centerX + neighbor.x * scale, centerY + neighbor.y * scale);
                context.stroke();
              }
            }
          }
        }
        context.globalAlpha = 1;
      }
      frame = requestAnimationFrame(render);
    };

    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resizeObserver.disconnect();
    };
  }, [reduceMotion]);

  return (
    <canvas
      ref={canvasRef}
      className="size-full touch-none"
      role="img"
      aria-label={`${mode} particles in the ${palette.label} palette`}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    />
  );
}

export default ThoughtField;
