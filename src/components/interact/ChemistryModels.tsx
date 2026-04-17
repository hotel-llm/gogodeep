import { useEffect, useRef, useState } from "react";
import {
  useRaf, ModelWrap, Slider, Stat, SectionLabel, StepNav,
  C_BG, C_FG, C_DIM, C_GRID, C_PRIMARY, C_GREEN, C_RED, C_AMBER, C_PURPLE, C_CYAN,
  TAU, clamp, lerp, drawAxes, drawCurve,
} from "./shared";

// ── 1. Bohr Model ─────────────────────────────────────────────────────────────
export function BohrModel() {
  const [element, setElement] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const elements = [
    { name: "Hydrogen", shells: [1] },
    { name: "Helium", shells: [2] },
    { name: "Carbon", shells: [2, 4] },
    { name: "Oxygen", shells: [2, 6] },
    { name: "Sodium", shells: [2, 8, 1] },
    { name: "Chlorine", shells: [2, 8, 7] },
  ];
  const el = elements[element];
  const tRef = useRef(0);
  useRaf((t) => {
    tRef.current = t;
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height, cx = W / 2, cy = H / 2;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    // nucleus
    ctx.beginPath(); ctx.arc(cx, cy, 18, 0, TAU);
    ctx.fillStyle = C_PRIMARY; ctx.fill();
    ctx.fillStyle = C_FG; ctx.font = "bold 11px Inter,sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(el.shells.reduce((a, b) => a + b, 0) + "", cx, cy);
    // shells
    el.shells.forEach((count, si) => {
      const r = 45 + si * 42;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU);
      ctx.strokeStyle = C_GRID; ctx.lineWidth = 1; ctx.stroke();
      for (let i = 0; i < count; i++) {
        const angle = TAU * i / count + t * (1 / (si + 1));
        const ex = cx + r * Math.cos(angle), ey = cy + r * Math.sin(angle);
        ctx.beginPath(); ctx.arc(ex, ey, 5, 0, TAU);
        ctx.fillStyle = C_CYAN; ctx.fill();
      }
    });
  }, true);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={
      <>
        <SectionLabel>Element</SectionLabel>
        {elements.map((e, i) => (
          <button key={e.name} onClick={() => setElement(i)}
            className={`w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors border ${i === element ? "bg-primary/20 text-primary border-primary/30" : "text-muted-foreground hover:text-foreground hover:bg-secondary border-transparent"}`}>
            {e.name}
          </button>
        ))}
        <Stat label="Electrons" value={el.shells.reduce((a, b) => a + b, 0) + ""} />
        <Stat label="Shells" value={el.shells.length + ""} />
      </>
    } />
  );
}

// ── 2. VSEPR ─────────────────────────────────────────────────────────────────
export function VSEPR() {
  const [shape, setShape] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shapes = [
    { name: "Linear (CO₂)", bonds: 2, lone: 0, angle: 180 },
    { name: "Bent (H₂O)", bonds: 2, lone: 2, angle: 104.5 },
    { name: "Trigonal Planar (BF₃)", bonds: 3, lone: 0, angle: 120 },
    { name: "Tetrahedral (CH₄)", bonds: 4, lone: 0, angle: 109.5 },
    { name: "Pyramidal (NH₃)", bonds: 3, lone: 1, angle: 107 },
    { name: "Octahedral (SF₆)", bonds: 6, lone: 0, angle: 90 },
  ];
  const s = shapes[shape];
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height, cx = W / 2, cy = H / 2;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const r = 90;
    const total = s.bonds + s.lone;
    for (let i = 0; i < total; i++) {
      const angle = (TAU * i / total) - Math.PI / 2;
      const x = cx + r * Math.cos(angle), y = cy + r * Math.sin(angle);
      if (i < s.bonds) {
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y);
        ctx.strokeStyle = C_FG; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, 10, 0, TAU);
        ctx.fillStyle = C_PRIMARY; ctx.fill();
        ctx.fillStyle = C_FG; ctx.font = "9px Inter,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("X", x, y);
      } else {
        ctx.beginPath(); ctx.arc(x, y, 8, 0, TAU);
        ctx.fillStyle = C_AMBER + "60"; ctx.fill();
        ctx.fillStyle = C_AMBER; ctx.font = "8px Inter,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("LP", x, y);
      }
    }
    ctx.beginPath(); ctx.arc(cx, cy, 14, 0, TAU);
    ctx.fillStyle = C_GREEN; ctx.fill();
    ctx.fillStyle = C_BG; ctx.font = "bold 9px Inter,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("M", cx, cy);
    ctx.fillStyle = C_DIM; ctx.font = "11px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText(`Bond angle: ${s.angle}°`, cx, H - 20);
  }, [shape]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={
      <>
        <SectionLabel>Molecule Shape</SectionLabel>
        {shapes.map((sh, i) => (
          <button key={sh.name} onClick={() => setShape(i)}
            className={`w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors border ${i === shape ? "bg-primary/20 text-primary border-primary/30" : "text-muted-foreground hover:text-foreground hover:bg-secondary border-transparent"}`}>
            {sh.name}
          </button>
        ))}
      </>
    } />
  );
}

// ── 3. Crystal Lattice ───────────────────────────────────────────────────────
export function CrystalLattice() {
  const [lattice, setLattice] = useState(0);
  const [angle, setAngle] = useState(30);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lattices = ["Simple Cubic", "BCC", "FCC", "Diamond"];
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height, cx = W / 2, cy = H / 2;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const a = angle * Math.PI / 180;
    const s = 80;
    // isometric projection
    const proj = (x: number, y: number, z: number): [number, number] => [
      cx + (x - z) * Math.cos(a) * s,
      cy + (x + z) * Math.sin(a) * s / 2 - y * s * 0.8,
    ];
    const corners: [number, number, number][] = [[0,0,0],[1,0,0],[1,0,1],[0,0,1],[0,1,0],[1,1,0],[1,1,1],[0,1,1]];
    const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
    edges.forEach(([a,b]) => {
      const [x1,y1] = proj(...corners[a]), [x2,y2] = proj(...corners[b]);
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2);
      ctx.strokeStyle = C_GRID; ctx.lineWidth = 1.5; ctx.stroke();
    });
    const draw = (p: [number,number,number], r: number, c: string) => {
      const [x,y] = proj(...p);
      ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.fillStyle = c; ctx.fill();
    };
    corners.forEach(c => draw(c, 8, C_PRIMARY));
    if (lattice === 1 || lattice === 2) draw([0.5,0.5,0.5], 9, C_AMBER);
    if (lattice === 2) {
      [[0.5,0,0.5],[0.5,1,0.5],[0,0.5,0.5],[1,0.5,0.5],[0.5,0.5,0],[0.5,0.5,1]].forEach(p=>draw(p as [number,number,number],7,C_GREEN));
    }
    if (lattice === 3) {
      [[0.25,0.25,0.25],[0.75,0.75,0.25],[0.75,0.25,0.75],[0.25,0.75,0.75]].forEach(p=>draw(p as [number,number,number],7,C_CYAN));
    }
    ctx.fillStyle = C_DIM; ctx.font = "11px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText(lattices[lattice], cx, H - 15);
  }, [lattice, angle]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={
      <>
        <SectionLabel>Lattice Type</SectionLabel>
        {lattices.map((l, i) => (
          <button key={l} onClick={() => setLattice(i)}
            className={`w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors border ${i === lattice ? "bg-primary/20 text-primary border-primary/30" : "text-muted-foreground hover:text-foreground hover:bg-secondary border-transparent"}`}>
            {l}
          </button>
        ))}
        <Slider label="View Angle" value={angle} min={10} max={60} onChange={setAngle} />
      </>
    } />
  );
}

// ── 4. Titration Curves ──────────────────────────────────────────────────────
export function TitrationCurves() {
  const [type, setType] = useState(0);
  const [vol, setVol] = useState(25);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const types = ["Strong Acid / Strong Base", "Weak Acid / Strong Base", "Strong Acid / Weak Base"];
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const pad = { l: 50, r: 20, t: 20, b: 40 };
    const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
    drawAxes(ctx, pad.l, pad.t + ph, pw, ph, "Volume NaOH (mL)", "pH");
    // pH scale ticks
    for (let i = 0; i <= 14; i += 2) {
      const y = pad.t + ph - (i / 14) * ph;
      ctx.fillStyle = C_DIM; ctx.font = "9px Inter,sans-serif"; ctx.textAlign = "right";
      ctx.fillText(i + "", pad.l - 5, y + 3);
    }
    const pH = (v: number) => {
      const eq = 25;
      if (type === 0) {
        if (v < eq - 0.5) return 1 + (v / eq) * 4;
        if (v > eq + 0.5) return 9 + ((v - eq) / 25) * 4;
        return 7;
      } else if (type === 1) {
        if (v < eq - 0.5) return 4 + (v / eq) * 4.5;
        if (v > eq + 0.5) return 9 + ((v - eq) / 25) * 3;
        return 8.5;
      } else {
        if (v < eq - 0.5) return 1 + (v / eq) * 4;
        if (v > eq + 0.5) return 5 + ((v - eq) / 25) * 3;
        return 5.5;
      }
    };
    const pts: [number, number][] = [];
    for (let v = 0; v <= 50; v += 0.5) {
      const x = pad.l + (v / 50) * pw;
      const y = pad.t + ph - (clamp(pH(v), 0, 14) / 14) * ph;
      pts.push([x, y]);
    }
    drawCurve(ctx, pts, C_PRIMARY, 2.5);
    // current point
    const cx2 = pad.l + (vol / 50) * pw;
    const cy2 = pad.t + ph - (clamp(pH(vol), 0, 14) / 14) * ph;
    ctx.beginPath(); ctx.arc(cx2, cy2, 6, 0, TAU); ctx.fillStyle = C_AMBER; ctx.fill();
    ctx.fillStyle = C_AMBER; ctx.font = "10px Inter,sans-serif"; ctx.textAlign = "left";
    ctx.fillText(`pH ${pH(vol).toFixed(1)}`, cx2 + 10, cy2);
  }, [type, vol]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={
      <>
        <SectionLabel>Titration Type</SectionLabel>
        {types.map((t, i) => (
          <button key={t} onClick={() => setType(i)}
            className={`w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors border ${i === type ? "bg-primary/20 text-primary border-primary/30" : "text-muted-foreground hover:text-foreground hover:bg-secondary border-transparent"}`}>
            {t}
          </button>
        ))}
        <Slider label="Volume NaOH" value={vol} min={0} max={50} onChange={setVol} unit=" mL" />
      </>
    } />
  );
}

// ── 5. Chromatography ────────────────────────────────────────────────────────
export function Chromatography() {
  const [progress, setProgress] = useState(50);
  const [running, setRunning] = useState(false);
  const tRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spots = [
    { name: "A", color: C_PRIMARY, rf: 0.85 },
    { name: "B", color: C_GREEN, rf: 0.55 },
    { name: "C", color: C_RED, rf: 0.3 },
  ];
  useRaf((t) => {
    if (!running) return;
    const dt = t - tRef.current; tRef.current = t;
    setProgress(p => { const n = p + dt * 15; if (n >= 100) { setRunning(false); return 100; } return n; });
  }, running);
  useEffect(() => {
    tRef.current = 0;
  }, [running]);
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    // paper strip
    const px = W / 2 - 60, py = 20, pw = 120, ph = H - 50;
    ctx.fillStyle = "#f5f0e8"; ctx.fillRect(px, py, pw, ph);
    // solvent front
    const sfY = py + ph - (progress / 100) * ph;
    ctx.fillStyle = "rgba(100,150,255,0.15)"; ctx.fillRect(px, sfY, pw, py + ph - sfY);
    ctx.strokeStyle = C_PRIMARY; ctx.lineWidth = 1.5; ctx.setLineDash([4,3]);
    ctx.beginPath(); ctx.moveTo(px, sfY); ctx.lineTo(px + pw, sfY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C_PRIMARY; ctx.font = "9px Inter,sans-serif"; ctx.textAlign = "left";
    ctx.fillText("Solvent front", px + pw + 5, sfY + 3);
    // baseline
    const baseY = py + ph - 10;
    ctx.strokeStyle = C_DIM; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px, baseY); ctx.lineTo(px + pw, baseY); ctx.stroke();
    // spots
    spots.forEach((sp, i) => {
      const spotX = px + 20 + i * 30;
      const spotY = baseY - (sp.rf * (progress / 100)) * (ph - 20);
      ctx.beginPath(); ctx.arc(spotX, spotY, 8, 0, TAU);
      ctx.fillStyle = sp.color + "cc"; ctx.fill();
      ctx.fillStyle = sp.color; ctx.font = "9px Inter,sans-serif"; ctx.textAlign = "center";
      ctx.fillText(sp.name, spotX, spotY - 12);
      ctx.fillStyle = C_DIM; ctx.font = "8px Inter,sans-serif";
      ctx.fillText(`Rf ${sp.rf}`, spotX, spotY + 20);
    });
  }, [progress]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={
      <>
        <SectionLabel>Chromatography</SectionLabel>
        <button onClick={() => { setProgress(0); setRunning(true); }}
          className="w-full rounded-lg px-3 py-2 text-xs font-semibold bg-primary/20 text-primary border border-primary/30">
          Run
        </button>
        <button onClick={() => setRunning(false)}
          className="w-full rounded-lg px-3 py-2 text-xs font-semibold border border-border text-muted-foreground">
          Pause
        </button>
        <Slider label="Solvent Progress" value={Math.round(progress)} min={0} max={100} onChange={v => { setRunning(false); setProgress(v); }} unit="%" />
        {spots.map(sp => <Stat key={sp.name} label={`Spot ${sp.name} Rf`} value={sp.rf.toFixed(2)} />)}
      </>
    } />
  );
}

// ── 6. Electrolysis ──────────────────────────────────────────────────────────
export function Electrolysis() {
  const [voltage, setVoltage] = useState(6);
  const [solution, setSolution] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const solutions = ["NaCl (aq)", "CuSO₄ (aq)", "H₂SO₄ (aq)"];
  const tRef = useRef(0);
  useRaf((t) => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    // beaker
    const bx = W/2 - 120, by = 40, bw = 240, bh = 220;
    ctx.strokeStyle = C_DIM; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by+bh); ctx.lineTo(bx+bw, by+bh); ctx.lineTo(bx+bw, by); ctx.stroke();
    ctx.fillStyle = solution === 1 ? "#1a5f7a44" : "#2244aa33";
    ctx.fillRect(bx+2, by+20, bw-4, bh-22);
    // electrodes
    const ey = by + 10, eh = bh - 30;
    ctx.fillStyle = C_DIM; ctx.fillRect(bx+40, ey, 8, eh); ctx.fillRect(bx+bw-48, ey, 8, eh);
    ctx.fillStyle = C_RED; ctx.font = "10px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText("+ Anode", bx+44, by - 5);
    ctx.fillStyle = C_PRIMARY;
    ctx.fillText("- Cathode", bx+bw-44, by - 5);
    // bubbles
    const rate = voltage / 12;
    for (let i = 0; i < 8; i++) {
      const phase = ((t * rate * 2 + i * 0.7) % 1);
      const bby = by + bh - 30 - phase * (bh - 40);
      ctx.beginPath(); ctx.arc(bx + 44 + (i % 3) * 5 - 5, bby, 3, 0, TAU);
      ctx.fillStyle = C_AMBER + "88"; ctx.fill();
      ctx.beginPath(); ctx.arc(bx + bw - 44 + (i % 3) * 5 - 5, bby, 3, 0, TAU);
      ctx.fillStyle = C_CYAN + "88"; ctx.fill();
    }
    const products = solution === 0 ? ["Cl₂", "H₂"] : solution === 1 ? ["O₂", "Cu"] : ["O₂", "H₂"];
    ctx.fillStyle = C_AMBER; ctx.font = "11px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText(products[0], bx + 44, by - 18);
    ctx.fillStyle = C_CYAN;
    ctx.fillText(products[1], bx + bw - 44, by - 18);
  }, true);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={
      <>
        <SectionLabel>Solution</SectionLabel>
        {solutions.map((s, i) => (
          <button key={s} onClick={() => setSolution(i)}
            className={`w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors border ${i === solution ? "bg-primary/20 text-primary border-primary/30" : "text-muted-foreground hover:text-foreground hover:bg-secondary border-transparent"}`}>
            {s}
          </button>
        ))}
        <Slider label="Voltage" value={voltage} min={1} max={12} onChange={setVoltage} unit=" V" />
        <Stat label="Current ∝" value={`${(voltage * 0.4).toFixed(1)} A`} />
      </>
    } />
  );
}

// ── 7. Phase Diagrams ────────────────────────────────────────────────────────
export function PhaseDiagrams() {
  const [temp, setTemp] = useState(50);
  const [pressure, setPressure] = useState(50);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const pad = { l: 55, r: 20, t: 20, b: 40 };
    const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
    drawAxes(ctx, pad.l, pad.t + ph, pw, ph, "Temperature (°C)", "Pressure (atm)");
    // regions
    const tp = { x: pad.l + 0.3 * pw, y: pad.t + 0.6 * ph };
    const cp = { x: pad.l + 0.75 * pw, y: pad.t + 0.25 * ph };
    // solid region
    ctx.fillStyle = C_PRIMARY + "22";
    ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(tp.x, tp.y); ctx.lineTo(pad.l, pad.t + ph); ctx.closePath(); ctx.fill();
    // liquid region
    ctx.fillStyle = C_CYAN + "22";
    ctx.beginPath(); ctx.moveTo(tp.x, tp.y); ctx.lineTo(cp.x, cp.y); ctx.lineTo(pad.l + pw, pad.t); ctx.lineTo(pad.l, pad.t); ctx.closePath(); ctx.fill();
    // gas region
    ctx.fillStyle = C_AMBER + "22";
    ctx.beginPath(); ctx.moveTo(tp.x, tp.y); ctx.lineTo(pad.l + pw, pad.t + ph); ctx.lineTo(pad.l, pad.t + ph); ctx.closePath(); ctx.fill();
    // boundaries
    ctx.strokeStyle = C_DIM; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(tp.x, tp.y); ctx.lineTo(cp.x, cp.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tp.x, tp.y); ctx.lineTo(pad.l + pw, pad.t + ph); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tp.x, tp.y); ctx.lineTo(pad.l, pad.t); ctx.stroke();
    // triple + critical points
    ctx.beginPath(); ctx.arc(tp.x, tp.y, 5, 0, TAU); ctx.fillStyle = C_RED; ctx.fill();
    ctx.beginPath(); ctx.arc(cp.x, cp.y, 5, 0, TAU); ctx.fillStyle = C_GREEN; ctx.fill();
    ctx.fillStyle = C_FG; ctx.font = "9px Inter,sans-serif"; ctx.textAlign = "left";
    ctx.fillText("Triple pt", tp.x + 7, tp.y);
    ctx.fillText("Critical pt", cp.x + 7, cp.y);
    ctx.fillStyle = C_PRIMARY + "aa"; ctx.font = "10px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText("SOLID", pad.l + pw * 0.12, pad.t + ph * 0.4);
    ctx.fillStyle = C_CYAN + "aa"; ctx.fillText("LIQUID", pad.l + pw * 0.5, pad.t + ph * 0.3);
    ctx.fillStyle = C_AMBER + "aa"; ctx.fillText("GAS", pad.l + pw * 0.65, pad.t + ph * 0.75);
    // current state dot
    const dx = pad.l + (temp / 100) * pw, dy = pad.t + ph - (pressure / 100) * ph;
    ctx.beginPath(); ctx.arc(dx, dy, 7, 0, TAU); ctx.fillStyle = C_FG; ctx.fill();
  }, [temp, pressure]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={
      <>
        <Slider label="Temperature" value={temp} min={0} max={100} onChange={setTemp} unit="%" />
        <Slider label="Pressure" value={pressure} min={0} max={100} onChange={setPressure} unit="%" />
        <Stat label="Dot position" value="White dot" />
      </>
    } />
  );
}

// ── 8. Reaction Kinetics ─────────────────────────────────────────────────────
export function ReactionKinetics() {
  const [temp, setTemp] = useState(300);
  const [conc, setConc] = useState(1);
  const [catalyst, setCatalyst] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const pad = { l: 50, r: 20, t: 20, b: 40 };
    const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
    drawAxes(ctx, pad.l, pad.t + ph, pw, ph, "Time (s)", "[Reactant] (mol/L)");
    const k = 0.01 * Math.exp((temp - 300) / 50) * conc * (catalyst ? 3 : 1);
    const pts: [number, number][] = [];
    for (let t = 0; t <= 100; t++) {
      const c = conc * Math.exp(-k * t);
      pts.push([pad.l + (t / 100) * pw, pad.t + ph - (c / conc) * ph]);
    }
    drawCurve(ctx, pts, C_PRIMARY, 2.5);
    const half = Math.log(2) / k;
    if (half < 100) {
      const hx = pad.l + (half / 100) * pw;
      ctx.strokeStyle = C_AMBER; ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(hx, pad.t); ctx.lineTo(hx, pad.t + ph); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = C_AMBER; ctx.font = "9px Inter,sans-serif"; ctx.textAlign = "center";
      ctx.fillText(`t½ = ${half.toFixed(1)}s`, hx, pad.t + 12);
    }
  }, [temp, conc, catalyst]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={
      <>
        <Slider label="Temperature" value={temp} min={200} max={500} onChange={setTemp} unit=" K" />
        <Slider label="[Reactant]₀" value={conc} min={0.1} max={3} step={0.1} onChange={setConc} unit=" M" />
        <button onClick={() => setCatalyst(c => !c)}
          className={`w-full rounded-lg px-3 py-2 text-xs font-semibold border transition-colors ${catalyst ? "bg-green-500/20 text-green-400 border-green-500/30" : "border-border text-muted-foreground"}`}>
          {catalyst ? "Catalyst: ON" : "Catalyst: OFF"}
        </button>
        <Stat label="Rate const k" value={(0.01 * Math.exp((temp - 300) / 50) * conc * (catalyst ? 3 : 1)).toFixed(4)} />
      </>
    } />
  );
}

// ── 9. Colligative Properties ────────────────────────────────────────────────
export function Colligative() {
  const [molality, setMolality] = useState(1);
  const [property, setProperty] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const properties = ["Boiling Point Elevation", "Freezing Point Depression", "Osmotic Pressure"];
  const Kb = 0.512, Kf = 1.86, R = 0.0821;
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const pad = { l: 55, r: 20, t: 30, b: 40 };
    const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
    const maxM = 4;
    drawAxes(ctx, pad.l, pad.t + ph, pw, ph, "Molality (mol/kg)", property === 2 ? "π (atm)" : "ΔT (°C)");
    const calc = (m: number) => property === 0 ? Kb * m : property === 1 ? Kf * m : R * 298 * m;
    const maxY = calc(maxM) * 1.1;
    const pts: [number, number][] = [];
    for (let m = 0; m <= maxM; m += 0.05) {
      pts.push([pad.l + (m / maxM) * pw, pad.t + ph - (calc(m) / maxY) * ph]);
    }
    drawCurve(ctx, pts, C_PRIMARY, 2.5);
    const cx2 = pad.l + (molality / maxM) * pw;
    const cy2 = pad.t + ph - (calc(molality) / maxY) * ph;
    ctx.beginPath(); ctx.arc(cx2, cy2, 6, 0, TAU); ctx.fillStyle = C_AMBER; ctx.fill();
    ctx.fillStyle = C_AMBER; ctx.font = "10px Inter,sans-serif"; ctx.textAlign = "left";
    ctx.fillText(calc(molality).toFixed(2), cx2 + 8, cy2);
  }, [molality, property]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={
      <>
        <SectionLabel>Property</SectionLabel>
        {properties.map((p, i) => (
          <button key={p} onClick={() => setProperty(i)}
            className={`w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors border ${i === property ? "bg-primary/20 text-primary border-primary/30" : "text-muted-foreground hover:text-foreground hover:bg-secondary border-transparent"}`}>
            {p}
          </button>
        ))}
        <Slider label="Molality" value={molality} min={0.1} max={4} step={0.1} onChange={setMolality} unit=" m" />
        <Stat label="ΔT or π" value={`${(property === 0 ? Kb : property === 1 ? Kf : R * 298) * molality >= 0 ? "+" : ""}${((property === 0 ? Kb : property === 1 ? Kf : R * 298) * molality).toFixed(2)}`} />
      </>
    } />
  );
}

// ── 10. Ionic vs Covalent ────────────────────────────────────────────────────
export function IonicCovalent() {
  const [mode, setMode] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height, cx = W / 2, cy = H / 2;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    if (mode === 0) {
      // Ionic: NaCl lattice
      const spacing = 60;
      for (let row = -2; row <= 2; row++) {
        for (let col = -2; col <= 2; col++) {
          const x = cx + col * spacing, y = cy + row * spacing;
          const isNa = (row + col) % 2 === 0;
          ctx.beginPath(); ctx.arc(x, y, 16, 0, TAU);
          ctx.fillStyle = isNa ? C_PRIMARY : C_GREEN; ctx.fill();
          ctx.fillStyle = C_BG; ctx.font = "bold 10px Inter,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(isNa ? "Na⁺" : "Cl⁻", x, y);
        }
      }
      ctx.fillStyle = C_DIM; ctx.font = "11px Inter,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
      ctx.fillText("Ionic — NaCl lattice", cx, H - 15);
    } else {
      // Covalent: H₂O with electron pairs
      ctx.beginPath(); ctx.arc(cx, cy, 22, 0, TAU); ctx.fillStyle = C_RED; ctx.fill();
      ctx.fillStyle = C_FG; ctx.font = "bold 13px Inter,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("O", cx, cy);
      [[cx - 80, cy + 40], [cx + 80, cy + 40]].forEach(([hx, hy]) => {
        ctx.strokeStyle = C_FG; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(hx, hy); ctx.stroke();
        ctx.beginPath(); ctx.arc(hx, hy, 14, 0, TAU); ctx.fillStyle = C_CYAN; ctx.fill();
        ctx.fillStyle = C_BG; ctx.font = "bold 11px Inter,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("H", hx, hy);
      });
      // lone pairs
      [[cx - 20, cy - 30], [cx + 20, cy - 30]].forEach(([lx, ly]) => {
        ctx.beginPath(); ctx.arc(lx - 6, ly, 3, 0, TAU); ctx.fillStyle = C_AMBER; ctx.fill();
        ctx.beginPath(); ctx.arc(lx + 6, ly, 3, 0, TAU); ctx.fill();
      });
      ctx.fillStyle = C_DIM; ctx.font = "11px Inter,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
      ctx.fillText("Covalent — H₂O with lone pairs", cx, H - 15);
    }
  }, [mode]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={
      <>
        <SectionLabel>Bond Type</SectionLabel>
        {["Ionic (NaCl)", "Covalent (H₂O)"].map((t, i) => (
          <button key={t} onClick={() => setMode(i)}
            className={`w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors border ${i === mode ? "bg-primary/20 text-primary border-primary/30" : "text-muted-foreground hover:text-foreground hover:bg-secondary border-transparent"}`}>
            {t}
          </button>
        ))}
        <Stat label="Type" value={mode === 0 ? "Ionic" : "Covalent"} />
        <Stat label="Transfer" value={mode === 0 ? "Electron transfer" : "Electron sharing"} />
      </>
    } />
  );
}

// ── 11. Le Chatelier ─────────────────────────────────────────────────────────
export function LeChatelier() {
  const [temp, setTemp] = useState(0);
  const [pressure, setPressure] = useState(0);
  const [conc, setConc] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const fwd = 0.5 + temp * 0.15 + pressure * 0.1 + conc * 0.1;
    const rev = 1 - clamp(fwd, 0.1, 0.9);
    const cx = W / 2, cy = H / 2;
    // reactants bar
    const rw = clamp(rev, 0.1, 0.9) * 200;
    const pw2 = clamp(fwd, 0.1, 0.9) * 200;
    ctx.fillStyle = C_PRIMARY + "88"; ctx.fillRect(cx - 220, cy - 20, rw, 40);
    ctx.fillStyle = C_GREEN + "88"; ctx.fillRect(cx + 20, cy - 20, pw2, 40);
    ctx.fillStyle = C_FG; ctx.font = "11px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText("Reactants", cx - 220 + rw / 2, cy + 4);
    ctx.fillText("Products", cx + 20 + pw2 / 2, cy + 4);
    // equilibrium arrows
    ctx.strokeStyle = C_AMBER; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - 15, cy - 8); ctx.lineTo(cx + 15, cy - 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 15, cy + 8); ctx.lineTo(cx - 15, cy + 8); ctx.stroke();
    ctx.fillStyle = C_DIM; ctx.font = "10px Inter,sans-serif"; ctx.textAlign = "center";
    const shift = temp > 0 ? "→ Products" : temp < 0 ? "← Reactants" : pressure > 0 ? "→ fewer moles" : conc > 0 ? "→ Products" : "Equilibrium";
    ctx.fillText(shift, cx, H - 20);
  }, [temp, pressure, conc]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={
      <>
        <SectionLabel>N₂ + 3H₂ ⇌ 2NH₃ + heat</SectionLabel>
        <Slider label="Temperature" value={temp} min={-1} max={1} step={1} onChange={setTemp} unit="" />
        <Slider label="Pressure" value={pressure} min={-1} max={1} step={1} onChange={setPressure} unit="" />
        <Slider label="[N₂] added" value={conc} min={-1} max={1} step={1} onChange={setConc} unit="" />
        <Stat label="Temp labels" value="-1=decrease, +1=increase" />
      </>
    } />
  );
}

// ── 12. Polymers ─────────────────────────────────────────────────────────────
export function Polymers() {
  const [chainLen, setChainLen] = useState(8);
  const [type, setType] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const types = ["Polyethylene", "Polypropylene", "Nylon-6,6", "DNA strand"];
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height, cy = H / 2;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const spacing = Math.min(60, (W - 40) / chainLen);
    const startX = (W - spacing * (chainLen - 1)) / 2;
    for (let i = 0; i < chainLen; i++) {
      const x = startX + i * spacing;
      const y = cy + (i % 2 === 0 ? -20 : 20);
      if (i > 0) {
        const px = startX + (i - 1) * spacing;
        const py = cy + ((i - 1) % 2 === 0 ? -20 : 20);
        ctx.strokeStyle = C_FG; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(x, y, 12, 0, TAU);
      ctx.fillStyle = type < 2 ? C_PRIMARY : i % 2 === 0 ? C_GREEN : C_AMBER; ctx.fill();
      ctx.fillStyle = C_BG; ctx.font = "8px Inter,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(type === 0 ? "CH₂" : type === 1 ? (i%2===0?"CH₂":"CH") : (i%2===0?"CO":"NH"), x, y);
      if (type === 1 && i % 2 !== 0) {
        ctx.beginPath(); ctx.arc(x + 14, y - 14, 8, 0, TAU); ctx.fillStyle = C_GREEN; ctx.fill();
        ctx.fillStyle = C_BG; ctx.font = "7px Inter,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("CH₃", x + 14, y - 14);
      }
    }
    ctx.fillStyle = C_DIM; ctx.font = "10px Inter,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.fillText(`${types[type]} — n = ${chainLen}`, W / 2, H - 15);
  }, [chainLen, type]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={
      <>
        <SectionLabel>Polymer Type</SectionLabel>
        {types.map((t, i) => (
          <button key={t} onClick={() => setType(i)}
            className={`w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors border ${i === type ? "bg-primary/20 text-primary border-primary/30" : "text-muted-foreground hover:text-foreground hover:bg-secondary border-transparent"}`}>
            {t}
          </button>
        ))}
        <Slider label="Chain Length" value={chainLen} min={3} max={12} onChange={setChainLen} unit=" units" />
      </>
    } />
  );
}

// ── 13. Radioactive Decay ────────────────────────────────────────────────────
export function RadioactiveDecay() {
  const [halfLife, setHalfLife] = useState(10);
  const [decayType, setDecayType] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const decays = ["Alpha (α)", "Beta (β)", "Gamma (γ)"];
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const pad = { l: 50, r: 20, t: 20, b: 40 };
    const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
    drawAxes(ctx, pad.l, pad.t + ph, pw, ph, "Time (years)", "N/N₀");
    const pts: [number, number][] = [];
    const tMax = halfLife * 5;
    for (let t = 0; t <= tMax; t += tMax / 200) {
      const n = Math.pow(0.5, t / halfLife);
      pts.push([pad.l + (t / tMax) * pw, pad.t + ph - n * ph]);
    }
    drawCurve(ctx, pts, [C_RED, C_GREEN, C_AMBER][decayType], 2.5);
    // half-life markers
    for (let i = 1; i <= 4; i++) {
      const x = pad.l + (i * halfLife / tMax) * pw;
      const y = pad.t + ph - Math.pow(0.5, i) * ph;
      ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fillStyle = C_FG; ctx.fill();
      ctx.setLineDash([3, 3]); ctx.strokeStyle = C_GRID; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, pad.t + ph); ctx.lineTo(x, y); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = C_DIM; ctx.font = "9px Inter,sans-serif"; ctx.textAlign = "left";
    ctx.fillText(`t½ = ${halfLife} yr | ${decays[decayType]}`, pad.l + 5, pad.t + 12);
  }, [halfLife, decayType]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={
      <>
        <SectionLabel>Decay Type</SectionLabel>
        {decays.map((d, i) => (
          <button key={d} onClick={() => setDecayType(i)}
            className={`w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors border ${i === decayType ? "bg-primary/20 text-primary border-primary/30" : "text-muted-foreground hover:text-foreground hover:bg-secondary border-transparent"}`}>
            {d}
          </button>
        ))}
        <Slider label="Half-life" value={halfLife} min={1} max={50} onChange={setHalfLife} unit=" yr" />
        <Stat label="After 3 t½" value={`${(12.5).toFixed(1)}% remaining`} />
      </>
    } />
  );
}

// ── 14. Ideal Gas Law ────────────────────────────────────────────────────────
export function IdealGasLaw() {
  const [n, setN] = useState(1);
  const [T, setT] = useState(300);
  const [V, setV] = useState(24.5);
  const R = 0.0821;
  const P = (n * R * T) / V;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height, cx = W / 2, cy = H / 2;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    // PV = nRT diagram
    const pad = { l: 50, r: 20, t: 20, b: 40 };
    const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
    drawAxes(ctx, pad.l, pad.t + ph, pw, ph, "Volume (L)", "Pressure (atm)");
    // isotherms for different T
    [200, T, 400].forEach((Tval, ti) => {
      const pts: [number, number][] = [];
      for (let v = 2; v <= 60; v++) {
        const p = (n * R * Tval) / v;
        if (p > 10) continue;
        pts.push([pad.l + (v / 60) * pw, pad.t + ph - (p / 10) * ph]);
      }
      const col = ti === 1 ? C_AMBER : C_PRIMARY + "44";
      drawCurve(ctx, pts, col, ti === 1 ? 2.5 : 1.5);
      if (ti === 1 && pts.length > 0) {
        ctx.fillStyle = C_AMBER; ctx.font = "9px Inter,sans-serif"; ctx.textAlign = "left";
        ctx.fillText(`T=${Tval}K`, pts[0][0], pts[0][1] - 8);
      }
    });
    // current state point
    const px2 = pad.l + (V / 60) * pw;
    const py2 = pad.t + ph - (P / 10) * ph;
    if (P <= 10) {
      ctx.beginPath(); ctx.arc(px2, py2, 6, 0, TAU); ctx.fillStyle = C_GREEN; ctx.fill();
    }
  }, [n, T, V]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={
      <>
        <SectionLabel>PV = nRT</SectionLabel>
        <Slider label="Moles (n)" value={n} min={0.5} max={3} step={0.1} onChange={setN} unit=" mol" />
        <Slider label="Temperature" value={T} min={100} max={500} onChange={setT} unit=" K" />
        <Slider label="Volume" value={V} min={2} max={60} step={0.5} onChange={setV} unit=" L" />
        <Stat label="Pressure" value={`${P.toFixed(2)} atm`} />
        <Stat label="PV" value={`${(P * V).toFixed(1)} L·atm`} />
      </>
    } />
  );
}

// ── 15. Orbital Hybridization ────────────────────────────────────────────────
export function OrbitalHybridization() {
  const [hybrid, setHybrid] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hybrids = [
    { name: "sp (linear)", lobes: 2, angle: 180, eg: "BeCl₂" },
    { name: "sp² (trigonal planar)", lobes: 3, angle: 120, eg: "BF₃" },
    { name: "sp³ (tetrahedral)", lobes: 4, angle: 109.5, eg: "CH₄" },
    { name: "sp³d (trigonal bipyramidal)", lobes: 5, angle: 90, eg: "PCl₅" },
  ];
  const h = hybrids[hybrid];
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height, cx = W / 2, cy = H / 2;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const r = 80;
    for (let i = 0; i < h.lobes; i++) {
      const angle = (TAU * i / h.lobes) - Math.PI / 2;
      const x = cx + r * Math.cos(angle), y = cy + r * Math.sin(angle);
      // lobe
      ctx.beginPath();
      ctx.ellipse(cx + (r / 2) * Math.cos(angle), cy + (r / 2) * Math.sin(angle), r * 0.45, 18, angle, 0, TAU);
      ctx.fillStyle = i % 2 === 0 ? C_PRIMARY + "55" : C_AMBER + "55";
      ctx.strokeStyle = i % 2 === 0 ? C_PRIMARY : C_AMBER; ctx.lineWidth = 1.5;
      ctx.fill(); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(cx, cy, 10, 0, TAU); ctx.fillStyle = C_GREEN; ctx.fill();
    ctx.fillStyle = C_DIM; ctx.font = "11px Inter,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.fillText(`${h.name}  —  ${h.eg}  —  ${h.angle}°`, cx, H - 15);
  }, [hybrid]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={
      <>
        <SectionLabel>Hybridization</SectionLabel>
        {hybrids.map((hb, i) => (
          <button key={hb.name} onClick={() => setHybrid(i)}
            className={`w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors border ${i === hybrid ? "bg-primary/20 text-primary border-primary/30" : "text-muted-foreground hover:text-foreground hover:bg-secondary border-transparent"}`}>
            {hb.name}
          </button>
        ))}
        <Stat label="Example" value={h.eg} />
        <Stat label="Bond Angle" value={`${h.angle}°`} />
      </>
    } />
  );
}

// ── 16. Galvanic Cells ───────────────────────────────────────────────────────
export function GalvanicCells() {
  const [metals, setMetals] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pairs = [
    { anode: "Zn", cathode: "Cu", emf: 1.10, anodeColor: C_AMBER, cathodeColor: C_PRIMARY },
    { anode: "Fe", cathode: "Ag", emf: 1.24, anodeColor: C_RED, cathodeColor: C_CYAN },
    { anode: "Pb", cathode: "Au", emf: 1.62, anodeColor: C_DIM, cathodeColor: C_AMBER },
  ];
  const p = pairs[metals];
  const tRef = useRef(0);
  useRaf((t) => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    // cells
    [[80, "Anode (−)", p.anodeColor, p.anode, true], [W - 150, "Cathode (+)", p.cathodeColor, p.cathode, false]].forEach(([bx, label, color, metal, isAnode]) => {
      ctx.fillStyle = "#1a2a3a"; ctx.fillRect(bx as number, 80, 120, 160);
      ctx.strokeStyle = C_DIM; ctx.lineWidth = 1.5; ctx.strokeRect(bx as number, 80, 120, 160);
      ctx.fillStyle = (color as string) + "44"; ctx.fillRect(bx as number + 2, 130, 116, 108);
      ctx.fillStyle = color as string; ctx.fillRect(bx as number + 45, 60, 30, 130);
      ctx.fillStyle = C_FG; ctx.font = "bold 10px Inter,sans-serif"; ctx.textAlign = "center";
      ctx.fillText(metal as string, bx as number + 60, 55);
      ctx.fillStyle = C_DIM; ctx.font = "9px Inter,sans-serif";
      ctx.fillText(label as string, bx as number + 60, 265);
      // ions
      for (let i = 0; i < 4; i++) {
        const ix = (bx as number) + 20 + i * 25;
        const iy = 160 + Math.sin(t * 2 + i) * 15;
        ctx.beginPath(); ctx.arc(ix, iy, 6, 0, TAU);
        ctx.fillStyle = (isAnode as boolean) ? C_AMBER + "cc" : C_GREEN + "cc"; ctx.fill();
      }
    });
    // wire + current arrow
    ctx.strokeStyle = C_AMBER; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(200, 75); ctx.lineTo(W - 150, 75); ctx.stroke();
    const phase = (t * 0.5) % 1;
    const ex = 200 + phase * (W - 350);
    ctx.beginPath(); ctx.arc(ex, 75, 5, 0, TAU); ctx.fillStyle = C_AMBER; ctx.fill();
    // salt bridge
    ctx.fillStyle = "#334"; ctx.fillRect(W / 2 - 30, 85, 60, 20);
    ctx.fillStyle = C_DIM; ctx.font = "8px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText("Salt Bridge", W / 2, 101);
    // EMF label
    ctx.fillStyle = C_GREEN; ctx.font = "bold 12px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText(`E° = ${p.emf.toFixed(2)} V`, W / 2, 50);
  }, true);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={
      <>
        <SectionLabel>Cell Pair</SectionLabel>
        {pairs.map((pa, i) => (
          <button key={i} onClick={() => setMetals(i)}
            className={`w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors border ${i === metals ? "bg-primary/20 text-primary border-primary/30" : "text-muted-foreground hover:text-foreground hover:bg-secondary border-transparent"}`}>
            {pa.anode}/{pa.cathode}
          </button>
        ))}
        <Stat label="EMF" value={`${p.emf.toFixed(2)} V`} />
        <Stat label="Anode" value={`${p.anode} → oxidation`} />
        <Stat label="Cathode" value={`${p.cathode} → reduction`} />
      </>
    } />
  );
}

// ── 17. Mass Spectrometry ────────────────────────────────────────────────────
export function MassSpectrometry() {
  const [molecule, setMolecule] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const molecules = [
    { name: "Ethanol (C₂H₅OH)", peaks: [[46, 100], [31, 60], [45, 40], [27, 30], [29, 25]] },
    { name: "Aspirin (C₉H₈O₄)", peaks: [[180, 100], [120, 80], [138, 60], [92, 50], [64, 40]] },
    { name: "Caffeine (C₈H₁₀N₄O₂)", peaks: [[194, 100], [109, 70], [82, 55], [55, 40], [67, 35]] },
  ];
  const mol = molecules[molecule];
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const pad = { l: 50, r: 20, t: 20, b: 40 };
    const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
    drawAxes(ctx, pad.l, pad.t + ph, pw, ph, "m/z", "Relative abundance (%)");
    const maxMZ = mol.peaks[0][0] * 1.2;
    mol.peaks.forEach(([mz, ab]) => {
      const x = pad.l + (mz / maxMZ) * pw;
      const y = pad.t + ph - (ab / 100) * ph;
      ctx.strokeStyle = mz === mol.peaks[0][0] ? C_PRIMARY : C_CYAN;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x, pad.t + ph); ctx.lineTo(x, y); ctx.stroke();
      ctx.fillStyle = C_FG; ctx.font = "9px Inter,sans-serif"; ctx.textAlign = "center";
      ctx.fillText(mz + "", x, y - 5);
    });
    ctx.fillStyle = C_DIM; ctx.font = "10px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText(`M⁺ = ${mol.peaks[0][0]}`, W / 2, pad.t + 12);
  }, [molecule]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={
      <>
        <SectionLabel>Molecule</SectionLabel>
        {molecules.map((m, i) => (
          <button key={m.name} onClick={() => setMolecule(i)}
            className={`w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors border ${i === molecule ? "bg-primary/20 text-primary border-primary/30" : "text-muted-foreground hover:text-foreground hover:bg-secondary border-transparent"}`}>
            {m.name}
          </button>
        ))}
        <Stat label="Molecular ion (M⁺)" value={`m/z = ${mol.peaks[0][0]}`} />
      </>
    } />
  );
}

// ── 18. Endo/Exo Reactions ───────────────────────────────────────────────────
export function EndoExo() {
  const [type, setType] = useState(0); // 0=exo, 1=endo
  const [activation, setActivation] = useState(50);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const pad = { l: 50, r: 20, t: 30, b: 40 };
    const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
    drawAxes(ctx, pad.l, pad.t + ph, pw, ph, "Reaction Progress", "Enthalpy (kJ/mol)");
    const startH = type === 0 ? 0.6 : 0.3;
    const endH = type === 0 ? 0.3 : 0.7;
    const peakH = Math.max(startH, endH) + activation / 200;
    const pts: [number, number][] = [];
    for (let x = 0; x <= 1; x += 0.01) {
      const h = x < 0.5 ? lerp(startH, peakH, x * 2) : lerp(peakH, endH, (x - 0.5) * 2);
      pts.push([pad.l + x * pw, pad.t + ph - h * ph]);
    }
    drawCurve(ctx, pts, type === 0 ? C_RED : C_CYAN, 2.5);
    // labels
    const sy = pad.t + ph - startH * ph;
    const ey = pad.t + ph - endH * ph;
    ctx.setLineDash([4, 3]); ctx.strokeStyle = C_DIM; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.l, sy); ctx.lineTo(pad.l + pw * 0.3, sy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pad.l + pw * 0.7, ey); ctx.lineTo(pad.l + pw, ey); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = type === 0 ? C_RED : C_CYAN;
    ctx.font = "10px Inter,sans-serif"; ctx.textAlign = "center";
    const dH = (endH - startH) * 200;
    ctx.fillText(`ΔH = ${dH > 0 ? "+" : ""}${dH.toFixed(0)} kJ/mol`, pad.l + pw / 2, pad.t + 14);
    ctx.fillStyle = C_AMBER; ctx.fillText(`Ea = +${activation} kJ/mol`, pad.l + pw / 2, pad.t + 26);
  }, [type, activation]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={
      <>
        <SectionLabel>Reaction Type</SectionLabel>
        {["Exothermic", "Endothermic"].map((t, i) => (
          <button key={t} onClick={() => setType(i)}
            className={`w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors border ${i === type ? "bg-primary/20 text-primary border-primary/30" : "text-muted-foreground hover:text-foreground hover:bg-secondary border-transparent"}`}>
            {t}
          </button>
        ))}
        <Slider label="Activation Energy" value={activation} min={10} max={100} onChange={setActivation} unit=" kJ" />
        <Stat label="ΔH" value={type === 0 ? "Negative (−)" : "Positive (+)"} />
      </>
    } />
  );
}

// ── 19. Hydrogen Bonding ─────────────────────────────────────────────────────
export function HydrogenBonding() {
  const [molecule, setMolecule] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const molecules = ["Water (H₂O)", "Ethanol", "Ammonia (NH₃)"];
  const tRef = useRef(0);
  useRaf((t) => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const mols = [
      { cx: W/2 - 120, cy: H/2 - 40 }, { cx: W/2 + 80, cy: H/2 + 40 },
      { cx: W/2 - 60, cy: H/2 + 90 }, { cx: W/2 + 130, cy: H/2 - 60 },
    ];
    mols.forEach((m, mi) => {
      const pulse = 1 + 0.05 * Math.sin(t * 2 + mi);
      // central atom
      ctx.beginPath(); ctx.arc(m.cx, m.cy, 18 * pulse, 0, TAU);
      ctx.fillStyle = molecule === 2 ? C_CYAN : C_RED; ctx.fill();
      ctx.fillStyle = C_FG; ctx.font = "bold 10px Inter,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(molecule === 2 ? "N" : "O", m.cx, m.cy);
      // H atoms
      const angles = molecule === 0 ? [-2.2, -0.9] : molecule === 2 ? [-2.5, -0.6, 0.6] : [-2.2, -0.9];
      angles.forEach(a => {
        const hx = m.cx + 38 * Math.cos(a), hy = m.cy + 38 * Math.sin(a);
        ctx.strokeStyle = C_FG; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(m.cx, m.cy); ctx.lineTo(hx, hy); ctx.stroke();
        ctx.beginPath(); ctx.arc(hx, hy, 9, 0, TAU); ctx.fillStyle = C_CYAN; ctx.fill();
        ctx.fillStyle = C_BG; ctx.font = "bold 8px Inter,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("H", hx, hy);
      });
    });
    // H-bonds between molecules
    ctx.setLineDash([4, 4]); ctx.strokeStyle = C_AMBER + "88"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(mols[0].cx + 30, mols[0].cy); ctx.lineTo(mols[1].cx - 30, mols[1].cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mols[0].cx, mols[0].cy + 30); ctx.lineTo(mols[2].cx, mols[2].cy - 30); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C_AMBER; ctx.font = "9px Inter,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.fillText("δ+···δ− hydrogen bonds", W / 2, H - 15);
  }, true);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={
      <>
        <SectionLabel>Molecule</SectionLabel>
        {molecules.map((m, i) => (
          <button key={m} onClick={() => setMolecule(i)}
            className={`w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors border ${i === molecule ? "bg-primary/20 text-primary border-primary/30" : "text-muted-foreground hover:text-foreground hover:bg-secondary border-transparent"}`}>
            {m}
          </button>
        ))}
        <Stat label="Bond type" value="H···X" />
        <Stat label="Strength" value="~20 kJ/mol" />
      </>
    } />
  );
}

// ── 20. Superconductivity ────────────────────────────────────────────────────
export function Superconductivity() {
  const [temp, setTemp] = useState(50);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const Tc = 30;
  const tRef = useRef(0);
  useRaf((t) => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const isSuper = temp <= Tc;
    const pad = { l: 55, r: 20, t: 20, b: 40 };
    const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
    drawAxes(ctx, pad.l, pad.t + ph, pw, ph, "Temperature (K)", "Resistance (Ω)");
    const pts: [number, number][] = [];
    for (let T = 0; T <= 100; T++) {
      const R = T <= Tc ? 0 : (T - Tc) * 0.8;
      pts.push([pad.l + (T / 100) * pw, pad.t + ph - (R / 56) * ph]);
    }
    drawCurve(ctx, pts, C_PRIMARY, 2.5);
    // Tc line
    const tx = pad.l + (Tc / 100) * pw;
    ctx.setLineDash([4,3]); ctx.strokeStyle = C_RED; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(tx, pad.t); ctx.lineTo(tx, pad.t + ph); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C_RED; ctx.font = "9px Inter,sans-serif"; ctx.textAlign = "left";
    ctx.fillText(`Tc = ${Tc}K`, tx + 4, pad.t + 12);
    // current point
    const dx = pad.l + (temp / 100) * pw;
    const dy = pad.t + ph - (Math.max(0, temp - Tc) * 0.8 / 56) * ph;
    ctx.beginPath(); ctx.arc(dx, dy, 7, 0, TAU); ctx.fillStyle = isSuper ? C_GREEN : C_AMBER; ctx.fill();
    ctx.fillStyle = isSuper ? C_GREEN : C_AMBER; ctx.font = "10px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText(isSuper ? "SUPERCONDUCTING" : "Normal conductor", W / 2, pad.t + 14);
    // Cooper pairs animation if superconducting
    if (isSuper) {
      for (let i = 0; i < 5; i++) {
        const px2 = pad.l + ((t * 80 + i * 80) % pw);
        ctx.beginPath(); ctx.arc(px2, pad.t + ph * 0.5, 4, 0, TAU); ctx.fillStyle = C_CYAN; ctx.fill();
      }
    }
  }, true);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={
      <>
        <Slider label="Temperature" value={temp} min={0} max={100} onChange={setTemp} unit=" K" />
        <Stat label="State" value={temp <= Tc ? "Superconducting" : "Normal"} />
        <Stat label="Tc" value={`${Tc} K`} />
        <Stat label="Resistance" value={temp <= Tc ? "0 Ω" : `${((temp - Tc) * 0.8).toFixed(1)} Ω`} />
      </>
    } />
  );
}

// ── 21. Stoichiometry ────────────────────────────────────────────────────────
export function Stoichiometry() {
  const [moles, setMoles] = useState(1);
  const [limiting, setLimiting] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // N₂ + 3H₂ → 2NH₃
  const reactions = [
    { name: "N₂ + 3H₂ → 2NH₃", ratio: [1, 3, 2], units: ["N₂", "H₂", "NH₃"] },
    { name: "2H₂ + O₂ → 2H₂O", ratio: [2, 1, 2], units: ["H₂", "O₂", "H₂O"] },
  ];
  const rx = reactions[limiting];
  const nA = moles * rx.ratio[0], nB = moles * rx.ratio[1], nC = moles * rx.ratio[2];
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const labels = [`${nA.toFixed(1)} mol ${rx.units[0]}`, `${nB.toFixed(1)} mol ${rx.units[1]}`, `${nC.toFixed(1)} mol ${rx.units[2]}`];
    const colors = [C_PRIMARY, C_CYAN, C_GREEN];
    const maxMol = Math.max(nA, nB, nC);
    const barH = 50;
    labels.forEach((lbl, i) => {
      const val = [nA, nB, nC][i];
      const bw = (val / maxMol) * (W - 120);
      const by = 60 + i * 80;
      ctx.fillStyle = colors[i] + "44"; ctx.fillRect(60, by, bw, barH);
      ctx.strokeStyle = colors[i]; ctx.lineWidth = 1.5; ctx.strokeRect(60, by, bw, barH);
      ctx.fillStyle = C_FG; ctx.font = "11px Inter,sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillText(lbl, 65, by + barH / 2);
    });
    ctx.fillStyle = C_DIM; ctx.font = "10px Inter,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.fillText(rx.name, W / 2, H - 15);
  }, [moles, limiting]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={
      <>
        <SectionLabel>Reaction</SectionLabel>
        {reactions.map((r, i) => (
          <button key={r.name} onClick={() => setLimiting(i)}
            className={`w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors border ${i === limiting ? "bg-primary/20 text-primary border-primary/30" : "text-muted-foreground hover:text-foreground hover:bg-secondary border-transparent"}`}>
            {r.name}
          </button>
        ))}
        <Slider label="Moles of limiting" value={moles} min={0.5} max={5} step={0.5} onChange={setMoles} unit=" mol" />
        <Stat label="Product yield" value={`${nC.toFixed(1)} mol`} />
      </>
    } />
  );
}

// ── 22. Functional Groups ────────────────────────────────────────────────────
export function FunctionalGroups() {
  const [group, setGroup] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const groups = [
    { name: "Alcohol (−OH)", formula: "R−OH", color: C_PRIMARY, desc: "Hydroxyl group" },
    { name: "Carboxylic acid (−COOH)", formula: "R−COOH", color: C_RED, desc: "Carboxyl group" },
    { name: "Amine (−NH₂)", formula: "R−NH₂", color: C_GREEN, desc: "Amino group" },
    { name: "Ester (−COO−)", formula: "R−COO−R'", color: C_AMBER, desc: "Ester linkage" },
    { name: "Ketone (−CO−)", formula: "R−CO−R'", color: C_PURPLE, desc: "Carbonyl group" },
  ];
  const g = groups[group];
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height, cx = W / 2, cy = H / 2;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    // R group
    ctx.beginPath(); ctx.arc(cx - 100, cy, 30, 0, TAU); ctx.fillStyle = C_DIM + "33"; ctx.fill();
    ctx.strokeStyle = C_DIM; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = C_DIM; ctx.font = "14px Inter,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("R", cx - 100, cy);
    ctx.strokeStyle = C_FG; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - 70, cy); ctx.lineTo(cx - 30, cy); ctx.stroke();
    // functional group box
    ctx.beginPath(); ctx.roundRect(cx - 30, cy - 28, 120, 56, 8);
    ctx.fillStyle = g.color + "22"; ctx.fill();
    ctx.strokeStyle = g.color; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = g.color; ctx.font = "bold 16px Inter,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(g.formula.split("−").pop() ?? "", cx + 30, cy);
    ctx.fillStyle = C_DIM; ctx.font = "10px Inter,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.fillText(g.desc, cx, H - 15);
    ctx.fillText(g.formula, cx, H - 30);
  }, [group]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={
      <>
        <SectionLabel>Functional Group</SectionLabel>
        {groups.map((g2, i) => (
          <button key={g2.name} onClick={() => setGroup(i)}
            className={`w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors border ${i === group ? "bg-primary/20 text-primary border-primary/30" : "text-muted-foreground hover:text-foreground hover:bg-secondary border-transparent"}`}>
            {g2.name}
          </button>
        ))}
      </>
    } />
  );
}

// ── 23. Solubility Rules ─────────────────────────────────────────────────────
export function SolubilityRules() {
  const [cation, setCation] = useState(0);
  const [anion, setAnion] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cations = ["Na⁺", "Ca²⁺", "Ba²⁺", "Pb²⁺", "Fe³⁺"];
  const anions = ["Cl⁻", "SO₄²⁻", "CO₃²⁻", "OH⁻", "NO₃⁻"];
  const soluble: Record<string, boolean> = {
    "Na⁺-Cl⁻": true, "Na⁺-SO₄²⁻": true, "Na⁺-CO₃²⁻": true, "Na⁺-OH⁻": true, "Na⁺-NO₃⁻": true,
    "Ca²⁺-Cl⁻": true, "Ca²⁺-SO₄²⁻": false, "Ca²⁺-CO₃²⁻": false, "Ca²⁺-OH⁻": false, "Ca²⁺-NO₃⁻": true,
    "Ba²⁺-Cl⁻": true, "Ba²⁺-SO₄²⁻": false, "Ba²⁺-CO₃²⁻": false, "Ba²⁺-OH⁻": true, "Ba²⁺-NO₃⁻": true,
    "Pb²⁺-Cl⁻": false, "Pb²⁺-SO₄²⁻": false, "Pb²⁺-CO₃²⁻": false, "Pb²⁺-OH⁻": false, "Pb²⁺-NO₃⁻": true,
    "Fe³⁺-Cl⁻": true, "Fe³⁺-SO₄²⁻": true, "Fe³⁺-CO₃²⁻": false, "Fe³⁺-OH⁻": false, "Fe³⁺-NO₃⁻": true,
  };
  const key = `${cations[cation]}-${anions[anion]}`;
  const isSoluble = soluble[key] ?? true;
  const tRef = useRef(0);
  useRaf((t) => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const bx = W / 2 - 70, by = 60, bw = 140, bh = 200;
    ctx.fillStyle = "#0a1a2a"; ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = C_DIM; ctx.lineWidth = 1.5; ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = isSoluble ? C_CYAN + "33" : "#33111100"; ctx.fillRect(bx + 2, by + 80, bw - 4, bh - 82);
    if (isSoluble) {
      for (let i = 0; i < 12; i++) {
        const px2 = bx + 15 + ((i * 37 + t * 20) % (bw - 30));
        const py2 = by + 90 + ((i * 23 + t * 15) % (bh - 100));
        ctx.beginPath(); ctx.arc(px2, py2, 4, 0, TAU);
        ctx.fillStyle = i % 2 === 0 ? C_PRIMARY : C_GREEN; ctx.fill();
      }
    } else {
      for (let i = 0; i < 8; i++) {
        const px2 = bx + 20 + (i % 4) * 25, py2 = by + bh - 30 - Math.floor(i / 4) * 25;
        ctx.fillStyle = C_RED + "aa"; ctx.fillRect(px2 - 8, py2 - 8, 16, 16);
      }
    }
    ctx.fillStyle = C_FG; ctx.font = "bold 14px Inter,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.fillText(`${cations[cation]}${anions[anion].replace("⁻","").replace("²⁻","")}`, W / 2, by + 25);
    ctx.fillStyle = isSoluble ? C_GREEN : C_RED; ctx.font = "bold 11px Inter,sans-serif";
    ctx.fillText(isSoluble ? "SOLUBLE ✓" : "INSOLUBLE ✗", W / 2, by + 45);
  }, true);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={
      <>
        <SectionLabel>Cation</SectionLabel>
        {cations.map((c, i) => (
          <button key={c} onClick={() => setCation(i)}
            className={`w-full rounded-lg px-2 py-1 text-left text-xs font-medium transition-colors border ${i === cation ? "bg-primary/20 text-primary border-primary/30" : "text-muted-foreground hover:text-foreground hover:bg-secondary border-transparent"}`}>
            {c}
          </button>
        ))}
        <SectionLabel>Anion</SectionLabel>
        {anions.map((a, i) => (
          <button key={a} onClick={() => setAnion(i)}
            className={`w-full rounded-lg px-2 py-1 text-left text-xs font-medium transition-colors border ${i === anion ? "bg-primary/20 text-primary border-primary/30" : "text-muted-foreground hover:text-foreground hover:bg-secondary border-transparent"}`}>
            {a}
          </button>
        ))}
      </>
    } />
  );
}

// ── 24. pH Scale ─────────────────────────────────────────────────────────────
export function PHScale() {
  const [pH, setPH] = useState(7);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const solutions: [number, string][] = [
    [0, "Battery acid"], [1, "Stomach acid"], [2.5, "Vinegar"], [4, "Coffee"],
    [5.5, "Rain"], [7, "Pure water"], [8, "Seawater"], [10, "Antacid"], [12, "Bleach"], [14, "NaOH"],
  ];
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const barW = W - 80, barH = 40, bx = 40, by = H / 2 - 20;
    // gradient bar
    const grad = ctx.createLinearGradient(bx, 0, bx + barW, 0);
    grad.addColorStop(0, "#ff2200"); grad.addColorStop(0.5, "#44aa44"); grad.addColorStop(1, "#2244ff");
    ctx.fillStyle = grad; ctx.fillRect(bx, by, barW, barH);
    // tick marks
    for (let i = 0; i <= 14; i++) {
      const x = bx + (i / 14) * barW;
      ctx.strokeStyle = C_BG; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, by); ctx.lineTo(x, by + barH); ctx.stroke();
      ctx.fillStyle = C_FG; ctx.font = "9px Inter,sans-serif"; ctx.textAlign = "center";
      ctx.fillText(i + "", x, by + barH + 12);
    }
    // marker
    const mx = bx + (pH / 14) * barW;
    ctx.strokeStyle = C_FG; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(mx, by - 12); ctx.lineTo(mx, by + barH + 16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mx, by - 12); ctx.lineTo(mx - 6, by - 22); ctx.lineTo(mx + 6, by - 22); ctx.closePath();
    ctx.fillStyle = C_FG; ctx.fill();
    ctx.fillStyle = C_FG; ctx.font = "bold 12px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText(`pH ${pH.toFixed(1)}`, mx, by - 27);
    const closest = solutions.reduce((a, b) => Math.abs(b[0] - pH) < Math.abs(a[0] - pH) ? b : a);
    ctx.fillStyle = C_DIM; ctx.font = "10px Inter,sans-serif";
    ctx.fillText(closest[1], W / 2, H - 20);
    ctx.fillText(pH < 7 ? "ACIDIC" : pH > 7 ? "BASIC" : "NEUTRAL", W / 2, H - 35);
    const H_conc = Math.pow(10, -pH);
    ctx.fillText(`[H⁺] = ${H_conc.toExponential(1)} mol/L`, W / 2, 30);
  }, [pH]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={
      <>
        <Slider label="pH" value={pH} min={0} max={14} step={0.1} onChange={setPH} />
        <SectionLabel>Quick Set</SectionLabel>
        {solutions.filter((_, i) => i % 2 === 0).map(([p, name]) => (
          <button key={name} onClick={() => setPH(p)}
            className="w-full rounded-lg px-2 py-1 text-left text-xs text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent">
            {name} ({p})
          </button>
        ))}
      </>
    } />
  );
}

// ── 25. Metallic Bonding ─────────────────────────────────────────────────────
export function MetallicBonding() {
  const [metal, setMetal] = useState(0);
  const [temp2, setTemp2] = useState(300);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const metals = [
    { name: "Copper (Cu)", spacing: 55, electrons: 1, color: C_AMBER },
    { name: "Iron (Fe)", spacing: 50, electrons: 2, color: C_RED },
    { name: "Gold (Au)", spacing: 60, electrons: 1, color: "#ffd700" },
    { name: "Aluminium (Al)", spacing: 52, electrons: 3, color: C_DIM },
  ];
  const m = metals[metal];
  const tRef = useRef(0);
  useRaf((t) => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const vib = (temp2 - 300) / 1000;
    // ion lattice
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 8; col++) {
        const x = 40 + col * m.spacing + Math.sin(t * 5 + row + col) * vib * 8;
        const y = 50 + row * 65 + Math.cos(t * 4 + row * col) * vib * 8;
        ctx.beginPath(); ctx.arc(x, y, 18, 0, TAU);
        ctx.fillStyle = m.color + "33"; ctx.fill();
        ctx.strokeStyle = m.color; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = m.color; ctx.font = "8px Inter,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(m.name.split(" ")[1].replace("(","").replace(")","") + `${m.electrons > 1 ? m.electrons + "+" : "+"}`, x, y);
      }
    }
    // delocalised electrons
    for (let i = 0; i < 20; i++) {
      const ex = ((t * (60 + i * 7) + i * 40) % (W - 40)) + 20;
      const ey = 30 + (i * 77) % (H - 60);
      ctx.beginPath(); ctx.arc(ex, ey, 3, 0, TAU); ctx.fillStyle = C_CYAN + "cc"; ctx.fill();
    }
    ctx.fillStyle = C_DIM; ctx.font = "10px Inter,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.fillText(`Sea of delocalised electrons — ${m.name}`, W / 2, H - 12);
  }, true);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={
      <>
        <SectionLabel>Metal</SectionLabel>
        {metals.map((mt, i) => (
          <button key={mt.name} onClick={() => setMetal(i)}
            className={`w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors border ${i === metal ? "bg-primary/20 text-primary border-primary/30" : "text-muted-foreground hover:text-foreground hover:bg-secondary border-transparent"}`}>
            {mt.name}
          </button>
        ))}
        <Slider label="Temperature" value={temp2} min={100} max={1500} onChange={setTemp2} unit=" K" />
        <Stat label="Delocalised e⁻" value={`${m.electrons} per atom`} />
      </>
    } />
  );
}
