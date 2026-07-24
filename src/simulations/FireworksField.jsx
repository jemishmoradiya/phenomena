// Dedicated canvas simulation for the "fireworks" mode: click/tap launches a shell
// that rises and bursts into particles with gravity, drag, and fading trails —
// physics distinct enough from the shared particle router to warrant its own component.
import { useCallback, useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { TAU } from "../config/studio";
import { getQualityProfile, getRenderDpr } from "./quality";

function FireworksField({ palette, settings }) {
  const canvasRef = useRef(null);
  const paletteRef = useRef(palette);
  const settingsRef = useRef(settings);
  const pointerRef = useRef({ x: 0.5, y: 0.42, active: false, launch: false });
  const reduceMotion = useReducedMotion();

  paletteRef.current = palette;
  settingsRef.current = settings;

  const updatePointer = useCallback((event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    pointerRef.current.x = (event.clientX - rect.left) / rect.width;
    pointerRef.current.y = (event.clientY - rect.top) / rect.height;
    pointerRef.current.active = true;
  }, []);

  const launchAtPointer = useCallback((event) => {
    updatePointer(event);
    pointerRef.current.launch = true;
  }, [updatePointer]);

  const releasePointer = useCallback(() => {
    pointerRef.current.active = false;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d", { alpha: true });
    let width = 1;
    let height = 1;
    let frame = 0;
    let visible = true;
    let previousTimestamp = 0;
    let launchClock = 0;
    let shellId = 0;
    const shells = [];
    const sparks = [];
    const smoke = [];

    let randomState = settingsRef.current.seed >>> 0;
    const random = () => {
      randomState += 0x6d2b79f5;
      let value = randomState;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
    const randomBetween = (minimum, maximum) => minimum + random() * (maximum - minimum);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = getRenderDpr(settingsRef.current.quality);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const addSmoke = (x, y, velocityX, velocityY, amount = 1) => {
      for (let index = 0; index < amount; index += 1) {
        smoke.push({
          x: x + randomBetween(-3, 3),
          y: y + randomBetween(-3, 3),
          vx: velocityX * 0.08 + randomBetween(-5, 5),
          vy: velocityY * 0.04 + randomBetween(-7, -1),
          life: randomBetween(0.75, 1.45),
          maxLife: 1.45,
          size: randomBetween(4, 11),
        });
      }
    };

    const launchShell = (targetX, targetY, immediate = false) => {
      const currentPalette = paletteRef.current;
      const originX = targetX == null ? randomBetween(width * 0.18, width * 0.82) : targetX + randomBetween(-width * 0.08, width * 0.08);
      const destinationX = targetX ?? randomBetween(width * 0.18, width * 0.82);
      const destinationY = targetY ?? randomBetween(height * 0.17, height * 0.5);
      const flightTime = randomBetween(0.82, 1.18);
      const gravity = height * 0.34;
      const velocityY = (destinationY - height - 0.5 * gravity * flightTime * flightTime) / flightTime;
      shells.push({
        id: shellId += 1,
        x: originX,
        y: height + 8,
        previousX: originX,
        previousY: height + 8,
        vx: (destinationX - originX) / flightTime,
        vy: velocityY,
        gravity,
        age: immediate ? flightTime * 0.12 : 0,
        fuse: flightTime,
        color: currentPalette.colors[Math.floor(random() * currentPalette.colors.length)],
        pattern: Math.floor(random() * 4),
        smokeClock: 0,
      });
    };

    const explodeShell = (shell) => {
      const currentSettings = settingsRef.current;
      const currentPalette = paletteRef.current;
      const quality = getQualityProfile(currentSettings.quality);
      const amount = Math.round((52 + currentSettings.density * 92) * quality.particles);
      const baseSpeed = Math.min(width, height) * randomBetween(0.19, 0.3) * (0.72 + currentSettings.energy * 0.28);
      const colors = random() > 0.42
        ? [shell.color]
        : [shell.color, currentPalette.colors[(currentPalette.colors.indexOf(shell.color) + 1) % currentPalette.colors.length]];

      for (let index = 0; index < amount; index += 1) {
        let angle = (index / amount) * TAU + randomBetween(-0.035, 0.035);
        let speed = baseSpeed * randomBetween(0.54, 1.04);
        let drag = randomBetween(0.972, 0.985);
        let gravityScale = randomBetween(0.72, 1.18);

        if (shell.pattern === 1) {
          angle = (Math.floor(index / 2) / Math.ceil(amount / 2)) * TAU + randomBetween(-0.018, 0.018);
          speed *= index % 2 ? 0.68 : 1;
        } else if (shell.pattern === 2) {
          angle += Math.sin(index * 1.7) * 0.14;
          speed *= 0.52 + (index % 7) / 10;
        } else if (shell.pattern === 3) {
          speed *= randomBetween(0.46, 0.78);
          drag = 0.989;
          gravityScale = 1.45;
        }

        const life = shell.pattern === 3 ? randomBetween(1.8, 2.6) : randomBetween(1.15, 2.05);
        sparks.push({
          x: shell.x,
          y: shell.y,
          previousX: shell.x,
          previousY: shell.y,
          vx: Math.cos(angle) * speed + shell.vx * 0.08,
          vy: Math.sin(angle) * speed + shell.vy * 0.03,
          drag,
          gravity: height * 0.1 * gravityScale,
          life,
          maxLife: life,
          color: colors[index % colors.length],
          size: randomBetween(0.7, 1.65),
          twinkle: randomBetween(8, 19),
          seed: random() * TAU,
          smokeClock: random() * 0.08,
        });
      }

      addSmoke(shell.x, shell.y, shell.vx, shell.vy, 9);
    };

    const drawSpark = (spark, currentSettings, timestamp) => {
      const progress = spark.life / spark.maxLife;
      const fade = Math.min(1, progress * 2.4);
      const flicker = 0.62 + Math.sin(timestamp * 0.001 * spark.twinkle + spark.seed) * 0.38;
      const alpha = fade * flicker;
      const tailScale = 1.8 + currentSettings.trail * 6.5;

      context.globalAlpha = alpha * 0.42;
      context.strokeStyle = spark.color;
      context.lineWidth = spark.size * currentSettings.size * 2.6;
      context.beginPath();
      context.moveTo(spark.x, spark.y);
      context.lineTo(
        spark.x - (spark.x - spark.previousX) * tailScale,
        spark.y - (spark.y - spark.previousY) * tailScale,
      );
      context.stroke();

      context.globalAlpha = alpha * 0.18;
      context.fillStyle = spark.color;
      context.beginPath();
      context.arc(spark.x, spark.y, spark.size * currentSettings.size * 4.2, 0, TAU);
      context.fill();

      context.globalAlpha = alpha;
      context.fillStyle = spark.color;
      context.beginPath();
      context.arc(spark.x, spark.y, Math.max(0.65, spark.size * currentSettings.size), 0, TAU);
      context.fill();
    };

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      previousTimestamp = 0;
    });
    const resizeObserver = new ResizeObserver(resize);
    intersectionObserver.observe(canvas);
    resizeObserver.observe(canvas);
    resize();

    if (!reduceMotion) {
      launchShell(width * 0.5, height * 0.34, true);
    }

    const render = (timestamp = 0) => {
      if (visible) {
        const currentSettings = settingsRef.current;
        const currentPalette = paletteRef.current;
        const delta = previousTimestamp ? Math.min((timestamp - previousTimestamp) / 1000, 0.034) : 0;
        previousTimestamp = timestamp;
        context.clearRect(0, 0, width, height);

        if (!currentSettings.paused && !reduceMotion) {
          launchClock -= delta * currentSettings.speed;
          const pointer = pointerRef.current;
          if (pointer.launch) {
            launchShell(pointer.x * width, Math.min(height * 0.7, pointer.y * height));
            pointer.launch = false;
            launchClock = Math.min(launchClock, 0.25);
          }
          if (launchClock <= 0) {
            launchShell();
            launchClock = randomBetween(0.72, 1.5) / (0.65 + currentSettings.density * 0.8);
          }

          for (let index = shells.length - 1; index >= 0; index -= 1) {
            const shell = shells[index];
            shell.previousX = shell.x;
            shell.previousY = shell.y;
            shell.age += delta * currentSettings.speed;
            shell.vy += shell.gravity * delta * currentSettings.speed;
            shell.x += shell.vx * delta * currentSettings.speed;
            shell.y += shell.vy * delta * currentSettings.speed;
            shell.smokeClock -= delta;
            if (shell.smokeClock <= 0) {
              addSmoke(shell.x, shell.y, shell.vx, shell.vy);
              shell.smokeClock = 0.045;
            }
            if (shell.age >= shell.fuse || shell.vy >= -height * 0.035) {
              explodeShell(shell);
              shells.splice(index, 1);
            }
          }

          for (let index = sparks.length - 1; index >= 0; index -= 1) {
            const spark = sparks[index];
            spark.previousX = spark.x;
            spark.previousY = spark.y;
            const timeScale = delta * currentSettings.speed;
            const drag = Math.pow(spark.drag, timeScale * 60);
            spark.vx *= drag;
            spark.vy = spark.vy * drag + spark.gravity * timeScale;

            const pointer = pointerRef.current;
            if (pointer.active && currentSettings.interaction !== "none") {
              const dx = pointer.x * width - spark.x;
              const dy = pointer.y * height - spark.y;
              const distance = Math.max(24, Math.hypot(dx, dy));
              const radius = Math.min(width, height) * (0.14 + currentSettings.interactionRadius * 0.42);
              const force = Math.max(0, 1 - distance / radius) * (55 + currentSettings.interactionStrength * 210) * timeScale;
              if (currentSettings.interaction === "attract") {
                spark.vx += (dx / distance) * force;
                spark.vy += (dy / distance) * force;
              } else if (currentSettings.interaction === "repel") {
                spark.vx -= (dx / distance) * force;
                spark.vy -= (dy / distance) * force;
              } else {
                spark.vx += (-dy / distance) * force;
                spark.vy += (dx / distance) * force;
              }
            }

            spark.x += spark.vx * timeScale;
            spark.y += spark.vy * timeScale;
            spark.life -= timeScale;
            spark.smokeClock -= timeScale;
            if (spark.smokeClock <= 0 && spark.life < spark.maxLife * 0.72 && random() < 0.18) {
              addSmoke(spark.x, spark.y, spark.vx, spark.vy);
              spark.smokeClock = 0.12;
            }
            if (spark.life <= 0 || spark.y > height + 40) sparks.splice(index, 1);
          }

          for (let index = smoke.length - 1; index >= 0; index -= 1) {
            const particle = smoke[index];
            particle.x += particle.vx * delta;
            particle.y += particle.vy * delta;
            particle.vx *= Math.pow(0.985, delta * 60);
            particle.vy -= 2.5 * delta;
            particle.life -= delta;
            particle.size += delta * 4;
            if (particle.life <= 0) smoke.splice(index, 1);
          }
        }

        context.globalCompositeOperation = "source-over";
        context.fillStyle = currentPalette.stageMuted;
        for (const particle of smoke) {
          const alpha = Math.max(0, particle.life / particle.maxLife) * 0.055;
          context.globalAlpha = alpha;
          context.beginPath();
          context.arc(particle.x, particle.y, particle.size, 0, TAU);
          context.fill();
        }

        context.globalCompositeOperation = currentPalette.id === "porcelain" ? "multiply" : "lighter";
        for (const shell of shells) {
          context.globalAlpha = 0.28;
          context.strokeStyle = shell.color;
          context.lineWidth = 3;
          context.beginPath();
          context.moveTo(shell.x, shell.y);
          context.lineTo(shell.x - (shell.x - shell.previousX) * 8, shell.y - (shell.y - shell.previousY) * 8);
          context.stroke();
          context.globalAlpha = 1;
          context.fillStyle = shell.color;
          context.beginPath();
          context.arc(shell.x, shell.y, 1.8 * currentSettings.size, 0, TAU);
          context.fill();
        }
        for (const spark of sparks) drawSpark(spark, currentSettings, timestamp);
        context.globalCompositeOperation = "source-over";
        context.globalAlpha = 1;
      }
      frame = requestAnimationFrame(render);
    };

    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      intersectionObserver.disconnect();
      resizeObserver.disconnect();
    };
  }, [reduceMotion]);

  return (
    <canvas
      ref={canvasRef}
      className="size-full touch-none cursor-crosshair"
      role="img"
      aria-label={`Interactive physics-based fireworks in the ${palette.label} palette`}
      onPointerMove={updatePointer}
      onPointerDown={launchAtPointer}
      onPointerLeave={releasePointer}
    />
  );
}

export default FireworksField;
