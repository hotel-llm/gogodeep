import { useEffect, useRef } from "react";

// ── Animation loop ────────────────────────────────────────────────────────────
export function useRaf(cb: (t: number) => void, active: boolean) {
  const cbRef = useRef(cb);
  cbRef.current = cb;
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const loop = (ts: number) => { cbRef.current(ts / 1000); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);
}

// ── Math helpers ──────────────────────────────────────────────────────────────
export const clamp  = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const lerp   = (a: number, b: number, t: number)  => a + (b - a) * t;
export const TAU    = Math.PI * 2;
export function niceStep(r: number) {
  const m = Math.pow(10, Math.floor(Math.log10(Math.max(r, 1e-9))));
  const n = r / m;
  return n < 1.5 ? m : n < 3.5 ? 2 * m : n < 7.5 ? 5 * m : 10 * m;
}

// ── Canvas colours ────────────────────────────────────────────────────────────
export const C_BG      = "#080e1c";
export const C_FG      = "rgba(255,255,255,0.88)";
export const C_DIM     = "rgba(255,255,255,0.35)";
export const C_GRID    = "rgba(255,255,255,0.06)";
export const C_PRIMARY = "#5b7fef";
export const C_GREEN   = "#4ade80";
export const C_RED     = "#f87171";
export const C_AMBER   = "#fbbf24";
export const C_PURPLE  = "#a78bfa";
export const C_CYAN    = "#22d3ee";

// ── Shared UI components ──────────────────────────────────────────────────────
export function Slider({
  label, value, min, max, step = 1, unit = "", onChange,
  disabled = false, color = C_PRIMARY,
}: {
  label: string; value: number; min: number; max: number;
  step?: number; unit?: string; onChange: (v: number) => void;
  disabled?: boolean; color?: string;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">{label}</span>
        <span className="text-sm font-bold tabular-nums text-foreground">{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} disabled={disabled}
        onChange={e => onChange(+e.target.value)}
        className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-secondary disabled:opacity-40"
        style={{ accentColor: color }} />
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-bold tabular-nums text-foreground">{value}</span>
    </div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">{children}</p>;
}

// Two-panel layout: left = dark canvas area, right = controls
export function ModelWrap({
  viz, controls, darkBg = true,
}: {
  viz: React.ReactNode; controls: React.ReactNode; darkBg?: boolean;
}) {
  return (
    <div className="flex h-full gap-4">
      <div className={`flex-1 min-w-0 rounded-xl border overflow-hidden flex items-stretch ${
        darkBg ? "border-white/[0.07] bg-[#080e1c]" : "border-border bg-card/40"
      }`}>
        {viz}
      </div>
      <div className="w-52 flex-shrink-0 flex flex-col gap-4 overflow-y-auto py-1 pr-0.5">
        {controls}
      </div>
    </div>
  );
}

// Step-through navigation bar
export function StepNav({
  steps, current, onChange,
}: {
  steps: string[]; current: number; onChange: (i: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <SectionLabel>Phase</SectionLabel>
      <div className="flex flex-col gap-1">
        {steps.map((s, i) => (
          <button key={s} onClick={() => onChange(i)}
            className={`rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors
              ${i === current ? "bg-primary/20 text-primary border border-primary/30" : "text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent"}`}>
            <span className="mr-1.5 opacity-50">{i + 1}.</span>{s}
          </button>
        ))}
      </div>
    </div>
  );
}

// Canvas helper: draw a simple axes/grid
export function drawAxes(
  ctx: CanvasRenderingContext2D,
  x0: number, y0: number, w: number, h: number,
  xLabel = "", yLabel = "",
) {
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x0, y0); ctx.lineTo(x0 + w, y0);
  ctx.moveTo(x0, y0); ctx.lineTo(x0, y0 - h);
  ctx.stroke();
  if (xLabel) {
    ctx.fillStyle = C_DIM; ctx.font = "10px Inter,sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(xLabel, x0 + w / 2, y0 + 18);
  }
  if (yLabel) {
    ctx.save(); ctx.translate(x0 - 22, y0 - h / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = C_DIM; ctx.font = "10px Inter,sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();
  }
}

// Draw a smooth curve from an array of [x, y] points (in canvas coords)
export function drawCurve(
  ctx: CanvasRenderingContext2D,
  pts: [number, number][],
  color: string,
  lw = 2,
) {
  if (pts.length < 2) return;
  ctx.strokeStyle = color; ctx.lineWidth = lw;
  ctx.beginPath();
  pts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
  ctx.stroke();
}
