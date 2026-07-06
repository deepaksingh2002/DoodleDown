import { useEffect, useRef } from "react";
import { FaEye } from "react-icons/fa";
import type { GameEngine } from "../engine/GameEngine";
import type { GameState, Stroke } from "../types";
import { nextId } from "../engine/Player";

// Logical coordinate space strokes are stored in — independent of the
// actual rendered pixel size so drawings look identical on every screen.
const LOGICAL_W = 1000;
const LOGICAL_H = 600;

interface Props {
  engine: GameEngine;
  state: GameState;
  isDrawer: boolean;
  color: string;
  size: number;
  isEraser: boolean;
}

export default function DrawingCanvas({ engine, state, isDrawer, color, size, isEraser }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const activeStrokeId = useRef<string | null>(null);
  const drawing = useRef(false);

  // Redraw whenever strokes change.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const sx = canvas.width / LOGICAL_W;
    const sy = canvas.height / LOGICAL_H;
    state.strokes.forEach((s) => drawStroke(ctx, s, sx, sy));
  }, [state.strokes]);

  // Keep canvas backing-store size in sync with its displayed size.
  useEffect(() => {
    function resize() {
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      if (!canvas || !wrap) return;
      const rect = wrap.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.width * (LOGICAL_H / LOGICAL_W);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const sx = canvas.width / LOGICAL_W;
      const sy = canvas.height / LOGICAL_H;
      state.strokes.forEach((s) => drawStroke(ctx, s, sx, sy));
    }
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toLogical(e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * LOGICAL_W;
    const y = ((e.clientY - rect.top) / rect.height) * LOGICAL_H;
    return { x, y };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawer) return;
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    const point = toLogical(e);
    const stroke: Stroke = {
      id: nextId("stroke"),
      color: isEraser ? "#ffffff" : color,
      size: isEraser ? size * 2.2 : size,
      points: [point],
      isEraser,
    };
    activeStrokeId.current = stroke.id;
    drawing.current = true;
    engine.addStroke(stroke);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawer || !drawing.current || !activeStrokeId.current) return;
    engine.appendPoint(activeStrokeId.current, toLogical(e));
  }

  function endStroke() {
    if (activeStrokeId.current) {
      engine.endStroke(activeStrokeId.current);
    }
    drawing.current = false;
    activeStrokeId.current = null;
  }

  return (
    <div className="relative w-full aspect-[5/3] rounded-2xl overflow-hidden border border-border shadow-[0_10px_30px_rgba(45,49,66,0.12)]" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        className={`block w-full h-full [touch-action:none] bg-surface ${isDrawer ? "cursor-crosshair" : ""}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endStroke}
        onPointerLeave={endStroke}
      />
      {!isDrawer && state.phase === "drawing" && (
        <div className="absolute top-2.5 right-3 bg-ink/80 text-white text-xs px-2.5 py-1.5 rounded-full font-semibold flex items-center gap-1.5">
          <FaEye /> watching
        </div>
      )}
    </div>
  );
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke, sx: number, sy: number) {
  if (stroke.points.length === 0) return;
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.size * ((sx + sy) / 2);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(stroke.points[0].x * sx, stroke.points[0].y * sy);
  if (stroke.points.length === 1) {
    ctx.lineTo(stroke.points[0].x * sx + 0.1, stroke.points[0].y * sy + 0.1);
  }
  for (let i = 1; i < stroke.points.length; i++) {
    ctx.lineTo(stroke.points[i].x * sx, stroke.points[i].y * sy);
  }
  ctx.stroke();
}
