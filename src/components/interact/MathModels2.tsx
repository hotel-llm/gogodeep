import { useCallback, useEffect, useRef, useState } from "react";
import {
  useRaf, ModelWrap, Slider, Stat, SectionLabel, StepNav,
  C_BG, C_FG, C_DIM, C_GRID, C_PRIMARY, C_GREEN, C_RED, C_AMBER, C_PURPLE, C_CYAN,
  TAU, clamp, lerp, drawAxes, drawCurve,
} from "./shared";

// ── helpers ───────────────────────────────────────────────────────────────────
function setupCanvas(cv: HTMLCanvasElement) {
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = C_BG; ctx.fillRect(0, 0, cv.width, cv.height);
  return ctx;
}
function grid(ctx: CanvasRenderingContext2D, ox: number, oy: number, pw: number, ph: number, xStep = 1, yStep = 1, xRange = 10, yRange = 6) {
  ctx.strokeStyle = C_GRID; ctx.lineWidth = 1;
  for (let x = -xRange; x <= xRange; x += xStep) {
    const px = ox + x * pw / (2 * xRange);
    ctx.beginPath(); ctx.moveTo(px, oy - ph); ctx.lineTo(px, oy); ctx.stroke();
  }
  for (let y = -yRange; y <= yRange; y += yStep) {
    const py = oy - y * ph / (2 * yRange);
    ctx.beginPath(); ctx.moveTo(ox - pw / 2, py); ctx.lineTo(ox + pw / 2, py); ctx.stroke();
  }
}
function axes(ctx: CanvasRenderingContext2D, ox: number, oy: number, pw: number, ph: number) {
  ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(ox - pw / 2, oy); ctx.lineTo(ox + pw / 2, oy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox, oy - ph); ctx.stroke();
}
function tickLabels(ctx: CanvasRenderingContext2D, ox: number, oy: number, pw: number, ph: number, xRange = 10, yRange = 6) {
  ctx.fillStyle = C_DIM; ctx.font = "9px Inter,sans-serif"; ctx.textAlign = "center";
  for (let x = -xRange; x <= xRange; x += 2) {
    if (x === 0) continue;
    ctx.fillText(String(x), ox + x * pw / (2 * xRange), oy + 12);
  }
  ctx.textAlign = "right";
  for (let y = -yRange; y <= yRange; y += 2) {
    if (y === 0) continue;
    ctx.fillText(String(y), ox - pw / 2 - 4, oy - y * ph / (2 * yRange) + 3);
  }
}

// ── 1. Quadratic Equations ────────────────────────────────────────────────────
export function QuadraticEquations() {
  const [a, setA] = useState(1);
  const [b, setB] = useState(0);
  const [c, setC] = useState(-4);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = setupCanvas(cv);
    const W = cv.width, H = cv.height;
    const pad = { l: 50, r: 20, t: 20, b: 40 };
    const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
    const ox = pad.l + pw / 2, oy = pad.t + ph;
    grid(ctx, ox, oy, pw, ph, 2, 2, 10, 8);
    axes(ctx, ox, oy, pw, ph);
    tickLabels(ctx, ox, oy, pw, ph, 10, 8);
    const toX = (x: number) => ox + x * pw / 20;
    const toY = (y: number) => oy - y * ph / 16;
    // parabola
    const pts: [number, number][] = [];
    for (let i = 0; i <= 300; i++) {
      const x = -10 + i * 20 / 300;
      const y = a * x * x + b * x + c;
      if (y < -8 || y > 8) continue;
      pts.push([toX(x), toY(y)]);
    }
    drawCurve(ctx, pts, C_PRIMARY, 2.5);
    // roots
    if (a !== 0) {
      const disc = b * b - 4 * a * c;
      if (disc >= 0) {
        const sq = Math.sqrt(disc);
        for (const r of [(-b + sq) / (2 * a), (-b - sq) / (2 * a)]) {
          if (Math.abs(r) <= 10) {
            ctx.beginPath(); ctx.arc(toX(r), toY(0), 5, 0, TAU);
            ctx.fillStyle = C_GREEN; ctx.fill();
          }
        }
      }
      // vertex
      const vx = -b / (2 * a), vy = a * vx * vx + b * vx + c;
      if (Math.abs(vx) <= 10 && vy > -8 && vy < 8) {
        ctx.beginPath(); ctx.arc(toX(vx), toY(vy), 5, 0, TAU);
        ctx.fillStyle = C_AMBER; ctx.fill();
      }
    }
    // label
    ctx.fillStyle = C_FG; ctx.font = "bold 13px Inter,sans-serif"; ctx.textAlign = "left";
    const sign = (v: number, first = false) => v >= 0 ? (first ? "" : " + ") + v : " − " + Math.abs(v);
    ctx.fillText(`y = ${a}x²${sign(b)}x${sign(c)}`, pad.l + 6, pad.t + 16);
  }, [a, b, c]);
  const disc = b * b - 4 * a * c;
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={<>
      <Slider label="a" value={a} min={-3} max={3} step={0.5} onChange={setA} />
      <Slider label="b" value={b} min={-6} max={6} step={0.5} onChange={setB} />
      <Slider label="c" value={c} min={-6} max={6} step={0.5} onChange={setC} />
      <Stat label="Discriminant" value={disc.toFixed(1)} />
      <Stat label="Roots" value={disc > 0 ? "2 real" : disc === 0 ? "1 real" : "complex"} />
      <Stat label="Vertex x" value={a !== 0 ? (-b / (2 * a)).toFixed(2) : "—"} />
    </>} />
  );
}

// ── 2. Systems of Equations ───────────────────────────────────────────────────
export function SystemsOfEquations() {
  const [m1, setM1] = useState(1);
  const [b1, setB1] = useState(2);
  const [m2, setM2] = useState(-1);
  const [b2, setB2] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = setupCanvas(cv);
    const W = cv.width, H = cv.height;
    const pad = { l: 50, r: 20, t: 20, b: 40 };
    const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
    const ox = pad.l + pw / 2, oy = pad.t + ph / 2;
    grid(ctx, ox, oy, pw, ph);
    axes(ctx, ox, oy, pw, ph);
    tickLabels(ctx, ox, oy, pw, ph);
    const toX = (x: number) => ox + x * pw / 20;
    const toY = (y: number) => oy - y * ph / 12;
    const linePts = (m: number, b: number): [number, number][] =>
      [[-10, m * -10 + b], [10, m * 10 + b]].filter(([,y]) => y >= -6 && y <= 6).map(([x,y]) => [toX(x), toY(y)]);
    drawCurve(ctx, [[-10, m1 * -10 + b1], [10, m1 * 10 + b1]].map(([x,y]) => [toX(x), toY(y)] as [number,number]), C_PRIMARY, 2);
    drawCurve(ctx, [[-10, m2 * -10 + b2], [10, m2 * 10 + b2]].map(([x,y]) => [toX(x), toY(y)] as [number,number]), C_AMBER, 2);
    // intersection
    if (m1 !== m2) {
      const ix = (b2 - b1) / (m1 - m2);
      const iy = m1 * ix + b1;
      if (Math.abs(ix) <= 10 && Math.abs(iy) <= 6) {
        ctx.beginPath(); ctx.arc(toX(ix), toY(iy), 6, 0, TAU);
        ctx.fillStyle = C_GREEN; ctx.fill();
        ctx.fillStyle = C_FG; ctx.font = "11px Inter,sans-serif"; ctx.textAlign = "left";
        ctx.fillText(`(${ix.toFixed(1)}, ${iy.toFixed(1)})`, toX(ix) + 9, toY(iy) - 4);
      }
    }
    ctx.fillStyle = C_PRIMARY; ctx.font = "11px Inter,sans-serif"; ctx.textAlign = "left";
    ctx.fillText(`y = ${m1}x + ${b1}`, pad.l + 6, pad.t + 16);
    ctx.fillStyle = C_AMBER;
    ctx.fillText(`y = ${m2}x + ${b2}`, pad.l + 6, pad.t + 32);
  }, [m1, b1, m2, b2]);
  const parallel = m1 === m2;
  const ix = parallel ? NaN : (b2 - b1) / (m1 - m2);
  const iy = parallel ? NaN : m1 * ix + b1;
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={<>
      <SectionLabel>Line 1 (blue)</SectionLabel>
      <Slider label="slope m₁" value={m1} min={-4} max={4} step={0.5} onChange={setM1} color={C_PRIMARY} />
      <Slider label="intercept b₁" value={b1} min={-5} max={5} step={0.5} onChange={setB1} color={C_PRIMARY} />
      <SectionLabel>Line 2 (amber)</SectionLabel>
      <Slider label="slope m₂" value={m2} min={-4} max={4} step={0.5} onChange={setM2} color={C_AMBER} />
      <Slider label="intercept b₂" value={b2} min={-5} max={5} step={0.5} onChange={setB2} color={C_AMBER} />
      <Stat label="Solution" value={parallel ? "No solution" : `(${ix.toFixed(1)}, ${iy.toFixed(1)})`} />
    </>} />
  );
}

// ── 3. Logarithms ─────────────────────────────────────────────────────────────
export function Logarithms() {
  const [base, setBase] = useState(2);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = setupCanvas(cv);
    const W = cv.width, H = cv.height;
    const pad = { l: 50, r: 20, t: 20, b: 40 };
    const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
    const ox = pad.l, oy = pad.t + ph / 2;
    const xMax = 12, yRange = 6;
    const toX = (x: number) => ox + x * pw / xMax;
    const toY = (y: number) => oy - y * ph / (2 * yRange);
    // grid
    ctx.strokeStyle = C_GRID; ctx.lineWidth = 1;
    for (let x = 0; x <= xMax; x += 2) { ctx.beginPath(); ctx.moveTo(toX(x), pad.t); ctx.lineTo(toX(x), pad.t + ph); ctx.stroke(); }
    for (let y = -yRange; y <= yRange; y += 2) { ctx.beginPath(); ctx.moveTo(ox, toY(y)); ctx.lineTo(ox + pw, toY(y)); ctx.stroke(); }
    // axes
    ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + pw, oy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ox, pad.t); ctx.lineTo(ox, pad.t + ph); ctx.stroke();
    ctx.fillStyle = C_DIM; ctx.font = "9px Inter,sans-serif"; ctx.textAlign = "center";
    for (let x = 2; x <= 10; x += 2) ctx.fillText(String(x), toX(x), oy + 12);
    ctx.textAlign = "right";
    for (let y = -4; y <= 4; y += 2) if (y !== 0) ctx.fillText(String(y), ox - 4, toY(y) + 3);
    const logB = (x: number) => Math.log(x) / Math.log(base);
    // log curve
    const pts: [number, number][] = [];
    for (let i = 1; i <= 300; i++) {
      const x = 0.05 + i * (xMax - 0.05) / 300;
      const y = logB(x);
      if (y < -yRange || y > yRange) continue;
      pts.push([toX(x), toY(y)]);
    }
    drawCurve(ctx, pts, C_PRIMARY, 2.5);
    // exponential inverse
    const epts: [number, number][] = [];
    for (let i = 0; i <= 300; i++) {
      const x = -yRange + i * (2 * yRange) / 300;
      const y = Math.pow(base, x);
      if (y < 0 || y > xMax) continue;
      epts.push([toX(y), toY(x)]);
    }
    drawCurve(ctx, epts, C_AMBER + "88", 1.5);
    // key point: (1,0)
    ctx.beginPath(); ctx.arc(toX(1), toY(0), 4, 0, TAU); ctx.fillStyle = C_GREEN; ctx.fill();
    // (base, 1)
    if (base > 0 && base <= xMax) {
      ctx.beginPath(); ctx.arc(toX(base), toY(1), 4, 0, TAU); ctx.fillStyle = C_CYAN; ctx.fill();
    }
    ctx.fillStyle = C_FG; ctx.font = "bold 12px Inter,sans-serif"; ctx.textAlign = "left";
    ctx.fillText(`y = log${base}(x)`, ox + 6, pad.t + 16);
    ctx.fillStyle = C_AMBER + "cc"; ctx.font = "11px Inter,sans-serif";
    ctx.fillText(`y = ${base}ˣ (inverse)`, ox + 6, pad.t + 32);
  }, [base]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={<>
      <Slider label="Base" value={base} min={1.2} max={10} step={0.2} onChange={setBase} />
      <Stat label="log_b(1)" value="0 (always)" />
      <Stat label="log_b(b)" value="1 (always)" />
      <Stat label="Domain" value="x > 0" />
    </>} />
  );
}

// ── 4. Complex Numbers ────────────────────────────────────────────────────────
export function ComplexNumbers() {
  const [r1, setR1] = useState(2); const [i1, setI1] = useState(1);
  const [r2, setR2] = useState(-1); const [i2, setI2] = useState(2);
  const [mode, setMode] = useState<"add" | "mul">("add");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = setupCanvas(cv);
    const W = cv.width, H = cv.height;
    const ox = W / 2, oy = H / 2, scale = 45;
    // grid
    ctx.strokeStyle = C_GRID; ctx.lineWidth = 1;
    for (let x = -6; x <= 6; x++) { ctx.beginPath(); ctx.moveTo(ox + x * scale, 10); ctx.lineTo(ox + x * scale, H - 30); ctx.stroke(); }
    for (let y = -3; y <= 3; y++) { ctx.beginPath(); ctx.moveTo(20, oy + y * scale); ctx.lineTo(W - 10, oy + y * scale); ctx.stroke(); }
    // axes
    ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(20, oy); ctx.lineTo(W - 10, oy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ox, 10); ctx.lineTo(ox, H - 30); ctx.stroke();
    ctx.fillStyle = C_DIM; ctx.font = "10px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText("Re", W - 16, oy - 6);
    ctx.textAlign = "left"; ctx.fillText("Im", ox + 4, 22);
    const drawVec = (re: number, im: number, color: string, label: string) => {
      ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + re * scale, oy - im * scale); ctx.stroke();
      ctx.beginPath(); ctx.arc(ox + re * scale, oy - im * scale, 5, 0, TAU);
      ctx.fillStyle = color; ctx.fill();
      ctx.fillStyle = color; ctx.font = "11px Inter,sans-serif"; ctx.textAlign = "left";
      ctx.fillText(label, ox + re * scale + 8, oy - im * scale - 4);
    };
    drawVec(r1, i1, C_PRIMARY, `z₁=${r1}+${i1}i`);
    drawVec(r2, i2, C_AMBER, `z₂=${r2}+${i2}i`);
    let rr: number, ri: number;
    if (mode === "add") { rr = r1 + r2; ri = i1 + i2; }
    else { rr = r1 * r2 - i1 * i2; ri = r1 * i2 + i1 * r2; }
    drawVec(rr, ri, C_GREEN, `z₁${mode === "add" ? "+" : "×"}z₂`);
    // dashed parallelogram for add
    if (mode === "add") {
      ctx.strokeStyle = C_DIM; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(ox + r1 * scale, oy - i1 * scale); ctx.lineTo(ox + rr * scale, oy - ri * scale); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ox + r2 * scale, oy - i2 * scale); ctx.lineTo(ox + rr * scale, oy - ri * scale); ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [r1, i1, r2, i2, mode]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={<>
      <SectionLabel>z₁</SectionLabel>
      <Slider label="Re(z₁)" value={r1} min={-4} max={4} step={0.5} onChange={setR1} color={C_PRIMARY} />
      <Slider label="Im(z₁)" value={i1} min={-3} max={3} step={0.5} onChange={setI1} color={C_PRIMARY} />
      <SectionLabel>z₂</SectionLabel>
      <Slider label="Re(z₂)" value={r2} min={-4} max={4} step={0.5} onChange={setR2} color={C_AMBER} />
      <Slider label="Im(z₂)" value={i2} min={-3} max={3} step={0.5} onChange={setI2} color={C_AMBER} />
      <div className="flex gap-1">
        {(["add","mul"] as const).map(m => (
          <button key={m} onClick={() => setMode(m)} className={`flex-1 rounded py-1 text-xs font-medium ${mode===m ? "bg-primary/20 text-primary border border-primary/30" : "border border-border text-muted-foreground"}`}>{m==="add"?"Add":"Multiply"}</button>
        ))}
      </div>
    </>} />
  );
}

// ── 5. Sequences & Series ─────────────────────────────────────────────────────
export function SequencesSeries() {
  const [type, setType] = useState<"arithmetic" | "geometric">("arithmetic");
  const [a0, setA0] = useState(1);
  const [d, setD] = useState(2);
  const [n, setN] = useState(8);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = setupCanvas(cv);
    const W = cv.width, H = cv.height;
    const pad = { l: 50, r: 20, t: 30, b: 50 };
    const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
    const terms: number[] = [a0];
    for (let i = 1; i < n; i++)
      terms.push(type === "arithmetic" ? terms[i - 1] + d : terms[i - 1] * d);
    const maxVal = Math.max(...terms.map(Math.abs), 1);
    const barW = pw / n * 0.7;
    const barSpacing = pw / n;
    let sum = 0;
    terms.forEach((v, i) => {
      sum += v;
      const bx = pad.l + i * barSpacing + barSpacing * 0.15;
      const barH = Math.abs(v) / maxVal * ph * 0.8;
      const by = v >= 0 ? pad.t + ph - barH : pad.t + ph;
      ctx.fillStyle = C_PRIMARY + "cc"; ctx.fillRect(bx, by, barW, barH);
      ctx.fillStyle = C_FG; ctx.font = "10px Inter,sans-serif"; ctx.textAlign = "center";
      if (barH > 14) ctx.fillText(v.toFixed(1), bx + barW / 2, by + (v >= 0 ? barH - 4 : -4));
      else ctx.fillText(v.toFixed(1), bx + barW / 2, by - 4);
      ctx.fillStyle = C_DIM; ctx.font = "9px Inter,sans-serif";
      ctx.fillText(`a${i + 1}`, bx + barW / 2, pad.t + ph + 14);
    });
    // baseline
    ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(pad.l, pad.t + ph); ctx.lineTo(pad.l + pw, pad.t + ph); ctx.stroke();
    ctx.fillStyle = C_AMBER; ctx.font = "11px Inter,sans-serif"; ctx.textAlign = "left";
    ctx.fillText(`Sₙ = ${sum.toFixed(2)}`, pad.l + 6, pad.t + 18);
    ctx.fillStyle = C_DIM;
    const formula = type === "arithmetic"
      ? `aₙ = ${a0} + (n−1)·${d}`
      : `aₙ = ${a0} · ${d}^(n−1)`;
    ctx.fillText(formula, pad.l + 6, pad.t + 34);
  }, [type, a0, d, n]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={<>
      <div className="flex gap-1">
        {(["arithmetic","geometric"] as const).map(t => (
          <button key={t} onClick={() => setType(t)} className={`flex-1 rounded py-1 text-[11px] font-medium ${type===t ? "bg-primary/20 text-primary border border-primary/30" : "border border-border text-muted-foreground"}`}>{t[0].toUpperCase()+t.slice(1,4)}</button>
        ))}
      </div>
      <Slider label="First term a₁" value={a0} min={-5} max={10} step={0.5} onChange={setA0} />
      <Slider label={type === "arithmetic" ? "Common diff d" : "Common ratio r"} value={d} min={type==="arithmetic" ? -5 : -3} max={type==="arithmetic" ? 5 : 3} step={0.5} onChange={setD} />
      <Slider label="Terms n" value={n} min={2} max={12} onChange={setN} />
    </>} />
  );
}

// ── 6. Binomial Theorem (Pascal's Triangle) ───────────────────────────────────
export function BinomialTheorem() {
  const [rowN, setRowN] = useState(5);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = setupCanvas(cv);
    const W = cv.width, H = cv.height;
    const rows = rowN + 1;
    const tri: number[][] = [[1]];
    for (let i = 1; i < rows; i++) {
      const prev = tri[i - 1];
      tri.push([1, ...prev.slice(0, -1).map((v, j) => v + prev[j + 1]), 1]);
    }
    const cellW = Math.min(60, (W - 40) / (rows));
    const cellH = Math.min(36, (H - 40) / rows);
    const colors = [C_PRIMARY, C_CYAN, C_GREEN, C_AMBER, C_PURPLE, C_RED];
    tri.forEach((row, i) => {
      const rowY = 30 + i * cellH;
      row.forEach((val, j) => {
        const rowX = W / 2 + (j - row.length / 2 + 0.5) * cellW;
        const color = colors[i % colors.length];
        ctx.fillStyle = color + (i === rowN ? "33" : "18");
        ctx.strokeStyle = color + (i === rowN ? "cc" : "55");
        ctx.lineWidth = i === rowN ? 2 : 1;
        ctx.beginPath(); ctx.roundRect(rowX - cellW * 0.44, rowY - cellH * 0.44, cellW * 0.88, cellH * 0.88, 5); ctx.fill(); ctx.stroke();
        ctx.fillStyle = i === rowN ? C_FG : C_DIM;
        ctx.font = `${i === rowN ? "bold " : ""}${Math.min(14, cellW * 0.4)}px Inter,sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(String(val), rowX, rowY);
      });
    });
    ctx.textBaseline = "alphabetic";
    const highlighted = tri[rowN];
    ctx.fillStyle = C_DIM; ctx.font = "10px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText(`(x+y)^${rowN} = ` + highlighted.map((c, k) => `${c}x^${rowN-k}y^${k}`).join(" + "), W / 2, H - 10);
  }, [rowN]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={<>
      <Slider label="Power n" value={rowN} min={0} max={8} onChange={setRowN} />
      <Stat label="Terms" value={String(rowN + 1)} />
      <Stat label="Row sum" value={String(Math.pow(2, rowN))} />
    </>} />
  );
}

// ── 7. Inverse Functions ──────────────────────────────────────────────────────
export function InverseFunctions() {
  const [power, setPower] = useState(3);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = setupCanvas(cv);
    const W = cv.width, H = cv.height;
    const pad = { l: 50, r: 20, t: 20, b: 40 };
    const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
    const ox = pad.l + pw / 2, oy = pad.t + ph / 2;
    grid(ctx, ox, oy, pw, ph);
    axes(ctx, ox, oy, pw, ph);
    tickLabels(ctx, ox, oy, pw, ph);
    const toX = (x: number) => ox + x * pw / 20;
    const toY = (y: number) => oy - y * ph / 12;
    // y=x line (mirror)
    ctx.strokeStyle = C_GRID + "aa"; ctx.lineWidth = 1; ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(toX(-6), toY(-6)); ctx.lineTo(toX(6), toY(6)); ctx.stroke();
    ctx.setLineDash([]);
    // f(x) = x^power (odd power for bijective)
    const p = power % 2 === 0 ? power + 1 : power; // keep odd for invertibility
    const f = (x: number) => Math.pow(x, p);
    const finv = (x: number) => Math.sign(x) * Math.pow(Math.abs(x), 1 / p);
    const fpts: [number, number][] = [];
    const invpts: [number, number][] = [];
    for (let i = 0; i <= 200; i++) {
      const x = -5 + i * 10 / 200;
      const y = f(x); const yi = finv(x);
      if (Math.abs(y) <= 6) fpts.push([toX(x), toY(y)]);
      if (Math.abs(yi) <= 6) invpts.push([toX(x), toY(yi)]);
    }
    drawCurve(ctx, fpts, C_PRIMARY, 2.5);
    drawCurve(ctx, invpts, C_AMBER, 2.5);
    ctx.fillStyle = C_PRIMARY; ctx.font = "11px Inter,sans-serif"; ctx.textAlign = "left";
    ctx.fillText(`f(x) = x^${p}`, pad.l + 6, pad.t + 16);
    ctx.fillStyle = C_AMBER;
    ctx.fillText(`f⁻¹(x) = x^(1/${p})`, pad.l + 6, pad.t + 32);
    ctx.fillStyle = C_DIM + "99";
    ctx.fillText("y = x", toX(4.5) + 6, toY(4.5));
  }, [power]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={<>
      <Slider label="Power" value={power} min={1} max={7} step={2} onChange={setPower} />
      <Stat label="f(x)" value={`x^${power % 2 === 0 ? power + 1 : power}`} />
      <Stat label="f⁻¹(x)" value={`x^(1/${power % 2 === 0 ? power + 1 : power})`} />
      <p className="text-[11px] text-muted-foreground">Odd powers are bijective — inverse exists over all reals.</p>
    </>} />
  );
}

// ── 8. Limits & Continuity ────────────────────────────────────────────────────
export function LimitsAndContinuity() {
  const [approach, setApproach] = useState(0);
  const [fnType, setFnType] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fns = [
    { label: "sin(x)/x", f: (x: number) => x === 0 ? NaN : Math.sin(x) / x, limit: "1", at: "x→0" },
    { label: "(x²−4)/(x−2)", f: (x: number) => Math.abs(x - 2) < 0.001 ? NaN : (x * x - 4) / (x - 2), limit: "4", at: "x→2" },
    { label: "1/x²", f: (x: number) => x === 0 ? NaN : 1 / (x * x), limit: "∞", at: "x→0" },
  ];
  const fn = fns[fnType];
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = setupCanvas(cv);
    const W = cv.width, H = cv.height;
    const pad = { l: 50, r: 20, t: 20, b: 40 };
    const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
    const ox = pad.l + pw / 2, oy = pad.t + ph / 2;
    grid(ctx, ox, oy, pw, ph);
    axes(ctx, ox, oy, pw, ph);
    tickLabels(ctx, ox, oy, pw, ph);
    const toX = (x: number) => ox + x * pw / 20;
    const toY = (y: number) => oy - y * ph / 12;
    // curve
    for (let side = -1; side <= 1; side += 2) {
      const pts: [number, number][] = [];
      for (let i = 1; i <= 200; i++) {
        const x = side * (i * 10 / 200);
        const y = fn.f(x);
        if (!isFinite(y) || Math.abs(y) > 6) { if (pts.length > 1) drawCurve(ctx, pts, C_PRIMARY, 2); pts.length = 0; continue; }
        pts.push([toX(x), toY(y)]);
      }
      if (pts.length > 1) drawCurve(ctx, pts, C_PRIMARY, 2);
    }
    // hole at discontinuity
    const holeX = fnType === 1 ? 2 : 0;
    const limitY = fnType === 0 ? 1 : fnType === 1 ? 4 : 6;
    ctx.beginPath(); ctx.arc(toX(holeX), toY(limitY), 5, 0, TAU);
    ctx.strokeStyle = C_GREEN; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = C_BG; ctx.fill();
    // approaching arrow
    const ax = approach;
    const ay = fn.f(ax + 0.001);
    if (isFinite(ay) && Math.abs(ay) < 6) {
      ctx.beginPath(); ctx.arc(toX(ax), toY(ay), 5, 0, TAU);
      ctx.fillStyle = C_AMBER; ctx.fill();
      ctx.fillStyle = C_AMBER; ctx.font = "10px Inter,sans-serif"; ctx.textAlign = "left";
      ctx.fillText(`x=${ax.toFixed(2)}, f≈${ay.toFixed(3)}`, toX(ax) + 8, toY(ay) - 4);
    }
    ctx.fillStyle = C_FG; ctx.font = "bold 12px Inter,sans-serif"; ctx.textAlign = "left";
    ctx.fillText(`f(x) = ${fn.label}`, pad.l + 6, pad.t + 16);
    ctx.fillStyle = C_GREEN; ctx.font = "11px Inter,sans-serif";
    ctx.fillText(`lim ${fn.at} = ${fn.limit}`, pad.l + 6, pad.t + 32);
  }, [approach, fnType, fn]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={<>
      <SectionLabel>Function</SectionLabel>
      {fns.map((f, i) => (
        <button key={i} onClick={() => setFnType(i)} className={`w-full text-left rounded px-2 py-1.5 text-xs ${fnType === i ? "bg-primary/20 text-primary border border-primary/30" : "border border-border text-muted-foreground"}`}>{f.label}</button>
      ))}
      <Slider label="Approach x" value={approach} min={fnType === 1 ? 1 : -3} max={fnType === 1 ? 3 : 3} step={0.05} onChange={setApproach} />
    </>} />
  );
}

// ── 9. The Derivative (tangent line) ─────────────────────────────────────────
export function TheDerivative() {
  const [xPos, setXPos] = useState(1);
  const [fnType, setFnType] = useState(0);
  const fns = [
    { label: "x³ − 3x", f: (x: number) => x ** 3 - 3 * x, df: (x: number) => 3 * x ** 2 - 3 },
    { label: "sin(x)", f: (x: number) => Math.sin(x), df: (x: number) => Math.cos(x) },
    { label: "x² − 2", f: (x: number) => x ** 2 - 2, df: (x: number) => 2 * x },
  ];
  const fn = fns[fnType];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = setupCanvas(cv);
    const W = cv.width, H = cv.height;
    const pad = { l: 50, r: 20, t: 20, b: 40 };
    const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
    const ox = pad.l + pw / 2, oy = pad.t + ph / 2;
    grid(ctx, ox, oy, pw, ph);
    axes(ctx, ox, oy, pw, ph);
    tickLabels(ctx, ox, oy, pw, ph);
    const toX = (x: number) => ox + x * pw / 20;
    const toY = (y: number) => oy - y * ph / 12;
    const pts: [number, number][] = [];
    for (let i = 0; i <= 300; i++) {
      const x = -10 + i * 20 / 300;
      const y = fn.f(x);
      if (Math.abs(y) > 6) { if (pts.length > 1) drawCurve(ctx, pts, C_PRIMARY, 2.5); pts.length = 0; continue; }
      pts.push([toX(x), toY(y)]);
    }
    if (pts.length > 1) drawCurve(ctx, pts, C_PRIMARY, 2.5);
    // tangent line
    const tx = xPos, ty = fn.f(tx), slope = fn.df(tx);
    const t1 = -10, t2 = 10;
    const ty1 = ty + slope * (t1 - tx), ty2 = ty + slope * (t2 - tx);
    drawCurve(ctx, [[toX(t1), toY(ty1)], [toX(t2), toY(ty2)]], C_AMBER, 1.5);
    // contact point
    ctx.beginPath(); ctx.arc(toX(tx), toY(ty), 5, 0, TAU);
    ctx.fillStyle = C_GREEN; ctx.fill();
    // slope label
    ctx.fillStyle = C_FG; ctx.font = "bold 12px Inter,sans-serif"; ctx.textAlign = "left";
    ctx.fillText(`f(x) = ${fn.label}`, pad.l + 6, pad.t + 16);
    ctx.fillStyle = C_AMBER; ctx.font = "11px Inter,sans-serif";
    ctx.fillText(`f′(${tx.toFixed(1)}) = ${slope.toFixed(2)}`, pad.l + 6, pad.t + 32);
  }, [xPos, fnType, fn]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={<>
      <SectionLabel>Function</SectionLabel>
      {fns.map((f, i) => (
        <button key={i} onClick={() => setFnType(i)} className={`w-full text-left rounded px-2 py-1.5 text-xs ${fnType === i ? "bg-primary/20 text-primary border border-primary/30" : "border border-border text-muted-foreground"}`}>{f.label}</button>
      ))}
      <Slider label="x position" value={xPos} min={-4} max={4} step={0.1} onChange={setXPos} />
      <Stat label="f(x)" value={fn.f(xPos).toFixed(3)} />
      <Stat label="f′(x)" value={fn.df(xPos).toFixed(3)} />
    </>} />
  );
}

// ── 10. Definite Integrals (Riemann sums) ─────────────────────────────────────
export function DefiniteIntegrals() {
  const [nRect, setNRect] = useState(8);
  const [a, setA] = useState(-2);
  const [b2, setB2] = useState(2);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = setupCanvas(cv);
    const W = cv.width, H = cv.height;
    const pad = { l: 50, r: 20, t: 20, b: 40 };
    const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
    const ox = pad.l + pw / 2, oy = pad.t + ph / 2;
    grid(ctx, ox, oy, pw, ph);
    axes(ctx, ox, oy, pw, ph);
    tickLabels(ctx, ox, oy, pw, ph);
    const toX = (x: number) => ox + x * pw / 20;
    const toY = (y: number) => oy - y * ph / 12;
    const f = (x: number) => Math.sin(x) + 1.5;
    const lo = Math.min(a, b2), hi = Math.max(a, b2);
    const dx = (hi - lo) / nRect;
    let riemannSum = 0;
    for (let i = 0; i < nRect; i++) {
      const xi = lo + (i + 0.5) * dx;
      const yi = f(xi);
      riemannSum += yi * dx;
      const rx = toX(lo + i * dx), rw = toX(lo + (i + 1) * dx) - rx;
      const ry = yi >= 0 ? toY(yi) : toY(0), rh = Math.abs(toY(0) - toY(yi));
      ctx.fillStyle = C_PRIMARY + "44"; ctx.strokeStyle = C_PRIMARY + "88"; ctx.lineWidth = 1;
      ctx.fillRect(rx, ry, rw, rh); ctx.strokeRect(rx, ry, rw, rh);
    }
    const pts: [number, number][] = [];
    for (let i = 0; i <= 200; i++) {
      const x = -10 + i * 20 / 200;
      pts.push([toX(x), toY(f(x))]);
    }
    drawCurve(ctx, pts, C_PRIMARY, 2.5);
    ctx.fillStyle = C_FG; ctx.font = "bold 12px Inter,sans-serif"; ctx.textAlign = "left";
    ctx.fillText("f(x) = sin(x) + 1.5", pad.l + 6, pad.t + 16);
    ctx.fillStyle = C_AMBER; ctx.font = "11px Inter,sans-serif";
    ctx.fillText(`∫ ≈ ${riemannSum.toFixed(4)}`, pad.l + 6, pad.t + 32);
    // exact
    const exact = (-Math.cos(hi) + Math.cos(lo)) + 1.5 * (hi - lo);
    ctx.fillStyle = C_GREEN;
    ctx.fillText(`exact: ${exact.toFixed(4)}`, pad.l + 6, pad.t + 48);
  }, [nRect, a, b2]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={<>
      <Slider label="Lower bound a" value={a} min={-5} max={0} step={0.5} onChange={setA} />
      <Slider label="Upper bound b" value={b2} min={0} max={5} step={0.5} onChange={setB2} />
      <Slider label="Rectangles n" value={nRect} min={1} max={50} onChange={setNRect} />
    </>} />
  );
}

// ── 11. Taylor Series ─────────────────────────────────────────────────────────
export function TaylorSeries() {
  const [terms, setTerms] = useState(3);
  const [fnType, setFnType] = useState(0);
  const fns = [
    {
      label: "sin(x)", f: (x: number) => Math.sin(x),
      taylor: (x: number, n: number) => {
        let s = 0, sign = 1, xp = x, fact = 1;
        for (let k = 0; k < n; k++) {
          if (k > 0) { xp *= x * x; fact *= (2 * k) * (2 * k + 1); sign *= -1; }
          s += sign * xp / fact;
        }
        return s;
      }
    },
    {
      label: "eˣ", f: (x: number) => Math.exp(x),
      taylor: (x: number, n: number) => {
        let s = 0, xp = 1, fact = 1;
        for (let k = 0; k < n; k++) {
          if (k > 0) { xp *= x; fact *= k; }
          s += xp / fact;
        }
        return s;
      }
    },
    {
      label: "cos(x)", f: (x: number) => Math.cos(x),
      taylor: (x: number, n: number) => {
        let s = 0, sign = 1, xp = 1, fact = 1;
        for (let k = 0; k < n; k++) {
          if (k > 0) { xp *= x * x; fact *= (2 * k - 1) * (2 * k); sign *= -1; }
          s += sign * xp / fact;
        }
        return s;
      }
    },
  ];
  const fn = fns[fnType];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = setupCanvas(cv);
    const W = cv.width, H = cv.height;
    const pad = { l: 50, r: 20, t: 20, b: 40 };
    const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
    const ox = pad.l + pw / 2, oy = pad.t + ph / 2;
    grid(ctx, ox, oy, pw, ph);
    axes(ctx, ox, oy, pw, ph);
    tickLabels(ctx, ox, oy, pw, ph);
    const toX = (x: number) => ox + x * pw / 20;
    const toY = (y: number) => oy - y * ph / 12;
    // actual function
    const pts: [number, number][] = [];
    for (let i = 0; i <= 200; i++) {
      const x = -10 + i * 20 / 200;
      const y = fn.f(x);
      if (Math.abs(y) > 7) { if (pts.length > 1) drawCurve(ctx, pts, C_PRIMARY, 2.5); pts.length = 0; continue; }
      pts.push([toX(x), toY(y)]);
    }
    if (pts.length) drawCurve(ctx, pts, C_PRIMARY, 2.5);
    // taylor approximation
    const tpts: [number, number][] = [];
    for (let i = 0; i <= 200; i++) {
      const x = -10 + i * 20 / 200;
      const y = fn.taylor(x, terms);
      if (Math.abs(y) > 7) { if (tpts.length > 1) drawCurve(ctx, tpts, C_AMBER, 2); tpts.length = 0; continue; }
      tpts.push([toX(x), toY(y)]);
    }
    if (tpts.length) drawCurve(ctx, tpts, C_AMBER, 2);
    ctx.fillStyle = C_PRIMARY; ctx.font = "bold 12px Inter,sans-serif"; ctx.textAlign = "left";
    ctx.fillText(`f(x) = ${fn.label}`, pad.l + 6, pad.t + 16);
    ctx.fillStyle = C_AMBER; ctx.font = "11px Inter,sans-serif";
    ctx.fillText(`Taylor (${terms} ${terms === 1 ? "term" : "terms"})`, pad.l + 6, pad.t + 32);
  }, [terms, fnType, fn]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={<>
      <SectionLabel>Function</SectionLabel>
      {fns.map((f, i) => (
        <button key={i} onClick={() => setFnType(i)} className={`w-full text-left rounded px-2 py-1.5 text-xs ${fnType === i ? "bg-primary/20 text-primary border border-primary/30" : "border border-border text-muted-foreground"}`}>{f.label}</button>
      ))}
      <Slider label="Number of terms" value={terms} min={1} max={10} onChange={setTerms} />
      <p className="text-[11px] text-muted-foreground">More terms → better approximation.</p>
    </>} />
  );
}

// ── 12. Differential Equations ────────────────────────────────────────────────
export function DifferentialEquations() {
  const [k, setK] = useState(0.5);
  const [y0, setY0] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = setupCanvas(cv);
    const W = cv.width, H = cv.height;
    const pad = { l: 50, r: 20, t: 20, b: 40 };
    const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
    const ox = pad.l, oy = pad.t + ph;
    const xMax = 8, yMax = 10;
    const toX = (x: number) => ox + x * pw / xMax;
    const toY = (y: number) => oy - y * ph / yMax;
    // grid
    ctx.strokeStyle = C_GRID; ctx.lineWidth = 1;
    for (let x = 0; x <= xMax; x++) { ctx.beginPath(); ctx.moveTo(toX(x), pad.t); ctx.lineTo(toX(x), oy); ctx.stroke(); }
    for (let y = 0; y <= yMax; y += 2) { ctx.beginPath(); ctx.moveTo(ox, toY(y)); ctx.lineTo(ox + pw, toY(y)); ctx.stroke(); }
    // axes
    ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + pw, oy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ox, pad.t); ctx.lineTo(ox, oy); ctx.stroke();
    ctx.fillStyle = C_DIM; ctx.font = "9px Inter,sans-serif"; ctx.textAlign = "center";
    for (let x = 1; x <= xMax; x++) ctx.fillText(String(x), toX(x), oy + 12);
    ctx.textAlign = "right";
    for (let y = 0; y <= yMax; y += 2) ctx.fillText(String(y), ox - 4, toY(y) + 3);
    // slope field
    for (let gx = 0; gx <= xMax; gx += 1) {
      for (let gy = 0; gy <= yMax; gy += 1) {
        const slope = k * gy;
        const len = 18, angle = Math.atan(slope);
        const px = toX(gx), py = toY(gy);
        const dx = (len / 2) * Math.cos(angle), dy = (len / 2) * Math.sin(angle);
        ctx.strokeStyle = C_DIM; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(px - dx, py + dy); ctx.lineTo(px + dx, py - dy); ctx.stroke();
      }
    }
    // solution: y = y0 * e^(kx)
    const pts: [number, number][] = [];
    for (let i = 0; i <= 200; i++) {
      const x = i * xMax / 200;
      const y = y0 * Math.exp(k * x);
      if (y > yMax + 1) break;
      pts.push([toX(x), toY(y)]);
    }
    drawCurve(ctx, pts, C_GREEN, 2.5);
    ctx.beginPath(); ctx.arc(toX(0), toY(y0), 5, 0, TAU); ctx.fillStyle = C_AMBER; ctx.fill();
    ctx.fillStyle = C_FG; ctx.font = "bold 12px Inter,sans-serif"; ctx.textAlign = "left";
    ctx.fillText("dy/dt = ky", pad.l + 6, pad.t + 16);
    ctx.fillStyle = C_GREEN; ctx.font = "11px Inter,sans-serif";
    ctx.fillText(`y = ${y0}e^(${k}t)`, pad.l + 6, pad.t + 32);
  }, [k, y0]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={<>
      <Slider label="Growth rate k" value={k} min={-1.5} max={1.5} step={0.1} onChange={setK} />
      <Slider label="Initial value y₀" value={y0} min={0.1} max={5} step={0.1} onChange={setY0} />
      <Stat label="Type" value={k > 0 ? "Exponential growth" : k < 0 ? "Exponential decay" : "Constant"} />
      <p className="text-[11px] text-muted-foreground">Slope field shows dy/dt at each (t, y).</p>
    </>} />
  );
}

// ── 13. Pythagorean Theorem ───────────────────────────────────────────────────
export function PythagoreanTheorem() {
  const [sideA, setSideA] = useState(3);
  const [sideB, setSideB] = useState(4);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = setupCanvas(cv);
    const W = cv.width, H = cv.height;
    const c = Math.sqrt(sideA * sideA + sideB * sideB);
    const scale = Math.min(W, H) / (sideA + sideB + c + 2) * 0.75;
    const ox = W / 2 - sideB * scale / 2, oy = H / 2 + sideA * scale / 2;
    // triangle vertices
    const A = { x: ox, y: oy };
    const B = { x: ox + sideB * scale, y: oy };
    const C2 = { x: ox + sideB * scale, y: oy - sideA * scale };
    // squares
    const drawSquare = (x1: number, y1: number, x2: number, y2: number, color: string, label: string) => {
      const dx = x2 - x1, dy = y2 - y1;
      const nx = -dy, ny = dx;
      ctx.fillStyle = color + "30"; ctx.strokeStyle = color; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
      ctx.lineTo(x2 + nx, y2 + ny); ctx.lineTo(x1 + nx, y1 + ny);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      const cx2 = (x1 + x2 + nx) / 2 + nx / 2, cy2 = (y1 + y2 + ny) / 2 + ny / 2;
      ctx.fillStyle = color; ctx.font = "bold 13px Inter,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(label, cx2, cy2);
      ctx.textBaseline = "alphabetic";
    };
    drawSquare(A.x, A.y, B.x, B.y, C_PRIMARY, `b²=${(sideB * sideB).toFixed(0)}`);
    drawSquare(C2.x, C2.y, B.x, B.y, C_AMBER, `a²=${(sideA * sideA).toFixed(0)}`);
    // hypotenuse square
    drawSquare(A.x, A.y, C2.x, C2.y, C_GREEN, `c²=${(c * c).toFixed(1)}`);
    // triangle
    ctx.fillStyle = C_PURPLE + "40"; ctx.strokeStyle = C_PURPLE; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.lineTo(C2.x, C2.y); ctx.closePath(); ctx.fill(); ctx.stroke();
    // right angle mark
    const s2 = 10;
    ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1;
    ctx.strokeRect(B.x - s2, B.y - s2, s2, s2);
    // labels on sides
    ctx.fillStyle = C_FG; ctx.font = "12px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText(`a=${sideA}`, (B.x + C2.x) / 2 + 16, (B.y + C2.y) / 2);
    ctx.fillText(`b=${sideB}`, (A.x + B.x) / 2, A.y + 16);
    ctx.fillStyle = C_GREEN;
    ctx.fillText(`c=${c.toFixed(2)}`, (A.x + C2.x) / 2 - 16, (A.y + C2.y) / 2);
  }, [sideA, sideB]);
  const c = Math.sqrt(sideA * sideA + sideB * sideB);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={<>
      <Slider label="Side a" value={sideA} min={1} max={7} step={0.5} onChange={setSideA} color={C_AMBER} />
      <Slider label="Side b" value={sideB} min={1} max={7} step={0.5} onChange={setSideB} color={C_PRIMARY} />
      <Stat label="c = √(a²+b²)" value={c.toFixed(3)} />
      <Stat label="a²+b²" value={`${sideA*sideA}+${sideB*sideB}=${sideA*sideA+sideB*sideB}`} />
    </>} />
  );
}

// ── 14. Unit Circle ───────────────────────────────────────────────────────────
export function UnitCircle() {
  const [theta, setTheta] = useState(45);
  const [animate, setAnimate] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const cv = canvasRef.current; if (!cv) return;
    const W = cv.width, H = cv.height;
    if (W === 0 || H === 0) return;
    const ctx = setupCanvas(cv);
    const ox = W / 2, oy = H / 2, R = Math.min(W, H) * 0.38;
    // grid
    ctx.strokeStyle = C_GRID; ctx.lineWidth = 1;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(ox + i * R, oy - R); ctx.lineTo(ox + i * R, oy + R); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ox - R, oy + i * R); ctx.lineTo(ox + R, oy + i * R); ctx.stroke();
    }
    // unit circle
    ctx.strokeStyle = C_DIM; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(ox, oy, R, 0, TAU); ctx.stroke();
    // axes
    ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(ox - R - 10, oy); ctx.lineTo(ox + R + 10, oy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ox, oy - R - 10); ctx.lineTo(ox, oy + R + 10); ctx.stroke();
    // angle labels
    ctx.fillStyle = C_DIM; ctx.font = "10px Inter,sans-serif"; ctx.textAlign = "center";
    [[1,0,"0°"],[0,-1,"90°"],[-1,0,"180°"],[0,1,"270°"]].forEach(([cx,cy,label]) => {
      ctx.fillText(label as string, ox + (cx as number) * (R + 18), oy + (cy as number) * (R + 18) + 4);
    });
    const rad = theta * Math.PI / 180;
    const px = ox + Math.cos(rad) * R, py = oy - Math.sin(rad) * R;
    // sin line (vertical, dashed green)
    ctx.strokeStyle = C_GREEN; ctx.lineWidth = 2; ctx.setLineDash([5, 3]);
    ctx.beginPath(); ctx.moveTo(px, oy); ctx.lineTo(px, py); ctx.stroke();
    // cos line (horizontal, blue)
    ctx.strokeStyle = C_PRIMARY; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(px, oy); ctx.stroke();
    ctx.setLineDash([]);
    // radius (amber)
    ctx.strokeStyle = C_AMBER; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(px, py); ctx.stroke();
    // arc for angle
    ctx.strokeStyle = C_DIM; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(ox, oy, R * 0.2, 0, -rad, Math.sin(rad) >= 0); ctx.stroke();
    // point on circle
    ctx.beginPath(); ctx.arc(px, py, 5, 0, TAU); ctx.fillStyle = C_AMBER; ctx.fill();
  }, [theta]);

  useRaf((t) => {
    if (!animate) return;
    setTheta(Math.floor(t * 60) % 360);
  }, animate);

  // Redraw whenever theta changes
  useEffect(() => { draw(); }, [draw]);

  // Resize canvas buffer to match CSS display size, then redraw
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ro = new ResizeObserver(() => {
      cv.width = cv.offsetWidth;
      cv.height = cv.offsetHeight;
      draw();
    });
    ro.observe(cv);
    return () => ro.disconnect();
  }, [draw]);

  const rad = theta * Math.PI / 180;
  const sinVal = Math.sin(rad);
  const cosVal = Math.cos(rad);
  const tanVal = cosVal !== 0 ? Math.tan(rad) : Infinity;

  return (
    <div className="flex h-full min-h-0 gap-6 p-4">
      {/* Canvas + stat boxes */}
      <div className="flex flex-1 min-w-0 flex-col gap-4">
        <div className="flex-1 min-h-0 rounded-xl border border-white/[0.07] bg-[#080e1c] overflow-hidden">
          <canvas ref={canvasRef} className="block w-full h-full" />
        </div>
        {/* Stat row — neutral cards, centered group, 2 dp */}
        <div className="flex justify-center gap-3 shrink-0">
          {[
            { label: "θ",     value: `${theta}°`,                              color: C_AMBER   },
            { label: "cos θ", value: cosVal.toFixed(2),                        color: C_PRIMARY },
            { label: "sin θ", value: sinVal.toFixed(2),                        color: C_GREEN   },
            { label: "tan θ", value: isFinite(tanVal) ? tanVal.toFixed(2) : "∞", color: C_CYAN  },
          ].map(({ label, value, color }) => (
            <div key={label} className="w-20 rounded-xl border border-white/[0.07] bg-[#0d1528] py-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
              <p className="text-sm font-bold tabular-nums" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      </div>
      {/* Controls */}
      <div className="w-48 flex-shrink-0 flex flex-col gap-5 overflow-y-auto py-1">
        <Slider label="Angle θ (°)" value={theta} min={0} max={360} onChange={setTheta} />
        <button
          onClick={() => setAnimate(a => !a)}
          className={`w-full rounded-lg py-2 text-xs font-medium border transition-colors ${animate ? "bg-primary/20 text-primary border-primary/30" : "border-border text-muted-foreground hover:text-foreground"}`}
        >
          {animate ? "Pause" : "Animate"}
        </button>
        <div className="space-y-2">
          <Stat label="Quadrant" value={theta <= 90 ? "I" : theta <= 180 ? "II" : theta <= 270 ? "III" : "IV"} />
          <Stat label="Radians" value={(theta * Math.PI / 180).toFixed(3)} />
        </div>
      </div>
    </div>
  );
}

// ── 15. Law of Sines & Cosines ────────────────────────────────────────────────
export function LawOfSinesCosines() {
  const [angA, setAngA] = useState(60);
  const [angB, setAngB] = useState(70);
  const [sideC2, setSideC2] = useState(6);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = setupCanvas(cv);
    const W = cv.width, H = cv.height;
    const angC = 180 - angA - angB;
    if (angC <= 0) {
      ctx.fillStyle = C_RED; ctx.font = "14px Inter,sans-serif"; ctx.textAlign = "center";
      ctx.fillText("A + B must be < 180°", W / 2, H / 2); return;
    }
    const aRad = angA * Math.PI / 180, bRad = angB * Math.PI / 180, cRad = angC * Math.PI / 180;
    // Law of sines: a/sin(A) = b/sin(B) = c/sin(C)
    const ratio = sideC2 / Math.sin(cRad);
    const sA = ratio * Math.sin(aRad), sB = ratio * Math.sin(bRad);
    const scale = Math.min(W, H) / (sideC2 + 4) * 0.7;
    const bx = W / 2 - sideC2 * scale / 2, by = H * 0.75;
    const Ax = { x: bx, y: by };
    const Bx = { x: bx + sideC2 * scale, y: by };
    const Cx = { x: bx + sB * scale * Math.cos(aRad), y: by - sB * scale * Math.sin(aRad) };
    // triangle
    ctx.fillStyle = C_PRIMARY + "20"; ctx.strokeStyle = C_PRIMARY; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(Ax.x, Ax.y); ctx.lineTo(Bx.x, Bx.y); ctx.lineTo(Cx.x, Cx.y); ctx.closePath(); ctx.fill(); ctx.stroke();
    // angle arcs
    const drawArc = (p: {x:number,y:number}, a1: number, a2: number, color: string) => {
      ctx.strokeStyle = color; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, 22, a1, a2); ctx.stroke();
    };
    drawArc(Ax, -0.1, -aRad + 0.1, C_AMBER);
    drawArc(Bx, Math.PI - bRad + 0.1, Math.PI + 0.1, C_GREEN);
    // labels
    ctx.fillStyle = C_FG; ctx.font = "11px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText(`c=${sideC2}`, (Ax.x + Bx.x) / 2, by + 16);
    ctx.fillText(`a=${sA.toFixed(2)}`, (Bx.x + Cx.x) / 2 + 14, (Bx.y + Cx.y) / 2);
    ctx.fillText(`b=${sB.toFixed(2)}`, (Ax.x + Cx.x) / 2 - 14, (Ax.y + Cx.y) / 2);
    ctx.fillStyle = C_AMBER; ctx.fillText(`A=${angA}°`, Ax.x - 16, Ax.y - 8);
    ctx.fillStyle = C_GREEN; ctx.fillText(`B=${angB}°`, Bx.x + 16, Bx.y - 8);
    ctx.fillStyle = C_CYAN; ctx.fillText(`C=${angC}°`, Cx.x, Cx.y - 12);
    ctx.fillStyle = C_DIM; ctx.font = "10px Inter,sans-serif";
    ctx.fillText(`a/sin A = ${(sA/Math.sin(aRad)).toFixed(2)}`, W / 2, H - 14);
  }, [angA, angB, sideC2]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={<>
      <Slider label="Angle A (°)" value={angA} min={10} max={140} onChange={setAngA} color={C_AMBER} />
      <Slider label="Angle B (°)" value={angB} min={10} max={140} onChange={setAngB} color={C_GREEN} />
      <Slider label="Side c" value={sideC2} min={2} max={9} step={0.5} onChange={setSideC2} />
      <Stat label="Angle C" value={`${180 - angA - angB}°`} />
    </>} />
  );
}

// ── 16. Conic Sections ────────────────────────────────────────────────────────
export function ConicSections() {
  const [ecc, setEcc] = useState(0.5);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = setupCanvas(cv);
    const W = cv.width, H = cv.height;
    const ox = W / 2, oy = H / 2;
    const scale = 80;
    // grid
    ctx.strokeStyle = C_GRID; ctx.lineWidth = 1;
    for (let x = -4; x <= 4; x++) { ctx.beginPath(); ctx.moveTo(ox + x * scale, 20); ctx.lineTo(ox + x * scale, H - 20); ctx.stroke(); }
    for (let y = -2; y <= 2; y++) { ctx.beginPath(); ctx.moveTo(20, oy + y * scale); ctx.lineTo(W - 20, oy + y * scale); ctx.stroke(); }
    ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(20, oy); ctx.lineTo(W - 20, oy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ox, 20); ctx.lineTo(ox, H - 20); ctx.stroke();
    const name = ecc === 0 ? "Circle" : ecc < 1 ? "Ellipse" : ecc === 1 ? "Parabola" : "Hyperbola";
    const color = ecc < 0.3 ? C_CYAN : ecc < 0.8 ? C_PRIMARY : ecc < 1.1 ? C_GREEN : C_RED;
    if (ecc < 1) {
      // Ellipse: a=1, b=sqrt(1-e²)
      const a = 1, b = Math.sqrt(1 - ecc * ecc);
      ctx.strokeStyle = color; ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i <= 360; i++) {
        const angle = i * Math.PI / 180;
        const x = ox + a * Math.cos(angle) * scale, y = oy - b * Math.sin(angle) * scale;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.stroke();
      // foci
      const f = ecc * scale;
      ctx.beginPath(); ctx.arc(ox + f, oy, 4, 0, TAU); ctx.fillStyle = C_AMBER; ctx.fill();
      ctx.beginPath(); ctx.arc(ox - f, oy, 4, 0, TAU); ctx.fillStyle = C_AMBER; ctx.fill();
    } else {
      // Hyperbola
      ctx.strokeStyle = color; ctx.lineWidth = 2.5;
      for (let branch = -1; branch <= 1; branch += 2) {
        const pts: [number, number][] = [];
        const a = 1, b = Math.sqrt(ecc * ecc - 1);
        for (let i = -60; i <= 60; i++) {
          const t = i * 0.05;
          const x = ox + branch * a * Math.cosh(t) * scale, y = oy - b * Math.sinh(t) * scale;
          if (x < 10 || x > W - 10 || y < 10 || y > H - 10) continue;
          pts.push([x, y]);
        }
        drawCurve(ctx, pts, color, 2.5);
      }
    }
    ctx.fillStyle = C_FG; ctx.font = "bold 13px Inter,sans-serif"; ctx.textAlign = "left";
    ctx.fillText(name, 20, 36);
    ctx.fillStyle = C_DIM; ctx.font = "11px Inter,sans-serif";
    ctx.fillText(`e = ${ecc.toFixed(2)}`, 20, 54);
  }, [ecc]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={<>
      <Slider label="Eccentricity e" value={ecc} min={0} max={2} step={0.05} onChange={setEcc} />
      <Stat label="Shape" value={ecc === 0 ? "Circle" : ecc < 1 ? "Ellipse" : ecc === 1 ? "Parabola" : "Hyperbola"} />
      <p className="text-[11px] text-muted-foreground">e=0: circle · e&lt;1: ellipse · e=1: parabola · e&gt;1: hyperbola</p>
    </>} />
  );
}

// ── 17. Vectors 2D ────────────────────────────────────────────────────────────
export function Vectors2D() {
  const [ax, setAx] = useState(3); const [ay, setAy] = useState(2);
  const [bx, setBx] = useState(1); const [by, setBy] = useState(3);
  const [mode, setMode] = useState<"add"|"dot">("add");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, cv.width, cv.height);
    const W = cv.width, H = cv.height;
    const ox = W / 2, oy = H / 2, sc = 38;
    ctx.strokeStyle = C_GRID; ctx.lineWidth = 1;
    for (let x = -7; x <= 7; x++) { ctx.beginPath(); ctx.moveTo(ox + x*sc, 10); ctx.lineTo(ox + x*sc, H-10); ctx.stroke(); }
    for (let y = -4; y <= 4; y++) { ctx.beginPath(); ctx.moveTo(10, oy + y*sc); ctx.lineTo(W-10, oy + y*sc); ctx.stroke(); }
    ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(10,oy); ctx.lineTo(W-10,oy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ox,10); ctx.lineTo(ox,H-10); ctx.stroke();
    const arrow = (x1:number,y1:number,x2:number,y2:number,color:string,lw=2.5) => {
      ctx.strokeStyle=color; ctx.fillStyle=color; ctx.lineWidth=lw;
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
      const ang = Math.atan2(y2-y1,x2-x1), hs=10;
      ctx.beginPath(); ctx.moveTo(x2,y2);
      ctx.lineTo(x2-hs*Math.cos(ang-0.4),y2-hs*Math.sin(ang-0.4));
      ctx.lineTo(x2-hs*Math.cos(ang+0.4),y2-hs*Math.sin(ang+0.4));
      ctx.closePath(); ctx.fill();
    };
    arrow(ox, oy, ox+ax*sc, oy-ay*sc, C_PRIMARY);
    arrow(ox, oy, ox+bx*sc, oy-by*sc, C_AMBER);
    if (mode === "add") {
      const rx = ax+bx, ry = ay+by;
      ctx.strokeStyle = C_DIM; ctx.lineWidth=1; ctx.setLineDash([5,4]);
      ctx.beginPath(); ctx.moveTo(ox+ax*sc,oy-ay*sc); ctx.lineTo(ox+rx*sc,oy-ry*sc); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ox+bx*sc,oy-by*sc); ctx.lineTo(ox+rx*sc,oy-ry*sc); ctx.stroke();
      ctx.setLineDash([]);
      arrow(ox, oy, ox+rx*sc, oy-ry*sc, C_GREEN);
      ctx.fillStyle=C_GREEN; ctx.font="11px Inter,sans-serif"; ctx.textAlign="left";
      ctx.fillText(`a+b=(${rx},${ry})`, ox+rx*sc+6, oy-ry*sc-4);
    }
    ctx.fillStyle=C_PRIMARY; ctx.font="11px Inter,sans-serif"; ctx.textAlign="left";
    ctx.fillText(`a=(${ax},${ay})`, ox+ax*sc+6, oy-ay*sc-4);
    ctx.fillStyle=C_AMBER;
    ctx.fillText(`b=(${bx},${by})`, ox+bx*sc+6, oy-by*sc+14);
  }, [ax, ay, bx, by, mode]);
  const dot = ax*bx + ay*by;
  const magA = Math.sqrt(ax*ax+ay*ay), magB = Math.sqrt(bx*bx+by*by);
  const angle = magA && magB ? Math.acos(clamp(dot/(magA*magB),-1,1))*180/Math.PI : 0;
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={<>
      <SectionLabel>Vector a</SectionLabel>
      <Slider label="aₓ" value={ax} min={-5} max={5} step={0.5} onChange={setAx} color={C_PRIMARY} />
      <Slider label="aᵧ" value={ay} min={-4} max={4} step={0.5} onChange={setAy} color={C_PRIMARY} />
      <SectionLabel>Vector b</SectionLabel>
      <Slider label="bₓ" value={bx} min={-5} max={5} step={0.5} onChange={setBx} color={C_AMBER} />
      <Slider label="bᵧ" value={by} min={-4} max={4} step={0.5} onChange={setBy} color={C_AMBER} />
      <Stat label="a · b" value={dot.toFixed(2)} />
      <Stat label="Angle" value={`${angle.toFixed(1)}°`} />
    </>} />
  );
}

// ── 18. Binomial Distribution ─────────────────────────────────────────────────
export function BinomialDistribution() {
  const [n, setN] = useState(10);
  const [p, setP] = useState(0.5);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    ctx.fillStyle = C_BG; ctx.fillRect(0,0,cv.width,cv.height);
    const W = cv.width, H = cv.height;
    const pad = { l:50, r:20, t:30, b:50 };
    const pw = W-pad.l-pad.r, ph = H-pad.t-pad.b;
    const fact = (n:number):number => n<=1?1:n*fact(n-1);
    const comb = (n:number,k:number) => fact(n)/(fact(k)*fact(n-k));
    const probs = Array.from({length:n+1},(_,k) => comb(n,k)*Math.pow(p,k)*Math.pow(1-p,n-k));
    const maxP = Math.max(...probs);
    const bw = pw/(n+1)*0.7, bs = pw/(n+1);
    probs.forEach((prob,k) => {
      const bx = pad.l + k*bs + bs*0.15;
      const bh = prob/maxP*ph*0.85;
      const by = pad.t+ph-bh;
      const isMode = prob === maxP;
      ctx.fillStyle = isMode ? C_GREEN+"cc" : C_PRIMARY+"88";
      ctx.strokeStyle = isMode ? C_GREEN : C_PRIMARY+"66";
      ctx.lineWidth = 1;
      ctx.fillRect(bx,by,bw,bh); ctx.strokeRect(bx,by,bw,bh);
      ctx.fillStyle = C_DIM; ctx.font="9px Inter,sans-serif"; ctx.textAlign="center";
      ctx.fillText(String(k), bx+bw/2, pad.t+ph+14);
      if (bh > 18) {
        ctx.fillStyle = isMode ? C_GREEN : C_FG;
        ctx.fillText(prob.toFixed(3), bx+bw/2, by-3);
      }
    });
    ctx.strokeStyle = "rgba(255,255,255,0.2)"; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(pad.l,pad.t+ph); ctx.lineTo(pad.l+pw,pad.t+ph); ctx.stroke();
    ctx.fillStyle=C_FG; ctx.font="bold 12px Inter,sans-serif"; ctx.textAlign="left";
    ctx.fillText(`B(${n}, ${p})`, pad.l+6, pad.t+18);
    ctx.fillStyle=C_DIM; ctx.font="11px Inter,sans-serif";
    ctx.fillText("k (successes)", pad.l+pw/2-30, pad.t+ph+30);
  }, [n, p]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={<>
      <Slider label="Trials n" value={n} min={1} max={20} onChange={setN} />
      <Slider label="Probability p" value={p} min={0.05} max={0.95} step={0.05} onChange={setP} />
      <Stat label="Mean μ = np" value={(n*p).toFixed(2)} />
      <Stat label="Std σ" value={Math.sqrt(n*p*(1-p)).toFixed(3)} />
    </>} />
  );
}

// ── 19. Linear Regression ─────────────────────────────────────────────────────
export function LinearRegression() {
  const [noise, setNoise] = useState(1.5);
  const [slope, setSlope] = useState(0.8);
  const [seed, setSeed] = useState(42);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    ctx.fillStyle = C_BG; ctx.fillRect(0,0,cv.width,cv.height);
    const W = cv.width, H = cv.height;
    const pad = { l:50, r:20, t:20, b:40 };
    const pw = W-pad.l-pad.r, ph = H-pad.t-pad.b;
    // pseudo-random
    let s = seed;
    const rand = () => { s=(s*1664525+1013904223)&0xffffffff; return (s>>>0)/0xffffffff; };
    const pts = Array.from({length:20},(_,i) => {
      const x = -4+i*0.4;
      const y = slope*x + 1 + (rand()-0.5)*2*noise;
      return {x,y};
    });
    const meanX = pts.reduce((a,p)=>a+p.x,0)/pts.length;
    const meanY = pts.reduce((a,p)=>a+p.y,0)/pts.length;
    const ssxy = pts.reduce((a,p)=>a+(p.x-meanX)*(p.y-meanY),0);
    const ssxx = pts.reduce((a,p)=>a+(p.x-meanX)**2,0);
    const m = ssxy/ssxx, b2 = meanY - m*meanX;
    const ssres = pts.reduce((a,p)=>a+(p.y-(m*p.x+b2))**2,0);
    const sstot = pts.reduce((a,p)=>a+(p.y-meanY)**2,0);
    const r2 = 1-ssres/sstot;
    const xRange = 6, yMax = 6;
    const toX = (x:number)=>pad.l+pw/2+x*pw/(2*xRange);
    const toY = (y:number)=>pad.t+ph/2-y*ph/(2*yMax);
    ctx.strokeStyle=C_GRID; ctx.lineWidth=1;
    for(let x=-xRange;x<=xRange;x+=2){ctx.beginPath();ctx.moveTo(toX(x),pad.t);ctx.lineTo(toX(x),pad.t+ph);ctx.stroke();}
    for(let y=-yMax;y<=yMax;y+=2){ctx.beginPath();ctx.moveTo(pad.l,toY(y));ctx.lineTo(pad.l+pw,toY(y));ctx.stroke();}
    ctx.strokeStyle="rgba(255,255,255,0.3)"; ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(pad.l,toY(0));ctx.lineTo(pad.l+pw,toY(0));ctx.stroke();
    ctx.beginPath();ctx.moveTo(toX(0),pad.t);ctx.lineTo(toX(0),pad.t+ph);ctx.stroke();
    // residual lines
    pts.forEach(pt => {
      ctx.strokeStyle=C_RED+"44"; ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(toX(pt.x),toY(pt.y));ctx.lineTo(toX(pt.x),toY(m*pt.x+b2));ctx.stroke();
    });
    // regression line
    drawCurve(ctx,[[-xRange,m*-xRange+b2],[xRange,m*xRange+b2]].map(([x,y])=>[toX(x),toY(y)] as [number,number]),C_AMBER,2);
    // points
    pts.forEach(pt => {
      ctx.beginPath();ctx.arc(toX(pt.x),toY(pt.y),4,0,TAU);
      ctx.fillStyle=C_PRIMARY; ctx.fill();
    });
    ctx.fillStyle=C_FG; ctx.font="bold 12px Inter,sans-serif"; ctx.textAlign="left";
    ctx.fillText(`ŷ = ${m.toFixed(2)}x + ${b2.toFixed(2)}`, pad.l+6, pad.t+18);
    ctx.fillStyle=C_AMBER; ctx.font="11px Inter,sans-serif";
    ctx.fillText(`r² = ${r2.toFixed(4)}`, pad.l+6, pad.t+34);
  }, [noise, slope, seed]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={<>
      <Slider label="True slope" value={slope} min={-2} max={2} step={0.1} onChange={setSlope} />
      <Slider label="Noise σ" value={noise} min={0.1} max={4} step={0.1} onChange={setNoise} />
      <button onClick={()=>setSeed(s=>s+1)} className="w-full rounded py-1.5 text-xs border border-border text-muted-foreground hover:text-foreground">New sample</button>
    </>} />
  );
}

// ── 20. Matrix Transformations ────────────────────────────────────────────────
export function MatrixTransformations() {
  const [a11,setA11]=useState(1);const[a12,setA12]=useState(0);
  const [a21,setA21]=useState(0);const[a22,setA22]=useState(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    ctx.fillStyle = C_BG; ctx.fillRect(0,0,cv.width,cv.height);
    const W=cv.width,H=cv.height,ox=W/2,oy=H/2,sc=50;
    ctx.strokeStyle=C_GRID; ctx.lineWidth=1;
    for(let x=-5;x<=5;x++){ctx.beginPath();ctx.moveTo(ox+x*sc,30);ctx.lineTo(ox+x*sc,H-30);ctx.stroke();}
    for(let y=-3;y<=3;y++){ctx.beginPath();ctx.moveTo(30,oy+y*sc);ctx.lineTo(W-30,oy+y*sc);ctx.stroke();}
    ctx.strokeStyle="rgba(255,255,255,0.3)";ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(30,oy);ctx.lineTo(W-30,oy);ctx.stroke();
    ctx.beginPath();ctx.moveTo(ox,30);ctx.lineTo(ox,H-30);ctx.stroke();
    // transform a grid of points
    const transform = (x:number,y:number) => [a11*x+a12*y, a21*x+a22*y];
    // draw transformed grid lines
    const gridRange = 3;
    for (let i=-gridRange;i<=gridRange;i++) {
      const ptsH: [number,number][] = [];
      const ptsV: [number,number][] = [];
      for (let j=-gridRange;j<=gridRange;j++) {
        const [tx,ty]=transform(j,i); ptsH.push([ox+tx*sc, oy-ty*sc]);
        const [tx2,ty2]=transform(i,j); ptsV.push([ox+tx2*sc, oy-ty2*sc]);
      }
      drawCurve(ctx,ptsH,C_PRIMARY+"55",1);
      drawCurve(ctx,ptsV,C_PRIMARY+"55",1);
    }
    // unit square -> transformed
    const corners:([number,number])[] = [[0,0],[1,0],[1,1],[0,1],[0,0]];
    const tCorners = corners.map(([x,y])=>{ const[tx,ty]=transform(x,y); return [ox+tx*sc,oy-ty*sc] as [number,number]; });
    ctx.fillStyle=C_AMBER+"44"; ctx.strokeStyle=C_AMBER; ctx.lineWidth=2;
    ctx.beginPath(); tCorners.forEach(([x,y],i)=>i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)); ctx.fill(); ctx.stroke();
    // original unit square (dashed)
    ctx.strokeStyle=C_DIM; ctx.lineWidth=1; ctx.setLineDash([4,4]);
    ctx.beginPath(); corners.map(([x,y])=>[ox+x*sc,oy-y*sc] as [number,number]).forEach(([x,y],i)=>i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)); ctx.stroke();
    ctx.setLineDash([]);
    const det=a11*a22-a12*a21;
    ctx.fillStyle=C_FG; ctx.font="bold 12px Inter,sans-serif"; ctx.textAlign="left";
    ctx.fillText(`[${a11}  ${a12}]`, 20, 50);
    ctx.fillText(`[${a21}  ${a22}]`, 20, 68);
    ctx.fillStyle=C_AMBER; ctx.font="11px Inter,sans-serif";
    ctx.fillText(`det = ${det.toFixed(2)}`, 20, 90);
  }, [a11,a12,a21,a22]);
  const presets = [
    { label:"Identity", v:[1,0,0,1] },
    { label:"Rotate 90°", v:[0,-1,1,0] },
    { label:"Scale 2×", v:[2,0,0,2] },
    { label:"Shear X", v:[1,1,0,1] },
    { label:"Reflect X", v:[1,0,0,-1] },
  ];
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={<>
      <SectionLabel>Matrix entries</SectionLabel>
      <div className="grid grid-cols-2 gap-1">
        {[[a11,setA11,"a"],[a12,setA12,"b"],[a21,setA21,"c"],[a22,setA22,"d"]].map(([v,fn,l])=>(
          <div key={l as string}>
            <p className="text-[9px] text-muted-foreground mb-0.5">{l as string}</p>
            <input type="range" min={-3} max={3} step={0.5} value={v as number} onChange={e=>(fn as (v:number)=>void)(+e.target.value)} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-secondary" style={{accentColor:C_PRIMARY}} />
            <p className="text-center text-xs font-bold">{v as number}</p>
          </div>
        ))}
      </div>
      <SectionLabel>Presets</SectionLabel>
      {presets.map(pr=>(
        <button key={pr.label} onClick={()=>{setA11(pr.v[0]);setA12(pr.v[1]);setA21(pr.v[2]);setA22(pr.v[3]);}} className="w-full text-left rounded px-2 py-1 text-xs border border-border text-muted-foreground hover:text-foreground">{pr.label}</button>
      ))}
    </>} />
  );
}

// ── 21. Modular Arithmetic ────────────────────────────────────────────────────
export function ModularArithmetic() {
  const [modN, setModN] = useState(12);
  const [value, setValue] = useState(17);
  const [step2, setStep2] = useState(3);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    ctx.fillStyle = C_BG; ctx.fillRect(0,0,cv.width,cv.height);
    const W=cv.width,H=cv.height,ox=W*0.42,oy=H/2,R=Math.min(W,H)*0.38;
    ctx.strokeStyle=C_DIM; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(ox,oy,R,0,TAU); ctx.stroke();
    const result = ((value%modN)+modN)%modN;
    for (let i=0;i<modN;i++) {
      const angle = -Math.PI/2 + i*TAU/modN;
      const px=ox+R*Math.cos(angle), py=oy+R*Math.sin(angle);
      const isResult = i===result;
      ctx.beginPath(); ctx.arc(px,py,isResult?9:5,0,TAU);
      ctx.fillStyle = isResult ? C_GREEN : i===0 ? C_AMBER : C_PRIMARY+"88"; ctx.fill();
      ctx.fillStyle = isResult ? C_BG : C_DIM; ctx.font=`${isResult?"bold ":""}${Math.min(11,R*0.14)}px Inter,sans-serif`;
      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText(String(i), px, py);
      ctx.textBaseline="alphabetic";
    }
    // draw path from 0 stepping by step2
    let cur=0;
    const visited=[0];
    for(let i=0;i<modN*2;i++){
      cur=(cur+step2)%modN;
      if(visited.includes(cur)&&i>0) break;
      visited.push(cur);
    }
    ctx.strokeStyle=C_CYAN+"88"; ctx.lineWidth=1.5; ctx.setLineDash([4,3]);
    for(let i=0;i<visited.length-1;i++){
      const a1=-Math.PI/2+visited[i]*TAU/modN, a2=-Math.PI/2+visited[i+1]*TAU/modN;
      ctx.beginPath(); ctx.moveTo(ox+R*0.85*Math.cos(a1),oy+R*0.85*Math.sin(a1));
      ctx.lineTo(ox+R*0.85*Math.cos(a2),oy+R*0.85*Math.sin(a2)); ctx.stroke();
    }
    ctx.setLineDash([]);
    const panelX=ox+R+20;
    ctx.fillStyle=C_FG; ctx.font="bold 13px Inter,sans-serif"; ctx.textAlign="left";
    ctx.fillText(`${value} mod ${modN} = ${result}`, panelX, oy-20);
    ctx.fillStyle=C_DIM; ctx.font="11px Inter,sans-serif";
    ctx.fillText(`Step +${step2} cycle:`, panelX, oy+10);
    ctx.fillText(visited.slice(0,6).join("→")+(visited.length>6?"…":""), panelX, oy+26);
  }, [modN, value, step2]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={<>
      <Slider label="Modulus n" value={modN} min={3} max={20} onChange={setModN} />
      <Slider label="Value" value={value} min={0} max={60} onChange={setValue} />
      <Slider label="Step size" value={step2} min={1} max={modN-1} onChange={setStep2} />
      <Stat label="Result" value={`${((value%modN)+modN)%modN}`} />
    </>} />
  );
}

// ── 22. Set Theory (Venn) ─────────────────────────────────────────────────────
export function SetTheory() {
  const [pA,setPA]=useState(0.4); const[pB,setPB]=useState(0.4); const[pAB,setPAB]=useState(0.15);
  const [op,setOp]=useState<"union"|"intersect"|"diff"|"comp">("union");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const cv=canvasRef.current; if(!cv) return;
    const ctx=cv.getContext("2d")!;
    ctx.fillStyle=C_BG; ctx.fillRect(0,0,cv.width,cv.height);
    const W=cv.width,H=cv.height,oy=H/2,R=100,sep=80;
    const cx1=W/2-sep/2, cx2=W/2+sep/2;
    // universe rect
    ctx.strokeStyle=C_DIM; ctx.lineWidth=1.5;
    ctx.strokeRect(30,30,W-60,H-60);
    ctx.fillStyle=C_DIM; ctx.font="10px Inter,sans-serif"; ctx.textAlign="left"; ctx.fillText("U",38,48);
    // highlight operation
    ctx.save();
    if(op==="union"){
      ctx.fillStyle=C_PRIMARY+"44";
      ctx.beginPath(); ctx.arc(cx1,oy,R,0,TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(cx2,oy,R,0,TAU); ctx.fill();
    } else if(op==="intersect"){
      ctx.fillStyle=C_GREEN+"55";
      ctx.beginPath(); ctx.arc(cx2,oy,R,0,TAU); ctx.clip();
      ctx.beginPath(); ctx.arc(cx1,oy,R,0,TAU); ctx.fill();
    } else if(op==="diff"){
      ctx.fillStyle=C_AMBER+"44";
      ctx.beginPath(); ctx.arc(cx1,oy,R,0,TAU);
      ctx.arc(cx2,oy,R,0,TAU,"evenodd" as any); ctx.fill();
    } else {
      ctx.fillStyle=C_RED+"33";
      ctx.beginPath(); ctx.rect(30,30,W-60,H-60);
      ctx.arc(cx1,oy,R,0,TAU,"evenodd" as any);
      ctx.arc(cx2,oy,R,0,TAU,"evenodd" as any); ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle=C_PRIMARY; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(cx1,oy,R,0,TAU); ctx.stroke();
    ctx.strokeStyle=C_AMBER;
    ctx.beginPath(); ctx.arc(cx2,oy,R,0,TAU); ctx.stroke();
    ctx.fillStyle=C_PRIMARY; ctx.font="bold 16px Inter,sans-serif"; ctx.textAlign="center";
    ctx.fillText("A", cx1-sep/2, oy+5);
    ctx.fillStyle=C_AMBER; ctx.fillText("B", cx2+sep/2, oy+5);
    ctx.fillStyle=C_DIM; ctx.font="10px Inter,sans-serif";
    ctx.fillText(`P(A)=${pA}`, cx1-sep/2, oy+24);
    ctx.fillText(`P(B)=${pB}`, cx2+sep/2, oy+24);
    ctx.fillText(`P(A∩B)=${pAB}`, W/2, oy+5);
    const pUnion = pA+pB-pAB;
    ctx.fillStyle=C_FG; ctx.font="11px Inter,sans-serif";
    ctx.fillText(`P(A∪B)=${pUnion.toFixed(2)}`, W/2, H-38);
  },[pA,pB,pAB,op]);
  const ops:[typeof op, string][] = [["union","A ∪ B"],["intersect","A ∩ B"],["diff","A − B"],["comp","Aᶜ"]];
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={<>
      <Slider label="P(A)" value={pA} min={0.05} max={0.7} step={0.05} onChange={setPA} color={C_PRIMARY} />
      <Slider label="P(B)" value={pB} min={0.05} max={0.7} step={0.05} onChange={setPB} color={C_AMBER} />
      <Slider label="P(A∩B)" value={pAB} min={0} max={Math.min(pA,pB)} step={0.05} onChange={setPAB} color={C_GREEN} />
      <SectionLabel>Operation</SectionLabel>
      <div className="grid grid-cols-2 gap-1">
        {ops.map(([o,l])=>(
          <button key={o} onClick={()=>setOp(o)} className={`rounded px-1 py-1.5 text-xs font-medium ${op===o?"bg-primary/20 text-primary border border-primary/30":"border border-border text-muted-foreground"}`}>{l}</button>
        ))}
      </div>
    </>} />
  );
}

// ── 23. Mean / Median / Mode ──────────────────────────────────────────────────
export function MeanMedianMode() {
  const [vals, setVals] = useState([2,3,3,4,5,6,7,8,9]);
  const [outlier, setOutlier] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const data = outlier !== 0 ? [...vals, outlier] : [...vals];
    data.sort((a,b)=>a-b);
    const mean = data.reduce((s,v)=>s+v,0)/data.length;
    const mid = Math.floor(data.length/2);
    const median = data.length%2===0 ? (data[mid-1]+data[mid])/2 : data[mid];
    const freq: Record<number,number>={};
    data.forEach(v=>{ freq[v]=(freq[v]||0)+1; });
    const maxF=Math.max(...Object.values(freq));
    const modes=Object.entries(freq).filter(([,f])=>f===maxF).map(([v])=>+v);
    const cv=canvasRef.current; if(!cv) return;
    const ctx=cv.getContext("2d")!;
    ctx.fillStyle=C_BG; ctx.fillRect(0,0,cv.width,cv.height);
    const W=cv.width,H=cv.height;
    const pad={l:50,r:20,t:30,b:50};
    const pw=W-pad.l-pad.r,ph=H-pad.t-pad.b;
    const xMin=Math.min(...data)-1, xMax=Math.max(...data)+1;
    const toX=(v:number)=>pad.l+(v-xMin)*pw/(xMax-xMin);
    // dots
    const yBase=pad.t+ph*0.65;
    const dotR=10, gap=24;
    const stacked: Record<number,number>={};
    data.forEach(v=>{
      stacked[v]=(stacked[v]||0)+1;
      const sx=toX(v), sy=yBase-(stacked[v]-1)*gap;
      const isMode=modes.includes(v), isOut=v===outlier&&outlier!==0;
      ctx.beginPath(); ctx.arc(sx,sy,dotR,0,TAU);
      ctx.fillStyle=isOut?C_RED:isMode?C_PURPLE:C_PRIMARY+"cc"; ctx.fill();
      ctx.fillStyle=C_BG; ctx.font="bold 9px Inter,sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText(String(v),sx,sy); ctx.textBaseline="alphabetic";
    });
    // axis
    ctx.strokeStyle="rgba(255,255,255,0.25)"; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(pad.l,yBase+dotR+4); ctx.lineTo(pad.l+pw,yBase+dotR+4); ctx.stroke();
    // markers
    const drawMarker=(x:number,color:string,label:string)=>{
      ctx.strokeStyle=color; ctx.lineWidth=2; ctx.setLineDash([5,3]);
      ctx.beginPath(); ctx.moveTo(x,pad.t); ctx.lineTo(x,yBase+dotR+4); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle=color; ctx.font="bold 10px Inter,sans-serif"; ctx.textAlign="center";
      ctx.fillText(label,x,pad.t+12);
    };
    drawMarker(toX(mean),C_AMBER,`mean=${mean.toFixed(1)}`);
    drawMarker(toX(median),C_GREEN,`med=${median.toFixed(1)}`);
    modes.forEach(m=>drawMarker(toX(m),C_PURPLE,`mode=${m}`));
    // x-axis ticks
    ctx.fillStyle=C_DIM; ctx.font="9px Inter,sans-serif"; ctx.textAlign="center";
    for(let v=Math.ceil(xMin);v<=xMax;v++) ctx.fillText(String(v),toX(v),yBase+dotR+18);
  },[vals,outlier]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={<>
      <Slider label="Outlier (0=none)" value={outlier} min={0} max={30} onChange={setOutlier} color={C_RED} />
      <p className="text-[11px] text-muted-foreground">Dataset: {(outlier !== 0 ? [...vals, outlier] : vals).sort((a,b)=>a-b).join(", ")}</p>
      <Stat label="Mean" value={((outlier !== 0 ? [...vals,outlier] : vals).reduce((s,v)=>s+v,0)/((outlier !== 0 ? vals.length+1 : vals.length))).toFixed(2)} />
      <p className="text-[11px] text-muted-foreground">Drag the outlier slider to see how mean shifts but median stays stable.</p>
    </>} />
  );
}

// ── 24. Conditional Probability ───────────────────────────────────────────────
export function ConditionalProbability() {
  const [pA2,setPA2]=useState(0.5); const[pB2,setPB2]=useState(0.4); const[pAB2,setPAB2]=useState(0.2);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const cv=canvasRef.current; if(!cv) return;
    const ctx=cv.getContext("2d")!;
    ctx.fillStyle=C_BG; ctx.fillRect(0,0,cv.width,cv.height);
    const W=cv.width,H=cv.height;
    // proportional area rectangles
    const pad=30, fullW=W-pad*2, fullH=(H-pad*2)*0.55;
    const ay=pad+40;
    // universe
    ctx.strokeStyle=C_DIM; ctx.lineWidth=1; ctx.strokeRect(pad,ay,fullW,fullH);
    // A
    ctx.fillStyle=C_PRIMARY+"33"; ctx.strokeStyle=C_PRIMARY; ctx.lineWidth=2;
    ctx.fillRect(pad,ay,fullW*pA2,fullH); ctx.strokeRect(pad,ay,fullW*pA2,fullH);
    // B
    ctx.fillStyle=C_AMBER+"33"; ctx.strokeStyle=C_AMBER;
    ctx.fillRect(pad+fullW*(1-pB2),ay,fullW*pB2,fullH); ctx.strokeRect(pad+fullW*(1-pB2),ay,fullW*pB2,fullH);
    // A∩B
    const intW=fullW*pAB2;
    ctx.fillStyle=C_GREEN+"55"; ctx.strokeStyle=C_GREEN; ctx.lineWidth=2;
    ctx.fillRect(pad+fullW*pA2-intW,ay,intW,fullH); ctx.strokeRect(pad+fullW*pA2-intW,ay,intW,fullH);
    ctx.fillStyle=C_PRIMARY; ctx.font="bold 13px Inter,sans-serif"; ctx.textAlign="left";
    ctx.fillText("A",pad+8,ay+20);
    ctx.fillStyle=C_AMBER; ctx.textAlign="right";
    ctx.fillText("B",pad+fullW-8,ay+20);
    ctx.fillStyle=C_GREEN; ctx.textAlign="center";
    ctx.fillText("A∩B",pad+fullW*pA2-intW/2,ay+fullH/2);
    const pAgivenB = pAB2/pB2;
    const pBgivenA = pAB2/pA2;
    const resultsY = ay+fullH+30;
    ctx.fillStyle=C_FG; ctx.font="bold 12px Inter,sans-serif"; ctx.textAlign="left";
    ctx.fillText(`P(A|B) = P(A∩B)/P(B) = ${pAB2}/${pB2} = ${pAgivenB.toFixed(3)}`, pad, resultsY);
    ctx.fillText(`P(B|A) = P(A∩B)/P(A) = ${pAB2}/${pA2} = ${pBgivenA.toFixed(3)}`, pad, resultsY+20);
    ctx.fillStyle=C_DIM; ctx.font="10px Inter,sans-serif";
    ctx.fillText("Width = probability (proportional area)", pad, ay+fullH+70);
  },[pA2,pB2,pAB2]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={<>
      <Slider label="P(A)" value={pA2} min={0.1} max={0.8} step={0.05} onChange={setPA2} color={C_PRIMARY} />
      <Slider label="P(B)" value={pB2} min={0.1} max={0.8} step={0.05} onChange={setPB2} color={C_AMBER} />
      <Slider label="P(A∩B)" value={pAB2} min={0} max={Math.min(pA2,pB2)} step={0.05} onChange={setPAB2} color={C_GREEN} />
      <Stat label="P(A|B)" value={(pAB2/pB2).toFixed(3)} />
      <Stat label="P(B|A)" value={(pAB2/pA2).toFixed(3)} />
    </>} />
  );
}

// ── 25. Bayes' Theorem ────────────────────────────────────────────────────────
export function BayesTheorem() {
  const [prior,setPrior]=useState(0.01);
  const [sensitivity,setSens]=useState(0.95);
  const [specificity,setSpec]=useState(0.90);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const cv=canvasRef.current; if(!cv) return;
    const ctx=cv.getContext("2d")!;
    ctx.fillStyle=C_BG; ctx.fillRect(0,0,cv.width,cv.height);
    const W=cv.width,H=cv.height;
    const tp=prior*sensitivity, fp=(1-prior)*(1-specificity);
    const posterior=tp/(tp+fp);
    // tree diagram
    const pad=40, nodeR=6;
    const root={x:pad+30,y:H/2};
    const posNode={x:pad+160,y:H*0.3};
    const negNode={x:pad+160,y:H*0.7};
    const tpNode={x:pad+300,y:H*0.2};
    const fnNode={x:pad+300,y:H*0.4};
    const fpNode={x:pad+300,y:H*0.6};
    const tnNode={x:pad+300,y:H*0.8};
    const drawLine=(x1:number,y1:number,x2:number,y2:number,color:string,label:string,lp:number)=>{
      ctx.strokeStyle=color; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
      const mx=(x1+x2)/2,my=(y1+y2)/2;
      ctx.fillStyle=color; ctx.font="10px Inter,sans-serif"; ctx.textAlign="center";
      ctx.fillText(label,mx,my-6);
      ctx.fillStyle=C_DIM; ctx.fillText(lp.toFixed(4),mx,my+10);
    };
    drawLine(root.x,root.y,posNode.x,posNode.y,C_GREEN,`+D ${prior}`,prior);
    drawLine(root.x,root.y,negNode.x,negNode.y,C_RED,`−D ${(1-prior).toFixed(2)}`,1-prior);
    drawLine(posNode.x,posNode.y,tpNode.x,tpNode.y,C_GREEN,`+T ${sensitivity}`,tp);
    drawLine(posNode.x,posNode.y,fnNode.x,fnNode.y,C_DIM,`−T ${(1-sensitivity).toFixed(2)}`,prior*(1-sensitivity));
    drawLine(negNode.x,negNode.y,fpNode.x,fpNode.y,C_RED,`+T ${(1-specificity).toFixed(2)}`,fp);
    drawLine(negNode.x,negNode.y,tnNode.x,tnNode.y,C_DIM,`−T ${specificity}`,( 1-prior)*specificity);
    const drawNode=(p:{x:number,y:number},color:string,lbl:string)=>{
      ctx.beginPath(); ctx.arc(p.x,p.y,nodeR,0,TAU); ctx.fillStyle=color; ctx.fill();
      ctx.fillStyle=C_FG; ctx.font="bold 10px Inter,sans-serif"; ctx.textAlign="left";
      ctx.fillText(lbl,p.x+nodeR+4,p.y+4);
    };
    drawNode(root,C_FG,"Start");
    drawNode(posNode,C_GREEN,"Disease+");
    drawNode(negNode,C_RED,"Disease−");
    drawNode(tpNode,C_GREEN,`TP=${tp.toFixed(4)}`);
    drawNode(fnNode,C_DIM,"FN");
    drawNode(fpNode,C_RED,`FP=${fp.toFixed(4)}`);
    drawNode(tnNode,C_DIM,"TN");
    ctx.fillStyle=C_AMBER; ctx.font="bold 12px Inter,sans-serif"; ctx.textAlign="left";
    ctx.fillText(`P(D|+) = ${posterior.toFixed(4)}`,W-180,H/2-10);
    ctx.fillStyle=C_DIM; ctx.font="10px Inter,sans-serif";
    ctx.fillText("Posterior probability",W-180,H/2+8);
  },[prior,sensitivity,specificity]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={<>
      <Slider label="Prior P(D)" value={prior} min={0.001} max={0.3} step={0.001} onChange={setPrior} />
      <Slider label="Sensitivity" value={sensitivity} min={0.5} max={1} step={0.01} onChange={setSens} color={C_GREEN} />
      <Slider label="Specificity" value={specificity} min={0.5} max={1} step={0.01} onChange={setSpec} color={C_RED} />
      <Stat label="P(D|+)" value={(prior*sensitivity/(prior*sensitivity+(1-prior)*(1-specificity))).toFixed(4)} />
      <p className="text-[11px] text-muted-foreground">Low prior → positive test still mostly FP.</p>
    </>} />
  );
}

// ── 26. Boolean Algebra ───────────────────────────────────────────────────────
export function BooleanAlgebra() {
  const [inA,setA]=useState(true); const[inB,setB]=useState(false);
  const [gate,setGate]=useState<"AND"|"OR"|"NAND"|"NOR"|"XOR"|"XNOR">("AND");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const cv=canvasRef.current; if(!cv) return;
    const ctx=cv.getContext("2d")!;
    ctx.fillStyle=C_BG; ctx.fillRect(0,0,cv.width,cv.height);
    const W=cv.width,H=cv.height;
    const gates:Record<string,[boolean,boolean][]>={
      AND:[[false,false],[false,true],[true,false],[true,true]],
      OR:[[false,false],[false,true],[true,false],[true,true]],
      NAND:[[false,false],[false,true],[true,false],[true,true]],
      NOR:[[false,false],[false,true],[true,false],[true,true]],
      XOR:[[false,false],[false,true],[true,false],[true,true]],
      XNOR:[[false,false],[false,true],[true,false],[true,true]],
    };
    const compute=(a:boolean,b:boolean,g:string)=>{
      if(g==="AND") return a&&b;
      if(g==="OR") return a||b;
      if(g==="NAND") return !(a&&b);
      if(g==="NOR") return !(a||b);
      if(g==="XOR") return a!==b;
      return a===b; // XNOR
    };
    const rows=gates[gate];
    // truth table
    const tw=60, th=32, tx=W*0.05, ty=60;
    ctx.fillStyle=C_DIM; ctx.font="bold 11px Inter,sans-serif"; ctx.textAlign="center";
    ["A","B","Out"].forEach((h,i)=>ctx.fillText(h,tx+tw*i+tw/2,ty-8));
    ctx.strokeStyle=C_GRID; ctx.lineWidth=1;
    for(let col=0;col<=3;col++){ctx.beginPath();ctx.moveTo(tx+col*tw,ty);ctx.lineTo(tx+col*tw,ty+th*4);ctx.stroke();}
    for(let row=0;row<=4;row++){ctx.beginPath();ctx.moveTo(tx,ty+row*th);ctx.lineTo(tx+3*tw,ty+row*th);ctx.stroke();}
    rows.forEach(([a,b],i)=>{
      const out=compute(a,b,gate);
      const isActive=a===inA&&b===inB;
      if(isActive){ ctx.fillStyle=C_PRIMARY+"22"; ctx.fillRect(tx,ty+i*th,tw*3,th); }
      const color=(v:boolean)=>v?C_GREEN:C_RED;
      [a,b,out].forEach((v,j)=>{
        ctx.fillStyle=isActive?color(v):C_DIM; ctx.font=`${isActive?"bold ":""}12px Inter,sans-serif`;
        ctx.textAlign="center"; ctx.fillText(v?"1":"0",tx+j*tw+tw/2,ty+i*th+th*0.65);
      });
    });
    // gate symbol
    const gx=W*0.65,gy=H/2,gw=80,gh=60;
    const out=compute(inA,inB,gate);
    ctx.strokeStyle=C_AMBER; ctx.lineWidth=2;
    ctx.strokeRect(gx-gw/2,gy-gh/2,gw,gh);
    ctx.fillStyle=C_AMBER; ctx.font="bold 14px Inter,sans-serif"; ctx.textAlign="center";
    ctx.fillText(gate,gx,gy+5);
    const drawWire=(x1:number,y1:number,x2:number,y2:number,on:boolean)=>{
      ctx.strokeStyle=on?C_GREEN:C_RED; ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
    };
    drawWire(gx-gw/2-60,gy-15,gx-gw/2,gy-15,inA);
    drawWire(gx-gw/2-60,gy+15,gx-gw/2,gy+15,inB);
    drawWire(gx+gw/2,gy,gx+gw/2+60,gy,out);
    ctx.fillStyle=inA?C_GREEN:C_RED; ctx.font="bold 12px Inter,sans-serif"; ctx.textAlign="center";
    ctx.fillText(`A=${inA?1:0}`,gx-gw/2-30,gy-22);
    ctx.fillStyle=inB?C_GREEN:C_RED;
    ctx.fillText(`B=${inB?1:0}`,gx-gw/2-30,gy+32);
    ctx.fillStyle=out?C_GREEN:C_RED;
    ctx.fillText(`Out=${out?1:0}`,gx+gw/2+30,gy-14);
  },[inA,inB,gate]);
  const gates2=["AND","OR","NAND","NOR","XOR","XNOR"] as const;
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={<>
      <SectionLabel>Inputs</SectionLabel>
      <div className="flex gap-2">
        <button onClick={()=>setA(v=>!v)} className={`flex-1 rounded py-2 text-sm font-bold border ${inA?"bg-emerald-500/20 text-emerald-400 border-emerald-500/40":"bg-red-500/20 text-red-400 border-red-500/40"}`}>A={inA?1:0}</button>
        <button onClick={()=>setB(v=>!v)} className={`flex-1 rounded py-2 text-sm font-bold border ${inB?"bg-emerald-500/20 text-emerald-400 border-emerald-500/40":"bg-red-500/20 text-red-400 border-red-500/40"}`}>B={inB?1:0}</button>
      </div>
      <SectionLabel>Gate</SectionLabel>
      <div className="grid grid-cols-3 gap-1">
        {gates2.map(g=>(
          <button key={g} onClick={()=>setGate(g)} className={`rounded py-1 text-xs font-medium ${gate===g?"bg-primary/20 text-primary border border-primary/30":"border border-border text-muted-foreground"}`}>{g}</button>
        ))}
      </div>
    </>} />
  );
}

// ── 27. Prime Factorization ───────────────────────────────────────────────────
export function PrimeFactorization() {
  const [num,setNum]=useState(60);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const cv=canvasRef.current; if(!cv) return;
    const ctx=cv.getContext("2d")!;
    ctx.fillStyle=C_BG; ctx.fillRect(0,0,cv.width,cv.height);
    const W=cv.width,H=cv.height;
    // factor tree builder
    type Node={val:number;x:number;y:number;left?:Node;right?:Node;prime:boolean};
    const factorOf=(n:number):number=>{
      if(n<2) return n;
      for(let i=2;i<=Math.sqrt(n);i++) if(n%i===0) return i;
      return n;
    };
    const build=(n:number,x:number,y:number,depth:number):Node=>{
      const f=factorOf(n);
      if(f===n) return {val:n,x,y,prime:true};
      const spread=Math.max(30,120/(depth+1));
      return {val:n,x,y,prime:false,
        left:build(f,x-spread,y+55,depth+1),
        right:build(n/f,x+spread,y+55,depth+1)};
    };
    const root=build(num,W/2,40,0);
    const draw=(node:Node)=>{
      if(node.left){
        ctx.strokeStyle=C_DIM; ctx.lineWidth=1.5;
        ctx.beginPath();ctx.moveTo(node.x,node.y+12);ctx.lineTo(node.left.x,node.left.y-12);ctx.stroke();
        ctx.beginPath();ctx.moveTo(node.x,node.y+12);ctx.lineTo(node.right!.x,node.right!.y-12);ctx.stroke();
        draw(node.left); draw(node.right!);
      }
      const r=18;
      ctx.beginPath();ctx.arc(node.x,node.y,r,0,TAU);
      ctx.fillStyle=node.prime?C_GREEN+"33":C_PRIMARY+"22";
      ctx.strokeStyle=node.prime?C_GREEN:C_PRIMARY;
      ctx.lineWidth=2; ctx.fill(); ctx.stroke();
      ctx.fillStyle=node.prime?C_GREEN:C_FG;
      ctx.font=`bold ${node.val>99?"10":"13"}px Inter,sans-serif`;
      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText(String(node.val),node.x,node.y);
      ctx.textBaseline="alphabetic";
    };
    draw(root);
    // collect primes
    const primes:number[]=[];
    const collect=(n:Node)=>{if(n.prime){primes.push(n.val);}else{collect(n.left!);collect(n.right!);}};
    collect(root);
    primes.sort((a,b)=>a-b);
    const freq:Record<number,number>={};
    primes.forEach(p=>freq[p]=(freq[p]||0)+1);
    const factStr=Object.entries(freq).map(([p,e])=>e>1?`${p}^${e}`:p).join(" × ");
    ctx.fillStyle=C_AMBER; ctx.font="bold 13px Inter,sans-serif"; ctx.textAlign="center"; ctx.textBaseline="alphabetic";
    ctx.fillText(`${num} = ${factStr}`,W/2,H-15);
  },[num]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={<>
      <Slider label="Number" value={num} min={2} max={120} onChange={setNum} />
      <p className="text-[11px] text-muted-foreground">Green circles = prime factors.</p>
    </>} />
  );
}

// ── 28. Optimization ─────────────────────────────────────────────────────────
export function Optimization() {
  const [constraint,setConstraint]=useState(4);
  const [fnIdx,setFnIdx]=useState(0);
  const fns=[
    {label:"x³−3x", f:(x:number)=>x**3-3*x, df:(x:number)=>3*x**2-3},
    {label:"−x⁴+4x²", f:(x:number)=>-(x**4)+4*(x**2), df:(x:number)=>-4*x**3+8*x},
    {label:"sin(x)·eˣ/3", f:(x:number)=>Math.sin(x)*Math.exp(x/3), df:(x:number)=>Math.exp(x/3)*(Math.sin(x)/3+Math.cos(x))},
  ];
  const fn=fns[fnIdx];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const cv=canvasRef.current; if(!cv) return;
    const ctx=cv.getContext("2d")!;
    ctx.fillStyle=C_BG; ctx.fillRect(0,0,cv.width,cv.height);
    const W=cv.width,H=cv.height;
    const pad={l:50,r:20,t:20,b:40};
    const pw=W-pad.l-pad.r,ph=H-pad.t-pad.b;
    const ox=pad.l+pw/2,oy=pad.t+ph/2;
    // grid + axes
    ctx.strokeStyle=C_GRID; ctx.lineWidth=1;
    for(let x=-8;x<=8;x+=2){const px=ox+x*pw/20;ctx.beginPath();ctx.moveTo(px,pad.t);ctx.lineTo(px,pad.t+ph);ctx.stroke();}
    for(let y=-4;y<=4;y+=2){const py=oy-y*ph/10;ctx.beginPath();ctx.moveTo(pad.l,py);ctx.lineTo(pad.l+pw,py);ctx.stroke();}
    ctx.strokeStyle="rgba(255,255,255,0.3)"; ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(pad.l,oy);ctx.lineTo(pad.l+pw,oy);ctx.stroke();
    ctx.beginPath();ctx.moveTo(ox,pad.t);ctx.lineTo(ox,pad.t+ph);ctx.stroke();
    const toX=(x:number)=>ox+x*pw/20;
    const toY=(y:number)=>oy-y*ph/10;
    // constraint shading
    ctx.fillStyle=C_PRIMARY+"15";
    ctx.fillRect(toX(-constraint),pad.t,toX(constraint)-toX(-constraint),ph);
    ctx.strokeStyle=C_DIM; ctx.lineWidth=1; ctx.setLineDash([4,3]);
    ctx.beginPath();ctx.moveTo(toX(-constraint),pad.t);ctx.lineTo(toX(-constraint),pad.t+ph);ctx.stroke();
    ctx.beginPath();ctx.moveTo(toX(constraint),pad.t);ctx.lineTo(toX(constraint),pad.t+ph);ctx.stroke();
    ctx.setLineDash([]);
    // curve
    const pts:[number,number][]=[];
    for(let i=0;i<=300;i++){
      const x=-10+i*20/300; const y=fn.f(x);
      if(Math.abs(y)>5.5){if(pts.length>1)drawCurve(ctx,pts,C_PRIMARY,2.5);pts.length=0;continue;}
      pts.push([toX(x),toY(y)]);
    }
    if(pts.length)drawCurve(ctx,pts,C_PRIMARY,2.5);
    // find local extrema in domain via numerical search
    const step=0.01;
    for(let x=-constraint+step;x<constraint-step;x+=step){
      const d1=fn.df(x),d2=fn.df(x+step);
      if(d1*d2<0){
        const ex=x+step/2, ey=fn.f(ex);
        if(Math.abs(ey)>5.5) continue;
        ctx.beginPath();ctx.arc(toX(ex),toY(ey),5,0,TAU);
        ctx.fillStyle=d2<0?C_GREEN:C_RED; ctx.fill();
        ctx.fillStyle=C_FG; ctx.font="10px Inter,sans-serif"; ctx.textAlign="left";
        ctx.fillText(`${d2<0?"max":"min"}(${ex.toFixed(1)},${ey.toFixed(2)})`,toX(ex)+7,toY(ey)-4);
      }
    }
    ctx.fillStyle=C_FG; ctx.font="bold 12px Inter,sans-serif"; ctx.textAlign="left";
    ctx.fillText(`f(x) = ${fn.label}`,pad.l+6,pad.t+16);
    ctx.fillStyle=C_DIM; ctx.font="10px Inter,sans-serif";
    ctx.fillText(`Domain: [−${constraint}, ${constraint}]`,pad.l+6,pad.t+32);
  },[constraint,fnIdx,fn]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={<>
      <SectionLabel>Function</SectionLabel>
      {fns.map((f,i)=>(
        <button key={i} onClick={()=>setFnIdx(i)} className={`w-full text-left rounded px-2 py-1.5 text-xs ${fnIdx===i?"bg-primary/20 text-primary border border-primary/30":"border border-border text-muted-foreground"}`}>{f.label}</button>
      ))}
      <Slider label="Domain limit" value={constraint} min={1} max={8} step={0.5} onChange={setConstraint} />
      <p className="text-[11px] text-muted-foreground">Green=max · Red=min</p>
    </>} />
  );
}

// ── 29. Volumes of Revolution ─────────────────────────────────────────────────
export function VolumesOfRevolution() {
  const [bound,setBound]=useState(2);
  const [method,setMethod]=useState<"disk"|"shell">("disk");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const cv=canvasRef.current; if(!cv) return;
    const ctx=cv.getContext("2d")!;
    ctx.fillStyle=C_BG; ctx.fillRect(0,0,cv.width,cv.height);
    const W=cv.width,H=cv.height;
    const f=(x:number)=>x*x/4+0.5;
    const pad={l:50,r:20,t:20,b:40};
    const pw=W-pad.l-pad.r,ph=H-pad.t-pad.b;
    const ox=pad.l,oy=pad.t+ph/2;
    const xScale=pw/(bound+1),yScale=ph/4;
    const toX=(x:number)=>ox+x*xScale;
    const toY=(y:number)=>oy-y*yScale;
    // draw disk slices
    const n=40;
    for(let i=0;i<n;i++){
      const x=i*bound/n, dx=bound/n;
      const r=f(x+dx/2)*yScale;
      ctx.strokeStyle=C_PRIMARY+"66"; ctx.lineWidth=0.5;
      // ellipse (disk cross-section)
      ctx.beginPath(); ctx.ellipse(toX(x+dx/2),oy,dx*xScale*0.4,r,0,0,TAU);
      ctx.fillStyle=C_PRIMARY+(method==="disk"?"33":"15");
      ctx.fill(); ctx.stroke();
    }
    // shell method: vertical shells
    if(method==="shell"){
      for(let i=0;i<n;i++){
        const x=(i+0.5)*bound/n, dx=bound/n;
        const h=f(x)*yScale;
        ctx.strokeStyle=C_AMBER+"88"; ctx.lineWidth=1;
        ctx.beginPath(); ctx.ellipse(ox,oy,x*xScale,h,0,0,TAU);
        ctx.strokeStyle=C_AMBER+"44"; ctx.stroke();
      }
    }
    // curve (top half)
    const pts:[number,number][]=[];
    for(let i=0;i<=100;i++){const x=i*bound/100;pts.push([toX(x),toY(f(x))]);}
    drawCurve(ctx,pts,C_PRIMARY,2.5);
    // mirrored bottom
    drawCurve(ctx,pts.map(([x,y])=>[x,oy+(oy-y)] as [number,number]),C_PRIMARY,2.5);
    // axis of rotation
    ctx.strokeStyle=C_DIM; ctx.lineWidth=1; ctx.setLineDash([6,4]);
    ctx.beginPath();ctx.moveTo(ox,oy);ctx.lineTo(toX(bound+0.5),oy);ctx.stroke();
    ctx.setLineDash([]);
    // x axis
    ctx.strokeStyle="rgba(255,255,255,0.25)"; ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(ox,pad.t);ctx.lineTo(ox,pad.t+ph);ctx.stroke();
    ctx.fillStyle=C_DIM; ctx.font="9px Inter,sans-serif"; ctx.textAlign="center";
    for(let x=0;x<=bound;x++) ctx.fillText(String(x),toX(x),oy+14);
    // calculate volume (disk: π∫r²dx)
    let vol=0;
    for(let i=0;i<200;i++){const x=i*bound/200;vol+=Math.PI*f(x)**2*(bound/200);}
    ctx.fillStyle=C_FG; ctx.font="bold 12px Inter,sans-serif"; ctx.textAlign="left";
    ctx.fillText(`f(x) = x²/4 + 0.5`,pad.l+6,pad.t+16);
    ctx.fillStyle=C_AMBER; ctx.font="11px Inter,sans-serif";
    ctx.fillText(`Volume ≈ ${vol.toFixed(3)} π`,pad.l+6,pad.t+32);
  },[bound,method]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={<>
      <Slider label="Upper bound b" value={bound} min={0.5} max={4} step={0.5} onChange={setBound} />
      <SectionLabel>Method</SectionLabel>
      <div className="flex gap-1">
        {(["disk","shell"] as const).map(m=>(
          <button key={m} onClick={()=>setMethod(m)} className={`flex-1 rounded py-1.5 text-xs font-medium ${method===m?"bg-primary/20 text-primary border border-primary/30":"border border-border text-muted-foreground"}`}>{m[0].toUpperCase()+m.slice(1)}</button>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">Rotating f(x) around the x-axis.</p>
    </>} />
  );
}

// ── 30. Similar Triangles ─────────────────────────────────────────────────────
export function SimilarTriangles() {
  const [scale2,setScale2]=useState(1.8);
  const [angle2,setAngle2]=useState(50);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const cv=canvasRef.current; if(!cv) return;
    const ctx=cv.getContext("2d")!;
    ctx.fillStyle=C_BG; ctx.fillRect(0,0,cv.width,cv.height);
    const W=cv.width,H=cv.height;
    const base=100, drawTri=(ox:number,oy:number,sc:number,color:string,label:string)=>{
      const A={x:ox,y:oy};
      const B={x:ox+base*sc,y:oy};
      const angR=angle2*Math.PI/180;
      const h=base*sc*Math.tan(angR);
      const C2={x:ox,y:oy-h};
      ctx.fillStyle=color+"22"; ctx.strokeStyle=color; ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.lineTo(B.x,B.y);ctx.lineTo(C2.x,C2.y);ctx.closePath();ctx.fill();ctx.stroke();
      // right angle
      ctx.strokeStyle=color+"88"; ctx.lineWidth=1;
      ctx.strokeRect(A.x,A.y-8,8,8);
      // labels
      ctx.fillStyle=color; ctx.font="11px Inter,sans-serif"; ctx.textAlign="center";
      ctx.fillText(`${(base*sc/100).toFixed(1)}`,( A.x+B.x)/2,B.y+16);
      ctx.fillText(`${(h/100).toFixed(1)}`,(A.x+C2.x)/2-14,(A.y+C2.y)/2);
      ctx.textAlign="left"; ctx.fillText(label,ox-30,oy-h-6);
    };
    drawTri(W*0.15,H*0.8,1,C_PRIMARY,"△ABC");
    drawTri(W*0.45,H*0.8,scale2,C_AMBER,"△A'B'C'");
    ctx.fillStyle=C_GREEN; ctx.font="bold 12px Inter,sans-serif"; ctx.textAlign="center";
    ctx.fillText(`Scale factor: ${scale2.toFixed(1)}`,W/2,H-14);
    ctx.fillStyle=C_DIM; ctx.font="10px Inter,sans-serif";
    ctx.fillText(`All angles equal (AA similarity) · sides proportional`,W/2,H-2);
  },[scale2,angle2]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={<>
      <Slider label="Scale factor" value={scale2} min={0.5} max={2.5} step={0.1} onChange={setScale2} color={C_AMBER} />
      <Slider label="Angle A (°)" value={angle2} min={15} max={70} onChange={setAngle2} />
      <Stat label="Area ratio" value={`${(scale2**2).toFixed(2)}:1`} />
      <Stat label="Perimeter ratio" value={`${scale2.toFixed(2)}:1`} />
    </>} />
  );
}

// ── 31. Trig Identities ───────────────────────────────────────────────────────
export function TrigIdentities() {
  const [theta3,setTheta3]=useState(40);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const cv=canvasRef.current; if(!cv) return;
    const ctx=cv.getContext("2d")!;
    ctx.fillStyle=C_BG; ctx.fillRect(0,0,cv.width,cv.height);
    const W=cv.width,H=cv.height;
    const rad=theta3*Math.PI/180;
    const cosT=Math.cos(rad), sinT=Math.sin(rad);
    const cos2T=Math.cos(2*rad), sin2T=Math.sin(2*rad);
    // Unit circle (left panel)
    const ox=W*0.27,oy=H/2,R=100;
    ctx.strokeStyle=C_DIM; ctx.lineWidth=1.5;
    ctx.beginPath();ctx.arc(ox,oy,R,0,TAU);ctx.stroke();
    ctx.strokeStyle="rgba(255,255,255,0.3)"; ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(ox-R-10,oy);ctx.lineTo(ox+R+10,oy);ctx.stroke();
    ctx.beginPath();ctx.moveTo(ox,oy-R-10);ctx.lineTo(ox,oy+R+10);ctx.stroke();
    const px=ox+cosT*R, py=oy-sinT*R;
    // Pythagorean identity: cos² + sin² = 1
    ctx.strokeStyle=C_PRIMARY; ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(ox,oy);ctx.lineTo(px,oy);ctx.stroke(); // cos
    ctx.strokeStyle=C_GREEN; ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(px,oy);ctx.lineTo(px,py);ctx.stroke(); // sin
    ctx.strokeStyle=C_AMBER; ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(ox,oy);ctx.lineTo(px,py);ctx.stroke(); // radius
    // angle arc
    ctx.strokeStyle=C_DIM; ctx.lineWidth=1.5;
    ctx.beginPath();ctx.arc(ox,oy,25,0,-rad,sinT>=0);ctx.stroke();
    // double angle point
    const px2=ox+cos2T*R, py2=oy-sin2T*R;
    ctx.beginPath();ctx.arc(px2,py2,5,0,TAU);ctx.fillStyle=C_PURPLE;ctx.fill();
    ctx.setLineDash([5,3]);
    ctx.strokeStyle=C_PURPLE+"88"; ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(ox,oy);ctx.lineTo(px2,py2);ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();ctx.arc(px,py,5,0,TAU);ctx.fillStyle=C_AMBER;ctx.fill();
    // Right panel: identities
    const rx=W*0.56;
    ctx.fillStyle=C_FG; ctx.font="bold 12px Inter,sans-serif"; ctx.textAlign="left";
    ctx.fillText(`θ = ${theta3}°`,rx,50);
    const idents=[
      {label:"sin²θ + cos²θ = 1",val:`${(sinT**2).toFixed(3)} + ${(cosT**2).toFixed(3)} = ${(sinT**2+cosT**2).toFixed(3)}`,color:C_GREEN},
      {label:"sin(2θ) = 2 sinθ cosθ",val:`${sin2T.toFixed(3)} = ${(2*sinT*cosT).toFixed(3)}`,color:C_PURPLE},
      {label:"cos(2θ) = cos²θ − sin²θ",val:`${cos2T.toFixed(3)} = ${(cosT**2-sinT**2).toFixed(3)}`,color:C_CYAN},
      {label:"tan θ = sin θ / cos θ",val:`${cosT!==0?(sinT/cosT).toFixed(3):"∞"}`,color:C_AMBER},
    ];
    idents.forEach(({label,val,color},i)=>{
      ctx.fillStyle=color; ctx.font="bold 10px Inter,sans-serif";
      ctx.fillText(label,rx,80+i*52);
      ctx.fillStyle=C_FG; ctx.font="11px Inter,sans-serif";
      ctx.fillText(val,rx,96+i*52);
    });
  },[theta3]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={<>
      <Slider label="Angle θ (°)" value={theta3} min={0} max={360} onChange={setTheta3} />
      <p className="text-[11px] text-muted-foreground">Amber dot: (cosθ, sinθ) · Purple dot: (cos2θ, sin2θ)</p>
    </>} />
  );
}

// ── 32. Inequalities ─────────────────────────────────────────────────────────
export function Inequalities() {
  const [type,setType]=useState<"linear"|"quadratic">("linear");
  const [dir,setDir]=useState<"lt"|"gt">("lt");
  const [a3,setA3]=useState(1); const[b3,setB3]=useState(0); const[c3,setC3]=useState(-2);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const cv=canvasRef.current; if(!cv) return;
    const ctx=cv.getContext("2d")!;
    ctx.fillStyle=C_BG; ctx.fillRect(0,0,cv.width,cv.height);
    const W=cv.width,H=cv.height;
    const pad={l:50,r:20,t:20,b:40};
    const pw=W-pad.l-pad.r,ph=H-pad.t-pad.b;
    const ox=pad.l+pw/2,oy=pad.t+ph/2;
    ctx.strokeStyle=C_GRID; ctx.lineWidth=1;
    for(let x=-10;x<=10;x+=2){const px=ox+x*pw/20;ctx.beginPath();ctx.moveTo(px,pad.t);ctx.lineTo(px,pad.t+ph);ctx.stroke();}
    for(let y=-6;y<=6;y+=2){const py=oy-y*ph/12;ctx.beginPath();ctx.moveTo(pad.l,py);ctx.lineTo(pad.l+pw,py);ctx.stroke();}
    ctx.strokeStyle="rgba(255,255,255,0.3)"; ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(pad.l,oy);ctx.lineTo(pad.l+pw,oy);ctx.stroke();
    ctx.beginPath();ctx.moveTo(ox,pad.t);ctx.lineTo(ox,pad.t+ph);ctx.stroke();
    const toX=(x:number)=>ox+x*pw/20;
    const toY=(y:number)=>oy-y*ph/12;
    const f=(x:number)=>type==="linear"?a3*x+b3:(a3*x*x+b3*x+c3);
    // shaded region
    ctx.save();
    const regionPts:[number,number][]=[];
    for(let i=0;i<=300;i++){
      const x=-10+i*20/300, y=f(x);
      if(Math.abs(y)>8) continue;
      regionPts.push([toX(x),toY(y)]);
    }
    if(regionPts.length>1){
      ctx.beginPath();
      ctx.moveTo(regionPts[0][0],regionPts[0][1]);
      regionPts.forEach(([x,y])=>ctx.lineTo(x,y));
      if(dir==="lt"){
        ctx.lineTo(regionPts[regionPts.length-1][0],pad.t+ph);
        ctx.lineTo(regionPts[0][0],pad.t+ph);
      } else {
        ctx.lineTo(regionPts[regionPts.length-1][0],pad.t);
        ctx.lineTo(regionPts[0][0],pad.t);
      }
      ctx.closePath();
      ctx.fillStyle=C_PRIMARY+"33"; ctx.fill();
    }
    ctx.restore();
    // curve
    const pts:[number,number][]=[];
    for(let i=0;i<=300;i++){
      const x=-10+i*20/300, y=f(x);
      if(Math.abs(y)>7){if(pts.length>1)drawCurve(ctx,pts,C_AMBER,2.5);pts.length=0;continue;}
      pts.push([toX(x),toY(y)]);
    }
    if(pts.length)drawCurve(ctx,pts,C_AMBER,2.5);
    ctx.fillStyle=C_DIM; ctx.font="9px Inter,sans-serif"; ctx.textAlign="center";
    for(let x=-8;x<=8;x+=2)ctx.fillText(String(x),toX(x),oy+12);
    const label=type==="linear"?`y ${dir==="lt"?"<":">"} ${a3}x${b3>=0?"+":""}${b3}`:`y ${dir==="lt"?"<":">"} ${a3}x²${b3>=0?"+":""}${b3}x${c3>=0?"+":""}${c3}`;
    ctx.fillStyle=C_AMBER; ctx.font="bold 12px Inter,sans-serif"; ctx.textAlign="left";
    ctx.fillText(label,pad.l+6,pad.t+16);
  },[type,dir,a3,b3,c3]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={<>
      <div className="flex gap-1">
        {(["linear","quadratic"] as const).map(t=>(
          <button key={t} onClick={()=>setType(t)} className={`flex-1 rounded py-1 text-xs font-medium ${type===t?"bg-primary/20 text-primary border border-primary/30":"border border-border text-muted-foreground"}`}>{t[0].toUpperCase()+t.slice(1,4)}</button>
        ))}
      </div>
      <div className="flex gap-1">
        {([["lt","y < f(x)"],["gt","y > f(x)"]] as const).map(([d,l])=>(
          <button key={d} onClick={()=>setDir(d)} className={`flex-1 rounded py-1 text-xs font-medium ${dir===d?"bg-primary/20 text-primary border border-primary/30":"border border-border text-muted-foreground"}`}>{l}</button>
        ))}
      </div>
      <Slider label="a" value={a3} min={-3} max={3} step={0.5} onChange={setA3} />
      <Slider label="b" value={b3} min={-5} max={5} step={0.5} onChange={setB3} />
      {type==="quadratic"&&<Slider label="c" value={c3} min={-5} max={5} step={0.5} onChange={setC3} />}
    </>} />
  );
}
