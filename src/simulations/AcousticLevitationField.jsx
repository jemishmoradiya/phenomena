// Dedicated canvas simulation for the "levitation" mode: particles hover at the
// pressure nodes of a simulated standing ultrasonic wave field, shifting phase
// as the pointer moves — distinct physics from the shared particle router.
import { useCallback, useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { getQualityProfile, getRenderDpr } from "./quality";

const MAX_PARTICLES = 240;
const TAU = Math.PI * 2;

function seeded(index, salt = 0) {
  const value = Math.sin(index * 67.71 + salt * 53.13) * 43758.5453;
  return value - Math.floor(value);
}

export default function AcousticLevitationField({ palette, settings }) {
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
    const seedOffset = settingsRef.current.seed * MAX_PARTICLES;
    const particles = Array.from({ length: MAX_PARTICLES }, (_, index) => ({
      x: 0.18 + seeded(index + seedOffset, 1) * 0.64,
      y: 0.16 + seeded(index + seedOffset, 2) * 0.68,
      vx: (seeded(index + seedOffset, 3) - 0.5) * 0.015,
      vy: 0,
      size: 0.65 + seeded(index + seedOffset, 4) * 1.35,
      phase: seeded(index + seedOffset, 5) * TAU,
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
        const nodeCount = 4 + Math.floor(currentSettings.density * 7);
        const top = 0.15;
        const bottom = 0.85;
        const spacing = (bottom - top) / nodeCount;
        const phaseStrength = (0.4 + currentSettings.interactionStrength * 1.6) * (0.7 + currentSettings.interactionRadius * 0.6);
        const phaseShift = pointer.active && currentSettings.interaction !== "none" ? (pointer.y - 0.5) * spacing * phaseStrength : Math.sin(elapsed * 0.45) * spacing * 0.12;
        const quality = getQualityProfile(currentSettings.quality);
        const count = Math.min(MAX_PARTICLES, Math.round((80 + currentSettings.density * (MAX_PARTICLES - 80)) * quality.particles));
        const damping = 0.87 + currentSettings.trail * 0.09;

        if (!currentSettings.paused && !reduceMotion) {
          for (let index = 0; index < count; index += 1) {
            const particle = particles[index];
            const nodeIndex = Math.max(0, Math.min(nodeCount, Math.round((particle.y - top - phaseShift) / spacing)));
            const nodeY = top + nodeIndex * spacing + phaseShift;
            const verticalDistance = nodeY - particle.y;
            const pressure = Math.sin(((particle.y - top - phaseShift) / spacing) * Math.PI);
            const springConstant = 5.5 + currentSettings.energy * 4.5;
            const dampingCoefficient = 1.8 * Math.sqrt(springConstant);
            particle.vy += (verticalDistance * springConstant - particle.vy * dampingCoefficient) * delta;
            particle.vx += Math.sin(elapsed * 1.6 + particle.phase) * Math.abs(pressure) * delta * 0.0035;
            particle.vx *= Math.pow(damping, delta * 60);
            particle.x += particle.vx * delta * 12;
            particle.y += particle.vy * delta;
            if (particle.x < 0.14 || particle.x > 0.86) { particle.x = Math.max(0.14, Math.min(0.86, particle.x)); particle.vx *= -0.72; }
            if (particle.y < top || particle.y > bottom) { particle.y = Math.max(top, Math.min(bottom, particle.y)); particle.vy *= -0.5; }
          }
        }

        context.clearRect(0, 0, width, height);
        const fieldLeft = width * 0.19;
        const fieldRight = width * 0.81;
        const topY = height * top;
        const bottomY = height * bottom;
        const nodeSpacingPx = height * spacing;

        for (let index = 0; index <= nodeCount * 2; index += 1) {
          const y = topY + index * nodeSpacingPx * 0.5 + phaseShift * height;
          if (y < topY || y > bottomY) continue;
          const isNode = index % 2 === 0;
          context.strokeStyle = isNode ? currentPalette.colors[2] : currentPalette.connection;
          context.globalAlpha = isNode ? 0.2 : 0.07;
          context.lineWidth = isNode ? 0.8 : 0.5;
          context.beginPath();
          const segments = 42;
          for (let segment = 0; segment <= segments; segment += 1) {
            const ratio = segment / segments;
            const x = fieldLeft + ratio * (fieldRight - fieldLeft);
            const wave = isNode ? 0 : Math.sin(ratio * TAU * 2 + elapsed * 6) * 4 * currentSettings.energy;
            if (segment === 0) context.moveTo(x, y + wave); else context.lineTo(x, y + wave);
          }
          context.stroke();
        }

        const transducerGradient = context.createLinearGradient(fieldLeft, 0, fieldRight, 0);
        transducerGradient.addColorStop(0, currentPalette.colors[1]);
        transducerGradient.addColorStop(0.5, currentPalette.stageInk);
        transducerGradient.addColorStop(1, currentPalette.colors[1]);
        context.globalAlpha = 0.92;
        context.fillStyle = transducerGradient;
        context.fillRect(fieldLeft, topY - 14, fieldRight - fieldLeft, 12);
        context.fillRect(fieldLeft, bottomY + 2, fieldRight - fieldLeft, 12);
        context.globalAlpha = 0.28;
        context.strokeStyle = currentPalette.connection;
        for (let x = fieldLeft + 8; x < fieldRight; x += 16) {
          context.beginPath();
          context.moveTo(x, topY - 14);
          context.lineTo(x, topY - 2);
          context.moveTo(x, bottomY + 2);
          context.lineTo(x, bottomY + 14);
          context.stroke();
        }

        for (let index = 0; index < count; index += 1) {
          const particle = particles[index];
          const pulse = 0.74 + Math.sin(elapsed * 4 + particle.phase) * 0.2;
          context.fillStyle = index % 9 === 0 ? currentPalette.colors[2] : currentPalette.colors[0];
          context.globalAlpha = pulse;
          context.beginPath();
          context.arc(particle.x * width, particle.y * height, particle.size * currentSettings.size, 0, TAU);
          context.fill();
        }
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

  return <canvas ref={canvasRef} className="size-full touch-none cursor-ns-resize" role="img" aria-label={`Interactive acoustic levitation field in the ${palette.label} palette`} onPointerMove={updatePointer} onPointerDown={updatePointer} onPointerLeave={releasePointer} />;
}
