import { useEffect, useRef, useState } from "react";
import {
  useRaf, ModelWrap, Slider, Stat, SectionLabel, StepNav,
  C_BG, C_FG, C_DIM, C_GRID, C_PRIMARY, C_GREEN, C_RED, C_AMBER, C_PURPLE, C_CYAN,
  TAU, clamp, lerp, drawAxes, drawCurve,
} from "./shared";

// ── 1. Fibonacci / Golden Ratio ───────────────────────────────────────────────
export function Fibonacci() {
  const [n, setN] = useState(8);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    // Golden spiral squares
    const fibs = [1, 1];
    for (let i = 2; i < n; i++) fibs.push(fibs[i - 1] + fibs[i - 2]);
    const scale = Math.min(W, H) / (fibs[fibs.length - 1] + fibs[fibs.length - 2]) * 0.85;
    let x = W / 2 - (fibs[fibs.length - 1] * scale) / 2;
    let y = H / 2 - (fibs[fibs.length - 2] * scale) / 2;
    const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    const colors = [C_PRIMARY, C_GREEN, C_AMBER, C_PURPLE, C_CYAN, C_RED];
    for (let i = fibs.length - 1; i >= 0; i--) {
      const s = fibs[i] * scale;
      const d = (fibs.length - 1 - i) % 4;
      ctx.strokeStyle = colors[i % colors.length]; ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, s, s);
      // label the square with fib number
      if (s > 15) {
        ctx.fillStyle = colors[i % colors.length];
        ctx.font = `${Math.min(s * 0.4, 16)}px Inter,sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(fibs[i] + "", x + s / 2, y + s / 2);
      }
      // arc
      ctx.beginPath();
      const arcAngles = [[-Math.PI, -Math.PI / 2], [-Math.PI / 2, 0], [0, Math.PI / 2], [Math.PI / 2, Math.PI]];
      const [a1, a2] = arcAngles[d];
      const arcX = d === 0 ? x + s : d === 1 ? x + s : d === 2 ? x : x;
      const arcY = d === 0 ? y + s : d === 1 ? y : d === 2 ? y : y + s;
      ctx.arc(arcX, arcY, s, a1, a2);
      ctx.strokeStyle = colors[i % colors.length] + "88"; ctx.lineWidth = 1; ctx.stroke();
      if (d === 0) x -= fibs[i - 1] * scale;
      else if (d === 1) y -= fibs[i - 1] * scale;
      else if (d === 2) { x += s; y += s - fibs[i - 1] * scale; }
      else { y += s; }
    }
    ctx.fillStyle = C_DIM; ctx.font = "10px Inter,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.fillText(`φ ≈ ${(fibs[n - 1] / fibs[n - 2]).toFixed(5)}`, W / 2, H - 18);
    ctx.fillText("F: " + fibs.slice(0, Math.min(n, 8)).join(", "), W / 2, H - 4);
  }, [n]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={
      <>
        <Slider label="Fibonacci terms" value={n} min={3} max={10} onChange={setN} />
        <Stat label="φ (golden ratio)" value="1.61803…" />
        <Stat label={`F(${n})`} value={(() => { const f = [1, 1]; for (let i = 2; i < n; i++) f.push(f[i-1]+f[i-2]); return f[n-1]+""; })()} />
      </>
    } />
  );
}

// ── 2. Fractals (Mandelbrot) ─────────────────────────────────────────────────
export function Fractals() {
  const [zoom, setZoom] = useState(1);
  const [cx2, setCx] = useState(-0.5);
  const [cy2, setCy] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDragging = useRef(false);
  const lastMouse = useRef<[number, number]>([0, 0]);
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height;
    const img = ctx.createImageData(W, H);
    const maxIter = 80;
    for (let py = 0; py < H; py++) {
      for (let px = 0; px < W; px++) {
        const x0 = cx2 + (px - W / 2) / (W * 0.3 * zoom);
        const y0 = cy2 + (py - H / 2) / (H * 0.45 * zoom);
        let x = 0, y = 0, iter = 0;
        while (x * x + y * y <= 4 && iter < maxIter) {
          const xn = x * x - y * y + x0;
          y = 2 * x * y + y0; x = xn; iter++;
        }
        const idx = (py * W + px) * 4;
        if (iter === maxIter) { img.data[idx] = 0; img.data[idx + 1] = 0; img.data[idx + 2] = 0; }
        else {
          const t = iter / maxIter;
          img.data[idx] = Math.floor(9 * (1 - t) * t * t * t * 255);
          img.data[idx + 1] = Math.floor(15 * (1 - t) * (1 - t) * t * t * 255);
          img.data[idx + 2] = Math.floor(8.5 * (1 - t) * (1 - t) * (1 - t) * t * 255);
        }
        img.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [zoom, cx2, cy2]);
  const handleMouseDown = (e: React.MouseEvent) => { isDragging.current = true; lastMouse.current = [e.clientX, e.clientY]; };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const [lx, ly] = lastMouse.current;
    const dx = e.clientX - lx, dy = e.clientY - ly;
    lastMouse.current = [e.clientX, e.clientY];
    setCx(c => c - dx / (580 * 0.3 * zoom));
    setCy(c => c - dy / (340 * 0.45 * zoom));
  };
  const handleMouseUp = () => { isDragging.current = false; };
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => clamp(z * (e.deltaY < 0 ? 1.3 : 0.77), 0.5, 200));
  };
  return (
    <ModelWrap viz={
      <div className="w-full h-full relative" style={{ cursor: isDragging.current ? "grabbing" : "grab" }}
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}>
        <canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />
      </div>
    } controls={
      <>
        <Slider label="Zoom" value={zoom} min={0.5} max={20} step={0.5} onChange={setZoom} unit="×" />
        <button onClick={() => { setZoom(1); setCx(-0.5); setCy(0); }}
          className="w-full rounded-lg px-3 py-1.5 text-xs border border-border text-muted-foreground hover:text-foreground">
          Reset View
        </button>
        <Stat label="Max iterations" value="80" />
        <p className="text-xs text-muted-foreground">Drag to pan · Scroll to zoom</p>
      </>
    } />
  );
}

// ── 3. Normal Distribution ───────────────────────────────────────────────────
export function NormalDistribution() {
  const [mean, setMean] = useState(0);
  const [sigma, setSigma] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const pad = { l: 50, r: 20, t: 20, b: 40 };
    const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
    drawAxes(ctx, pad.l, pad.t + ph, pw, ph, "x", "f(x)");
    const xMin = mean - 4 * sigma, xMax = mean + 4 * sigma;
    const pdf = (x: number) => (1 / (sigma * Math.sqrt(TAU))) * Math.exp(-0.5 * ((x - mean) / sigma) ** 2);
    const maxPdf = pdf(mean);
    const toCanvas = (x: number, y: number): [number, number] => [
      pad.l + ((x - xMin) / (xMax - xMin)) * pw,
      pad.t + ph - (y / maxPdf) * ph * 0.9,
    ];
    // fill ±1σ, ±2σ, ±3σ
    [[3, C_PRIMARY + "22"], [2, C_PRIMARY + "33"], [1, C_PRIMARY + "55"]].forEach(([k, col]) => {
      ctx.beginPath();
      const lo = mean - (k as number) * sigma, hi = mean + (k as number) * sigma;
      for (let x = lo; x <= hi; x += (hi - lo) / 100) {
        const [cx2, cy2] = toCanvas(x, pdf(x));
        x === lo ? ctx.moveTo(cx2, cy2) : ctx.lineTo(cx2, cy2);
      }
      const [rx, ] = toCanvas(hi, 0); const [lx, by] = toCanvas(lo, 0);
      ctx.lineTo(rx, by); ctx.lineTo(lx, by); ctx.closePath();
      ctx.fillStyle = col as string; ctx.fill();
    });
    // curve
    const pts: [number, number][] = [];
    for (let x = xMin; x <= xMax; x += (xMax - xMin) / 200) {
      pts.push(toCanvas(x, pdf(x)));
    }
    drawCurve(ctx, pts, C_PRIMARY, 2.5);
    // sigma lines
    [-3, -2, -1, 0, 1, 2, 3].forEach(k => {
      const [lx] = toCanvas(mean + k * sigma, 0);
      ctx.strokeStyle = k === 0 ? C_AMBER : C_GRID; ctx.lineWidth = k === 0 ? 1.5 : 1; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(lx, pad.t); ctx.lineTo(lx, pad.t + ph); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = k === 0 ? C_AMBER : C_DIM; ctx.font = "8px Inter,sans-serif"; ctx.textAlign = "center";
      ctx.fillText(`${(mean + k * sigma).toFixed(1)}`, lx, pad.t + ph + 14);
    });
    // Mean marker dot
    const [mx] = toCanvas(mean, pdf(mean));
    ctx.fillStyle = C_AMBER;
    ctx.beginPath(); ctx.arc(mx, toCanvas(mean, pdf(mean))[1], 5, 0, TAU); ctx.fill();
    ctx.fillStyle = C_FG; ctx.font = "10px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText(`μ=${mean.toFixed(1)}  σ=${sigma.toFixed(1)}  peak=${(1/(sigma*Math.sqrt(TAU))).toFixed(3)}`, W / 2, pad.t + 12);
  }, [mean, sigma]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={
      <>
        <Slider label="Mean (μ)" value={mean} min={-3} max={3} step={0.1} onChange={setMean} />
        <Slider label="Std Dev (σ)" value={sigma} min={0.3} max={3} step={0.1} onChange={setSigma} />
        <Stat label="68% within" value="±1σ" />
        <Stat label="95% within" value="±2σ" />
        <Stat label="99.7% within" value="±3σ" />
      </>
    } />
  );
}

// ── 4. Vector Calculus ───────────────────────────────────────────────────────
export function VectorCalculus() {
  const [field, setField] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fieldRef = useRef(field);
  useEffect(() => { fieldRef.current = field; }, [field]);
  const particleRef = useRef<{x:number;y:number} | null>(null);
  const trailRef = useRef<[number,number][]>([]);
  const fields = ["Uniform", "Radial (div)", "Curl (rotation)", "Saddle"];
  useRaf(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height, cx = W / 2, cy = H / 2;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const f = fieldRef.current;
    const step = 40;
    for (let x = step; x < W; x += step) {
      for (let y = step; y < H; y += step) {
        const dx = (x - cx) / (W / 2), dy = (y - cy) / (H / 2);
        let vx = 0, vy = 0;
        if (f === 0) { vx = 1; vy = 0; }
        else if (f === 1) { vx = dx; vy = dy; }
        else if (f === 2) { vx = -dy; vy = dx; }
        else { vx = dx; vy = -dy; }
        const mag = Math.sqrt(vx * vx + vy * vy);
        if (mag < 0.001) continue;
        const len = clamp(mag * 14, 5, 18);
        const nx = vx / mag, ny = vy / mag;
        const hue = (Math.atan2(vy, vx) / TAU + 1) % 1;
        ctx.strokeStyle = `hsl(${hue * 360},80%,60%)`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + nx * len, y + ny * len); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + nx * len, y + ny * len);
        ctx.lineTo(x + nx * len - ny * 4 - nx * 4, y + ny * len + nx * 4 - ny * 4);
        ctx.lineTo(x + nx * len + ny * 4 - nx * 4, y + ny * len - nx * 4 - ny * 4);
        ctx.fillStyle = `hsl(${hue * 360},80%,60%)`; ctx.fill();
      }
    }
    // Particle advection
    if (particleRef.current) {
      const {x, y} = particleRef.current;
      const dx = (x - cx) / (W / 2), dy = (y - cy) / (H / 2);
      let vx = 0, vy = 0;
      if (f === 0) { vx = 1; vy = 0; }
      else if (f === 1) { vx = dx; vy = dy; }
      else if (f === 2) { vx = -dy; vy = dx; }
      else { vx = dx; vy = -dy; }
      const mag = Math.sqrt(vx * vx + vy * vy) || 1;
      particleRef.current = {x: x + vx / mag * 2, y: y + vy / mag * 2};
      trailRef.current.push([x, y]);
      if (trailRef.current.length > 60) trailRef.current.shift();
      trailRef.current.forEach(([tx, ty], i) => {
        ctx.beginPath(); ctx.arc(tx, ty, 2, 0, TAU);
        ctx.fillStyle = `rgba(251,191,36,${i / trailRef.current.length})`; ctx.fill();
      });
      ctx.beginPath(); ctx.arc(particleRef.current.x, particleRef.current.y, 5, 0, TAU);
      ctx.fillStyle = C_AMBER; ctx.fill();
      if (x < 0 || x > W || y < 0 || y > H) { particleRef.current = null; trailRef.current = []; }
    }
    ctx.fillStyle = C_FG; ctx.font = "bold 12px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText(`${fields[f]} vector field`, cx, H - 15);
  }, true);
  return (
    <ModelWrap viz={
      <canvas ref={canvasRef} width={580} height={340} className="w-full h-full" style={{ cursor: "crosshair" }}
        onMouseDown={e => {
          const rect = canvasRef.current!.getBoundingClientRect();
          const sx = 580 / rect.width;
          particleRef.current = { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sx };
          trailRef.current = [];
        }} />
    } controls={
      <>
        <SectionLabel>Vector Field</SectionLabel>
        {fields.map((f, i) => (
          <button key={f} onClick={() => setField(i)}
            className={`w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors border ${i === field ? "bg-primary/20 text-primary border-primary/30" : "text-muted-foreground hover:text-foreground hover:bg-secondary border-transparent"}`}>
            {f}
          </button>
        ))}
        <Stat label="Divergence" value={field === 1 ? "∇·F > 0" : field === 2 ? "∇·F = 0" : "varies"} />
        <Stat label="Curl" value={field === 2 ? "|∇×F| > 0" : "0"} />
        <p className="text-xs text-muted-foreground mt-1">Click canvas to release a particle</p>
      </>
    } />
  );
}

// ── 5. Neural Networks ───────────────────────────────────────────────────────
export function NeuralNetworks() {
  const [layerCount, setLayerCount] = useState(2);
  const [hiddenSize, setHiddenSize] = useState(4);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tRef = useRef(0);
  useRaf((t) => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const L = [3, ...Array(layerCount).fill(hiddenSize), 2];
    const xGap = W / (L.length + 1);
    const nodePositions: [number, number][][] = L.map((count, li) => {
      const x = xGap * (li + 1);
      return Array.from({ length: count }, (_, ni) => {
        const y = (H / (count + 1)) * (ni + 1);
        return [x, y] as [number, number];
      });
    });
    // draw weights
    nodePositions.forEach((layer, li) => {
      if (li === L.length - 1) return;
      layer.forEach(([x1, y1]) => {
        nodePositions[li + 1].forEach(([x2, y2]) => {
          const activation = Math.sin(t * 2 + x1 * 0.1 + y2 * 0.05) * 0.5 + 0.5;
          ctx.strokeStyle = `rgba(91,127,239,${activation * 0.5})`;
          ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        });
      });
    });
    // draw nodes
    nodePositions.forEach((layer, li) => {
      layer.forEach(([x, y], ni) => {
        const activation = clamp(Math.sin(t * 1.5 + li * 0.8 + ni * 1.2) * 0.5 + 0.5, 0, 1);
        const r = 12;
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
        ctx.fillStyle = `rgba(91,127,239,${0.3 + activation * 0.7})`; ctx.fill();
        ctx.strokeStyle = C_PRIMARY; ctx.lineWidth = 1.5; ctx.stroke();
      });
    });
    ctx.fillStyle = C_DIM; ctx.font = "9px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText(["Input", ...Array(L.length - 2).fill("Hidden"), "Output"].join(" → "), W / 2, H - 10);
  }, true);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={
      <>
        <Slider label="Hidden Layers" value={layerCount} min={1} max={3} onChange={v => setLayerCount(v)} />
        <Slider label="Neurons/Layer" value={hiddenSize} min={2} max={6} onChange={setHiddenSize} />
        <Stat label="Architecture" value={[3, ...Array(layerCount).fill(hiddenSize), 2].join("→")} />
        <Stat label="Parameters" value={
          [3, ...Array(layerCount).fill(hiddenSize), 2].reduce((acc, n, i, arr) => i < arr.length - 1 ? acc + n * arr[i+1] : acc, 0) + ""
        } />
      </>
    } />
  );
}

// ── 6. Binary Search Trees ───────────────────────────────────────────────────
export function BinarySearchTrees() {
  const [values] = useState([50, 30, 70, 20, 40, 60, 80]);
  const [search, setSearch] = useState(40);
  const [searchPath, setSearchPath] = useState<number[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  function findPath(target: number) {
    const path: number[] = [];
    let node = 50;
    while (node !== undefined) {
      path.push(node);
      if (node === target) break;
      else if (target < node) { node = node === 50 ? 30 : node === 30 ? 20 : node === 70 ? 60 : 0; }
      else { node = node === 50 ? 70 : node === 30 ? 40 : node === 70 ? 80 : 0; }
      if (node === 0) break;
    }
    setSearchPath(path);
  }
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    // BST positions
    const positions: Record<number, [number, number]> = {
      50: [W / 2, 50], 30: [W / 2 - 120, 130], 70: [W / 2 + 120, 130],
      20: [W / 2 - 180, 210], 40: [W / 2 - 60, 210], 60: [W / 2 + 60, 210], 80: [W / 2 + 180, 210],
    };
    const edges: [number, number][] = [[50, 30], [50, 70], [30, 20], [30, 40], [70, 60], [70, 80]];
    edges.forEach(([p, c]) => {
      ctx.beginPath(); ctx.moveTo(...positions[p]); ctx.lineTo(...positions[c]);
      ctx.strokeStyle = C_GRID; ctx.lineWidth = 1.5; ctx.stroke();
    });
    values.forEach(v => {
      const [x, y] = positions[v];
      const inPath = searchPath.includes(v);
      ctx.beginPath(); ctx.arc(x, y, 18, 0, TAU);
      ctx.fillStyle = v === search && inPath ? C_GREEN : inPath ? C_AMBER : C_PRIMARY + "44"; ctx.fill();
      ctx.strokeStyle = inPath ? C_AMBER : C_DIM; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = C_FG; ctx.font = "bold 11px Inter,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(v + "", x, y);
    });
    ctx.fillStyle = C_DIM; ctx.font = "10px Inter,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.fillText(`Searching for ${search} — comparisons: ${searchPath.length}`, W / 2, H - 10);
  }, [searchPath, search]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={
      <>
        <SectionLabel>Search Value</SectionLabel>
        {values.map(v => (
          <button key={v} onClick={() => { setSearch(v); findPath(v); }}
            className={`w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors border ${v === search ? "bg-primary/20 text-primary border-primary/30" : "text-muted-foreground hover:text-foreground hover:bg-secondary border-transparent"}`}>
            {v}
          </button>
        ))}
        <Stat label="Tree height" value="3" />
      </>
    } />
  );
}

// ── 7. Graph Theory ──────────────────────────────────────────────────────────
export function GraphTheory() {
  const [algo, setAlgo] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const algos = ["Undirected", "Directed", "Weighted", "Bipartite"];
  const nodes = [
    { id: 0, x: 0.2, y: 0.3 }, { id: 1, x: 0.5, y: 0.15 }, { id: 2, x: 0.8, y: 0.3 },
    { id: 3, x: 0.15, y: 0.7 }, { id: 4, x: 0.5, y: 0.8 }, { id: 5, x: 0.85, y: 0.7 },
  ];
  const edges = [[0, 1, 4], [1, 2, 3], [0, 3, 2], [1, 4, 5], [2, 5, 1], [3, 4, 6], [4, 5, 3], [0, 2, 7]];
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const bipartite = algo === 3;
    edges.forEach(([a, b, w]) => {
      const n1 = nodes[a], n2 = nodes[b];
      const x1 = n1.x * W, y1 = n1.y * H, x2 = n2.x * W, y2 = n2.y * H;
      ctx.strokeStyle = C_PRIMARY; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      if (algo === 1) {
        // arrowhead
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
        ctx.beginPath(); ctx.moveTo(mx, my);
        ctx.lineTo(mx - 10 * Math.cos(angle - 0.4), my - 10 * Math.sin(angle - 0.4));
        ctx.lineTo(mx - 10 * Math.cos(angle + 0.4), my - 10 * Math.sin(angle + 0.4));
        ctx.closePath(); ctx.fillStyle = C_PRIMARY; ctx.fill();
      }
      if (algo === 2) {
        ctx.fillStyle = C_AMBER; ctx.font = "9px Inter,sans-serif"; ctx.textAlign = "center";
        ctx.fillText(w + "", (x1 + x2) / 2, (y1 + y2) / 2 - 5);
      }
    });
    nodes.forEach((n, i) => {
      const x = n.x * W, y = n.y * H;
      ctx.beginPath(); ctx.arc(x, y, 16, 0, TAU);
      const color = bipartite ? (i < 3 ? C_CYAN : C_AMBER) : C_PRIMARY;
      ctx.fillStyle = color + "44"; ctx.fill();
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = C_FG; ctx.font = "bold 10px Inter,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(n.id + "", x, y);
    });
    ctx.fillStyle = C_DIM; ctx.font = "10px Inter,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.fillText(`${algos[algo]} graph — V=${nodes.length}, E=${edges.length}`, W / 2, H - 10);
  }, [algo]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={
      <>
        <SectionLabel>Graph Type</SectionLabel>
        {algos.map((a, i) => (
          <button key={a} onClick={() => setAlgo(i)}
            className={`w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors border ${i === algo ? "bg-primary/20 text-primary border-primary/30" : "text-muted-foreground hover:text-foreground hover:bg-secondary border-transparent"}`}>
            {a}
          </button>
        ))}
        <Stat label="Vertices" value={nodes.length + ""} />
        <Stat label="Edges" value={edges.length + ""} />
      </>
    } />
  );
}

// ── 8. Markov Chains ─────────────────────────────────────────────────────────
export function MarkovChains() {
  const [state, setState] = useState(0);
  const [steps, setSteps] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateNames = ["Sunny", "Cloudy", "Rainy"];
  const transitions = [[0.7, 0.2, 0.1], [0.3, 0.4, 0.3], [0.2, 0.3, 0.5]];
  const colors = [C_AMBER, C_DIM, C_PRIMARY];
  function step() {
    const probs = transitions[state];
    const r = Math.random();
    let cum = 0;
    for (let i = 0; i < probs.length; i++) {
      cum += probs[i];
      if (r < cum) { setState(i); break; }
    }
    setSteps(s => s + 1);
  }
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2;
    const r2 = 100;
    const statePos = stateNames.map((_, i) => [cx + r2 * Math.cos(TAU * i / 3 - Math.PI / 2), cy + r2 * Math.sin(TAU * i / 3 - Math.PI / 2)]);
    // edges
    transitions.forEach((row, i) => {
      row.forEach((p, j) => {
        if (p === 0) return;
        const [x1, y1] = statePos[i], [x2, y2] = statePos[j];
        const mid = i === j;
        if (mid) {
          ctx.beginPath(); ctx.arc(x1, y1 - 35, 20, 0, TAU);
          ctx.strokeStyle = `rgba(255,255,255,${p})`; ctx.lineWidth = p * 3; ctx.stroke();
        } else {
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
          ctx.strokeStyle = `rgba(255,255,255,${p * 0.8})`; ctx.lineWidth = p * 3; ctx.stroke();
        }
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
        ctx.fillStyle = C_DIM; ctx.font = "8px Inter,sans-serif"; ctx.textAlign = "center";
        ctx.fillText(p.toFixed(1), mid ? x1 : mx, mid ? y1 - 58 : my - 5);
      });
    });
    stateNames.forEach((name, i) => {
      const [x, y] = statePos[i];
      ctx.beginPath(); ctx.arc(x, y, 28, 0, TAU);
      ctx.fillStyle = i === state ? colors[i] : colors[i] + "44"; ctx.fill();
      ctx.strokeStyle = colors[i]; ctx.lineWidth = i === state ? 3 : 1.5; ctx.stroke();
      ctx.fillStyle = C_FG; ctx.font = `${i === state ? "bold " : ""}10px Inter,sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(name, x, y);
    });
    ctx.fillStyle = C_DIM; ctx.font = "10px Inter,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.fillText(`Steps: ${steps}`, W / 2, H - 10);
  }, [state, steps]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={
      <>
        <button onClick={step} className="w-full rounded-lg px-3 py-2 text-xs font-semibold bg-primary/20 text-primary border border-primary/30">
          Step →
        </button>
        <button onClick={() => { setState(0); setSteps(0); }}
          className="w-full rounded-lg px-3 py-2 text-xs border border-border text-muted-foreground">
          Reset
        </button>
        <Stat label="Current state" value={stateNames[state]} />
        <Stat label="Steps taken" value={steps + ""} />
        <SectionLabel>Transitions</SectionLabel>
        {stateNames.map((name, i) => <Stat key={name} label={`${name} →`} value={transitions[i].join(" / ")} />)}
      </>
    } />
  );
}

// ── 9. Game Theory ───────────────────────────────────────────────────────────
export function GameTheory() {
  const [p1, setP1] = useState(0);
  const [p2, setP2] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const games = [
    { name: "Prisoner's Dilemma", p1: ["Cooperate", "Defect"], p2: ["Cooperate", "Defect"],
      matrix: [[[3, 3], [0, 5]], [[5, 0], [1, 1]]], nash: [1, 1] },
    { name: "Battle of Sexes", p1: ["Opera", "Football"], p2: ["Opera", "Football"],
      matrix: [[[2, 1], [0, 0]], [[0, 0], [1, 2]]], nash: [0, 0] },
    { name: "Stag Hunt", p1: ["Stag", "Hare"], p2: ["Stag", "Hare"],
      matrix: [[[4, 4], [0, 3]], [[3, 0], [2, 2]]], nash: [0, 0] },
  ];
  const [gameIdx, setGameIdx] = useState(0);
  const game = games[gameIdx];
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height, cx = W / 2, cy = H / 2;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const cw = 100, ch = 70;
    const startX = cx - cw, startY = cy - ch;
    // headers
    ctx.fillStyle = C_DIM; ctx.font = "10px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText("Player 2", cx + 50, startY - 40);
    ctx.save(); ctx.translate(startX - 40, cy); ctx.rotate(-Math.PI / 2);
    ctx.fillText("Player 1", 0, 0); ctx.restore();
    game.p2.forEach((label, i) => ctx.fillText(label, startX + i * cw + cw / 2, startY - 10));
    game.p1.forEach((label, i) => {
      ctx.save(); ctx.translate(startX - 10, startY + i * ch + ch / 2); ctx.rotate(-Math.PI / 2);
      ctx.fillText(label, 0, 0); ctx.restore();
    });
    game.matrix.forEach((row, i) => {
      row.forEach(([a, b], j) => {
        const x = startX + j * cw, y = startY + i * ch;
        const isNash = i === game.nash[0] && j === game.nash[1];
        const selected = i === p1 && j === p2;
        ctx.fillStyle = selected ? C_PRIMARY + "44" : isNash ? C_GREEN + "22" : "transparent";
        ctx.fillRect(x, y, cw, ch);
        ctx.strokeStyle = isNash ? C_GREEN : C_DIM; ctx.lineWidth = isNash ? 2 : 1;
        ctx.strokeRect(x, y, cw, ch);
        ctx.fillStyle = C_GREEN; ctx.font = "bold 12px Inter,sans-serif"; ctx.textAlign = "center";
        ctx.fillText(a + "", x + 30, y + ch / 2 + 4);
        ctx.fillStyle = C_RED; ctx.fillText(b + "", x + 70, y + ch / 2 + 4);
      });
    });
    const payoff = game.matrix[p1][p2];
    const isNash = p1 === game.nash[0] && p2 === game.nash[1];
    // payoff bars
    const bx = cx - 60, by = H - 45;
    ctx.fillStyle = C_GREEN; ctx.fillRect(bx, by - payoff[0] * 8, 20, payoff[0] * 8);
    ctx.fillStyle = C_RED; ctx.fillRect(bx + 30, by - payoff[1] * 8, 20, payoff[1] * 8);
    ctx.fillStyle = C_DIM; ctx.font = "9px Inter,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.fillText("P1", bx + 10, by + 12); ctx.fillText("P2", bx + 40, by + 12);
    ctx.fillStyle = isNash ? C_GREEN : C_DIM; ctx.font = "10px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText(isNash ? "Nash Equilibrium!" : `Payoff: P1=${payoff[0]}, P2=${payoff[1]}`, cx + 60, H - 10);
  }, [p1, p2, gameIdx]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={
      <>
        {games.map((g, i) => (
          <button key={g.name} onClick={() => setGameIdx(i)}
            className={`w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors border ${i === gameIdx ? "bg-primary/20 text-primary border-primary/30" : "text-muted-foreground hover:text-foreground hover:bg-secondary border-transparent"}`}>
            {g.name}
          </button>
        ))}
        <SectionLabel>Player 1 Strategy</SectionLabel>
        {game.p1.map((s, i) => (
          <button key={s} onClick={() => setP1(i)}
            className={`w-full rounded-lg px-2 py-1 text-xs border transition-colors ${i === p1 ? "bg-green-500/20 text-green-400 border-green-500/30" : "border-transparent text-muted-foreground"}`}>
            {s}
          </button>
        ))}
        <SectionLabel>Player 2 Strategy</SectionLabel>
        {game.p2.map((s, i) => (
          <button key={s} onClick={() => setP2(i)}
            className={`w-full rounded-lg px-2 py-1 text-xs border transition-colors ${i === p2 ? "bg-red-500/20 text-red-400 border-red-500/30" : "border-transparent text-muted-foreground"}`}>
            {s}
          </button>
        ))}
      </>
    } />
  );
}

// ── 10. Chaos Theory ─────────────────────────────────────────────────────────
export function ChaosTheory() {
  const [r, setR] = useState(3.7);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const pad = { l: 50, r: 20, t: 20, b: 40 };
    const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
    drawAxes(ctx, pad.l, pad.t + ph, pw, ph, "Generation", "Population x");
    // logistic map time series
    let x = 0.5;
    const pts: [number, number][] = [];
    for (let i = 0; i < 100; i++) {
      x = r * x * (1 - x);
      pts.push([pad.l + (i / 99) * pw, pad.t + ph - x * ph]);
    }
    drawCurve(ctx, pts, C_PRIMARY, 1.5);
    // two trajectories differing by tiny amount
    let x2 = 0.5 + 1e-6;
    const pts2: [number, number][] = [];
    for (let i = 0; i < 100; i++) {
      x2 = r * x2 * (1 - x2);
      pts2.push([pad.l + (i / 99) * pw, pad.t + ph - x2 * ph]);
    }
    drawCurve(ctx, pts2, C_RED + "88", 1.5);
    ctx.fillStyle = C_DIM; ctx.font = "9px Inter,sans-serif"; ctx.textAlign = "left";
    ctx.fillText(`r=${r}  ${r < 3 ? "stable" : r < 3.45 ? "period-2" : r < 3.57 ? "period-4" : "chaos"}`, pad.l + 5, pad.t + 12);
    ctx.fillStyle = C_RED + "88"; ctx.fillText("x₀+ε", pad.l + 5, pad.t + 24);
  }, [r]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={
      <>
        <Slider label="Growth rate (r)" value={r} min={1} max={4} step={0.01} onChange={setR} />
        <Stat label="r < 3" value="Stable fixed point" />
        <Stat label="r = 3.45" value="Period-2 bifurcation" />
        <Stat label="r > 3.57" value="Chaos" />
        <Stat label="Sensitivity" value="Butterfly effect" />
      </>
    } />
  );
}

// ── 11. Spherical Trig ───────────────────────────────────────────────────────
export function SphericalTrig() {
  const [lat1, setLat1] = useState(51.5);
  const [lon1, setLon1] = useState(-0.1);
  const [lat2, setLat2] = useState(40.7);
  const [lon2, setLon2] = useState(-74);
  const [rotating, setRotating] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotRef = useRef(0);
  const lastTRef = useRef(0);
  const rotatingRef = useRef(true);
  useEffect(() => { rotatingRef.current = rotating; }, [rotating]);
  useRaf((t) => {
    const dt = t - lastTRef.current; lastTRef.current = t;
    if (rotatingRef.current) rotRef.current += dt * 0.2;
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height, cx = W / 2, cy = H / 2;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const R = 120;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU);
    ctx.fillStyle = "#0a1a3a"; ctx.fill();
    ctx.strokeStyle = C_PRIMARY + "44"; ctx.lineWidth = 1; ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const ang = TAU * i / 8 + rotRef.current;
      ctx.beginPath(); ctx.ellipse(cx, cy, R * Math.abs(Math.cos(ang)), R, ang, 0, TAU);
      ctx.strokeStyle = C_GRID; ctx.lineWidth = 0.5; ctx.stroke();
    }
    const toXY = (lat: number, lon: number): [number, number] => {
      const phi = lat * Math.PI / 180, theta = lon * Math.PI / 180 + rotRef.current;
      const x = R * Math.cos(phi) * Math.cos(theta);
      const y = -R * Math.sin(phi);
      return [cx + x, cy + y];
    };
    const [p1x, p1y] = toXY(lat1, lon1), [p2x, p2y] = toXY(lat2, lon2);
    ctx.beginPath(); ctx.arc(p1x, p1y, 6, 0, TAU); ctx.fillStyle = C_GREEN; ctx.fill();
    ctx.beginPath(); ctx.arc(p2x, p2y, 6, 0, TAU); ctx.fillStyle = C_RED; ctx.fill();
    ctx.setLineDash([4, 3]); ctx.strokeStyle = C_AMBER; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(p1x, p1y); ctx.lineTo(p2x, p2y); ctx.stroke();
    ctx.setLineDash([]);
    const dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
    const dist = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    ctx.fillStyle = C_AMBER; ctx.font = "10px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText(`Great-circle: ${dist.toFixed(0)} km`, cx, H - 15);
    ctx.fillStyle = C_GREEN; ctx.fillText("A", p1x, p1y - 12);
    ctx.fillStyle = C_RED; ctx.fillText("B", p2x, p2y - 12);
  }, true);
  const dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
  const aa = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  const dist = 6371 * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1-aa));
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={
      <>
        <SectionLabel>Point A</SectionLabel>
        <Slider label="Lat A" value={lat1} min={-80} max={80} step={1} onChange={setLat1} unit="°" />
        <Slider label="Lon A" value={lon1} min={-180} max={180} step={1} onChange={setLon1} unit="°" />
        <SectionLabel>Point B</SectionLabel>
        <Slider label="Lat B" value={lat2} min={-80} max={80} step={1} onChange={setLat2} unit="°" />
        <Slider label="Lon B" value={lon2} min={-180} max={180} step={1} onChange={setLon2} unit="°" />
        <Stat label="Distance" value={`${dist.toFixed(0)} km`} />
        <button onClick={() => setRotating(r => !r)}
          className="w-full rounded-lg px-2 py-1.5 text-xs border border-border text-muted-foreground hover:text-foreground">
          {rotating ? "Pause rotation" : "Resume rotation"}
        </button>
      </>
    } />
  );
}

// ── 12. Encryption ───────────────────────────────────────────────────────────
function modInverseRSA(e: number, phi: number): number {
  let [old_r, r] = [e, phi]; let [old_s, s] = [1, 0];
  while (r !== 0) { const q = Math.floor(old_r / r); [old_r, r] = [r, old_r - q * r]; [old_s, s] = [s, old_s - q * s]; }
  return ((old_s % phi) + phi) % phi;
}
function modPowRSA(base: number, exp: number, mod: number): number {
  let result = 1; base %= mod;
  while (exp > 0) { if (exp & 1) result = result * base % mod; exp >>= 1; base = base * base % mod; }
  return result;
}

export function Encryption() {
  const [mode, setMode] = useState(0);
  const [shift, setShift] = useState(3);
  const [bits, setBits] = useState(8);
  const [rsaP, setRsaP] = useState(11);
  const [rsaQ, setRsaQ] = useState(13);
  const [rsaMsg, setRsaMsg] = useState(5);
  const plaintext = "HELLO";
  const modes = ["Caesar Cipher", "Binary / ASCII", "RSA concept"];
  const caesar = (s: string, k: number) => s.split("").map(c => String.fromCharCode(((c.charCodeAt(0) - 65 + k) % 26) + 65)).join("");
  const encrypted = mode === 0 ? caesar(plaintext, shift) : plaintext;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height, cx = W / 2, cy = H / 2;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    if (mode === 0) {
      // Caesar cipher wheel
      ctx.beginPath(); ctx.arc(cx, cy, 100, 0, TAU); ctx.strokeStyle = C_DIM; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, 68, 0, TAU); ctx.stroke();
      for (let i = 0; i < 26; i++) {
        const a = (TAU * i / 26) - Math.PI / 2;
        const outer = { x: cx + 88 * Math.cos(a), y: cy + 88 * Math.sin(a) };
        const inner = { x: cx + 55 * Math.cos(a - (shift / 26) * TAU), y: cy + 55 * Math.sin(a - (shift / 26) * TAU) };
        const letter = String.fromCharCode(65 + i);
        ctx.fillStyle = plaintext.includes(letter) ? C_AMBER : C_DIM;
        ctx.font = "10px Inter,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(letter, outer.x, outer.y);
        ctx.fillStyle = C_GREEN; ctx.fillText(caesar(letter, shift), inner.x, inner.y);
      }
      ctx.fillStyle = C_AMBER; ctx.font = "bold 13px Inter,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(plaintext, cx, cy - 14);
      ctx.fillStyle = C_GREEN;
      ctx.fillText(encrypted, cx, cy + 14);
    } else if (mode === 1) {
      plaintext.split("").forEach((c, i) => {
        const x = 50 + i * 90, y = cy - 30;
        ctx.fillStyle = C_AMBER; ctx.font = "bold 16px Inter,sans-serif"; ctx.textAlign = "center";
        ctx.fillText(c, x, y);
        ctx.fillStyle = C_DIM; ctx.font = "9px Inter,sans-serif";
        ctx.fillText(c.charCodeAt(0) + "", x, y + 20);
        const bin = c.charCodeAt(0).toString(2).padStart(8, "0").slice(0, bits);
        bin.split("").forEach((b, bi) => {
          ctx.fillStyle = b === "1" ? C_GREEN : C_PRIMARY + "44";
          ctx.font = "8px Inter,sans-serif"; ctx.textAlign = "center";
          ctx.fillText(b, x - 28 + bi * 8, y + 40);
        });
      });
    } else {
      const n = rsaP * rsaQ;
      const phi = (rsaP - 1) * (rsaQ - 1);
      const rsaE = 7;
      const d = modInverseRSA(rsaE, phi);
      const C = modPowRSA(rsaMsg, rsaE, n);
      const M_dec = modPowRSA(C, d, n);
      const steps = [
        {label: "n = p × q", value: `${rsaP} × ${rsaQ} = ${n}`, color: C_CYAN},
        {label: "φ(n) = (p-1)(q-1)", value: `${rsaP-1} × ${rsaQ-1} = ${phi}`, color: C_DIM},
        {label: "Public key e", value: `${rsaE}`, color: C_AMBER},
        {label: "Private key d", value: `${d}`, color: C_RED},
        {label: `Encrypt: M^e mod n`, value: `${rsaMsg}^${rsaE} mod ${n} = ${C}`, color: C_GREEN},
        {label: `Decrypt: C^d mod n`, value: `${C}^${d} mod ${n} = ${M_dec}`, color: C_PRIMARY},
      ];
      steps.forEach((s, i) => {
        ctx.fillStyle = s.color; ctx.font = "bold 10px Inter,sans-serif"; ctx.textAlign = "left";
        ctx.fillText(s.label + ":", 40, 45 + i * 42);
        ctx.fillStyle = C_FG; ctx.font = "12px Inter,sans-serif";
        ctx.fillText(s.value, 40, 62 + i * 42);
      });
    }
  }, [mode, shift, bits, rsaP, rsaQ, rsaMsg]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={
      <>
        <SectionLabel>Method</SectionLabel>
        {modes.map((m, i) => (
          <button key={m} onClick={() => setMode(i)}
            className={`w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors border ${i === mode ? "bg-primary/20 text-primary border-primary/30" : "text-muted-foreground hover:text-foreground hover:bg-secondary border-transparent"}`}>
            {m}
          </button>
        ))}
        {mode === 0 && <Slider label="Shift key" value={shift} min={1} max={25} onChange={setShift} />}
        {mode === 1 && <Slider label="Bits shown" value={bits} min={4} max={8} onChange={setBits} />}
        {mode === 2 && <>
          <Slider label="Prime p" value={rsaP} min={2} max={23} step={1} onChange={setRsaP} />
          <Slider label="Prime q" value={rsaQ} min={2} max={23} step={1} onChange={setRsaQ} />
          <Slider label="Message M" value={rsaMsg} min={1} max={20} step={1} onChange={setRsaMsg} />
          <Stat label="Public exponent e" value="7" />
        </>}
        {mode === 0 && <Stat label="Ciphertext" value={encrypted} />}
      </>
    } />
  );
}

// ── 13. Big-O Notation ───────────────────────────────────────────────────────
export function BigO() {
  const [n, setN] = useState(20);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const complexities = [
    { name: "O(1)", fn: () => 1, color: C_GREEN },
    { name: "O(log n)", fn: (n: number) => Math.log2(n), color: C_CYAN },
    { name: "O(n)", fn: (n: number) => n, color: C_PRIMARY },
    { name: "O(n log n)", fn: (n: number) => n * Math.log2(n), color: C_AMBER },
    { name: "O(n²)", fn: (n: number) => n * n, color: C_RED },
    { name: "O(2ⁿ)", fn: (n: number) => Math.min(Math.pow(2, n), 9999), color: C_PURPLE },
  ];
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const pad = { l: 50, r: 20, t: 20, b: 40 };
    const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
    drawAxes(ctx, pad.l, pad.t + ph, pw, ph, "n (input size)", "Operations");
    const maxY = complexities[4].fn(n) * 1.2;
    complexities.forEach(({ fn, color }) => {
      const pts: [number, number][] = [];
      for (let i = 1; i <= n; i++) {
        const v = fn(i);
        pts.push([pad.l + (i / n) * pw, pad.t + ph - clamp(v / maxY, 0, 1) * ph]);
      }
      drawCurve(ctx, pts, color, 2);
    });
    // legend
    complexities.forEach(({ name, color }, i) => {
      const lx = pad.l + 5, ly = pad.t + 12 + i * 16;
      ctx.fillStyle = color; ctx.fillRect(lx, ly - 5, 20, 3);
      ctx.font = "9px Inter,sans-serif"; ctx.textAlign = "left";
      ctx.fillText(name, lx + 24, ly);
    });
    // n marker
    const mx = pad.l + pw;
    ctx.strokeStyle = C_AMBER; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(mx, pad.t); ctx.lineTo(mx, pad.t + ph); ctx.stroke();
    ctx.setLineDash([]);
  }, [n]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={
      <>
        <Slider label="Input size n" value={n} min={5} max={30} onChange={setN} />
        {complexities.map(({ name, fn, color }) => (
          <Stat key={name} label={name} value={fn(n).toFixed(0)} />
        ))}
      </>
    } />
  );
}

// ── 14. Blockchain ───────────────────────────────────────────────────────────
export function Blockchain() {
  const [blocks, setBlocks] = useState([
    { id: 0, data: "Genesis", prev: "0000", hash: "a1b2" },
    { id: 1, data: "Tx: A→B 5", prev: "a1b2", hash: "c3d4" },
    { id: 2, data: "Tx: B→C 2", prev: "c3d4", hash: "e5f6" },
  ]);
  const [tampered, setTampered] = useState<number | null>(null);
  const [blockZoom, setBlockZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDragging = useRef(false);
  const lastMouseX = useRef(0);
  function addBlock() {
    setBlocks(b => {
      const last = b[b.length - 1];
      return [...b, { id: last.id + 1, data: `Tx: block ${last.id + 1}`, prev: last.hash, hash: Math.random().toString(36).slice(2, 6) }];
    });
    setTampered(null);
  }
  function tamper(i: number) {
    setTampered(i);
  }
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height, cy = H / 2;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(panX, 0); ctx.scale(blockZoom, 1);
    const bw = 110, bh = 100, gap = 30;
    const total = blocks.length;
    const startX = W / 2 - (total * (bw + gap) - gap) / 2;
    blocks.forEach((bl, i) => {
      const x = startX + i * (bw + gap);
      const y = cy - bh / 2;
      const isTampered = tampered !== null && i >= tampered;
      ctx.fillStyle = isTampered ? C_RED + "22" : C_PRIMARY + "22"; ctx.fillRect(x, y, bw, bh);
      ctx.strokeStyle = isTampered ? C_RED : C_PRIMARY; ctx.lineWidth = 2; ctx.strokeRect(x, y, bw, bh);
      // chain link
      if (i > 0) {
        ctx.strokeStyle = isTampered ? C_RED : C_DIM; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x - gap, cy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - gap, cy - 5); ctx.lineTo(x - gap, cy + 5); ctx.stroke();
      }
      ctx.fillStyle = C_FG; ctx.font = "bold 9px Inter,sans-serif"; ctx.textAlign = "center";
      ctx.fillText(`Block ${bl.id}`, x + bw / 2, y + 14);
      ctx.fillStyle = C_DIM; ctx.font = "8px Inter,sans-serif";
      ctx.fillText(bl.data, x + bw / 2, y + 30);
      ctx.fillStyle = C_AMBER;
      ctx.fillText(`Hash: ${isTampered ? "??????" : bl.hash}`, x + bw / 2, y + 50);
      ctx.fillStyle = C_GREEN;
      ctx.fillText(`Prev: ${bl.prev}`, x + bw / 2, y + 66);
    });
    ctx.restore();
    if (tampered !== null) {
      ctx.fillStyle = C_RED; ctx.font = "10px Inter,sans-serif"; ctx.textAlign = "center";
      ctx.fillText(`Block ${tampered} tampered — chain invalidated from here`, W / 2, H - 15);
    }
  }, [blocks, tampered, blockZoom, panX]);
  return (
    <ModelWrap viz={
      <div className="w-full h-full relative"
        onMouseDown={e => { isDragging.current = true; lastMouseX.current = e.clientX; }}
        onMouseMove={e => { if (!isDragging.current) return; const dx = e.clientX - lastMouseX.current; lastMouseX.current = e.clientX; setPanX(p => p + dx); }}
        onMouseUp={() => { isDragging.current = false; }}
        onMouseLeave={() => { isDragging.current = false; }}
        style={{ cursor: "grab" }}>
        <canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />
      </div>
    } controls={
      <>
        <button onClick={addBlock}
          className="w-full rounded-lg px-3 py-2 text-xs font-semibold bg-primary/20 text-primary border border-primary/30">
          + Add Block
        </button>
        <Slider label="Zoom" value={blockZoom} min={0.4} max={2} step={0.1} onChange={setBlockZoom} unit="×" />
        <div className="flex gap-1.5">
          <button onClick={() => setPanX(p => p + 60)} className="flex-1 rounded px-2 py-1 text-xs border border-border text-muted-foreground">← Pan</button>
          <button onClick={() => setPanX(p => p - 60)} className="flex-1 rounded px-2 py-1 text-xs border border-border text-muted-foreground">Pan →</button>
        </div>
        <SectionLabel>Tamper Block</SectionLabel>
        {blocks.map((b, i) => (
          <button key={b.id} onClick={() => tamper(i)}
            className={`w-full rounded-lg px-2 py-1 text-xs border transition-colors ${tampered === i ? "bg-red-500/20 text-red-400 border-red-500/30" : "border-border text-muted-foreground"}`}>
            Block {b.id}
          </button>
        ))}
        <button onClick={() => setTampered(null)}
          className="w-full rounded-lg px-3 py-2 text-xs border border-border text-muted-foreground">
          Restore chain
        </button>
      </>
    } />
  );
}
