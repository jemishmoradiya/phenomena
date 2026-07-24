import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import * as THREE from "three";
import { clampSpatialZoom } from "../config/spatial";

const MODEL_FILES = {
  origamicrane3d: "/origami-models/crane.json",
  origamibutterfly3d: "/origami-models/butterfly.json",
  origamilotus3d: "/origami-models/lotus.json",
  origamikabuto3d: "/origami-models/kabuto.json",
  origamipigeon3d: "/origami-models/pigeon.json",
  origamimouse3d: "/origami-models/mouse.json",
  origamimasubox3d: "/origami-models/masubox.json",
  origamiowl3d: "/origami-models/owl.json",
  origamiboat3d: "/origami-models/boat.json",
};

const modelCache = new Map();

async function loadModel(model) {
  const path = MODEL_FILES[model];
  if (!modelCache.has(path)) {
    modelCache.set(path, fetch(path).then((response) => {
      if (!response.ok) throw new Error(`Unable to load origami model: ${response.status}`);
      return response.json();
    }));
  }
  return modelCache.get(path);
}

function createPaperGeometry(frame) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(frame.positions);

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
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
      antialias: true,
      depth: true,
      failIfMajorPerformanceCaveat: false,
      powerPreference,
      stencil: false,
    });
    canvas.removeEventListener("webglcontextcreationerror", captureCreationError);

    if (context && !context.isContextLost()) {
      return new THREE.WebGLRenderer({
        antialias: true,
        canvas,
        context,
        powerPreference,
      });
    }
  }

  throw new Error(statusMessage || "WebGL2 context creation failed");
}

function CanvasOrigamiFallback({ autoRotate, fold, model, onZoomChange, showAxes, viewRevision, zoom }) {
  const canvasRef = useRef(null);
  const settingsRef = useRef({ autoRotate, fold, onZoomChange, showAxes, viewRevision, zoom });
  const reduceMotion = useReducedMotion();
  settingsRef.current = { autoRotate, fold, onZoomChange, showAxes, viewRevision, zoom };

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: false });
    if (!canvas || !context) return undefined;

    let disposed = false;
    let animationFrame = 0;
    let resizeObserver;
    let intersectionObserver;
    let cleanupInteraction = () => {};
    const pointers = new Map();
    let pinchDistance = 0;

    const start = async () => {
      const modelData = await loadModel(model);
      if (disposed) return;

      let width = 1;
      let height = 1;
      let visible = true;
      let previousTimestamp = 0;
      let renderedFold = settingsRef.current.fold;
      let rotationX = -0.18;
      let rotationY = -0.35;
      let autoRotation = 0;
      let appliedViewRevision = settingsRef.current.viewRevision;
      const targetRotation = { x: -0.18, y: -0.35 };

      const resize = () => {
        const rect = canvas.getBoundingClientRect();
        width = Math.max(1, rect.width);
        height = Math.max(1, rect.height);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.max(1, Math.round(width * dpr));
        canvas.height = Math.max(1, Math.round(height * dpr));
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      const getPinchDistance = () => {
        const [first, second] = [...pointers.values()];
        return first && second ? Math.hypot(second.x - first.x, second.y - first.y) : 0;
      };
      const pointerDown = (event) => {
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (pointers.size === 2) pinchDistance = getPinchDistance();
        canvas.setPointerCapture(event.pointerId);
      };
      const pointerMove = (event) => {
        const previous = pointers.get(event.pointerId);
        if (!previous) return;
        if (event.cancelable) event.preventDefault();
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (pointers.size === 2) {
          const nextDistance = getPinchDistance();
          if (pinchDistance > 0) settingsRef.current.onZoomChange((current) => clampSpatialZoom(current * ((nextDistance / pinchDistance) ** 0.85)));
          pinchDistance = nextDistance;
          return;
        }
        targetRotation.y += (event.clientX - previous.x) * 0.007;
        targetRotation.x = Math.max(-1.3, Math.min(1.3, targetRotation.x + (event.clientY - previous.y) * 0.007));
      };
      const pointerEnd = (event) => {
        pointers.delete(event.pointerId);
        pinchDistance = pointers.size === 2 ? getPinchDistance() : 0;
        if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      };
      const wheel = (event) => {
        event.preventDefault();
        settingsRef.current.onZoomChange((current) => clampSpatialZoom(current * Math.exp(-event.deltaY * 0.0015)));
      };

      const rotatePoint = (x, y, z, cosX, sinX, cosY, sinY) => {
        const rotatedX = x * cosY + z * sinY;
        const intermediateZ = -x * sinY + z * cosY;
        return {
          x: rotatedX,
          y: y * cosX - intermediateZ * sinX,
          z: y * sinX + intermediateZ * cosX,
        };
      };

      const projectPoint = (point, cameraDistance, focalLength) => {
        const depth = Math.max(0.05, cameraDistance - point.z);
        const scale = focalLength / depth;
        return {
          x: width / 2 + point.x * scale,
          y: height / 2 - point.y * scale,
          depth,
        };
      };

      const drawLine = (start, end, color, lineWidth, cameraDistance, focalLength, rotation) => {
        const a = projectPoint(rotatePoint(start[0], start[1], start[2], ...rotation), cameraDistance, focalLength);
        const b = projectPoint(rotatePoint(end[0], end[1], end[2], ...rotation), cameraDistance, focalLength);
        context.beginPath();
        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
        context.strokeStyle = color;
        context.lineWidth = lineWidth;
        context.stroke();
      };

      const draw = () => {
        const settings = settingsRef.current;
        const frameIndex = Math.round(renderedFold * (modelData.frames.length - 1));
        const positions = modelData.frames[frameIndex].positions;
        let minX = Infinity;
        let minY = Infinity;
        let minZ = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        let maxZ = -Infinity;
        for (let index = 0; index < positions.length; index += 3) {
          minX = Math.min(minX, positions[index]);
          maxX = Math.max(maxX, positions[index]);
          minY = Math.min(minY, positions[index + 1]);
          maxY = Math.max(maxY, positions[index + 1]);
          minZ = Math.min(minZ, positions[index + 2]);
          maxZ = Math.max(maxZ, positions[index + 2]);
        }
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const centerZ = (minZ + maxZ) / 2;
        const radius = Math.max(0.01, Math.hypot(maxX - minX, maxY - minY, maxZ - minZ) / 2);
        const modelScale = 1.48 / radius;
        const cameraDistance = 4.8 / settings.zoom;
        const focalLength = height / (2 * Math.tan((42 * Math.PI) / 360));
        const cosX = Math.cos(rotationX);
        const sinX = Math.sin(rotationX);
        const cosY = Math.cos(rotationY);
        const sinY = Math.sin(rotationY);
        const rotation = [cosX, sinX, cosY, sinY];

        context.fillStyle = "#f1ece2";
        context.fillRect(0, 0, width, height);

        if (settings.showAxes) {
          context.globalAlpha = 0.28;
          for (let value = -6; value <= 6; value += 0.75) {
            drawLine([-6, 0, value], [6, 0, value], "#8c8176", 1, cameraDistance, focalLength, rotation);
            drawLine([value, 0, -6], [value, 0, 6], "#c8bfb4", 1, cameraDistance, focalLength, rotation);
          }
          context.globalAlpha = 0.82;
          drawLine([-6, 0, 0], [6, 0, 0], "#db1f1f", 1.5, cameraDistance, focalLength, rotation);
          drawLine([0, -4, 0], [0, 4, 0], "#1f9e33", 1.5, cameraDistance, focalLength, rotation);
          drawLine([0, 0, -6], [0, 0, 6], "#1f4de0", 1.5, cameraDistance, focalLength, rotation);
          context.globalAlpha = 1;
        }

        const triangles = [];
        for (let index = 0; index < positions.length; index += 9) {
          const points = [];
          for (let vertex = 0; vertex < 3; vertex += 1) {
            const offset = index + vertex * 3;
            const rotated = rotatePoint(
              (positions[offset] - centerX) * modelScale,
              (positions[offset + 1] - centerY) * modelScale,
              (positions[offset + 2] - centerZ) * modelScale,
              ...rotation,
            );
            points.push({ ...rotated, screen: projectPoint(rotated, cameraDistance, focalLength) });
          }
          const edgeA = {
            x: points[1].x - points[0].x,
            y: points[1].y - points[0].y,
            z: points[1].z - points[0].z,
          };
          const edgeB = {
            x: points[2].x - points[0].x,
            y: points[2].y - points[0].y,
            z: points[2].z - points[0].z,
          };
          const normalZ = edgeA.x * edgeB.y - edgeA.y * edgeB.x;
          const normalLength = Math.max(0.001, Math.hypot(
            edgeA.y * edgeB.z - edgeA.z * edgeB.y,
            edgeA.z * edgeB.x - edgeA.x * edgeB.z,
            normalZ,
          ));
          const light = 0.58 + Math.abs(normalZ / normalLength) * 0.24;
          triangles.push({
            depth: (points[0].screen.depth + points[1].screen.depth + points[2].screen.depth) / 3,
            light,
            points,
          });
        }
        triangles.sort((a, b) => b.depth - a.depth);
        for (const triangle of triangles) {
          const red = Math.round(217 * triangle.light);
          const green = Math.round(108 * triangle.light);
          const blue = Math.round(82 * triangle.light);
          context.beginPath();
          context.moveTo(triangle.points[0].screen.x, triangle.points[0].screen.y);
          context.lineTo(triangle.points[1].screen.x, triangle.points[1].screen.y);
          context.lineTo(triangle.points[2].screen.x, triangle.points[2].screen.y);
          context.closePath();
          context.fillStyle = `rgb(${red} ${green} ${blue})`;
          context.fill();
          context.strokeStyle = "rgb(122 72 61 / 0.2)";
          context.lineWidth = 0.55;
          context.stroke();
        }
      };

      resizeObserver = new ResizeObserver(resize);
      intersectionObserver = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        previousTimestamp = 0;
      });
      resizeObserver.observe(canvas);
      intersectionObserver.observe(canvas);
      canvas.addEventListener("pointerdown", pointerDown);
      canvas.addEventListener("pointermove", pointerMove);
      canvas.addEventListener("pointerup", pointerEnd);
      canvas.addEventListener("pointercancel", pointerEnd);
      canvas.addEventListener("wheel", wheel, { passive: false });
      cleanupInteraction = () => {
        canvas.removeEventListener("pointerdown", pointerDown);
        canvas.removeEventListener("pointermove", pointerMove);
        canvas.removeEventListener("pointerup", pointerEnd);
        canvas.removeEventListener("pointercancel", pointerEnd);
        canvas.removeEventListener("wheel", wheel);
      };
      resize();

      const render = (timestamp = 0) => {
        const delta = previousTimestamp ? Math.min((timestamp - previousTimestamp) / 1000, 0.05) : 0;
        previousTimestamp = timestamp;
        if (visible) {
          const settings = settingsRef.current;
          if (settings.viewRevision !== appliedViewRevision) {
            appliedViewRevision = settings.viewRevision;
            targetRotation.x = -0.18;
            targetRotation.y = -0.35;
            autoRotation = 0;
          }
          const foldDifference = settings.fold - renderedFold;
          if (Math.abs(foldDifference) > 0.0005) {
            renderedFold = reduceMotion ? settings.fold : renderedFold + foldDifference * Math.min(1, delta * 5.5);
          }
          if (settings.autoRotate && !reduceMotion) autoRotation += delta * 0.16;
          rotationX += (targetRotation.x - rotationX) * 0.08;
          rotationY += (targetRotation.y + autoRotation - rotationY) * 0.08;
          draw();
        }
        animationFrame = requestAnimationFrame(render);
      };
      animationFrame = requestAnimationFrame(render);
    };

    start().catch(() => {});

    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      cleanupInteraction();
    };
  }, [model, reduceMotion]);

  return <canvas ref={canvasRef} className="block size-full touch-none" aria-hidden="true" />;
}

export default function OrigamiViewer({ autoRotate, fold, model, onBackendChange, onZoomChange, showAxes, viewRevision, zoom }) {
  const containerRef = useRef(null);
  const [backend, setBackend] = useState("webgl");
  const settingsRef = useRef({ autoRotate, fold, onZoomChange, showAxes, viewRevision, zoom });
  const reduceMotion = useReducedMotion();
  settingsRef.current = { autoRotate, fold, onZoomChange, showAxes, viewRevision, zoom };

  useEffect(() => {
    onBackendChange?.(backend);
  }, [backend, onBackendChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || backend !== "webgl") return undefined;

    let disposed = false;
    let frame = 0;
    let renderer;
    let resizeObserver;
    let intersectionObserver;
    let cleanupInteraction = () => {};

    const start = async () => {
      try {
        const modelData = await loadModel(model);
        if (disposed) return;

        renderer = createCompatibleWebGLRenderer();
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.domElement.className = "block size-full touch-none";
        container.appendChild(renderer.domElement);
        const handleContextLost = (event) => {
          event.preventDefault();
          setBackend("canvas");
        };
        renderer.domElement.addEventListener("webglcontextlost", handleContextLost);

        const scene = new THREE.Scene();
        scene.background = new THREE.Color("#f1ece2");
        const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 50);
        camera.position.set(0, 0, 4.8 / settingsRef.current.zoom);

        const orbitGroup = new THREE.Group();
        orbitGroup.rotation.set(-0.18, -0.35, 0);
        scene.add(orbitGroup);
        const group = new THREE.Group();
        orbitGroup.add(group);

        const referenceGroup = new THREE.Group();
        const studyGrid = new THREE.GridHelper(12, 16, "#8c8176", "#c8bfb4");
        studyGrid.material.transparent = true;
        studyGrid.material.opacity = 0.28;
        referenceGroup.add(studyGrid);
        const axisGeometry = new THREE.BufferGeometry();
        axisGeometry.setAttribute("position", new THREE.Float32BufferAttribute([
          -6, 0, 0, 6, 0, 0,
          0, -4, 0, 0, 4, 0,
          0, 0, -6, 0, 0, 6,
        ], 3));
        axisGeometry.setAttribute("color", new THREE.Float32BufferAttribute([
          0.86, 0.12, 0.12, 0.86, 0.12, 0.12,
          0.12, 0.62, 0.2, 0.12, 0.62, 0.2,
          0.12, 0.3, 0.88, 0.12, 0.3, 0.88,
        ], 3));
        const axisMaterial = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.82, vertexColors: true });
        referenceGroup.add(new THREE.LineSegments(axisGeometry, axisMaterial));
        referenceGroup.visible = settingsRef.current.showAxes;
        orbitGroup.add(referenceGroup);

        const paperMaterial = new THREE.MeshStandardMaterial({
          color: "#d96c52",
          flatShading: true,
          metalness: 0,
          roughness: 0.92,
          side: THREE.DoubleSide,
        });
        let paperGeometry = createPaperGeometry(modelData.frames.at(-1));
        const paper = new THREE.Mesh(paperGeometry, paperMaterial);
        paper.castShadow = true;
        paper.receiveShadow = true;
        group.add(paper);

        const floor = new THREE.Mesh(
          new THREE.PlaneGeometry(12, 12),
          new THREE.ShadowMaterial({ color: "#654537", opacity: 0.17 }),
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -1.72;
        floor.receiveShadow = true;
        scene.add(floor);

        scene.add(new THREE.HemisphereLight("#fffaf2", "#76645a", 2.15));
        const key = new THREE.DirectionalLight("#fff3df", 4.4);
        key.position.set(-3, 5, 5);
        key.castShadow = true;
        key.shadow.mapSize.set(1024, 1024);
        scene.add(key);
        const fill = new THREE.DirectionalLight("#bed4e8", 1.3);
        fill.position.set(4, 1, 2);
        scene.add(fill);

        let activeFrameIndex = -1;
        let renderedFold = settingsRef.current.fold;
        let currentScale = 1;
        let targetScale = 1;
        const currentCenter = new THREE.Vector3();
        const targetCenter = new THREE.Vector3();
        let visible = true;
        let previousTimestamp = 0;
        let appliedViewRevision = settingsRef.current.viewRevision;
        let rotationX = -0.18;
        let rotationY = -0.35;
        let autoRotation = 0;
        const targetRotation = { x: -0.18, y: -0.35 };
        const pointers = new Map();
        let pinchDistance = 0;

        const updatePaperFrame = () => {
          const nextIndex = Math.round(renderedFold * (modelData.frames.length - 1));
          if (nextIndex === activeFrameIndex) return;
          activeFrameIndex = nextIndex;
          paperGeometry.dispose();
          paperGeometry = createPaperGeometry(modelData.frames[nextIndex]);
          paper.geometry = paperGeometry;
          targetScale = 1.48 / Math.max(0.01, paperGeometry.boundingSphere.radius);
          targetCenter.copy(paperGeometry.boundingBox.getCenter(new THREE.Vector3())).multiplyScalar(-targetScale);
          if (activeFrameIndex === 0) {
            currentScale = targetScale;
            currentCenter.copy(targetCenter);
          }
        };

        const resize = () => {
          const rect = container.getBoundingClientRect();
          const width = Math.max(1, rect.width);
          const height = Math.max(1, rect.height);
          renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        };
        const getPinchDistance = () => {
          const [first, second] = [...pointers.values()];
          return first && second ? Math.hypot(second.x - first.x, second.y - first.y) : 0;
        };
        const pointerDown = (event) => {
          pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
          if (pointers.size === 2) pinchDistance = getPinchDistance();
          container.setPointerCapture(event.pointerId);
        };
        const pointerMove = (event) => {
          const previous = pointers.get(event.pointerId);
          if (!previous) return;
          if (event.cancelable) event.preventDefault();
          pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
          if (pointers.size === 2) {
            const nextDistance = getPinchDistance();
            if (pinchDistance > 0) settingsRef.current.onZoomChange((current) => clampSpatialZoom(current * ((nextDistance / pinchDistance) ** 0.85)));
            pinchDistance = nextDistance;
            return;
          }
          targetRotation.y += (event.clientX - previous.x) * 0.007;
          targetRotation.x = Math.max(-1.3, Math.min(1.3, targetRotation.x + (event.clientY - previous.y) * 0.007));
        };
        const pointerEnd = (event) => {
          pointers.delete(event.pointerId);
          pinchDistance = pointers.size === 2 ? getPinchDistance() : 0;
          if (container.hasPointerCapture(event.pointerId)) container.releasePointerCapture(event.pointerId);
        };
        const wheel = (event) => {
          event.preventDefault();
          settingsRef.current.onZoomChange((current) => clampSpatialZoom(current * Math.exp(-event.deltaY * 0.0015)));
        };

        resizeObserver = new ResizeObserver(resize);
        intersectionObserver = new IntersectionObserver(([entry]) => {
          visible = entry.isIntersecting;
          previousTimestamp = 0;
        });
        resizeObserver.observe(container);
        intersectionObserver.observe(container);
        container.addEventListener("pointerdown", pointerDown);
        container.addEventListener("pointermove", pointerMove);
        container.addEventListener("pointerup", pointerEnd);
        container.addEventListener("pointercancel", pointerEnd);
        container.addEventListener("wheel", wheel, { passive: false });
        cleanupInteraction = () => {
          container.removeEventListener("pointerdown", pointerDown);
          container.removeEventListener("pointermove", pointerMove);
          container.removeEventListener("pointerup", pointerEnd);
          container.removeEventListener("pointercancel", pointerEnd);
          container.removeEventListener("wheel", wheel);
        };
        resize();
        updatePaperFrame();

        const render = (timestamp = 0) => {
          const delta = previousTimestamp ? Math.min((timestamp - previousTimestamp) / 1000, 0.05) : 0;
          previousTimestamp = timestamp;
          if (visible) {
            const settings = settingsRef.current;
            referenceGroup.visible = settings.showAxes;
            if (settings.viewRevision !== appliedViewRevision) {
              appliedViewRevision = settings.viewRevision;
              targetRotation.x = -0.18;
              targetRotation.y = -0.35;
              autoRotation = 0;
            }
            const foldDifference = settings.fold - renderedFold;
            if (Math.abs(foldDifference) > 0.0005) {
              renderedFold = reduceMotion ? settings.fold : renderedFold + foldDifference * Math.min(1, delta * 5.5);
              updatePaperFrame();
            }
            if (settings.autoRotate && !reduceMotion) autoRotation += delta * 0.16;
            rotationX += (targetRotation.x - rotationX) * 0.08;
            rotationY += (targetRotation.y + autoRotation - rotationY) * 0.08;
            orbitGroup.rotation.x = rotationX;
            orbitGroup.rotation.y = rotationY;
            currentScale += (targetScale - currentScale) * 0.08;
            currentCenter.lerp(targetCenter, 0.08);
            group.scale.setScalar(currentScale);
            group.position.copy(currentCenter);
            const cameraDistance = 4.8 / settings.zoom;
            camera.position.z += (cameraDistance - camera.position.z) * 0.12;
            renderer.render(scene, camera);
          }
          frame = requestAnimationFrame(render);
        };
        frame = requestAnimationFrame(render);

        cleanupInteraction = ((previousCleanup) => () => {
          previousCleanup();
          paperGeometry.dispose();
          paperMaterial.dispose();
          floor.geometry.dispose();
          floor.material.dispose();
          studyGrid.geometry.dispose();
          studyGrid.material.dispose();
          axisGeometry.dispose();
          axisMaterial.dispose();
        })(cleanupInteraction);
      } catch {
        setBackend("canvas");
      }
    };

    start();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      cleanupInteraction();
      renderer?.dispose();
      renderer?.domElement.remove();
    };
  }, [backend, model, reduceMotion]);

  return (
    <div
      ref={containerRef}
      className="relative size-full cursor-grab overflow-hidden active:cursor-grabbing"
      role="img"
      aria-label={`Interactive paper origami model: ${model}`}
    >
      {backend === "canvas" ? (
        <CanvasOrigamiFallback
          autoRotate={autoRotate}
          fold={fold}
          model={model}
          onZoomChange={onZoomChange}
          showAxes={showAxes}
          viewRevision={viewRevision}
          zoom={zoom}
        />
      ) : null}
    </div>
  );
}
