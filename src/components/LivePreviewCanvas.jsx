import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";

function LivePreviewCanvas({ className, draw }) {
  const canvasRef = useRef(null);
  const drawRef = useRef(draw);
  const reduceMotion = useReducedMotion();
  drawRef.current = draw;

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !context) return undefined;

    let frame = 0;
    let visible = true;
    let width = 0;
    let height = 0;
    let elapsed = 0;
    let previousTimestamp = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const resizeObserver = new ResizeObserver(resize);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      previousTimestamp = 0;
    });
    resizeObserver.observe(canvas);
    intersectionObserver.observe(canvas);
    resize();

    const renderFrame = (timestamp = 0) => {
      const delta = previousTimestamp ? Math.min((timestamp - previousTimestamp) / 1000, 0.05) : 0;
      previousTimestamp = timestamp;
      if (visible) {
        if (!reduceMotion) elapsed += delta;
        context.clearRect(0, 0, width, height);
        drawRef.current(context, width, height, elapsed);
      }
      frame = requestAnimationFrame(renderFrame);
    };
    frame = requestAnimationFrame(renderFrame);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
    };
  }, [reduceMotion]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}

export default LivePreviewCanvas;
