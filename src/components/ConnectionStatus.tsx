import { useRef, useEffect, useState } from "react";
import { useSync } from "@/contexts/sync-context";
import { useTheme } from "@/hooks/use-theme";

const BAR_COUNT = 120;
const BAR_W = 2;
const PAD = 6;
const CANVAS_H = 156;
const LERP = 0.12;
const TICK_MS = 300;

function randomTargets(): Float32Array {
  return new Float32Array(
    Array.from({ length: BAR_COUNT }, () => 20 + Math.random() * 110)
  );
}

export function ConnectionStatus() {
  const { isConnected } = useSync();
  const { dark } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const barsRef = useRef(new Float32Array(BAR_COUNT).fill(16));
  const targetsRef = useRef(randomTargets());
  const rafRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const [canvasWidth, setCanvasWidth] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver((entries) => {
      setCanvasWidth(entries[0].contentRect.width);
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvasWidth === 0) return;
    const ctx = canvas.getContext("2d")!;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * dpr;
    canvas.height = CANVAS_H * dpr;
    ctx.scale(dpr, dpr);

    const draw = () => {
      ctx.clearRect(0, 0, canvasWidth, CANVAS_H);
      const bars = barsRef.current;
      const targets = targetsRef.current;

      const activeColor = dark ? "#4ade80" : "#22c55e";
      const inactiveColor = dark ? "#525252" : "#d1d5db";
      const color = isConnected ? activeColor : inactiveColor;

      for (let i = 0; i < BAR_COUNT; i++) {
        if (isConnected) {
          bars[i] += (targets[i] - bars[i]) * LERP;
        }
        const h = Math.round(bars[i]);
        const totalBarWidth = canvasWidth - PAD * 2;
        const step = totalBarWidth / BAR_COUNT;
        const x = PAD + i * step;
        const y = (CANVAS_H - h) / 2;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, BAR_W, h);
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isConnected, canvasWidth, dark]);

  useEffect(() => {
    if (!isConnected) return;
    targetsRef.current = randomTargets();
    tickRef.current = setInterval(() => {
      targetsRef.current = randomTargets();
    }, TICK_MS);
    return () => clearInterval(tickRef.current);
  }, [isConnected]);

  return (
    <div ref={containerRef} className="w-full">
      <canvas
        ref={canvasRef}
        style={{ width: canvasWidth || "100%", height: CANVAS_H }}
        className="bg-background"
      />
    </div>
  );
}
