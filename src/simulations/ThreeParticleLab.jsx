// Imperative WebGL renderer for the 3D lab's 34 scenes (spatial.html / SpatialApp.jsx).
// Each scene has a writeXPosition() function (mostly in spatialFormulas.js, some
// inline below) that computes a per-particle 3D position each frame; this component
// owns the Three.js scene/camera/points setup, orbit/pan/zoom pointer controls, and
// a CanvasParticleFallback for when WebGL is unavailable. Kept out of the main 2D
// gallery bundle — see CLAUDE.md's "two entry points" note.
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import * as THREE from "three";
import { clampSpatialZoom } from "../config/spatial";
import { getSafeRenderDpr } from "./quality";
import { seeded, TAU, writeGalaxyPosition } from "./spatialFormulas";

const SOLAR_ORBITS = [0.52, 0.7, 0.9, 1.1, 1.48, 1.78, 2.04, 2.28];
const SOLAR_SPEEDS = [0.72, 0.58, 0.48, 0.4, 0.26, 0.2, 0.16, 0.13];
const PLANET_SIZES = [0.035, 0.055, 0.06, 0.045, 0.14, 0.12, 0.09, 0.085];
const MOON_HOSTS = [2, 3, 4, 5, 6, 7];

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function createParticleTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.beginPath();
  context.arc(32, 32, 29, 0, TAU);
  context.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

function createCompatibleWebGLRenderer() {
  const preferences = ["default", "low-power", "high-performance"];
  let statusMessage = "";

  for (const powerPreference of preferences) {
    const canvas = document.createElement("canvas");
    const captureCreationError = (event) => {
      statusMessage = event.statusMessage || statusMessage;
      event.preventDefault();
    };
    canvas.addEventListener("webglcontextcreationerror", captureCreationError);
    const context = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      depth: true,
      failIfMajorPerformanceCaveat: false,
      powerPreference,
      stencil: false,
    });
    canvas.removeEventListener("webglcontextcreationerror", captureCreationError);

    if (context && !context.isContextLost()) {
      return new THREE.WebGLRenderer({
        alpha: false,
        antialias: false,
        canvas,
        context,
        powerPreference,
      });
    }
  }

  throw new Error(statusMessage || "WebGL2 context creation failed");
}

function createPointerNavigation(element, settingsRef, targetPan, targetRotation) {
  const pointers = new Map();
  let pinchDistance = 0;
  const getPinchDistance = () => {
    const [first, second] = [...pointers.values()];
    return first && second ? Math.hypot(second.x - first.x, second.y - first.y) : 0;
  };
  const startPointer = (event) => {
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size >= 2) pinchDistance = getPinchDistance();
    element.setPointerCapture(event.pointerId);
  };
  const movePointer = (event) => {
    const previous = pointers.get(event.pointerId);
    if (!previous) return;
    if (event.cancelable) event.preventDefault();
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.size >= 2) {
      const nextDistance = getPinchDistance();
      if (pinchDistance > 0 && nextDistance > 0) {
        const zoomFactor = (nextDistance / pinchDistance) ** 0.85;
        settingsRef.current.onZoomChange((currentZoom) => clampSpatialZoom(currentZoom * zoomFactor));
      }
      pinchDistance = nextDistance;
      return;
    }

    const settings = settingsRef.current;
    const deltaX = event.clientX - previous.x;
    const deltaY = event.clientY - previous.y;
    if (settings.interactionMode === "pan") {
      targetPan.x = Math.max(-1.5, Math.min(1.5, targetPan.x - deltaX * 0.0045 * settings.pointerStrength));
      targetPan.y = Math.max(-1.5, Math.min(1.5, targetPan.y + deltaY * 0.0045 * settings.pointerStrength));
    } else {
      targetRotation.y += deltaX * 0.006 * settings.pointerStrength;
      targetRotation.x = Math.max(-1.45, Math.min(1.45, targetRotation.x + deltaY * 0.006 * settings.pointerStrength));
    }
  };
  const endPointer = (event) => {
    pointers.delete(event.pointerId);
    pinchDistance = pointers.size >= 2 ? getPinchDistance() : 0;
    if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
  };
  const wheelZoom = (event) => {
    event.preventDefault();
    const zoomFactor = Math.exp(-event.deltaY * 0.0015);
    settingsRef.current.onZoomChange((currentZoom) => clampSpatialZoom(currentZoom * zoomFactor));
  };

  return { endPointer, movePointer, startPointer, wheelZoom };
}

function writeOrbitalPosition(target, offset, index, time, seeds) {
  if (index % 23 === 0) {
    const theta = seeds[offset] * TAU + time * 0.16;
    const phi = Math.acos(seeds[offset + 1] * 2 - 1);
    const radius = 0.04 + seeds[offset + 2] * 0.17;
    target[offset] = Math.sin(phi) * Math.cos(theta) * radius;
    target[offset + 1] = Math.cos(phi) * radius;
    target[offset + 2] = Math.sin(phi) * Math.sin(theta) * radius;
    return;
  }

  const ring = index % 8;
  const radius = 0.52 + ring * 0.18;
  const angle = seeds[offset] * TAU + time * (0.18 + (7 - ring) * 0.045);
  const tilt = -0.36 + ring * 0.105;
  target[offset] = Math.cos(angle) * radius;
  target[offset + 1] = Math.sin(angle) * Math.sin(tilt) * radius;
  target[offset + 2] = Math.sin(angle) * Math.cos(tilt) * radius;
}

function writeQuantumPosition(target, offset, index, time, seeds) {
  const orbital = index % 3;
  const theta = seeds[offset] * TAU + time * (0.1 + orbital * 0.025);
  const phi = Math.acos(seeds[offset + 1] * 2 - 1);
  const radius = 0.18 + Math.sqrt(seeds[offset + 2]) * (1.25 + orbital * 0.22);
  const lobe = 0.28 + Math.abs(Math.cos(theta * (orbital + 1))) * 0.72;
  target[offset] = Math.sin(phi) * Math.cos(theta) * radius * lobe;
  target[offset + 1] = Math.cos(phi) * radius;
  target[offset + 2] = Math.sin(phi) * Math.sin(theta) * radius * lobe;
}

function writeWarpPosition(target, offset, time, seeds) {
  const depth = ((seeds[offset] * 10 + time * (1.4 + seeds[offset + 1])) % 10) - 5;
  const angle = seeds[offset + 2] * TAU;
  const radius = 0.12 + Math.sqrt(seeds[offset + 1]) * 1.7;
  const perspective = 0.34 + Math.abs(depth) / 5 * 0.66;
  target[offset] = Math.cos(angle) * radius * perspective;
  target[offset + 1] = Math.sin(angle) * radius * perspective;
  target[offset + 2] = depth;
}

function writeBlackHolePosition(target, offset, index, time, seeds) {
  if (index % 9 === 0) {
    const side = index % 2 === 0 ? -1 : 1;
    const distance = 0.18 + seeds[offset] * 2.1;
    const angle = seeds[offset + 1] * TAU + time * 0.9;
    const spread = (1 - distance / 2.4) * 0.11;
    target[offset] = Math.cos(angle) * spread;
    target[offset + 1] = side * distance;
    target[offset + 2] = Math.sin(angle) * spread;
    return;
  }
  const radius = 0.28 + seeds[offset] * 1.85;
  const angle = seeds[offset + 1] * TAU + time * (0.25 + 0.42 / radius);
  const thickness = (seeds[offset + 2] - 0.5) * 0.14 * (radius / 2.2);
  target[offset] = Math.cos(angle) * radius;
  target[offset + 1] = thickness;
  target[offset + 2] = Math.sin(angle) * radius;
}

function writeNebulaPosition(target, offset, index, time, seeds) {
  const cluster = index % 4;
  const clusterAngle = (cluster / 4) * TAU + time * 0.035;
  const centerRadius = 0.45 + cluster * 0.13;
  const centerX = Math.cos(clusterAngle) * centerRadius;
  const centerY = Math.sin(clusterAngle * 1.3) * 0.32;
  const centerZ = Math.sin(clusterAngle) * centerRadius;
  const radius = Math.cbrt(seeds[offset]) * (0.55 + cluster * 0.08);
  const theta = seeds[offset + 1] * TAU + time * 0.055;
  const phi = Math.acos(seeds[offset + 2] * 2 - 1);
  target[offset] = centerX + Math.sin(phi) * Math.cos(theta) * radius;
  target[offset + 1] = centerY + Math.cos(phi) * radius * 0.72;
  target[offset + 2] = centerZ + Math.sin(phi) * Math.sin(theta) * radius;
}

function writeSolarSystemPosition(target, offset, index, time, seeds, count) {
  const section = index / count;
  if (section < 0.14) {
    const theta = seeds[offset] * TAU + time * 0.08;
    const phi = Math.acos(seeds[offset + 1] * 2 - 1);
    const radius = Math.cbrt(seeds[offset + 2]) * 0.34;
    target[offset] = Math.sin(phi) * Math.cos(theta) * radius;
    target[offset + 1] = Math.cos(phi) * radius;
    target[offset + 2] = Math.sin(phi) * Math.sin(theta) * radius;
    return;
  }

  if (section < 0.38) {
    const planet = index % SOLAR_ORBITS.length;
    const orbitAngle = seeded(planet, 41) * TAU + time * SOLAR_SPEEDS[planet];
    const orbitRadius = SOLAR_ORBITS[planet];
    const localTheta = seeds[offset] * TAU + time * 0.24;
    const localPhi = Math.acos(seeds[offset + 1] * 2 - 1);
    const localRadius = Math.cbrt(seeds[offset + 2]) * PLANET_SIZES[planet];
    target[offset] = Math.cos(orbitAngle) * orbitRadius + Math.sin(localPhi) * Math.cos(localTheta) * localRadius;
    target[offset + 1] = Math.sin(orbitAngle * 0.7) * orbitRadius * 0.035 + Math.cos(localPhi) * localRadius;
    target[offset + 2] = Math.sin(orbitAngle) * orbitRadius + Math.sin(localPhi) * Math.sin(localTheta) * localRadius;
    return;
  }

  if (section < 0.61) {
    const planet = index % SOLAR_ORBITS.length;
    const angle = seeds[offset] * TAU;
    const radius = SOLAR_ORBITS[planet];
    const tilt = (planet - 3.5) * 0.012;
    target[offset] = Math.cos(angle) * radius;
    target[offset + 1] = Math.sin(angle) * radius * tilt;
    target[offset + 2] = Math.sin(angle) * radius;
    return;
  }

  if (section < 0.73) {
    const angle = seeds[offset] * TAU + time * 0.12;
    const radius = 1.25 + seeds[offset + 1] * 0.17;
    target[offset] = Math.cos(angle) * radius;
    target[offset + 1] = (seeds[offset + 2] - 0.5) * 0.11;
    target[offset + 2] = Math.sin(angle) * radius;
    return;
  }

  if (section < 0.86) {
    const moon = index % MOON_HOSTS.length;
    const host = MOON_HOSTS[moon];
    const planetAngle = seeded(host, 41) * TAU + time * SOLAR_SPEEDS[host];
    const moonAngle = seeded(moon, 52) * TAU + time * (0.72 + moon * 0.08);
    const planetRadius = SOLAR_ORBITS[host];
    const moonRadius = PLANET_SIZES[host] + 0.055 + moon * 0.004;
    const localTheta = seeds[offset] * TAU;
    const localPhi = Math.acos(seeds[offset + 1] * 2 - 1);
    const localRadius = Math.cbrt(seeds[offset + 2]) * 0.018;
    target[offset] = Math.cos(planetAngle) * planetRadius + Math.cos(moonAngle) * moonRadius + Math.sin(localPhi) * Math.cos(localTheta) * localRadius;
    target[offset + 1] = Math.sin(moonAngle) * moonRadius * 0.35 + Math.cos(localPhi) * localRadius;
    target[offset + 2] = Math.sin(planetAngle) * planetRadius + Math.sin(moonAngle) * moonRadius + Math.sin(localPhi) * Math.sin(localTheta) * localRadius;
    return;
  }

  const theta = seeds[offset] * TAU;
  const phi = Math.acos(seeds[offset + 1] * 2 - 1);
  const radius = 3.1 + seeds[offset + 2] * 1.45;
  target[offset] = Math.sin(phi) * Math.cos(theta) * radius;
  target[offset + 1] = Math.cos(phi) * radius;
  target[offset + 2] = Math.sin(phi) * Math.sin(theta) * radius;
}

function writeLunarOrbitPosition(target, offset, index, time, seeds, count) {
  const section = index / count;
  const moonAngle = time * 0.3;
  const moonX = Math.cos(moonAngle) * 1.42;
  const moonY = Math.sin(moonAngle * 0.7) * 0.12;
  const moonZ = Math.sin(moonAngle) * 1.42;
  if (section < 0.42) {
    const theta = seeds[offset] * TAU + time * 0.08;
    const phi = Math.acos(seeds[offset + 1] * 2 - 1);
    const radius = 0.56 + (seeds[offset + 2] - 0.5) * 0.025;
    target[offset] = Math.sin(phi) * Math.cos(theta) * radius;
    target[offset + 1] = Math.cos(phi) * radius;
    target[offset + 2] = Math.sin(phi) * Math.sin(theta) * radius;
    return;
  }
  if (section < 0.64) {
    const theta = seeds[offset] * TAU + time * 0.05;
    const phi = Math.acos(seeds[offset + 1] * 2 - 1);
    const radius = Math.cbrt(seeds[offset + 2]) * 0.2;
    target[offset] = moonX + Math.sin(phi) * Math.cos(theta) * radius;
    target[offset + 1] = moonY + Math.cos(phi) * radius;
    target[offset + 2] = moonZ + Math.sin(phi) * Math.sin(theta) * radius;
    return;
  }
  if (section < 0.82) {
    const angle = seeds[offset] * TAU;
    target[offset] = Math.cos(angle) * 1.42;
    target[offset + 1] = Math.sin(angle) * 0.12;
    target[offset + 2] = Math.sin(angle) * 1.42;
    return;
  }
  const theta = seeds[offset] * TAU;
  const phi = Math.acos(seeds[offset + 1] * 2 - 1);
  const radius = 2.5 + seeds[offset + 2] * 1.8;
  target[offset] = Math.sin(phi) * Math.cos(theta) * radius;
  target[offset + 1] = Math.cos(phi) * radius;
  target[offset + 2] = Math.sin(phi) * Math.sin(theta) * radius;
}

function writeSatelliteNetworkPosition(target, offset, index, time, seeds, count) {
  const section = index / count;
  if (section < 0.4) {
    const theta = seeds[offset] * TAU + time * 0.07;
    const phi = Math.acos(seeds[offset + 1] * 2 - 1);
    const radius = 0.67 + (seeds[offset + 2] - 0.5) * 0.025;
    target[offset] = Math.sin(phi) * Math.cos(theta) * radius;
    target[offset + 1] = Math.cos(phi) * radius;
    target[offset + 2] = Math.sin(phi) * Math.sin(theta) * radius;
    return;
  }
  if (section < 0.65) {
    const shell = index % 4;
    const angle = seeds[offset] * TAU;
    const radius = 0.9 + shell * 0.22;
    const tilt = -0.62 + shell * 0.4;
    target[offset] = Math.cos(angle) * radius;
    target[offset + 1] = Math.sin(angle) * Math.sin(tilt) * radius;
    target[offset + 2] = Math.sin(angle) * Math.cos(tilt) * radius;
    return;
  }
  if (section < 0.92) {
    const satellite = index % 24;
    const shell = satellite % 4;
    const radius = 0.9 + shell * 0.22;
    const tilt = -0.62 + shell * 0.4;
    const angle = seeded(satellite, 61) * TAU + time * (0.28 + (3 - shell) * 0.08);
    const localTheta = seeds[offset] * TAU;
    const localRadius = seeds[offset + 1] * 0.018;
    target[offset] = Math.cos(angle) * radius + Math.cos(localTheta) * localRadius;
    target[offset + 1] = Math.sin(angle) * Math.sin(tilt) * radius + (seeds[offset + 2] - 0.5) * 0.025;
    target[offset + 2] = Math.sin(angle) * Math.cos(tilt) * radius + Math.sin(localTheta) * localRadius;
    return;
  }
  const theta = seeds[offset] * TAU;
  const phi = Math.acos(seeds[offset + 1] * 2 - 1);
  const radius = 2.4 + seeds[offset + 2] * 1.3;
  target[offset] = Math.sin(phi) * Math.cos(theta) * radius;
  target[offset + 1] = Math.cos(phi) * radius;
  target[offset + 2] = Math.sin(phi) * Math.sin(theta) * radius;
}

function writeStellarNeighborhoodPosition(target, offset, index, time, seeds, count) {
  const section = index / count;
  if (section < 0.78) {
    const star = index % 22;
    const centerRadius = 0.55 + seeded(star, 71) * 2.5;
    const centerTheta = seeded(star, 72) * TAU + time * (0.008 + seeded(star, 73) * 0.012);
    const centerPhi = Math.acos(seeded(star, 74) * 2 - 1);
    const pulse = 0.035 + seeded(star, 75) * 0.07 + Math.sin(time * 1.4 + star) * 0.008;
    const theta = seeds[offset] * TAU;
    const phi = Math.acos(seeds[offset + 1] * 2 - 1);
    const localRadius = Math.cbrt(seeds[offset + 2]) * pulse;
    target[offset] = Math.sin(centerPhi) * Math.cos(centerTheta) * centerRadius + Math.sin(phi) * Math.cos(theta) * localRadius;
    target[offset + 1] = Math.cos(centerPhi) * centerRadius + Math.cos(phi) * localRadius;
    target[offset + 2] = Math.sin(centerPhi) * Math.sin(centerTheta) * centerRadius + Math.sin(phi) * Math.sin(theta) * localRadius;
    return;
  }
  const theta = seeds[offset] * TAU;
  const phi = Math.acos(seeds[offset + 1] * 2 - 1);
  const radius = 3.4 + seeds[offset + 2] * 1.6;
  target[offset] = Math.sin(phi) * Math.cos(theta) * radius;
  target[offset + 1] = Math.cos(phi) * radius;
  target[offset + 2] = Math.sin(phi) * Math.sin(theta) * radius;
}

function writeSpaceStationPosition(target, offset, index, time, seeds, count) {
  const section = index / count;
  if (section < 0.3) {
    const module = index % 5;
    const centerX = (module - 2) * 0.26;
    const theta = seeds[offset] * TAU;
    const length = (seeds[offset + 1] - 0.5) * 0.24;
    const radius = 0.095 + (module === 2 ? 0.035 : 0);
    target[offset] = centerX + length;
    target[offset + 1] = Math.cos(theta) * radius;
    target[offset + 2] = Math.sin(theta) * radius;
    return;
  }
  if (section < 0.53) {
    const side = index % 2 === 0 ? -1 : 1;
    const u = seeds[offset];
    const v = seeds[offset + 1] - 0.5;
    target[offset] = side * (0.72 + u * 0.82);
    target[offset + 1] = v * 0.62;
    target[offset + 2] = Math.sin(u * Math.PI * 5 + time * 0.25) * 0.014;
    return;
  }
  if (section < 0.65) {
    const part = index % 3;
    if (part === 0) {
      target[offset] = (seeds[offset] - 0.5) * 2.95;
      target[offset + 1] = (seeds[offset + 1] - 0.5) * 0.025;
      target[offset + 2] = (seeds[offset + 2] - 0.5) * 0.025;
    } else {
      const angle = seeds[offset] * TAU;
      const radius = part === 1 ? 0.22 : 0.31;
      target[offset] = Math.cos(angle) * radius;
      target[offset + 1] = Math.sin(angle) * radius;
      target[offset + 2] = (seeds[offset + 2] - 0.5) * 0.06;
    }
    return;
  }
  if (section < 0.82) {
    const dockingProgress = (time * 0.11) % 1;
    const craftZ = 2.15 - dockingProgress * 1.72;
    const theta = seeds[offset] * TAU;
    const bodyLength = (seeds[offset + 1] - 0.5) * 0.42;
    const noseTaper = 0.04 + (1 - Math.abs(bodyLength) / 0.22) * 0.055;
    target[offset] = Math.cos(theta) * noseTaper + 0.18;
    target[offset + 1] = Math.sin(theta) * noseTaper + 0.06;
    target[offset + 2] = craftZ + bodyLength;
    return;
  }
  const theta = seeds[offset] * TAU;
  const phi = Math.acos(seeds[offset + 1] * 2 - 1);
  const radius = 2.3 + seeds[offset + 2] * 2;
  target[offset] = Math.sin(phi) * Math.cos(theta) * radius;
  target[offset + 1] = Math.cos(phi) * radius;
  target[offset + 2] = Math.sin(phi) * Math.sin(theta) * radius;
}

function writeStarshipLaunchPosition(target, offset, index, time, seeds, count) {
  const section = index / count;
  const cycle = time % 14;
  const rawAscent = clamp01((cycle - 1) / 7);
  const ascent = rawAscent * rawAscent * (3 - 2 * rawAscent);
  const separation = clamp01((cycle - 7) / 1.8);
  const returnProgress = clamp01((cycle - 9) / 4);
  const flipProgress = clamp01((cycle - 7.1) / 2.7);
  const boosterTilt = Math.sin(flipProgress * Math.PI) * 0.72;
  const shipY = -0.72 + ascent * 3.2;
  const upperX = separation * 0.5;
  const upperY = shipY + separation * 0.36;
  const separatedBoosterY = shipY - separation * 0.86;
  const boosterY = separatedBoosterY + returnProgress * (-1.02 - separatedBoosterY);
  const boosterX = -separation * 0.58 * (1 - returnProgress * 0.72);
  const tiltCos = Math.cos(boosterTilt);
  const tiltSin = Math.sin(boosterTilt);

  if (section < 0.2) {
    const localY = seeds[offset] * 1.02;
    const noseTaper = clamp01((1.02 - localY) / 0.28);
    const aftTaper = 0.88 + clamp01(localY / 0.14) * 0.12;
    const radius = 0.018 + noseTaper * 0.09 * aftTaper;
    const theta = seeds[offset + 1] * TAU;
    target[offset] = upperX + Math.cos(theta) * radius;
    target[offset + 1] = upperY + localY;
    target[offset + 2] = Math.sin(theta) * radius;
    return;
  }

  if (section < 0.29) {
    const flap = index % 4;
    const forward = flap < 2;
    const side = flap % 2 === 0 ? -1 : 1;
    const span = forward ? 0.16 : 0.25;
    const height = forward ? 0.2 : 0.3;
    const baseY = forward ? 0.7 : 0.05;
    const u = seeds[offset];
    const v = seeds[offset + 1];
    const sweptEdge = (1 - v) * span * 0.35;
    target[offset] = upperX + side * (0.085 + u * (span - sweptEdge));
    target[offset + 1] = upperY + baseY + v * height;
    target[offset + 2] = (seeds[offset + 2] - 0.5) * 0.035;
    return;
  }

  if (section < 0.48) {
    const localY = -0.98 + seeds[offset] * 0.98;
    const theta = seeds[offset + 1] * TAU;
    const localX = Math.cos(theta) * 0.118;
    const localZ = Math.sin(theta) * 0.118;
    target[offset] = boosterX + localX * tiltCos + localY * tiltSin;
    target[offset + 1] = boosterY - localX * tiltSin + localY * tiltCos;
    target[offset + 2] = localZ;
    return;
  }

  if (section < 0.53) {
    const fin = index % 4;
    const side = fin % 2 === 0 ? -1 : 1;
    const onZ = fin > 1;
    const u = seeds[offset];
    const v = seeds[offset + 1];
    const localX = onZ ? (v - 0.5) * 0.05 : side * (0.11 + u * 0.16);
    const localY = -0.04 + v * 0.19;
    const localZ = onZ ? side * (0.11 + u * 0.16) : (v - 0.5) * 0.05;
    target[offset] = boosterX + localX * tiltCos + localY * tiltSin;
    target[offset + 1] = boosterY - localX * tiltSin + localY * tiltCos;
    target[offset + 2] = localZ;
    return;
  }

  if (section < 0.59) {
    const engine = index % 33;
    const ring = engine === 0 ? 0 : engine < 10 ? 1 : 2;
    const ringIndex = ring === 1 ? engine - 1 : engine - 9;
    const ringCount = ring === 0 ? 1 : ring === 1 ? 9 : 24;
    const engineAngle = (ringIndex / ringCount) * TAU;
    const engineRadius = ring * 0.042;
    const nozzleAngle = seeds[offset] * TAU;
    const localX = Math.cos(engineAngle) * engineRadius + Math.cos(nozzleAngle) * 0.011;
    const localY = -1.02 + seeds[offset + 1] * 0.055;
    const localZ = Math.sin(engineAngle) * engineRadius + Math.sin(nozzleAngle) * 0.011;
    target[offset] = boosterX + localX * tiltCos + localY * tiltSin;
    target[offset + 1] = boosterY - localX * tiltSin + localY * tiltCos;
    target[offset + 2] = localZ;
    return;
  }

  if (section < 0.78) {
    const upperStagePlume = separation > 0.08 && index % 3 === 0;
    const sourceX = upperStagePlume ? upperX : boosterX - tiltSin;
    const sourceY = upperStagePlume ? upperY - 0.04 : boosterY - tiltCos;
    const trail = 0.06 + seeds[offset] * (0.5 + ascent * 1.08);
    const turbulence = (0.02 + trail * 0.105) * (0.4 + seeds[offset + 1]);
    const angle = seeds[offset + 2] * TAU + time * 3.2;
    target[offset] = sourceX - (upperStagePlume ? 0 : tiltSin * trail) + Math.cos(angle) * turbulence;
    target[offset + 1] = sourceY - (upperStagePlume ? trail : tiltCos * trail);
    target[offset + 2] = Math.sin(angle) * turbulence;
    return;
  }

  if (section < 0.91) {
    const structure = index % 4;
    if (structure === 0) {
      target[offset] = (seeds[offset] - 0.5) * 1.35;
      target[offset + 1] = -1.79 + (seeds[offset + 1] - 0.5) * 0.035;
      target[offset + 2] = (seeds[offset + 2] - 0.5) * 0.76;
    } else if (structure === 1) {
      target[offset] = 0.5 + (seeds[offset] - 0.5) * 0.075;
      target[offset + 1] = -1.76 + seeds[offset + 1] * 1.62;
      target[offset + 2] = (seeds[offset + 2] - 0.5) * 0.075;
    } else if (structure === 2) {
      const armY = -0.18 + (index % 2) * 0.23;
      target[offset] = 0.08 + seeds[offset] * 0.43;
      target[offset + 1] = armY + (seeds[offset + 1] - 0.5) * 0.035;
      target[offset + 2] = (seeds[offset + 2] - 0.5) * 0.055;
    } else {
      const mountAngle = seeds[offset] * TAU;
      target[offset] = Math.cos(mountAngle) * 0.24;
      target[offset + 1] = -1.67 + (seeds[offset + 1] - 0.5) * 0.05;
      target[offset + 2] = Math.sin(mountAngle) * 0.24;
    }
    return;
  }
  const theta = seeds[offset] * TAU;
  const phi = Math.acos(seeds[offset + 1] * 2 - 1);
  const radius = 3.1 + seeds[offset + 2] * 1.7;
  target[offset] = Math.sin(phi) * Math.cos(theta) * radius;
  target[offset + 1] = Math.cos(phi) * radius;
  target[offset + 2] = Math.sin(phi) * Math.sin(theta) * radius;
}

function writeEntangledPosition(target, offset, index, time, _seeds) {
  const pairIndex = Math.floor(index / 2);
  const side = index % 2 === 0 ? -1 : 1;
  const theta = seeded(pairIndex, 11) * TAU + time * (0.12 + seeded(pairIndex, 12) * 0.08);
  const phi = Math.acos(seeded(pairIndex, 13) * 2 - 1);
  const radius = 0.45 + seeded(pairIndex, 14) * 1.35;
  const x = Math.sin(phi) * Math.cos(theta) * radius;
  const y = Math.cos(phi) * radius;
  const z = Math.sin(phi) * Math.sin(theta) * radius;
  target[offset] = side * (0.62 + Math.abs(x) * 0.62);
  target[offset + 1] = side * y * 0.72;
  target[offset + 2] = side * z * 0.72;
}

function writeWaveLatticePosition(target, offset, index, time, count) {
  const side = Math.ceil(Math.cbrt(count));
  const plane = side * side;
  const layers = Math.ceil(count / plane);
  const zIndex = Math.floor(index / plane);
  const remainder = index % plane;
  const yIndex = Math.floor(remainder / side);
  const xIndex = remainder % side;
  const spacing = 3.25 / Math.max(side - 1, 1);
  const x = (xIndex - (side - 1) / 2) * spacing;
  const y = (yIndex - (side - 1) / 2) * spacing;
  const z = (zIndex - (layers - 1) / 2) * spacing;
  const wave = Math.sin(x * 2.2 + z * 1.7 - time * 1.4) * 0.16;
  target[offset] = x;
  target[offset + 1] = y + wave;
  target[offset + 2] = z;
}

function writeMagneticPosition(target, offset, index, time, seeds) {
  const line = index % 16;
  const theta = 0.12 + seeds[offset] * (Math.PI - 0.24);
  const azimuth = (line / 16) * TAU + time * 0.08;
  const scale = 0.55 + (line % 4) * 0.28;
  const radius = Math.sin(theta) ** 2 * scale;
  target[offset] = Math.cos(azimuth) * radius;
  target[offset + 1] = Math.cos(theta) * scale * 1.4;
  target[offset + 2] = Math.sin(azimuth) * radius;
}

function writeVortexPosition(target, offset, index, time, seeds) {
  const arm = index % 5;
  const vertical = (seeds[offset] - 0.5) * 3.8;
  const radius = 0.25 + (1 - Math.abs(vertical) / 2.2) * 0.85 + seeds[offset + 1] * 0.18;
  const angle = (arm / 5) * TAU + vertical * 1.7 + time * (0.48 + seeds[offset + 2] * 0.18);
  target[offset] = Math.cos(angle) * radius;
  target[offset + 1] = vertical;
  target[offset + 2] = Math.sin(angle) * radius;
}

function writeDnaPosition(target, offset, index, time, seeds) {
  const y = (seeds[offset] - 0.5) * 3.8;
  const angle = y * 2.5 + time * 0.28;
  if (index % 5 === 0) {
    const across = seeds[offset + 1] * 2 - 1;
    target[offset] = Math.cos(angle) * 0.72 * across;
    target[offset + 1] = y;
    target[offset + 2] = Math.sin(angle) * 0.72 * across;
    return;
  }
  const strand = index % 2;
  const strandAngle = angle + strand * Math.PI;
  target[offset] = Math.cos(strandAngle) * 0.72;
  target[offset + 1] = y;
  target[offset + 2] = Math.sin(strandAngle) * 0.72;
}

function writeMobiusPosition(target, offset, time, seeds) {
  const u = seeds[offset] * TAU + time * 0.12;
  const v = (seeds[offset + 1] - 0.5) * 0.72;
  const radius = 1.2 + v * Math.cos(u / 2);
  target[offset] = Math.cos(u) * radius;
  target[offset + 1] = Math.sin(u) * radius;
  target[offset + 2] = v * Math.sin(u / 2) * 1.8;
}

function writeCrystalPosition(target, offset, index, time, count) {
  const side = Math.ceil(Math.cbrt(count));
  const plane = side * side;
  const layers = Math.ceil(count / plane);
  const zIndex = Math.floor(index / plane);
  const remainder = index % plane;
  const yIndex = Math.floor(remainder / side);
  const xIndex = remainder % side;
  const spacing = 3.1 / Math.max(side - 1, 1);
  const breathe = 0.96 + Math.sin(time * 0.45) * 0.04;
  target[offset] = (xIndex - (side - 1) / 2) * spacing * breathe;
  target[offset + 1] = (yIndex - (side - 1) / 2) * spacing * breathe;
  target[offset + 2] = (zIndex - (layers - 1) / 2) * spacing * breathe;
}

function writeNeuralPosition(target, offset, index, time, seeds) {
  const nodeA = index % 12;
  const nodeB = (nodeA + 1 + (index % 5)) % 12;
  const ax = (seeded(nodeA, 21) - 0.5) * 2.7;
  const ay = (seeded(nodeA, 22) - 0.5) * 2.5;
  const az = (seeded(nodeA, 23) - 0.5) * 2.7;
  const bx = (seeded(nodeB, 21) - 0.5) * 2.7;
  const by = (seeded(nodeB, 22) - 0.5) * 2.5;
  const bz = (seeded(nodeB, 23) - 0.5) * 2.7;
  const progress = seeds[offset];
  const pulse = (Math.sin(time * 1.8 - progress * 5 + nodeA) + 1) / 2;
  target[offset] = ax + (bx - ax) * progress;
  target[offset + 1] = ay + (by - ay) * progress + Math.sin(progress * Math.PI) * 0.06;
  target[offset + 2] = az + (bz - az) * progress + pulse * 0.04;
}

function writeCellularPosition(target, offset, index, time, seeds) {
  const cell = index % 4;
  const merge = (1 - Math.cos(time * 0.32)) / 2;
  const centerAngle = (cell / 4) * TAU + time * 0.06;
  const separation = 0.95 * (1 - merge * 0.72);
  const theta = seeds[offset] * TAU;
  const phi = Math.acos(seeds[offset + 1] * 2 - 1);
  const radius = Math.cbrt(seeds[offset + 2]) * (0.42 + merge * 0.12);
  target[offset] = Math.cos(centerAngle) * separation + Math.sin(phi) * Math.cos(theta) * radius;
  target[offset + 1] = Math.sin(centerAngle * 1.3) * separation * 0.55 + Math.cos(phi) * radius;
  target[offset + 2] = Math.sin(centerAngle) * separation + Math.sin(phi) * Math.sin(theta) * radius;
}

function writeVinePosition(target, offset, index, time, seeds) {
  const height = (seeds[offset] - 0.5) * 3.8;
  const branch = index % 5;
  const stemAngle = height * 1.65 + time * 0.1;
  const branchReach = branch === 0 ? 0 : Math.sin(seeds[offset + 1] * Math.PI) * (0.18 + branch * 0.11);
  const branchAngle = stemAngle + (branch / 5) * TAU;
  target[offset] = Math.sin(stemAngle) * 0.36 + Math.cos(branchAngle) * branchReach;
  target[offset + 1] = height;
  target[offset + 2] = Math.cos(stemAngle) * 0.36 + Math.sin(branchAngle) * branchReach;
}

function writeFluidVortexPosition(target, offset, index, time, seeds) {
  const vertical = (seeds[offset] - 0.5) * 3.4;
  const normalizedHeight = Math.abs(vertical) / 1.7;
  const radius = 0.2 + normalizedHeight * 1.05 + seeds[offset + 1] * 0.18;
  const angle = seeds[offset + 2] * TAU + vertical * 1.8 + time * (0.52 + (1 - normalizedHeight) * 0.55);
  target[offset] = Math.cos(angle) * radius;
  target[offset + 1] = vertical + Math.sin(angle * 2) * 0.08;
  target[offset + 2] = Math.sin(angle) * radius;
}

function writeDropletFusionPosition(target, offset, index, time, seeds) {
  const drop = index % 3;
  const merge = (1 - Math.cos(time * 0.4)) / 2;
  const centerAngle = (drop / 3) * TAU + time * 0.045;
  const separation = 1.05 * (1 - merge);
  const theta = seeds[offset] * TAU;
  const phi = Math.acos(seeds[offset + 1] * 2 - 1);
  const radius = Math.cbrt(seeds[offset + 2]) * (0.5 + merge * 0.25);
  target[offset] = Math.cos(centerAngle) * separation + Math.sin(phi) * Math.cos(theta) * radius;
  target[offset + 1] = Math.sin(centerAngle) * separation * 0.35 + Math.cos(phi) * radius;
  target[offset + 2] = Math.sin(centerAngle) * separation + Math.sin(phi) * Math.sin(theta) * radius;
}

function writeRippleSpherePosition(target, offset, time, seeds) {
  const theta = seeds[offset] * TAU;
  const phi = Math.acos(seeds[offset + 1] * 2 - 1);
  const wave = Math.sin(phi * 10 - time * 2.2 + theta * 1.5) * 0.13;
  const radius = 1.45 + wave;
  target[offset] = Math.sin(phi) * Math.cos(theta) * radius;
  target[offset + 1] = Math.cos(phi) * radius;
  target[offset + 2] = Math.sin(phi) * Math.sin(theta) * radius;
}

function writeClockworkPosition(target, offset, index, time, seeds) {
  const gear = index % 5;
  const centers = [[-0.9, 0.45], [0.25, 0.65], [0.85, -0.25], [-0.35, -0.65], [0.1, 0]];
  const center = centers[gear];
  const radius = 0.34 + gear * 0.06;
  const angle = seeds[offset] * TAU + time * (gear % 2 ? -0.42 : 0.42);
  const tooth = 1 + Math.sin(angle * (8 + gear)) * 0.08;
  target[offset] = center[0] + Math.cos(angle) * radius * tooth;
  target[offset + 1] = center[1] + Math.sin(angle) * radius * tooth;
  target[offset + 2] = (gear - 2) * 0.18 + (seeds[offset + 1] - 0.5) * 0.12;
}

function writeBridgePosition(target, offset, index, time, seeds) {
  const role = index % 6;
  const x = (seeds[offset] - 0.5) * 3.5;
  const depthLane = (index % 2 === 0 ? -1 : 1) * 0.42;
  if (role < 2) {
    target[offset] = x;
    target[offset + 1] = -0.55 + Math.sin(x * 1.5 - time * 0.6) * 0.025;
    target[offset + 2] = depthLane;
    return;
  }
  if (role < 4) {
    target[offset] = x;
    target[offset + 1] = 0.85 - x * x * 0.3;
    target[offset + 2] = depthLane;
    return;
  }
  const tower = index % 4 < 2 ? -1 : 1;
  target[offset] = tower * 1.05 + (seeds[offset + 1] - 0.5) * 0.08;
  target[offset + 1] = (seeds[offset + 2] - 0.5) * 2.3;
  target[offset + 2] = depthLane;
}

function writeOrchestraPosition(target, offset, index, time, seeds) {
  const section = index % 5;
  const angle = Math.PI * (0.12 + section * 0.19);
  const row = 0.7 + seeds[offset] * 1.15;
  const pulse = Math.sin(time * 1.5 - section * 0.75) * 0.08;
  target[offset] = Math.cos(angle) * row;
  target[offset + 1] = -0.25 + Math.sin(angle) * row * 0.72 + pulse;
  target[offset + 2] = (seeds[offset + 1] - 0.5) * 0.75 + section * 0.08;
}

function writePhotonLensPosition(target, offset, index, time, seeds) {
  const ray = index % 11;
  const progress = seeds[offset];
  const x = -2.1 + progress * 4.2;
  const startY = (ray - 5) * 0.18;
  const startZ = (seeds[offset + 1] - 0.5) * 0.75;
  const focus = 0.55;
  const y = x < focus ? startY * (1 - (x + 2.1) / (focus + 2.1)) : -startY * ((x - focus) / 1.55) * 0.48;
  const z = x < focus ? startZ * (1 - (x + 2.1) / (focus + 2.1)) : -startZ * ((x - focus) / 1.55) * 0.48;
  target[offset] = x;
  target[offset + 1] = y + Math.sin(progress * TAU * 3 - time * 2.4) * 0.015;
  target[offset + 2] = z;
}

function writeDoubleSlitVolumePosition(target, offset, index, time, seeds) {
  const slit = index % 2 === 0 ? -1 : 1;
  const progress = seeds[offset];
  const x = -2 + progress * 4;
  const slitY = slit * 0.28;
  const sourceY = (seeds[offset + 1] - 0.5) * 0.35;
  if (x < 0) {
    target[offset] = x;
    target[offset + 1] = sourceY + (slitY - sourceY) * ((x + 2) / 2);
    target[offset + 2] = (seeds[offset + 2] - 0.5) * 0.5 * (1 + x / 2);
    return;
  }
  const spread = x / 2;
  const fringe = Math.sin((Math.floor(index / 2) % 13 - 6) * 1.2) * 0.75;
  target[offset] = x;
  target[offset + 1] = slitY * (1 - spread) + fringe * spread;
  target[offset + 2] = (seeds[offset + 2] - 0.5) * spread * 1.5 + Math.sin(time * 0.3) * 0.03;
}

function writeCausticVolumePosition(target, offset, index, time, seeds) {
  const layer = index % 5;
  const x = (seeds[offset] - 0.5) * 3.7;
  const z = (seeds[offset + 1] - 0.5) * 3.2;
  const phase = time * 0.22 + layer * 0.62;
  target[offset] = x;
  target[offset + 1] = Math.sin(x * 2.4 + phase) * 0.42 + Math.sin(z * 2.8 - phase) * 0.3 + (layer - 2) * 0.08;
  target[offset + 2] = z;
}

function writeDysonPosition(target, offset, index, time, seeds) {
  if (index % 17 === 0) {
    const theta = seeds[offset] * TAU;
    const phi = Math.acos(seeds[offset + 1] * 2 - 1);
    const radius = Math.cbrt(seeds[offset + 2]) * 0.28;
    target[offset] = Math.sin(phi) * Math.cos(theta) * radius;
    target[offset + 1] = Math.cos(phi) * radius;
    target[offset + 2] = Math.sin(phi) * Math.sin(theta) * radius;
    return;
  }
  const shell = index % 4;
  const theta = seeds[offset] * TAU + time * (0.16 + shell * 0.035);
  const phi = Math.acos(seeds[offset + 1] * 2 - 1) + time * 0.025 * (shell % 2 ? -1 : 1);
  const radius = 0.72 + shell * 0.32;
  target[offset] = Math.sin(phi) * Math.cos(theta) * radius;
  target[offset + 1] = Math.cos(phi) * radius;
  target[offset + 2] = Math.sin(phi) * Math.sin(theta) * radius;
}

function writeTeleportPosition(target, offset, index, time, seeds) {
  const cycle = time % 10;
  const theta = seeds[offset] * TAU;
  const phi = Math.acos(seeds[offset + 1] * 2 - 1);
  const radius = Math.cbrt(seeds[offset + 2]) * 0.48;
  const localX = Math.sin(phi) * Math.cos(theta) * radius;
  const localY = Math.cos(phi) * radius;
  const localZ = Math.sin(phi) * Math.sin(theta) * radius;
  const delay = seeded(index, 31) * 0.8;
  const progress = Math.max(0, Math.min(1, (cycle - 2 - delay) / 3));
  const returnProgress = Math.max(0, Math.min(1, (cycle - 7.5) / 2.5));
  const travel = progress * (1 - returnProgress);
  target[offset] = -1.25 + travel * 2.5 + localX;
  target[offset + 1] = localY + Math.sin(travel * Math.PI) * Math.sin(index) * 0.18;
  target[offset + 2] = localZ + Math.sin(travel * Math.PI) * Math.cos(index) * 0.18;
}

function writePlasmaTorusPosition(target, offset, index, time, seeds) {
  const u = seeds[offset] * TAU + time * (0.28 + seeds[offset + 1] * 0.14);
  const v = (index % 23) / 23 * TAU + time * 0.75;
  const majorRadius = 1.25;
  const minorRadius = 0.24 + seeds[offset + 2] * 0.14;
  const ringRadius = majorRadius + Math.cos(v) * minorRadius;
  target[offset] = Math.cos(u) * ringRadius;
  target[offset + 1] = Math.sin(v) * minorRadius;
  target[offset + 2] = Math.sin(u) * ringRadius;
}

function writeParticlePositions(mode, positions, seeds, density, time) {
  for (let index = 0; index < density; index += 1) {
    const offset = index * 3;
    if (mode === "orbital") writeOrbitalPosition(positions, offset, index, time, seeds);
    else if (mode === "galaxy") writeGalaxyPosition(positions, offset, index, time, seeds);
    else if (mode === "quantum") writeQuantumPosition(positions, offset, index, time, seeds);
    else if (mode === "warp") writeWarpPosition(positions, offset, time, seeds);
    else if (mode === "blackhole") writeBlackHolePosition(positions, offset, index, time, seeds);
    else if (mode === "nebula") writeNebulaPosition(positions, offset, index, time, seeds);
    else if (mode === "solarsystem3d") writeSolarSystemPosition(positions, offset, index, time, seeds, density);
    else if (mode === "lunarorbit3d") writeLunarOrbitPosition(positions, offset, index, time, seeds, density);
    else if (mode === "satellites3d") writeSatelliteNetworkPosition(positions, offset, index, time, seeds, density);
    else if (mode === "stellar3d") writeStellarNeighborhoodPosition(positions, offset, index, time, seeds, density);
    else if (mode === "spacestation3d") writeSpaceStationPosition(positions, offset, index, time, seeds, density);
    else if (mode === "starshiplaunch3d") writeStarshipLaunchPosition(positions, offset, index, time, seeds, density);
    else if (mode === "entangled") writeEntangledPosition(positions, offset, index, time, seeds);
    else if (mode === "wavelattice") writeWaveLatticePosition(positions, offset, index, time, density);
    else if (mode === "magnetic") writeMagneticPosition(positions, offset, index, time, seeds);
    else if (mode === "vortex3d") writeVortexPosition(positions, offset, index, time, seeds);
    else if (mode === "dna3d") writeDnaPosition(positions, offset, index, time, seeds);
    else if (mode === "mobius3d") writeMobiusPosition(positions, offset, time, seeds);
    else if (mode === "crystal3d") writeCrystalPosition(positions, offset, index, time, density);
    else if (mode === "neural3d") writeNeuralPosition(positions, offset, index, time, seeds);
    else if (mode === "cellular3d") writeCellularPosition(positions, offset, index, time, seeds);
    else if (mode === "vine3d") writeVinePosition(positions, offset, index, time, seeds);
    else if (mode === "fluidvortex3d") writeFluidVortexPosition(positions, offset, index, time, seeds);
    else if (mode === "dropletfusion3d") writeDropletFusionPosition(positions, offset, index, time, seeds);
    else if (mode === "ripplesphere3d") writeRippleSpherePosition(positions, offset, time, seeds);
    else if (mode === "clockwork3d") writeClockworkPosition(positions, offset, index, time, seeds);
    else if (mode === "bridge3d") writeBridgePosition(positions, offset, index, time, seeds);
    else if (mode === "orchestra3d") writeOrchestraPosition(positions, offset, index, time, seeds);
    else if (mode === "photonlens3d") writePhotonLensPosition(positions, offset, index, time, seeds);
    else if (mode === "doubleslit3d") writeDoubleSlitVolumePosition(positions, offset, index, time, seeds);
    else if (mode === "caustic3d") writeCausticVolumePosition(positions, offset, index, time, seeds);
    else if (mode === "dyson3d") writeDysonPosition(positions, offset, index, time, seeds);
    else if (mode === "teleport3d") writeTeleportPosition(positions, offset, index, time, seeds);
    else writePlasmaTorusPosition(positions, offset, index, time, seeds);
  }
}

function CanvasParticleFallback({ autoRotate, density, interactionMode, mode, onZoomChange, palette, paused, pointerStrength, pointSize, quality, speed, viewRevision, zoom }) {
  const canvasRef = useRef(null);
  const settingsRef = useRef({ autoRotate, interactionMode, mode, onZoomChange, paused, pointerStrength, pointSize, speed, viewRevision, zoom });
  const reduceMotion = useReducedMotion();
  settingsRef.current = { autoRotate, interactionMode, mode, onZoomChange, paused, pointerStrength, pointSize, speed, viewRevision, zoom };

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: false });
    if (!canvas || !context) return undefined;

    const positions = new Float32Array(density * 3);
    const seeds = new Float32Array(density * 3);
    for (let index = 0; index < density; index += 1) {
      const offset = index * 3;
      seeds[offset] = seeded(index, 1);
      seeds[offset + 1] = seeded(index, 2);
      seeds[offset + 2] = seeded(index, 3);
    }

    let frame = 0;
    let width = 1;
    let height = 1;
    let visible = true;
    let elapsed = reduceMotion ? 2.5 : 0;
    let previousTimestamp = 0;
    let autoRotation = 0;
    let rotationX = -0.08;
    let rotationY = 0;
    let panX = 0;
    let panY = 0;
    let appliedViewRevision = settingsRef.current.viewRevision;
    let appliedMode = settingsRef.current.mode;
    const targetRotation = { x: -0.08, y: 0 };
    const targetPan = { x: 0, y: 0 };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      const dpr = getSafeRenderDpr(quality, width, height);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const { endPointer, movePointer, startPointer, wheelZoom } = createPointerNavigation(canvas, settingsRef, targetPan, targetRotation);

    const resizeObserver = new ResizeObserver(resize);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      previousTimestamp = 0;
    });
    resizeObserver.observe(canvas);
    intersectionObserver.observe(canvas);
    canvas.addEventListener("pointerdown", startPointer);
    canvas.addEventListener("pointermove", movePointer);
    canvas.addEventListener("pointerup", endPointer);
    canvas.addEventListener("pointercancel", endPointer);
    canvas.addEventListener("wheel", wheelZoom, { passive: false });
    resize();
    writeParticlePositions(settingsRef.current.mode, positions, seeds, density, elapsed);

    const render = (timestamp = 0) => {
      const delta = previousTimestamp ? Math.min((timestamp - previousTimestamp) / 1000, 0.05) : 0;
      previousTimestamp = timestamp;
      if (visible) {
        const settings = settingsRef.current;
        if (settings.viewRevision !== appliedViewRevision) {
          appliedViewRevision = settings.viewRevision;
          autoRotation = 0;
          targetRotation.x = -0.08;
          targetRotation.y = 0;
          targetPan.x = 0;
          targetPan.y = 0;
        }
        if (settings.mode !== appliedMode) {
          appliedMode = settings.mode;
          writeParticlePositions(settings.mode, positions, seeds, density, elapsed);
        }
        if (!settings.paused && !reduceMotion) {
          elapsed += delta * settings.speed;
          writeParticlePositions(settings.mode, positions, seeds, density, elapsed);
        }
        if (settings.autoRotate && !settings.paused && !reduceMotion) autoRotation += delta * 0.18 * settings.speed;
        rotationX += (targetRotation.x - rotationX) * 0.045;
        rotationY += (targetRotation.y + autoRotation - rotationY) * 0.045;
        panX += (targetPan.x - panX) * 0.12;
        panY += (targetPan.y - panY) * 0.12;

        context.fillStyle = palette.background;
        context.fillRect(0, 0, width, height);
        const baseCameraDistance = settings.mode === "warp" ? 4.2 : 5.1;
        const cameraDistance = baseCameraDistance / settings.zoom;
        const distanceScale = Math.sqrt(cameraDistance / baseCameraDistance);
        const focalLength = height / (2 * Math.tan((48 * Math.PI) / 360));
        const cosX = Math.cos(rotationX);
        const sinX = Math.sin(rotationX);
        const cosY = Math.cos(rotationY);
        const sinY = Math.sin(rotationY);
        context.globalAlpha = 0.9;

        for (let colorIndex = 0; colorIndex < palette.colors.length; colorIndex += 1) {
          context.beginPath();
          for (let index = colorIndex; index < density; index += palette.colors.length) {
            const offset = index * 3;
            const x = positions[offset];
            const y = positions[offset + 1];
            const z = positions[offset + 2];
            const rotatedX = x * cosY + z * sinY;
            const rotatedZ = -x * sinY + z * cosY;
            const rotatedY = y * cosX - rotatedZ * sinX;
            const depthZ = y * sinX + rotatedZ * cosX;
            const depth = cameraDistance - depthZ;
            if (depth <= 0.02) continue;
            const scale = focalLength / depth;
            const screenX = width / 2 + (rotatedX - panX) * scale;
            const screenY = height / 2 - (rotatedY - panY) * scale;
            if (screenX < -12 || screenX > width + 12 || screenY < -12 || screenY > height + 12) continue;
            const radius = Math.max(0.5, Math.min(4, 0.012 * settings.pointSize * distanceScale * distanceScale * height / depth));
            context.moveTo(screenX + radius, screenY);
            context.arc(screenX, screenY, radius, 0, TAU);
          }
          context.fillStyle = palette.colors[colorIndex];
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
      canvas.removeEventListener("pointerdown", startPointer);
      canvas.removeEventListener("pointermove", movePointer);
      canvas.removeEventListener("pointerup", endPointer);
      canvas.removeEventListener("pointercancel", endPointer);
      canvas.removeEventListener("wheel", wheelZoom);
    };
  }, [density, palette, quality, reduceMotion]);

  return <canvas ref={canvasRef} className="block size-full touch-none" aria-hidden="true" />;
}

function ThreeParticleLab({ autoRotate, backendPreference = "auto", density, interactionMode, mode, onBackendChange, onZoomChange, palette, paused, pointerStrength, pointSize, quality = "auto", speed, viewRevision, zoom }) {
  const containerRef = useRef(null);
  const settingsRef = useRef({ autoRotate, interactionMode, mode, onZoomChange, paused, pointerStrength, pointSize, speed, viewRevision, zoom });
  const [backend, setBackend] = useState(() => backendPreference === "canvas" ? "canvas" : "webgl");
  const reduceMotion = useReducedMotion();
  settingsRef.current = { autoRotate, interactionMode, mode, onZoomChange, paused, pointerStrength, pointSize, speed, viewRevision, zoom };

  useEffect(() => {
    setBackend(backendPreference === "canvas" ? "canvas" : "webgl");
  }, [backendPreference, mode]);

  useEffect(() => {
    onBackendChange?.(backend);
  }, [backend, onBackendChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || backend !== "webgl") return undefined;

    let frame = 0;
    let visible = true;
    let previousTimestamp = 0;
    let elapsed = reduceMotion ? 2.5 : 0;
    let renderer;
    let geometry;
    let material;
    let texture;
    let points;
    let handleContextLost;
    let autoRotation = 0;
    let appliedViewRevision = settingsRef.current.viewRevision;
    let appliedMode = settingsRef.current.mode;

    try {
      renderer = createCompatibleWebGLRenderer();
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.domElement.className = "block size-full touch-none cursor-inherit";
      handleContextLost = (event) => {
        event.preventDefault();
        setBackend("canvas");
      };
      renderer.domElement.addEventListener("webglcontextlost", handleContextLost);
      container.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(palette.background);
      const camera = new THREE.PerspectiveCamera(48, 1, 0.005, 160);
      const initialMode = settingsRef.current.mode;
      const baseCameraDistance = initialMode === "warp" ? 4.2 : 5.1;
      let appliedCameraDistance = baseCameraDistance / zoom;
      camera.position.set(0, 0, appliedCameraDistance);

      const positions = new Float32Array(density * 3);
      const colors = new Float32Array(density * 3);
      const seeds = new Float32Array(density * 3);
      const paletteColors = palette.colors.map((value) => new THREE.Color(value));

      for (let index = 0; index < density; index += 1) {
        const offset = index * 3;
        seeds[offset] = seeded(index, 1);
        seeds[offset + 1] = seeded(index, 2);
        seeds[offset + 2] = seeded(index, 3);
        const color = paletteColors[index % paletteColors.length];
        colors[offset] = color.r;
        colors[offset + 1] = color.g;
        colors[offset + 2] = color.b;
      }

      geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      texture = createParticleTexture();
      material = new THREE.PointsMaterial({
        alphaTest: 0.35,
        color: 0xffffff,
        depthWrite: false,
        map: texture,
        size: 0.024 * pointSize,
        sizeAttenuation: true,
        transparent: true,
        vertexColors: true,
      });
      points = new THREE.Points(geometry, material);
      scene.add(points);

      const targetRotation = { x: -0.08, y: 0 };
      const targetPan = { x: 0, y: 0 };
      const { endPointer, movePointer, startPointer, wheelZoom } = createPointerNavigation(container, settingsRef, targetPan, targetRotation);

      const resize = () => {
        const rect = container.getBoundingClientRect();
        const width = Math.max(1, rect.width);
        const height = Math.max(1, rect.height);
        renderer.setPixelRatio(getSafeRenderDpr(quality, width, height));
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };

      const updatePositions = (time) => {
        writeParticlePositions(settingsRef.current.mode, positions, seeds, density, time);
        geometry.attributes.position.needsUpdate = true;
      };

      const resizeObserver = new ResizeObserver(resize);
      const intersectionObserver = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        previousTimestamp = 0;
      });
      resizeObserver.observe(container);
      intersectionObserver.observe(container);
      container.addEventListener("pointerdown", startPointer);
      container.addEventListener("pointermove", movePointer);
      container.addEventListener("pointerup", endPointer);
      container.addEventListener("pointercancel", endPointer);
      container.addEventListener("wheel", wheelZoom, { passive: false });
      resize();
      updatePositions(elapsed);

      const render = (timestamp = 0) => {
        const delta = previousTimestamp ? Math.min((timestamp - previousTimestamp) / 1000, 0.05) : 0;
        previousTimestamp = timestamp;
        if (visible) {
          const settings = settingsRef.current;
          if (settings.viewRevision !== appliedViewRevision) {
            appliedViewRevision = settings.viewRevision;
            autoRotation = 0;
            targetRotation.x = -0.08;
            targetRotation.y = 0;
            targetPan.x = 0;
            targetPan.y = 0;
            points.rotation.set(0, 0, 0);
          }
          if (settings.mode !== appliedMode) {
            appliedMode = settings.mode;
            updatePositions(elapsed);
          }
          if (!settings.paused && !reduceMotion) elapsed += delta * settings.speed;
          const activeBaseCameraDistance = settings.mode === "warp" ? 4.2 : 5.1;
          const cameraDistance = activeBaseCameraDistance / settings.zoom;
          const distanceScale = Math.sqrt(cameraDistance / activeBaseCameraDistance);
          material.size = 0.024 * settings.pointSize * distanceScale * distanceScale;
          if (!settings.paused && !reduceMotion) updatePositions(elapsed);
          camera.position.z += (cameraDistance - camera.position.z) * 0.12;
          if (cameraDistance !== appliedCameraDistance) {
            appliedCameraDistance = cameraDistance;
            camera.near = Math.max(0.005, cameraDistance * 0.002);
            camera.far = Math.max(80, cameraDistance + 80);
            camera.updateProjectionMatrix();
          }
          camera.position.x += (targetPan.x - camera.position.x) * 0.12;
          camera.position.y += (targetPan.y - camera.position.y) * 0.12;
          if (settings.autoRotate && !settings.paused && !reduceMotion) autoRotation += delta * 0.18 * settings.speed;
          points.rotation.x += (targetRotation.x - points.rotation.x) * 0.045;
          points.rotation.y += (targetRotation.y + autoRotation - points.rotation.y) * 0.045;
          renderer.render(scene, camera);
        }
        frame = requestAnimationFrame(render);
      };

      frame = requestAnimationFrame(render);

      return () => {
        cancelAnimationFrame(frame);
        resizeObserver.disconnect();
        intersectionObserver.disconnect();
        container.removeEventListener("pointerdown", startPointer);
        container.removeEventListener("pointermove", movePointer);
        container.removeEventListener("pointerup", endPointer);
        container.removeEventListener("pointercancel", endPointer);
        container.removeEventListener("wheel", wheelZoom);
        renderer.domElement.removeEventListener("webglcontextlost", handleContextLost);
        geometry.dispose();
        material.dispose();
        texture.dispose();
        renderer.dispose();
        if (!renderer.getContext().isContextLost()) renderer.forceContextLoss();
        renderer.domElement.remove();
      };
    } catch {
      setBackend("canvas");
      geometry?.dispose();
      material?.dispose();
      texture?.dispose();
      renderer?.dispose();
      if (renderer && !renderer.getContext().isContextLost()) renderer.forceContextLoss();
      renderer?.domElement.remove();
      return undefined;
    }
    // pointSize/zoom deliberately excluded: they're read live via settingsRef inside
    // the render loop (see settings.pointSize/settings.zoom above) so the WebGL
    // scene isn't torn down and rebuilt on every slider drag.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backend, density, palette, quality, reduceMotion]);

  return (
    <div
      ref={containerRef}
      className={`relative size-full overflow-hidden ${interactionMode === "pan" ? "cursor-move" : "cursor-grab active:cursor-grabbing"}`}
      role="img"
      aria-label={`Interactive 3D particle scene: ${mode}`}
    >
      {backend === "canvas" ? (
        <CanvasParticleFallback
          autoRotate={autoRotate}
          density={density}
          interactionMode={interactionMode}
          mode={mode}
          onZoomChange={onZoomChange}
          palette={palette}
          paused={paused}
          pointerStrength={pointerStrength}
          pointSize={pointSize}
          quality={quality}
          speed={speed}
          viewRevision={viewRevision}
          zoom={zoom}
        />
      ) : null}
    </div>
  );
}

export default ThreeParticleLab;
