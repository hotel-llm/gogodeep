import { useEffect, useRef, useState } from "react";
import {
  useRaf, ModelWrap, Slider, Stat, SectionLabel, StepNav,
  C_BG, C_FG, C_DIM, C_GRID, C_PRIMARY, C_GREEN, C_RED, C_AMBER, C_PURPLE, C_CYAN,
  TAU, clamp, lerp, drawAxes, drawCurve,
} from "./shared";

// ── 1. Plate Tectonics ───────────────────────────────────────────────────────
export function PlateTectonics() {
  const [type, setType] = useState(0);
  const [offset, setOffset] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const types = ["Convergent", "Divergent", "Transform"];
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height, cx = W / 2, cy = H / 2 + 20;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const off = offset * 2;
    if (type === 0) {
      // convergent — subduction with mountain forming
      // Left (ocean) plate — subducting under
      const subX = cx - off * 0.5;
      ctx.fillStyle = "#253050";
      ctx.beginPath();
      ctx.moveTo(40, cy - 30); ctx.lineTo(subX, cy - 30); ctx.lineTo(subX + 30, cy + 40); ctx.lineTo(40, cy + 40);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = C_PRIMARY; ctx.lineWidth = 2; ctx.stroke();

      // Right (continental) plate — stationary
      ctx.fillStyle = "#3a2010";
      ctx.beginPath();
      ctx.moveTo(cx + 10, cy - 30); ctx.lineTo(W - 40, cy - 30); ctx.lineTo(W - 40, cy + 40); ctx.lineTo(cx + 10, cy + 40);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = C_AMBER; ctx.lineWidth = 2; ctx.stroke();

      // Mountain growing at collision zone
      const mH = off * 2.5;
      if (mH > 5) {
        ctx.beginPath();
        ctx.moveTo(cx - 20 - off * 0.3, cy - 30);
        ctx.lineTo(cx, cy - 30 - mH);
        ctx.lineTo(cx + 20 + off * 0.3, cy - 30);
        ctx.closePath();
        ctx.fillStyle = "#5a4030"; ctx.fill();
        ctx.strokeStyle = C_AMBER; ctx.lineWidth = 1.5; ctx.stroke();
        // snow cap
        if (mH > 20) {
          ctx.beginPath();
          ctx.moveTo(cx - 8, cy - 30 - mH + 15);
          ctx.lineTo(cx, cy - 30 - mH);
          ctx.lineTo(cx + 8, cy - 30 - mH + 15);
          ctx.closePath();
          ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.fill();
        }
      }

      ctx.fillStyle = C_DIM; ctx.font = "9px Inter,sans-serif"; ctx.textAlign = "center";
      ctx.fillText("Ocean plate subducts → mountain range forms", cx, cy + 60);
    } else if (type === 1) {
      // divergent — plates move apart, magma rises
      ctx.fillStyle = "#3a2010";
      ctx.beginPath(); ctx.moveTo(40, cy); ctx.lineTo(cx - 20 - off, cy); ctx.lineTo(cx - 20 - off, cy + 80); ctx.lineTo(40, cy + 80); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = C_AMBER; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + 20 + off, cy); ctx.lineTo(W - 40, cy); ctx.lineTo(W - 40, cy + 80); ctx.lineTo(cx + 20 + off, cy + 80); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = C_RED; ctx.lineWidth = 2; ctx.stroke();
      // magma
      ctx.fillStyle = "#ff4400";
      ctx.beginPath(); ctx.moveTo(cx - 10, cy + 80); ctx.lineTo(cx, cy + 10); ctx.lineTo(cx + 10, cy + 80); ctx.closePath(); ctx.fill();
    } else {
      // transform
      ctx.fillStyle = "#3a2010";
      ctx.fillRect(40, cy - 40, cx - 40 - off, 80);
      ctx.strokeStyle = C_AMBER; ctx.lineWidth = 2; ctx.strokeRect(40, cy - 40, cx - 40 - off, 80);
      ctx.fillStyle = "#2a1a0a";
      ctx.fillRect(cx + off, cy - 10, W - cx - off - 40, 80);
      ctx.strokeStyle = C_RED; ctx.lineWidth = 2; ctx.strokeRect(cx + off, cy - 10, W - cx - off - 40, 80);
      ctx.fillStyle = C_DIM; ctx.font = "9px Inter,sans-serif"; ctx.textAlign = "center";
      ctx.fillText("Plates slide past each other — earthquakes", cx, cy + 100);
    }
    ctx.fillStyle = C_FG; ctx.font = "bold 12px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText(types[type], cx, 30);
  }, [type, offset]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={
      <>
        <SectionLabel>Boundary Type</SectionLabel>
        {types.map((t, i) => (
          <button key={t} onClick={() => setType(i)}
            className={`w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors border ${i === type ? "bg-primary/20 text-primary border-primary/30" : "text-muted-foreground hover:text-foreground hover:bg-secondary border-transparent"}`}>
            {t}
          </button>
        ))}
        <Slider label="Movement" value={offset} min={0} max={40} onChange={setOffset} unit=" km" />
      </>
    } />
  );
}

// ── 2. Stellar Lifecycle ─────────────────────────────────────────────────────
export function StellarLifecycle() {
  const [progress, setProgress] = useState(0);
  const stages = [
    "Nebula", "Protostar", "Main Sequence", "Red Giant", "Supernova", "Neutron Star / Black Hole",
  ];
  const stage = Math.min(Math.floor(progress / (100 / 6)), 5);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tRef = useRef(0);
  useRaf((t) => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height, cx = W / 2, cy = H / 2;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    // star field
    for (let i = 0; i < 40; i++) {
      const sx = (i * 137.5) % W, sy = (i * 89.3) % H;
      ctx.beginPath(); ctx.arc(sx, sy, 1, 0, TAU); ctx.fillStyle = C_DIM; ctx.fill();
    }
    if (stage === 0) {
      // nebula: diffuse cloud
      for (let i = 0; i < 30; i++) {
        const nx = cx + Math.sin(i * 2.4 + t * 0.3) * 80 + i * 5 - 75;
        const ny = cy + Math.cos(i * 1.8 + t * 0.2) * 60;
        ctx.beginPath(); ctx.arc(nx, ny, 8 + (i % 4) * 4, 0, TAU);
        ctx.fillStyle = `rgba(100,80,150,${0.05 + (i % 5) * 0.03})`; ctx.fill();
      }
    } else if (stage === 1) {
      const r = 30 + Math.sin(t * 3) * 5;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, "#ffcc44"); grad.addColorStop(1, "#ff440000");
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fillStyle = grad; ctx.fill();
    } else if (stage === 2) {
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 50);
      grad.addColorStop(0, "#ffffcc"); grad.addColorStop(0.5, "#ffcc44"); grad.addColorStop(1, "#ff880000");
      ctx.beginPath(); ctx.arc(cx, cy, 50, 0, TAU); ctx.fillStyle = grad; ctx.fill();
    } else if (stage === 3) {
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 100);
      grad.addColorStop(0, "#ffcc44"); grad.addColorStop(0.7, "#ff4400"); grad.addColorStop(1, "#ff000000");
      ctx.beginPath(); ctx.arc(cx, cy, 100, 0, TAU); ctx.fillStyle = grad; ctx.fill();
    } else if (stage === 4) {
      // supernova explosion
      const r2 = 60 + Math.sin(t * 6) * 30;
      for (let i = 0; i < 12; i++) {
        const angle = TAU * i / 12 + t;
        ctx.strokeStyle = C_AMBER; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + r2 * Math.cos(angle), cy + r2 * Math.sin(angle)); ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(cx, cy, 20, 0, TAU); ctx.fillStyle = "#ffffff"; ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(cx, cy, 15, 0, TAU); ctx.fillStyle = "#111133"; ctx.fill();
      ctx.strokeStyle = C_PURPLE; ctx.lineWidth = 2;
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath(); ctx.arc(cx, cy, i * 25, 0, TAU); ctx.globalAlpha = 1 / i; ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = C_FG; ctx.font = "bold 12px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText(stages[stage], cx, H - 20);
  }, true);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={
      <>
        <StepNav steps={stages} current={stage} onChange={i => setProgress(i * (100 / 6) + 8)} />
        <Slider label="Stellar Age" value={progress} min={0} max={100} onChange={setProgress} unit="%" />
      </>
    } />
  );
}

// ── 3. Black Hole ────────────────────────────────────────────────────────────
export function BlackHole() {
  const [mass, setMass] = useState(50);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tRef = useRef(0);
  useRaf((t) => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height, cx = W / 2, cy = H / 2;
    ctx.fillStyle = "#000008"; ctx.fillRect(0, 0, W, H);
    // accretion disk
    const rs = mass * 0.6; // Schwarzschild radius proxy
    for (let r = rs * 3; r > rs; r -= 3) {
      const alpha = (r - rs) / (rs * 2);
      const hue = lerp(30, 0, alpha);
      ctx.beginPath(); ctx.ellipse(cx, cy, r * 1.5, r * 0.3, 0, 0, TAU);
      ctx.strokeStyle = `hsla(${hue},90%,60%,${alpha * 0.3})`; ctx.lineWidth = 3; ctx.stroke();
    }
    // gravitational lensing
    for (let i = 0; i < 20; i++) {
      const sx = (i * 137.5) % W, sy = (i * 89.3) % H;
      const dx = sx - cx, dy = sy - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < rs * 3 && dist > rs) {
        const bend = (rs * 2 / dist) * 0.3;
        const nx = sx + (cx - sx) * bend, ny = sy + (cy - sy) * bend;
        ctx.beginPath(); ctx.arc(nx, ny, 1.5, 0, TAU); ctx.fillStyle = C_FG; ctx.fill();
      } else if (dist >= rs * 3) {
        ctx.beginPath(); ctx.arc(sx, sy, 1, 0, TAU); ctx.fillStyle = C_DIM; ctx.fill();
      }
    }
    // event horizon
    ctx.beginPath(); ctx.arc(cx, cy, rs, 0, TAU);
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rs);
    grad.addColorStop(0, "#000000"); grad.addColorStop(1, "#000008");
    ctx.fillStyle = grad; ctx.fill();
    ctx.fillStyle = C_DIM; ctx.font = "9px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText(`Event horizon r = ${rs.toFixed(0)} km`, cx, H - 15);
    ctx.fillText(`M = ${mass} M☉`, cx, H - 28);
  }, true);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={
      <>
        <Slider label="Black Hole Mass" value={mass} min={10} max={100} onChange={setMass} unit=" M☉" />
        <Stat label="Schwarzschild r" value={`${(mass * 0.6).toFixed(0)} km`} />
        <Stat label="Escape velocity" value="= c (light)" />
      </>
    } />
  );
}

// ── 4. Kepler's Laws ─────────────────────────────────────────────────────────

/** Solve Kepler's equation M = E - e·sin(E) via Newton iteration → return true anomaly ν */
function keplerTrueAnomaly(M: number, e: number): number {
  let E = M;
  for (let i = 0; i < 50; i++) {
    const dE = (M - E + e * Math.sin(E)) / (1 - e * Math.cos(E));
    E += dE;
    if (Math.abs(dE) < 1e-10) break;
  }
  const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
  return nu;
}

export function KeplerLaws() {
  const [law, setLaw] = useState(0); // 0 = 2nd law, 1 = 3rd law
  const [ecc, setEcc] = useState(0.55);
  const [speed, setSpeed] = useState(0.35); // overall orbit speed for 2nd law
  // 3rd law interactive planet
  const [law3A, setLaw3A] = useState(90);
  const law3T = Math.pow(law3A, 1.5) / 100;
  const setLaw3T = (newT: number) => { setLaw3A(Math.round(Math.pow(newT * 100, 2 / 3))); };
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const laws = ["2nd Law — Equal Areas", "3rd Law — T² ∝ a³"];

  useRaf((t) => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height, cx = W / 2, cy = H / 2;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const a = 130, b = a * Math.sqrt(1 - ecc * ecc);
    const foci = a * ecc;

    if (law === 0) {
      // Ellipse — center offset so sun is at one focus
      ctx.beginPath(); ctx.ellipse(cx - foci, cy, a, b, 0, 0, TAU);
      ctx.strokeStyle = C_DIM; ctx.lineWidth = 1.5; ctx.stroke();

      // Sun at occupied focus
      ctx.beginPath(); ctx.arc(cx, cy, 11, 0, TAU);
      const sg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 11);
      sg.addColorStop(0, "#fff8c0"); sg.addColorStop(0.5, C_AMBER); sg.addColorStop(1, C_AMBER + "88");
      ctx.fillStyle = sg; ctx.fill();

      // True anomaly from Kepler's equation (correct speed variation)
      const M = (t * speed) % TAU;
      const nu = keplerTrueAnomaly(M, ecc);
      const r = a * (1 - ecc * ecc) / (1 + ecc * Math.cos(nu));
      const px = cx + r * Math.cos(nu);
      const py = cy - r * Math.sin(nu);

      // Swept area sector over a fixed Δt
      const dM = speed * 0.9; // fixed time window
      const M0 = ((M - dM) + TAU * 4) % TAU;
      const nu0 = keplerTrueAnomaly(M0, ecc);
      ctx.beginPath(); ctx.moveTo(cx, cy);
      for (let i = 0; i <= 50; i++) {
        const nuI = nu0 + ((nu - nu0 + TAU * 2) % TAU) * (i / 50);
        const ri = a * (1 - ecc * ecc) / (1 + ecc * Math.cos(nuI));
        ctx.lineTo(cx + ri * Math.cos(nuI), cy - ri * Math.sin(nuI));
      }
      ctx.closePath(); ctx.fillStyle = C_PRIMARY + "55"; ctx.fill();
      ctx.strokeStyle = C_PRIMARY + "99"; ctx.lineWidth = 1; ctx.stroke();

      // Speed label
      const isNearSun = r < a * 0.75;
      ctx.fillStyle = isNearSun ? C_GREEN : C_RED;
      ctx.font = "bold 10px Inter,sans-serif"; ctx.textAlign = "center";
      ctx.fillText(isNearSun ? "▲ faster" : "▼ slower", px, py - 16);

      ctx.beginPath(); ctx.arc(px, py, 8, 0, TAU); ctx.fillStyle = C_CYAN; ctx.fill();
      ctx.strokeStyle = "#ffffff22"; ctx.lineWidth = 1; ctx.stroke();

      // Perihelion / aphelion labels
      ctx.fillStyle = C_DIM; ctx.font = "9px Inter,sans-serif"; ctx.textAlign = "center";
      ctx.fillText("perihelion", cx + a * (1 - ecc), cy + 20);
      ctx.fillText("aphelion", cx - a * (1 + ecc) - foci * 0, cy + 20);
    } else {
      // 3rd law: three planets
      const K = 100;
      const planets = [
        { a: 50,    color: C_PRIMARY, label: "a=50" },
        { a: law3A, color: C_GREEN,   label: `a=${law3A}` },
        { a: 160,   color: C_AMBER,   label: "a=160" },
      ];
      ctx.beginPath(); ctx.arc(cx, cy, 12, 0, TAU);
      const sg2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, 12);
      sg2.addColorStop(0, "#fff8c0"); sg2.addColorStop(0.5, C_AMBER); sg2.addColorStop(1, C_AMBER + "88");
      ctx.fillStyle = sg2; ctx.fill();

      planets.forEach(p => {
        const T = Math.pow(p.a, 1.5) / K;
        ctx.beginPath(); ctx.arc(cx, cy, p.a, 0, TAU);
        ctx.strokeStyle = C_GRID; ctx.lineWidth = 1; ctx.stroke();
        const angle = (t * 0.4 / T) % TAU;
        ctx.beginPath(); ctx.arc(cx + p.a * Math.cos(angle), cy + p.a * Math.sin(angle), 7, 0, TAU);
        ctx.fillStyle = p.color; ctx.fill();
        ctx.fillStyle = p.color; ctx.font = "9px Inter,sans-serif"; ctx.textAlign = "left";
        ctx.fillText(p.label, cx + p.a + 4, cy - 4);
        ctx.fillStyle = C_DIM;
        ctx.fillText(`T=${T.toFixed(1)}`, cx + p.a + 4, cy + 8);
      });

      ctx.fillStyle = C_FG; ctx.font = "10px Inter,sans-serif"; ctx.textAlign = "center";
      ctx.fillText("T² ∝ a³  —  outer planets orbit slower", cx, H - 14);
    }
  }, true);

  const law3Tval = parseFloat(law3T.toFixed(2));

  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={
      <>
        <StepNav steps={laws} current={law} onChange={setLaw} />
        {law === 0 && (
          <>
            <Slider label="Eccentricity" value={ecc} min={0.1} max={0.85} step={0.05} onChange={setEcc} />
            <Slider label="Orbital speed" value={speed} min={0.05} max={1.0} step={0.05} onChange={setSpeed} />
          </>
        )}
        {law === 1 && (
          <>
            <Slider label="Semi-major axis (a)" value={law3A} min={55} max={145} step={5} onChange={setLaw3A} unit=" au" />
            <Slider label="Orbital period (T)" value={law3Tval} min={parseFloat((Math.pow(55,1.5)/100).toFixed(2))} max={parseFloat((Math.pow(145,1.5)/100).toFixed(2))} step={0.05} onChange={(v) => setLaw3T(v)} unit=" yr" />
            <Stat label="a³" value={(law3A ** 3).toLocaleString()} />
            <Stat label="T²" value={(law3Tval ** 2).toFixed(2)} />
            <Stat label="T² / a³" value={((law3Tval ** 2) / (law3A ** 3) * 1e4).toFixed(3) + " ×10⁻⁴"} />
          </>
        )}
      </>
    } />
  );
}

// ── 5. Big Bang ──────────────────────────────────────────────────────────────
export function BigBang() {
  const [time, setTime] = useState(50);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const eras = [
    [0, 10, "Planck / GUT Era"],
    [10, 30, "Quark-Lepton Era"],
    [30, 50, "Nucleosynthesis"],
    [50, 70, "Recombination — CMB"],
    [70, 85, "Dark Ages"],
    [85, 100, "First Stars & Galaxies"],
  ];
  const era = eras.find(([s, e]) => time >= s && time <= e) ?? eras[eras.length - 1];
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height, cx = W / 2, cy = H / 2;
    ctx.fillStyle = "#000008"; ctx.fillRect(0, 0, W, H);
    const scale = time / 100;
    const r = scale * 220;
    // universe bubble
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r + 20);
    grad.addColorStop(0, time < 30 ? "#ff8800" : time < 70 ? "#ff440044" : "#11111188");
    grad.addColorStop(1, "#00000000");
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU);
    ctx.fillStyle = grad; ctx.fill();
    ctx.strokeStyle = time < 50 ? C_AMBER : C_DIM; ctx.lineWidth = 1.5; ctx.stroke();
    // particles
    const count = Math.floor(scale * 40);
    for (let i = 0; i < count; i++) {
      const angle = TAU * i / count;
      const pr = r * 0.7 * (0.5 + 0.5 * ((i * 7 + 3) % 11) / 10);
      ctx.beginPath(); ctx.arc(cx + pr * Math.cos(angle), cy + pr * Math.sin(angle), 2, 0, TAU);
      ctx.fillStyle = time < 50 ? C_AMBER : C_CYAN; ctx.fill();
    }
    ctx.fillStyle = C_FG; ctx.font = "11px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText(era[2] as string, cx, H - 20);
  }, [time]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={
      <>
        <Slider label="Cosmic time" value={time} min={1} max={100} onChange={setTime} unit="%" />
        <SectionLabel>Era</SectionLabel>
        {eras.map(([s, e, name]) => (
          <button key={name as string} onClick={() => setTime(Math.round(((s as number) + (e as number)) / 2))}
            className={`w-full rounded-lg px-2 py-1 text-left text-xs font-medium transition-colors border ${time >= (s as number) && time <= (e as number) ? "bg-primary/20 text-primary border-primary/30" : "text-muted-foreground hover:text-foreground hover:bg-secondary border-transparent"}`}>
            {name as string}
          </button>
        ))}
      </>
    } />
  );
}

// ── 6. Exoplanet Transit ─────────────────────────────────────────────────────
export function ExoplanetTransit() {
  const [planetSize, setPlanetSize] = useState(15);
  const [period, setPeriod] = useState(5);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tRef = useRef(0);
  useRaf((t) => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const starR = 50, starX = W / 2, starY = 100;
    // star
    const grad = ctx.createRadialGradient(starX, starY, 0, starX, starY, starR);
    grad.addColorStop(0, "#ffffcc"); grad.addColorStop(0.5, "#ffcc44"); grad.addColorStop(1, "#ff880000");
    ctx.beginPath(); ctx.arc(starX, starY, starR, 0, TAU); ctx.fillStyle = grad; ctx.fill();
    // planet orbit
    const phase = ((t / period) % 1);
    const px = W * 0.1 + phase * W * 0.8;
    const py = starY + (phase > 0.3 && phase < 0.7 ? 0 : 40 * Math.sin((phase - 0.5) * TAU));
    ctx.beginPath(); ctx.arc(px, py, planetSize, 0, TAU);
    ctx.fillStyle = C_PRIMARY + "cc"; ctx.fill();
    // light curve
    const lcY = 240, lcH = 60, lcX = 40, lcW = W - 80;
    drawAxes(ctx, lcX, lcY + lcH, lcW, lcH, "Time", "Flux");
    const pts: [number, number][] = [];
    for (let i = 0; i < 200; i++) {
      const ph = i / 200;
      const inTransit = ph > 0.4 && ph < 0.6;
      const dip = inTransit ? 1 - (planetSize / starR) ** 2 * 0.8 : 1;
      pts.push([lcX + ph * lcW, lcY + lcH - dip * lcH]);
    }
    drawCurve(ctx, pts, C_CYAN, 2);
    // current position on light curve
    const lx = lcX + phase * lcW;
    ctx.beginPath(); ctx.arc(lx, lcY + lcH - (phase > 0.4 && phase < 0.6 ? 1 - (planetSize / starR) ** 2 * 0.8 : 1) * lcH, 5, 0, TAU);
    ctx.fillStyle = C_AMBER; ctx.fill();
  }, true);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={
      <>
        <Slider label="Planet Size" value={planetSize} min={5} max={35} onChange={setPlanetSize} unit=" px" />
        <Slider label="Orbital Period" value={period} min={2} max={10} onChange={setPeriod} unit=" s" />
        <Stat label="Flux dip" value={`${((planetSize / 50) ** 2 * 80).toFixed(1)}%`} />
        <Stat label="Method" value="Photometry" />
      </>
    } />
  );
}

// ── 7. Volcanism ─────────────────────────────────────────────────────────────
export function Volcanism() {
  const [erupting, setErupting] = useState(false);
  const [type, setType] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const types = ["Shield (Hawaii)", "Stratovolcano", "Caldera"];
  const tRef = useRef(0);
  useRaf((t) => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height, cx = W / 2;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const baseY = H - 40;
    // volcano shape
    const profiles = [
      { w: 240, h: 120, slope: 0.5 },
      { w: 140, h: 200, slope: 0.8 },
      { w: 200, h: 80, slope: 0.4 },
    ];
    const p = profiles[type];
    ctx.beginPath(); ctx.moveTo(cx - p.w, baseY);
    ctx.lineTo(cx - 15, baseY - p.h); ctx.lineTo(cx + 15, baseY - p.h);
    ctx.lineTo(cx + p.w, baseY); ctx.closePath();
    ctx.fillStyle = "#3a2010"; ctx.fill();
    ctx.strokeStyle = C_AMBER + "44"; ctx.lineWidth = 1; ctx.stroke();
    // magma chamber
    ctx.beginPath(); ctx.ellipse(cx, baseY - p.h * 0.4, 50, 25, 0, 0, TAU);
    ctx.fillStyle = "#ff440044"; ctx.fill();
    // vent line
    ctx.beginPath(); ctx.moveTo(cx, baseY - p.h * 0.4); ctx.lineTo(cx, baseY - p.h + 5);
    ctx.strokeStyle = "#ff4400"; ctx.lineWidth = 3; ctx.stroke();
    // eruption
    if (erupting) {
      for (let i = 0; i < 20; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
        const speed = 40 + Math.random() * 60;
        const age = (t * 1.5 + i * 0.3) % 1;
        const ex = cx + Math.cos(angle) * speed * age * 2;
        const ey = baseY - p.h + Math.sin(angle) * speed * age * 2 + age * age * 100;
        ctx.beginPath(); ctx.arc(ex, ey, 4 * (1 - age), 0, TAU);
        ctx.fillStyle = `rgba(255,${Math.floor(100 * (1 - age))},0,${1 - age})`; ctx.fill();
      }
      // lava flow
      ctx.beginPath(); ctx.moveTo(cx, baseY - p.h);
      ctx.quadraticCurveTo(cx + 40, baseY - p.h / 2, cx + p.w * 0.6, baseY);
      ctx.strokeStyle = "#ff4400aa"; ctx.lineWidth = 8; ctx.stroke();
    }
    ctx.fillStyle = C_FG; ctx.font = "bold 11px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText(types[type], cx, 30);
  }, true);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={
      <>
        <SectionLabel>Volcano Type</SectionLabel>
        {types.map((t, i) => (
          <button key={t} onClick={() => setType(i)}
            className={`w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors border ${i === type ? "bg-primary/20 text-primary border-primary/30" : "text-muted-foreground hover:text-foreground hover:bg-secondary border-transparent"}`}>
            {t}
          </button>
        ))}
        <button onClick={() => setErupting(e => !e)}
          className={`w-full rounded-lg px-3 py-2 text-xs font-semibold border transition-colors ${erupting ? "bg-red-500/20 text-red-400 border-red-500/30" : "border-border text-muted-foreground"}`}>
          {erupting ? "Erupting!" : "Trigger Eruption"}
        </button>
      </>
    } />
  );
}

// ── 8. Atmosphere Layers ─────────────────────────────────────────────────────
export function AtmosphereLayers() {
  const [altitude, setAltitude] = useState(20);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layers = [
    { name: "Troposphere", h: 12, color: "#1a3a6a" },
    { name: "Stratosphere", h: 50, color: "#0a2a4a" },
    { name: "Mesosphere", h: 85, color: "#051a30" },
    { name: "Thermosphere", h: 600, color: "#030e1a" },
    { name: "Exosphere", h: 10000, color: "#010608" },
  ];
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const maxH = 700, bh = H - 40, bx = 60;
    const logH = (h: number) => Math.log(h + 1) / Math.log(maxH + 1);
    layers.forEach((l, i) => {
      const nextH = i + 1 < layers.length ? layers[i + 1].h : maxH;
      const y1 = H - 20 - logH(nextH) * bh;
      const y2 = H - 20 - logH(l.h) * bh;
      ctx.fillStyle = l.color; ctx.fillRect(bx, y1, W - bx - 20, y2 - y1);
      ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.lineWidth = 1;
      ctx.strokeRect(bx, y1, W - bx - 20, y2 - y1);
      ctx.fillStyle = C_DIM; ctx.font = "9px Inter,sans-serif"; ctx.textAlign = "left";
      ctx.fillText(l.name, bx + 6, (y1 + y2) / 2 + 3);
      ctx.textAlign = "right";
      ctx.fillText(`${l.h} km`, W - 25, (y1 + y2) / 2 + 3);
    });
    // altitude marker
    const altLogY = H - 20 - logH(altitude) * bh;
    ctx.strokeStyle = C_AMBER; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(bx, altLogY); ctx.lineTo(W - 20, altLogY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C_AMBER; ctx.font = "10px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText(`${altitude} km`, bx + 40, altLogY - 5);
  }, [altitude]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={
      <>
        <Slider label="Altitude" value={altitude} min={0} max={600} onChange={setAltitude} unit=" km" />
        <SectionLabel>Layer</SectionLabel>
        {layers.map(l => (
          <Stat key={l.name} label={l.name} value={`0–${l.h} km`} />
        ))}
      </>
    } />
  );
}

// ── 9. Ocean Currents ────────────────────────────────────────────────────────
export function OceanCurrents() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showDeep, setShowDeep] = useState(false);
  const tRef = useRef(0);
  useRaf((t) => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height;
    ctx.fillStyle = "#040c18"; ctx.fillRect(0, 0, W, H);
    // simplified world landmasses (rectangles)
    ctx.fillStyle = "#2a1a0a";
    ctx.fillRect(0.1 * W, 0.1 * H, 0.15 * W, 0.5 * H); // Americas
    ctx.fillRect(0.55 * W, 0.05 * H, 0.18 * W, 0.45 * H); // Europe/Africa
    ctx.fillRect(0.75 * W, 0.05 * H, 0.2 * W, 0.35 * H); // Asia
    // surface currents (warm = red, cold = blue)
    const currents = showDeep ? [
      { pts: [[0.3, 0.8], [0.3, 0.2], [0.7, 0.2], [0.9, 0.5], [0.7, 0.8], [0.3, 0.8]], color: C_CYAN },
    ] : [
      { pts: [[0.25, 0.3], [0.5, 0.2], [0.73, 0.3], [0.5, 0.6], [0.25, 0.3]], color: C_RED },
      { pts: [[0.25, 0.7], [0.5, 0.8], [0.73, 0.7]], color: C_PRIMARY },
    ];
    currents.forEach(cur => {
      const phase = (t * 0.2) % 1;
      ctx.strokeStyle = cur.color; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
      ctx.beginPath();
      cur.pts.forEach(([x, y], i) => {
        const px = x * W, py = y * H;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      });
      ctx.stroke(); ctx.setLineDash([]);
      // animated dot
      const totalPts = cur.pts.length;
      const seg = Math.floor(phase * (totalPts - 1));
      const segT = (phase * (totalPts - 1)) % 1;
      if (seg < totalPts - 1) {
        const [x1, y1] = cur.pts[seg], [x2, y2] = cur.pts[seg + 1];
        const dx = lerp(x1, x2, segT) * W, dy = lerp(y1, y2, segT) * H;
        ctx.beginPath(); ctx.arc(dx, dy, 6, 0, TAU); ctx.fillStyle = cur.color; ctx.fill();
      }
    });
    ctx.fillStyle = C_DIM; ctx.font = "10px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText(showDeep ? "Thermohaline deep circulation" : "Surface wind-driven currents", W / 2, H - 15);
  }, true);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={
      <>
        <SectionLabel>Current Type</SectionLabel>
        <button onClick={() => setShowDeep(false)}
          className={`w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors border ${!showDeep ? "bg-primary/20 text-primary border-primary/30" : "text-muted-foreground hover:text-foreground hover:bg-secondary border-transparent"}`}>
          Surface currents
        </button>
        <button onClick={() => setShowDeep(true)}
          className={`w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors border ${showDeep ? "bg-primary/20 text-primary border-primary/30" : "text-muted-foreground hover:text-foreground hover:bg-secondary border-transparent"}`}>
          Thermohaline (deep)
        </button>
        <Stat label="Driver" value={showDeep ? "Density (T & salinity)" : "Wind + Coriolis"} />
      </>
    } />
  );
}

// ── 10. Glacial Retreat ──────────────────────────────────────────────────────
export function GlacialRetreat() {
  const [year, setYear] = useState(1900);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height, cx = W / 2;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const progress = (year - 1900) / 125;
    const glacierW = lerp(W - 40, W * 0.3, progress);
    const glacierH = lerp(160, 60, progress);
    // mountain
    ctx.beginPath(); ctx.moveTo(cx, 30); ctx.lineTo(cx + 150, H - 40); ctx.lineTo(cx - 150, H - 40); ctx.closePath();
    ctx.fillStyle = "#3a3a3a"; ctx.fill();
    // glacier
    ctx.beginPath(); ctx.moveTo(cx, 30);
    ctx.bezierCurveTo(cx + glacierW * 0.3, 50, cx + glacierW * 0.5, 60 + glacierH, cx - glacierW * 0.1, 60 + glacierH);
    ctx.bezierCurveTo(cx - glacierW * 0.4, 60 + glacierH * 0.8, cx - glacierW * 0.3, 50, cx, 30);
    ctx.fillStyle = `rgba(200,230,255,${0.9 - progress * 0.4})`; ctx.fill();
    // melt water
    if (progress > 0.1) {
      ctx.beginPath();
      ctx.arc(cx - glacierW * 0.1, 65 + glacierH + (progress - 0.1) * 40, (progress) * 25, 0, TAU);
      ctx.fillStyle = C_CYAN + "66"; ctx.fill();
    }
    ctx.fillStyle = C_FG; ctx.font = "bold 13px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText(`Year: ${year}`, cx, H - 15);
    ctx.fillStyle = C_DIM; ctx.font = "10px Inter,sans-serif";
    ctx.fillText(`Glacier area: ${(100 - progress * 70).toFixed(0)}%`, cx, H - 30);
  }, [year]);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={
      <>
        <Slider label="Year" value={year} min={1900} max={2025} onChange={setYear} />
        <Stat label="CO₂ ppm" value={`${Math.round(lerp(280, 420, (year - 1900) / 125))}`} />
        <Stat label="Temp anomaly" value={`+${lerp(0, 1.2, (year - 1900) / 125).toFixed(2)}°C`} />
      </>
    } />
  );
}

// ── 11. Greenhouse Effect ────────────────────────────────────────────────────
export function GreenhouseEffect() {
  const [co2, setCo2] = useState(420);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tRef = useRef(0);
  useRaf((t) => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height;
    ctx.fillStyle = "#040c18"; ctx.fillRect(0, 0, W, H);
    // atmosphere layer
    const opacity = clamp((co2 - 280) / 500, 0.1, 0.7);
    ctx.fillStyle = `rgba(40,80,30,${opacity})`;
    ctx.fillRect(0, 0, W, H * 0.45);
    ctx.fillStyle = "rgba(30,60,100,0.3)"; ctx.fillText("Atmosphere", 10, 20);
    ctx.fillStyle = C_DIM; ctx.font = "10px Inter,sans-serif"; ctx.textAlign = "left";
    ctx.fillText(`CO₂: ${co2} ppm`, 10, 20);
    // ground
    ctx.fillStyle = "#2a3a1a"; ctx.fillRect(0, H * 0.8, W, H * 0.2);
    // sun
    ctx.beginPath(); ctx.arc(W * 0.85, H * 0.1, 28, 0, TAU);
    const sg = ctx.createRadialGradient(W * 0.85, H * 0.1, 0, W * 0.85, H * 0.1, 28);
    sg.addColorStop(0, "#ffffcc"); sg.addColorStop(1, "#ffcc4400");
    ctx.fillStyle = sg; ctx.fill();
    // solar radiation arrows (incoming)
    for (let i = 0; i < 3; i++) {
      const phase = (t * 0.5 + i * 0.33) % 1;
      const ry = H * 0.1 + phase * H * 0.6;
      const rx = W * 0.7 + i * 30;
      ctx.strokeStyle = C_AMBER; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(rx, ry - 15); ctx.lineTo(rx, ry); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(rx - 4, ry - 8); ctx.lineTo(rx, ry); ctx.lineTo(rx + 4, ry - 8); ctx.stroke();
    }
    // re-radiation arrows (trapped)
    const trapCount = Math.floor(opacity * 6);
    for (let i = 0; i < trapCount; i++) {
      const phase = (t * 0.3 + i * 0.2) % 1;
      const ry = H * 0.8 - phase * H * 0.4;
      const rx = 50 + i * 70;
      ctx.strokeStyle = C_RED + "cc"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(rx, ry + 12); ctx.lineTo(rx, ry); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(rx - 4, ry + 8); ctx.lineTo(rx, ry); ctx.lineTo(rx + 4, ry + 8); ctx.stroke();
    }
    const tempIncrease = ((co2 - 280) / 500 * 3).toFixed(2);
    ctx.fillStyle = C_RED; ctx.font = "11px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText(`ΔT ≈ +${tempIncrease}°C above pre-industrial`, W / 2, H - 15);
  }, true);
  return (
    <ModelWrap viz={<canvas ref={canvasRef} width={580} height={340} className="w-full h-full" />} controls={
      <>
        <Slider label="CO₂ concentration" value={co2} min={280} max={1000} onChange={setCo2} unit=" ppm" />
        <Stat label="Pre-industrial" value="280 ppm" />
        <Stat label="Current (2024)" value="~420 ppm" />
        <Stat label="IPCC 2°C budget" value="~450 ppm" />
      </>
    } />
  );
}
