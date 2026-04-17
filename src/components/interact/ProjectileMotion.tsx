import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

type Planet = "earth" | "moon" | "mars" | "jupiter";

const PLANETS: Record<Planet, { label: string; g: number; color: string }> = {
  earth:   { label: "Earth",   g: 9.81,  color: "#4ade80" },
  moon:    { label: "Moon",    g: 1.62,  color: "#cbd5e1" },
  mars:    { label: "Mars",    g: 3.72,  color: "#f87171" },
  jupiter: { label: "Jupiter", g: 24.8,  color: "#fb923c" },
};

const CW = 580;
const CH = 340;
const PAD = { t: 28, r: 24, b: 44, l: 52 };

function niceStep(raw: number) {
  const mag = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1e-9))));
  const n = raw / mag;
  if (n < 1.5) return mag;
  if (n < 3.5) return 2 * mag;
  if (n < 7.5) return 5 * mag;
  return 10 * mag;
}

export default function ProjectileMotion() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const t0Ref     = useRef<number>(0);
  const physRef   = useRef<ReturnType<typeof calcPhys> | null>(null);

  const [angle,  setAngle]  = useState(45);
  const [speed,  setSpeed]  = useState(50);
  const [planet, setPlanet] = useState<Planet>("earth");
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [dragging, setDragging] = useState(false);

  function calcPhys(a: number, s: number, p: Planet) {
    const g   = PLANETS[p].g;
    const rad = (a * Math.PI) / 180;
    const vx  = s * Math.cos(rad);
    const vy  = s * Math.sin(rad);
    const tf  = vy > 0 ? (2 * vy) / g : 0.001;
    const rng = vx * tf;
    const mxH = (vy * vy) / (2 * g);
    return { g, rad, vx, vy, tf, rng, mxH };
  }

  const phys = useMemo(() => calcPhys(angle, speed, planet), [angle, speed, planet]);
  physRef.current = phys;

  const getPos = useCallback((t: number, p = phys) => ({
    x: p.vx * t,
    y: p.vy * t - 0.5 * p.g * t * t,
  }), [phys]);

  const draw = useCallback((t: number, p = phys) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const worldW = Math.max(p.rng  * 1.2, 10);
    const worldH = Math.max(p.mxH  * 1.8, 10);
    const aW = CW - PAD.l - PAD.r;
    const aH = CH - PAD.t - PAD.b;
    const sx = aW / worldW;
    const sy = aH / worldH;

    const wx = (x: number) => PAD.l + x * sx;
    const wy = (y: number) => CH - PAD.b - y * sy;

    // ── Background ──────────────────────────────────────────────────────────
    ctx.fillStyle = "#080e1c";
    ctx.fillRect(0, 0, CW, CH);

    // ── Grid ────────────────────────────────────────────────────────────────
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.055)";
    ctx.lineWidth = 1;
    ctx.font = "9px Inter, ui-sans-serif, sans-serif";

    const xStep = niceStep(worldW / 6);
    for (let x = 0; x <= worldW * 1.01; x += xStep) {
      const cx = wx(x);
      if (cx < PAD.l - 1 || cx > CW - PAD.r + 1) continue;
      ctx.beginPath(); ctx.moveTo(cx, PAD.t); ctx.lineTo(cx, CH - PAD.b); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.textAlign = "center";
      ctx.fillText(`${Math.round(x)}`, cx, CH - PAD.b + 14);
    }

    const yStep = niceStep(worldH / 4);
    for (let y = yStep; y <= worldH * 1.01; y += yStep) {
      const cy = wy(y);
      if (cy < PAD.t - 1) break;
      ctx.beginPath(); ctx.moveTo(PAD.l, cy); ctx.lineTo(CW - PAD.r, cy); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.textAlign = "right";
      ctx.fillText(`${Math.round(y)}`, PAD.l - 6, cy + 3);
    }

    // Axis labels
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.textAlign = "center";
    ctx.fillText("distance (m)", PAD.l + aW / 2, CH - 4);
    ctx.save();
    ctx.translate(12, PAD.t + aH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("height (m)", 0, 0);
    ctx.restore();
    ctx.restore();

    // ── Ground ──────────────────────────────────────────────────────────────
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(PAD.l, wy(0)); ctx.lineTo(CW - PAD.r, wy(0)); ctx.stroke();

    // ── Trajectory preview (dashed) ─────────────────────────────────────────
    ctx.save();
    ctx.setLineDash([3, 5]);
    ctx.strokeStyle = "rgba(120, 160, 255, 0.18)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i <= 80; i++) {
      const pt = getPos((i / 80) * p.tf, p);
      i === 0 ? ctx.moveTo(wx(pt.x), wy(pt.y)) : ctx.lineTo(wx(pt.x), wy(pt.y));
    }
    ctx.stroke();
    ctx.restore();

    // ── Trail ───────────────────────────────────────────────────────────────
    const tNow = Math.min(t, p.tf);
    if (tNow > 0) {
      const steps = 80;
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i <= steps; i++) {
        const pt = getPos((i / steps) * tNow, p);
        pts.push({ x: wx(pt.x), y: wy(pt.y) });
      }
      const grad = ctx.createLinearGradient(pts[0].x, pts[0].y, pts[pts.length - 1].x, pts[pts.length - 1].y);
      grad.addColorStop(0, "rgba(79,111,245,0.08)");
      grad.addColorStop(1, "rgba(99,131,255,0.95)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      pts.forEach((pt, i) => (i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)));
      ctx.stroke();
    }

    // ── Angle arc + velocity arrow ───────────────────────────────────────────
    if (tNow === 0 || tNow >= p.tf) {
      const arcR = 30;
      ctx.strokeStyle = "rgba(251,191,36,0.65)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(wx(0), wy(0), arcR, -p.rad, 0, false);
      ctx.stroke();

      // Arrow
      const arrowLen = 50;
      const ax = arrowLen * Math.cos(p.rad);
      const ay = arrowLen * Math.sin(p.rad);
      const ex = wx(0) + ax;
      const ey = wy(0) - ay;
      ctx.strokeStyle = "rgba(251,191,36,0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(wx(0), wy(0)); ctx.lineTo(ex, ey); ctx.stroke();
      const ha = Math.atan2(ey - wy(0), ex - wx(0));
      const hl = 9;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - hl * Math.cos(ha - 0.38), ey - hl * Math.sin(ha - 0.38));
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - hl * Math.cos(ha + 0.38), ey - hl * Math.sin(ha + 0.38));
      ctx.stroke();

      // Angle label
      ctx.fillStyle = "rgba(251,191,36,0.95)";
      ctx.font = "bold 11px Inter, ui-sans-serif, sans-serif";
      ctx.textAlign = "left";
      const lx = wx(0) + (arcR + 10) * Math.cos(p.rad / 2);
      const ly = wy(0) - (arcR + 10) * Math.sin(p.rad / 2);
      ctx.fillText(`${angle}°`, lx, ly + 4);
    }

    // ── Velocity components (during flight) ─────────────────────────────────
    if (tNow > 0 && tNow < p.tf) {
      const curPos = getPos(tNow, p);
      const bx = wx(curPos.x);
      const by = wy(curPos.y);
      const curVy = p.vy - p.g * tNow;
      const speed2 = Math.sqrt(p.vx * p.vx + curVy * curVy);
      const vscale = 30 / Math.max(speed2, 1);
      const vcx = p.vx * vscale;
      const vcy = curVy * vscale;
      ctx.strokeStyle = "rgba(99,131,255,0.55)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + vcx, by - vcy); ctx.stroke();
    }

    // ── Ball ────────────────────────────────────────────────────────────────
    const ballPos = getPos(tNow, p);
    const bx = wx(ballPos.x);
    const by = wy(ballPos.y);
    ctx.save();
    ctx.shadowColor = "#6383ff";
    ctx.shadowBlur = 18;
    ctx.fillStyle = "#5b7fef";
    ctx.beginPath(); ctx.arc(bx, by, 7, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.beginPath(); ctx.arc(bx - 2, by - 2, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // ── Peak label ──────────────────────────────────────────────────────────
    const tPeak = p.vy / p.g;
    if (tNow >= tPeak && tPeak > 0) {
      const peakPos = getPos(tPeak, p);
      ctx.fillStyle = "rgba(251,191,36,0.8)";
      ctx.font = "10px Inter, ui-sans-serif, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`▲ ${p.mxH.toFixed(1)} m`, wx(peakPos.x), wy(peakPos.y) - 11);
    }

    // ── Landing marker ──────────────────────────────────────────────────────
    if (tNow >= p.tf) {
      const lx = wx(p.rng);
      const ly = wy(0);
      const s = 5;
      ctx.strokeStyle = "rgba(99,131,255,0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lx - s, ly - s); ctx.lineTo(lx + s, ly + s);
      ctx.moveTo(lx + s, ly - s); ctx.lineTo(lx - s, ly + s);
      ctx.stroke();
      ctx.fillStyle = "rgba(99,131,255,0.85)";
      ctx.font = "bold 10px Inter, ui-sans-serif, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`← ${p.rng.toFixed(1)} m →`, lx, ly + 26);
    }
  }, [phys, getPos, angle]);

  // ── Animation loop ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!playing) return;
    const loop = (ts: number) => {
      if (!t0Ref.current) t0Ref.current = ts;
      const p = physRef.current!;
      const t = Math.min((ts - t0Ref.current) / 1000, p.tf);
      setElapsed(t);
      draw(t, p);
      if (t < p.tf) rafRef.current = requestAnimationFrame(loop);
      else { draw(p.tf, p); setPlaying(false); }
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, draw]);

  // Redraw when controls change (not playing)
  useEffect(() => {
    if (!playing) { setElapsed(0); draw(0); }
  }, [phys, playing, draw]);

  function launch() {
    t0Ref.current = 0;
    setElapsed(0);
    setPlaying(true);
  }
  function pause() { cancelAnimationFrame(rafRef.current); setPlaying(false); }
  function reset() {
    cancelAnimationFrame(rafRef.current);
    setPlaying(false);
    t0Ref.current = 0;
    setElapsed(0);
    draw(0);
  }

  // ── Drag angle on canvas ──────────────────────────────────────────────────
  function onCanvasPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (playing) return;
    setDragging(true);
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
  }
  function onCanvasPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dragging || playing) return;
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const scaleX = CW / rect.width;
    const scaleY = CH / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top)  * scaleY;
    const originX = PAD.l;
    const originY = CH - PAD.b;
    const dx = cx - originX;
    const dy = originY - cy;
    if (dx < 2) return;
    const a = Math.round(Math.max(5, Math.min(85, (Math.atan2(dy, dx) * 180) / Math.PI)));
    setAngle(a);
  }
  function onCanvasPointerUp() { setDragging(false); }

  const curVy  = phys.vy - phys.g * elapsed;
  const curSpd = Math.sqrt(phys.vx ** 2 + curVy ** 2);

  return (
    <div className="flex h-full flex-col gap-4 p-1">
      <div className="flex flex-1 gap-5 min-h-0">
        {/* Canvas */}
        <div className="relative flex-1 min-w-0 rounded-xl overflow-hidden border border-white/[0.07] bg-[#080e1c]"
             style={{ cursor: playing ? "default" : dragging ? "grabbing" : "crosshair" }}>
          <canvas
            ref={canvasRef}
            width={CW}
            height={CH}
            className="w-full h-full"
            style={{ display: "block" }}
            onPointerDown={onCanvasPointerDown}
            onPointerMove={onCanvasPointerMove}
            onPointerUp={onCanvasPointerUp}
            onPointerLeave={onCanvasPointerUp}
          />
          {!playing && elapsed === 0 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none">
              <span className="rounded-full bg-white/[0.07] px-3 py-1 text-[10px] text-white/40 tracking-wide">
                drag to set angle
              </span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex w-52 flex-col gap-5">
          {/* Sliders */}
          <div className="space-y-4">
            <SliderControl
              label="Launch Angle"
              value={angle}
              min={5} max={85} step={1}
              unit="°"
              color="rgb(251,191,36)"
              disabled={playing}
              onChange={setAngle}
            />
            <SliderControl
              label="Initial Speed"
              value={speed}
              min={10} max={80} step={1}
              unit=" m/s"
              color="rgb(99,131,255)"
              disabled={playing}
              onChange={setSpeed}
            />
          </div>

          {/* Planet selector */}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Planet</p>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.entries(PLANETS) as [Planet, typeof PLANETS[Planet]][]).map(([key, pl]) => (
                <button
                  key={key}
                  disabled={playing}
                  onClick={() => setPlanet(key)}
                  className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors
                    ${planet === key
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"}`}
                >
                  {pl.label}
                  <span className="ml-1 text-[10px] opacity-60">{pl.g}g</span>
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Stats</p>
            <Stat label="Range"       value={`${phys.rng.toFixed(1)} m`} />
            <Stat label="Max Height"  value={`${phys.mxH.toFixed(1)} m`} />
            <Stat label="Flight Time" value={`${phys.tf.toFixed(2)} s`} />
            {playing && (
              <Stat label="Speed now"  value={`${curSpd.toFixed(1)} m/s`} highlight />
            )}
          </div>

          {/* Buttons */}
          <div className="mt-auto flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-border"
              onClick={reset}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
            <Button
              size="sm"
              className="flex-1 gap-1.5 bg-primary hover:bg-primary/90"
              onClick={playing ? pause : launch}
            >
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {playing ? "Pause" : elapsed > 0 && elapsed < phys.tf ? "Resume" : "Launch"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SliderControl({
  label, value, min, max, step, unit, color, disabled, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number;
  unit: string; color: string; disabled?: boolean; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
        <p className="text-sm font-bold tabular-nums text-foreground">{value}{unit}</p>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-secondary disabled:opacity-40"
        style={{ accentColor: color }}
      />
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-xs font-bold tabular-nums ${highlight ? "text-primary" : "text-foreground"}`}>{value}</span>
    </div>
  );
}
