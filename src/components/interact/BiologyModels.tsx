import { useRef, useState, useEffect } from "react";
import {
  ModelWrap, Slider, Stat, SectionLabel, StepNav, useRaf,
  C_BG, C_FG, C_DIM, C_PRIMARY, C_GREEN, C_RED, C_AMBER, C_CYAN, C_PURPLE,
  clamp, lerp, TAU, drawAxes, drawCurve,
} from "./shared";

// ─────────────────────────────────────────────────────────────────────────────
// 1. Mitosis & Meiosis
// ─────────────────────────────────────────────────────────────────────────────
const MIT_PHASES = ["Interphase", "Prophase", "Metaphase", "Anaphase", "Telophase"];

function drawChromosome(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, angle = 0) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(angle);
  ctx.strokeStyle = color; ctx.lineWidth = 6; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(9, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 12); ctx.stroke();
  ctx.restore();
}

export function MitosisMeiosis() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState(0);

  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2 - 10;
    const cr = 90;

    if (step < 4) {
      ctx.strokeStyle = C_GREEN; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(cx, cy, cr, cr * 0.9, 0, 0, TAU); ctx.stroke();
    }
    const col = mode === 0 ? C_PRIMARY : C_CYAN;

    if (step === 0) {
      ctx.fillStyle = "rgba(91,127,239,0.12)";
      ctx.beginPath(); ctx.ellipse(cx, cy, 36, 36, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = C_PRIMARY; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(cx, cy, 36, 36, 0, 0, TAU); ctx.stroke();
      ctx.strokeStyle = "rgba(91,127,239,0.5)"; ctx.lineWidth = 1.5;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * 14, cy + Math.sin(a) * 14);
        ctx.quadraticCurveTo(cx + Math.cos(a + 0.6) * 28, cy + Math.sin(a + 0.6) * 28,
          cx + Math.cos(a + 1.2) * 20, cy + Math.sin(a + 1.2) * 20);
        ctx.stroke();
      }
    }
    if (step === 1) {
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU;
        drawChromosome(ctx, cx + Math.cos(a) * 38, cy + Math.sin(a) * 38, col, a);
        if (mode === 1) drawChromosome(ctx, cx + Math.cos(a) * 54, cy + Math.sin(a) * 54, C_RED, a);
      }
    }
    if (step === 2) {
      ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 1; ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.moveTo(cx, cy - cr); ctx.lineTo(cx, cy + cr); ctx.stroke();
      ctx.setLineDash([]);
      for (let i = 0; i < 4; i++) {
        const py = cy - 44 + i * 30;
        drawChromosome(ctx, mode === 0 ? cx : cx - 14, py, col);
        if (mode === 1) drawChromosome(ctx, cx + 14, py, C_RED);
      }
      ctx.fillStyle = C_AMBER;
      ctx.beginPath(); ctx.arc(cx - cr + 14, cy, 5, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + cr - 14, cy, 5, 0, TAU); ctx.fill();
    }
    if (step === 3) {
      for (let i = 0; i < 4; i++) {
        const py = cy - 44 + i * 30;
        drawChromosome(ctx, cx - 52, py, col);
        drawChromosome(ctx, cx + 52, py, mode === 0 ? col : C_RED);
      }
    }
    if (step === 4) {
      for (const dx of [-72, 72]) {
        ctx.strokeStyle = C_GREEN; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(cx + dx, cy, 55, 55, 0, 0, TAU); ctx.stroke();
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * TAU;
          drawChromosome(ctx, cx + dx + Math.cos(a) * 22, cy + Math.sin(a) * 22, col, a);
        }
      }
    }
    ctx.fillStyle = C_FG; ctx.font = "bold 13px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText(MIT_PHASES[step], cx, H - 16);
  }, [step, mode]);

  return (
    <ModelWrap
      viz={<canvas ref={ref} width={580} height={340} className="w-full h-full" />}
      controls={
        <>
          <SectionLabel>Mode</SectionLabel>
          <div className="flex gap-1.5">
            {["Mitosis", "Meiosis I"].map((m, i) => (
              <button key={m} onClick={() => setMode(i)}
                className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium border transition-colors
                  ${mode === i ? "bg-primary/20 text-primary border-primary/30" : "text-muted-foreground border-transparent hover:bg-secondary"}`}>
                {m}
              </button>
            ))}
          </div>
          <StepNav steps={MIT_PHASES} current={step} onChange={setStep} />
          <Slider label="Phase" value={step} min={0} max={4} step={1} onChange={setStep} />
          <div className="space-y-1">
            <Stat label="Daughter cells" value={step === 4 ? "2" : "—"} />
            <Stat label="Chromosome # (2n)" value="4 (simplified)" />
          </div>
        </>
      }
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. DNA Double Helix
// ─────────────────────────────────────────────────────────────────────────────
const BASE_NAMES = ["A-T", "G-C", "T-A", "C-G", "A-T"];
const BASE_DETAILS: Record<string, string> = {
  "A-T": "Adenine (A) — Thymine (T) | Hydrogen bonds: 2",
  "G-C": "Guanine (G) — Cytosine (C) | Hydrogen bonds: 3",
  "T-A": "Thymine (T) — Adenine (A) | Hydrogen bonds: 2",
  "C-G": "Cytosine (C) — Guanine (G) | Hydrogen bonds: 3",
};

export function DNADoubleHelix() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [speed, setSpeed] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [hoverBase, setHoverBase] = useState<string | null>(null);
  const phaseRef = useRef(0);
  const lastTRef = useRef(0);
  const playingRef = useRef(false);
  const speedRef = useRef(1);
  useEffect(() => { playingRef.current = playing; }, [playing]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  const basePosRef = useRef<{x1:number;x2:number;y:number;idx:number}[]>([]);

  useRaf((t) => {
    const dt = t - lastTRef.current; lastTRef.current = t;
    if (playingRef.current) phaseRef.current += dt * speedRef.current * 1.4;
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const cx = W / 2, amp = 80, rows = 16;
    const spacing = H / rows;
    const phase = phaseRef.current;
    const baseColors: [string, string][] = [[C_PRIMARY, C_RED], [C_GREEN, C_AMBER], [C_CYAN, C_RED], [C_PRIMARY, C_PURPLE], [C_GREEN, C_CYAN]];

    for (const sign of [1, -1]) {
      ctx.strokeStyle = sign === 1 ? "rgba(91,127,239,0.7)" : "rgba(34,211,238,0.7)";
      ctx.lineWidth = 2.5; ctx.beginPath();
      for (let i = 0; i <= 80; i++) {
        const y = (i / 80) * H;
        const x = cx + sign * Math.sin((i / 80) * TAU * 2.5 + phase) * amp;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    const newPos: typeof basePosRef.current = [];
    for (let i = 0; i < rows + 2; i++) {
      const y = i * spacing - (phase * spacing / TAU / 2.5 * H) % spacing + spacing / 2;
      if (y < -10 || y > H + 10) continue;
      const frac = (i / rows);
      const ang = frac * TAU * 2.5 + phase;
      const x1 = cx + Math.sin(ang) * amp;
      const x2 = cx - Math.sin(ang) * amp;
      const [c1, c2] = baseColors[i % 5];
      ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
      ctx.fillStyle = c1; ctx.beginPath(); ctx.arc(x1, y, 5, 0, TAU); ctx.fill();
      ctx.fillStyle = c2; ctx.beginPath(); ctx.arc(x2, y, 5, 0, TAU); ctx.fill();
      newPos.push({x1, x2, y, idx: i % 5});
    }
    basePosRef.current = newPos;

    ctx.fillStyle = C_DIM; ctx.font = "10px Inter,sans-serif";
    ctx.textAlign = "left"; ctx.fillText("5′→3′", cx + amp + 10, 20);
    ctx.textAlign = "right"; ctx.fillText("3′→5′", cx - amp - 10, H - 10);
  }, true);

  return (
    <ModelWrap
      viz={
        <div className="w-full h-full relative"
          onMouseMove={e => {
            const canvas = ref.current; if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            const mx = (e.clientX - rect.left) * (580 / rect.width);
            const my = (e.clientY - rect.top) * (340 / rect.height);
            const hit = basePosRef.current.find(bp => {
              const d1 = Math.hypot(mx - bp.x1, my - bp.y);
              const d2 = Math.hypot(mx - bp.x2, my - bp.y);
              return d1 < 12 || d2 < 12;
            });
            setHoverBase(hit ? BASE_DETAILS[BASE_NAMES[hit.idx]] ?? null : null);
          }}
          onMouseLeave={() => setHoverBase(null)}>
          <canvas ref={ref} width={580} height={340} className="w-full h-full" />
          {hoverBase && (
            <div className="absolute top-2 left-2 bg-black/80 text-xs text-white rounded px-2 py-1 pointer-events-none">
              {hoverBase}
            </div>
          )}
        </div>
      }
      controls={
        <>
          <button onClick={() => setPlaying(p => !p)}
            className="w-full rounded-lg px-3 py-2 text-xs font-semibold bg-primary/20 text-primary border border-primary/30">
            {playing ? "⏸ Pause" : "▶ Play"}
          </button>
          <Slider label="Speed" value={speed} min={0.2} max={3} step={0.1} onChange={setSpeed} />
          <div className="space-y-1 mt-2">
            <Stat label="Human genome" value="~3 billion bp" />
            <Stat label="Helix diameter" value="2 nm" />
            <Stat label="Rise per base pair" value="0.34 nm" />
            <Stat label="Bases per turn" value="10.5" />
          </div>
          <p className="text-xs text-muted-foreground">Hover base pairs for info</p>
        </>
      }
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Photosynthesis
// ─────────────────────────────────────────────────────────────────────────────
export function Photosynthesis() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [light, setLight] = useState(50);
  const [co2, setCO2] = useState(50);

  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);

    const rate = (light / 100) * (co2 / 100);
    const atp = Math.round(rate * 18);
    const nadph = Math.round(rate * 12);
    const glucose = (rate * 1).toFixed(2);

    // Light reactions box (left)
    const lx = 100, ly = 80, lw = 160, lh = 180;
    ctx.fillStyle = "rgba(251,191,36,0.08)";
    ctx.fillRect(lx, ly, lw, lh);
    ctx.strokeStyle = C_AMBER; ctx.lineWidth = 1.5;
    ctx.strokeRect(lx, ly, lw, lh);
    ctx.fillStyle = C_AMBER; ctx.font = "bold 11px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText("LIGHT REACTIONS", lx + lw / 2, ly + 18);
    ctx.fillStyle = C_DIM; ctx.font = "10px Inter,sans-serif";
    ctx.fillText("(Thylakoid membrane)", lx + lw / 2, ly + 32);

    // Calvin cycle box (right)
    const rx = 320, ry = 80, rw = 160, rh = 180;
    ctx.fillStyle = "rgba(74,222,128,0.08)";
    ctx.fillRect(rx, ry, rw, rh);
    ctx.strokeStyle = C_GREEN; ctx.lineWidth = 1.5;
    ctx.strokeRect(rx, ry, rw, rh);
    ctx.fillStyle = C_GREEN; ctx.font = "bold 11px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText("CALVIN CYCLE", rx + rw / 2, ry + 18);
    ctx.fillStyle = C_DIM; ctx.font = "10px Inter,sans-serif";
    ctx.fillText("(Stroma)", rx + rw / 2, ry + 32);

    // Inputs to light reactions
    ctx.fillStyle = C_FG; ctx.font = "11px Inter,sans-serif"; ctx.textAlign = "right";
    ctx.fillText(`H₂O`, lx - 10, ly + 80);
    ctx.fillText(`Light (${light}%)`, lx - 10, ly + 100);
    ctx.strokeStyle = C_AMBER; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(lx - 5, ly + 77); ctx.lineTo(lx + 10, ly + 77); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(lx - 5, ly + 97); ctx.lineTo(lx + 10, ly + 97); ctx.stroke();

    // Outputs of light reactions → Calvin cycle
    const midY1 = ly + 110, midY2 = ly + 130;
    ctx.fillStyle = C_PRIMARY; ctx.font = "11px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText(`ATP (${atp})`, W / 2, midY1 - 6);
    ctx.fillText(`NADPH (${nadph})`, W / 2, midY2 + 6);
    ctx.strokeStyle = C_PRIMARY; ctx.lineWidth = 1.5;
    const arrX1 = lx + lw, arrX2 = rx;
    ctx.beginPath(); ctx.moveTo(arrX1, midY1); ctx.lineTo(arrX2, midY1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(arrX1, midY2); ctx.lineTo(arrX2, midY2); ctx.stroke();
    // arrowhead
    for (const y of [midY1, midY2]) {
      ctx.beginPath(); ctx.moveTo(arrX2, y); ctx.lineTo(arrX2 - 8, y - 4); ctx.lineTo(arrX2 - 8, y + 4); ctx.closePath(); ctx.fill();
    }

    // O2 output
    ctx.fillStyle = C_CYAN; ctx.textAlign = "center";
    ctx.fillText(`O₂ released`, lx + lw / 2, ly + 160);

    // CO2 input to Calvin
    ctx.fillStyle = C_FG; ctx.textAlign = "left";
    ctx.fillText(`CO₂ (${co2}%)`, rx + rw + 8, ry + 80);
    ctx.strokeStyle = C_GREEN; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(rx + rw + 5, ry + 77); ctx.lineTo(rx + rw - 10, ry + 77); ctx.stroke();

    // Glucose output
    ctx.fillStyle = C_GREEN; ctx.textAlign = "center";
    ctx.fillText(`Glucose: ${glucose} rel. units`, rx + rw / 2, ry + 160);

    // Summary
    ctx.fillStyle = C_DIM; ctx.font = "10px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText("6CO₂ + 6H₂O + light energy → C₆H₁₂O₆ + 6O₂", W / 2, H - 18);
  }, [light, co2]);

  return (
    <ModelWrap
      viz={<canvas ref={ref} width={580} height={340} className="w-full h-full" />}
      controls={
        <>
          <Slider label="Light Intensity" value={light} min={5} max={100} unit="%" onChange={setLight} color={C_AMBER} />
          <Slider label="CO₂ Level" value={co2} min={5} max={100} unit="%" onChange={setCO2} color={C_GREEN} />
          <div className="space-y-1 mt-2">
            <Stat label="ATP produced" value={`${Math.round((light / 100) * (co2 / 100) * 18)}`} />
            <Stat label="NADPH produced" value={`${Math.round((light / 100) * (co2 / 100) * 12)}`} />
          </div>
        </>
      }
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Human Circulatory System
// ─────────────────────────────────────────────────────────────────────────────
export function CirculatorySystem() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [bpm, setBpm] = useState(72);
  const [hoverChamber, setHoverChamber] = useState<string | null>(null);
  const CHAMBER_DESC: Record<string,string> = {
    RA: "Right Atrium — receives deoxygenated blood from the body via vena cava",
    LA: "Left Atrium — receives oxygenated blood from lungs via pulmonary veins",
    RV: "Right Ventricle — pumps deoxygenated blood to lungs via pulmonary artery",
    LV: "Left Ventricle — pumps oxygenated blood to the whole body via aorta",
  };

  useRaf((t) => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);

    const cx = W / 2, cy = H / 2 + 10;
    const beat = (t * bpm / 60) % 1;
    const pulse = beat < 0.15 ? Math.sin(beat / 0.15 * Math.PI) * 10 : 0;

    // Heart shape (4 chambers)
    const hw = 60 + pulse * 0.5, hh = 70 + pulse * 0.3;
    const hx = cx - 30, hy = cy - 20;

    // Right atrium
    ctx.fillStyle = "rgba(91,127,239,0.25)";
    ctx.strokeStyle = C_PRIMARY; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(hx - hw / 2 + 10, hy - hh / 4, 28, 22, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C_DIM; ctx.font = "9px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText("RA", hx - hw / 2 + 10, hy - hh / 4 + 4);

    // Left atrium
    ctx.fillStyle = "rgba(248,113,113,0.25)";
    ctx.strokeStyle = C_RED; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(hx + hw / 2 - 10, hy - hh / 4, 28, 22, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C_DIM;
    ctx.fillText("LA", hx + hw / 2 - 10, hy - hh / 4 + 4);

    // Right ventricle
    ctx.fillStyle = "rgba(91,127,239,0.35)";
    ctx.strokeStyle = C_PRIMARY; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(hx - hw / 2 + 12, hy + hh / 3, 30, 28, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C_DIM;
    ctx.fillText("RV", hx - hw / 2 + 12, hy + hh / 3 + 4);

    // Left ventricle
    ctx.fillStyle = "rgba(248,113,113,0.35)";
    ctx.strokeStyle = C_RED; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(hx + hw / 2 - 12, hy + hh / 3 + 4, 32, 30, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C_DIM;
    ctx.fillText("LV", hx + hw / 2 - 12, hy + hh / 3 + 8);

    // Animated blood particles on pulmonary circuit (right side = blue, deoxygenated)
    const pPhase = beat;
    const pLungX = cx - 155, pLungY = cy - 60;
    // Pulmonary artery (RV → lungs, blue)
    const px = lerp(cx - 48, pLungX, pPhase);
    const py = lerp(cy + 22, pLungY, pPhase);
    ctx.fillStyle = C_PRIMARY;
    ctx.beginPath(); ctx.arc(px, py, 5, 0, TAU); ctx.fill();
    // Pulmonary vein (lungs → LA, red)
    const px2 = lerp(pLungX, cx + 20, pPhase);
    const py2 = lerp(pLungY, cy - 28, pPhase);
    ctx.fillStyle = C_RED;
    ctx.beginPath(); ctx.arc(px2, py2, 5, 0, TAU); ctx.fill();

    // Aorta (LV → body, red)
    const bodyX = cx + 150, bodyY = cy + 60;
    const px3 = lerp(cx + 48, bodyX, pPhase);
    const py3 = lerp(cy + 40, bodyY, pPhase);
    ctx.fillStyle = C_RED;
    ctx.beginPath(); ctx.arc(px3, py3, 5, 0, TAU); ctx.fill();
    // Vena cava (body → RA, blue)
    const px4 = lerp(bodyX, cx - 60, pPhase);
    const py4 = lerp(bodyY, cy - 28, pPhase);
    ctx.fillStyle = C_PRIMARY;
    ctx.beginPath(); ctx.arc(px4, py4, 5, 0, TAU); ctx.fill();

    // Labels
    ctx.fillStyle = C_DIM; ctx.font = "10px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText("Lungs", pLungX, pLungY - 14);
    ctx.fillText("Body", bodyX, bodyY + 16);
    ctx.fillStyle = C_PRIMARY; ctx.fillText("Deoxygenated", 60, H - 20);
    ctx.fillStyle = C_RED; ctx.fillText("Oxygenated", W - 80, H - 20);

    ctx.fillStyle = C_FG; ctx.font = "bold 12px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText(`♥  ${bpm} bpm`, cx, H - 20);
  }, true);

  return (
    <ModelWrap
      viz={
        <div className="w-full h-full relative"
          onMouseMove={e => {
            const canvas = ref.current; if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            const mx = (e.clientX - rect.left) * (580 / rect.width);
            const my = (e.clientY - rect.top) * (340 / rect.height);
            const cx = 290, cy = 180;
            const chambers: {name:string;x:number;y:number}[] = [
              {name:"RA",x:cx-70,y:cy-40}, {name:"LA",x:cx+10,y:cy-40},
              {name:"RV",x:cx-68,y:cy+10}, {name:"LV",x:cx+8,y:cy+14},
            ];
            const hit = chambers.find(c => Math.hypot(mx - c.x, my - c.y) < 30);
            setHoverChamber(hit ? hit.name : null);
          }}
          onMouseLeave={() => setHoverChamber(null)}>
          <canvas ref={ref} width={580} height={340} className="w-full h-full" />
          {hoverChamber && (
            <div className="absolute top-2 left-2 bg-black/80 text-xs text-white rounded px-2 py-1 max-w-[200px] pointer-events-none">
              {CHAMBER_DESC[hoverChamber]}
            </div>
          )}
        </div>
      }
      controls={
        <>
          <Slider label="Heart Rate" value={bpm} min={40} max={180} unit=" bpm" onChange={setBpm} color={C_RED} />
          <div className="space-y-1 mt-2">
            <Stat label="Stroke volume" value="~70 mL" />
            <Stat label="Cardiac output" value={`${((bpm * 70) / 1000).toFixed(1)} L/min`} />
            <Stat label="Systolic BP" value="~120 mmHg" />
            <Stat label="Diastolic BP" value="~80 mmHg" />
          </div>
        </>
      }
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Nitrogen Cycle
// ─────────────────────────────────────────────────────────────────────────────
export function NitrogenCycle() {
  const [active, setActive] = useState(-1);
  const nodes = [
    { id: 0, x: 290, y: 50,  label: "N₂ in Atmosphere", color: C_CYAN },
    { id: 1, x: 80,  y: 160, label: "Nitrogen Fixation", color: C_GREEN },
    { id: 2, x: 500, y: 160, label: "Denitrification",   color: C_PURPLE },
    { id: 3, x: 150, y: 260, label: "NH₄⁺ / NH₃",       color: C_AMBER },
    { id: 4, x: 290, y: 190, label: "Organisms",         color: C_PRIMARY },
    { id: 5, x: 430, y: 260, label: "NO₃⁻ (Nitrate)",   color: C_RED },
  ];
  const edges = [
    [0, 1, "Fixation\n(Rhizobium)"], [1, 3, "Produces"], [3, 4, "Uptake"],
    [4, 3, "Decomposition"], [3, 5, "Nitrification"], [5, 2, "Denitrification"],
    [2, 0, "Returns N₂"], [4, 5, "Excretion"],
  ];
  const infos: Record<number, string> = {
    0: "78% of atmosphere is N₂ — unusable by most organisms directly.",
    1: "Bacteria (Rhizobium) convert N₂ → NH₄⁺, making nitrogen bioavailable.",
    2: "Bacteria convert NO₃⁻ → N₂, returning nitrogen to the atmosphere.",
    3: "Ammonium (NH₄⁺) is taken up by plant roots from soil.",
    4: "Plants and animals incorporate nitrogen into proteins and DNA.",
    5: "Nitrifying bacteria oxidise NH₄⁺ → NO₂⁻ → NO₃⁻.",
  };

  return (
    <ModelWrap
      darkBg={false}
      viz={
        <svg viewBox="0 0 580 340" className="w-full h-full">
          <rect width={580} height={340} fill="#080e1c" />
          {edges.map(([a, b, label], i) => {
            const n1 = nodes[a as number], n2 = nodes[b as number];
            const mx = (n1.x + n2.x) / 2, my = (n1.y + n2.y) / 2;
            return (
              <g key={i}>
                <line x1={n1.x} y1={n1.y} x2={n2.x} y2={n2.y} stroke="rgba(255,255,255,0.15)" strokeWidth={1.5} markerEnd="url(#arr)" />
                <text x={mx} y={my - 4} fill="rgba(255,255,255,0.35)" fontSize={8} textAnchor="middle">{String(label).split("\n")[0]}</text>
              </g>
            );
          })}
          <defs>
            <marker id="arr" markerWidth={6} markerHeight={6} refX={5} refY={3} orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,0.3)" />
            </marker>
          </defs>
          {nodes.map(n => (
            <g key={n.id} onClick={() => setActive(active === n.id ? -1 : n.id)} style={{ cursor: "pointer" }}>
              <circle cx={n.x} cy={n.y} r={active === n.id ? 30 : 24} fill={`${n.color}22`} stroke={n.color} strokeWidth={active === n.id ? 2.5 : 1.5} />
              <text x={n.x} y={n.y - 3} fill={n.color} fontSize={8} textAnchor="middle" fontWeight="bold">{n.label.split(" ")[0]}</text>
              <text x={n.x} y={n.y + 8} fill={n.color} fontSize={7} textAnchor="middle">{n.label.split(" ").slice(1).join(" ")}</text>
            </g>
          ))}
          {active >= 0 && (
            <foreignObject x={140} y={298} width={300} height={50}>
              <div style={{ background: "rgba(8,14,28,0.95)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "6px 10px", color: "rgba(255,255,255,0.75)", fontSize: 10, lineHeight: 1.5 }}>
                {infos[active]}
              </div>
            </foreignObject>
          )}
        </svg>
      }
      controls={
        <>
          <SectionLabel>Click a node</SectionLabel>
          <p className="text-xs text-muted-foreground">Tap any stage to learn what happens there.</p>
          <div className="space-y-1 mt-2">
            <Stat label="Atmospheric N₂" value="78%" />
            <Stat label="Key bacteria" value="Rhizobium, Nitrosomonas" />
          </div>
        </>
      }
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Protein Folding
// ─────────────────────────────────────────────────────────────────────────────
const FOLD_STEPS = ["1° Structure", "2° Structure", "3° Structure", "4° Structure"];

export function ProteinFolding() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2;

    if (step === 0) {
      // Primary: linear chain of amino acids
      const aas = ["Met","Ala","Gly","Leu","Val","Pro","Phe","Ser","Thr","Ile","Asp","Glu","Lys","Arg"];
      const startX = 40, y = cy;
      aas.forEach((aa, i) => {
        const x = startX + i * 38;
        ctx.fillStyle = i % 2 === 0 ? C_PRIMARY : C_CYAN;
        ctx.beginPath(); ctx.arc(x, y, 12, 0, TAU); ctx.fill();
        ctx.fillStyle = C_BG; ctx.font = "8px Inter,sans-serif"; ctx.textAlign = "center";
        ctx.fillText(aa, x, y + 3);
        if (i > 0) {
          ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(x - 26, y); ctx.lineTo(x - 12, y); ctx.stroke();
        }
      });
      ctx.fillStyle = C_DIM; ctx.font = "11px Inter,sans-serif"; ctx.textAlign = "center";
      ctx.fillText("Peptide bonds link amino acids in sequence", cx, H - 20);
    }

    if (step === 1) {
      // Secondary: alpha helix on left, beta sheet on right
      // Alpha helix
      const hx = 130, hy = 60;
      ctx.fillStyle = C_AMBER; ctx.font = "bold 11px Inter,sans-serif"; ctx.textAlign = "center";
      ctx.fillText("α-Helix", hx, hy - 8);
      for (let i = 0; i < 8; i++) {
        const y = hy + i * 28;
        const x = hx + Math.sin(i * 1.2) * 28;
        ctx.fillStyle = `hsl(${200 + i * 10},70%,60%)`;
        ctx.beginPath(); ctx.arc(x, y, 10, 0, TAU); ctx.fill();
        if (i > 0) {
          const px = hx + Math.sin((i - 1) * 1.2) * 28, py = y - 28;
          ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(px, py + 10); ctx.lineTo(x, y - 10); ctx.stroke();
        }
        // H-bond
        if (i > 3) {
          ctx.strokeStyle = "rgba(251,191,36,0.4)"; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
          const tx = hx + Math.sin((i - 4) * 1.2) * 28;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, y - 28 * 4); ctx.stroke();
          ctx.setLineDash([]);
        }
      }
      // Beta sheet
      const bx = 370, by = 60;
      ctx.fillStyle = C_GREEN; ctx.font = "bold 11px Inter,sans-serif"; ctx.textAlign = "center";
      ctx.fillText("β-Sheet", bx, by - 8);
      for (let strand = 0; strand < 3; strand++) {
        const sx = bx - 60 + strand * 60, dir = strand % 2 === 0 ? 1 : -1;
        for (let i = 0; i < 5; i++) {
          const y = by + (dir === 1 ? i : 4 - i) * 30;
          ctx.fillStyle = strand % 2 === 0 ? C_GREEN : C_CYAN;
          ctx.beginPath(); ctx.arc(sx, y, 9, 0, TAU); ctx.fill();
          if (i > 0) {
            ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(sx, y - 21); ctx.lineTo(sx, y - 9); ctx.stroke();
          }
        }
        // H-bonds between strands
        if (strand < 2) {
          ctx.strokeStyle = "rgba(251,191,36,0.4)"; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
          for (let i = 0; i < 5; i++) {
            const y = by + i * 30;
            ctx.beginPath(); ctx.moveTo(sx + 9, y); ctx.lineTo(sx + 51, y); ctx.stroke();
          }
          ctx.setLineDash([]);
        }
      }
      ctx.fillStyle = C_DIM; ctx.font = "10px Inter,sans-serif"; ctx.textAlign = "center";
      ctx.fillText("H-bonds (dashed) stabilise secondary structures", cx, H - 20);
    }

    if (step === 2) {
      // Tertiary: blob shape showing hydrophobic core
      ctx.fillStyle = "rgba(91,127,239,0.12)";
      ctx.beginPath();
      ctx.moveTo(cx - 100, cy - 80); ctx.bezierCurveTo(cx + 60, cy - 120, cx + 140, cy - 20, cx + 80, cy + 80);
      ctx.bezierCurveTo(cx, cy + 130, cx - 120, cy + 60, cx - 140, cy - 10);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = C_PRIMARY; ctx.lineWidth = 2; ctx.stroke();

      // Hydrophobic core
      ctx.fillStyle = "rgba(251,191,36,0.3)";
      ctx.beginPath(); ctx.ellipse(cx + 10, cy + 10, 45, 35, 0.3, 0, TAU); ctx.fill();
      ctx.fillStyle = C_AMBER; ctx.font = "10px Inter,sans-serif"; ctx.textAlign = "center";
      ctx.fillText("Hydrophobic core", cx + 10, cy + 12);

      // Disulfide bridge
      ctx.strokeStyle = C_AMBER; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx - 60, cy - 50); ctx.lineTo(cx + 60, cy + 50); ctx.stroke();
      ctx.fillStyle = C_AMBER; ctx.font = "9px Inter,sans-serif";
      ctx.fillText("S-S", cx + 5, cy + 5);

      ctx.fillStyle = C_DIM; ctx.font = "11px Inter,sans-serif"; ctx.textAlign = "center";
      ctx.fillText("Unique 3D shape determines protein function", cx, H - 20);
    }

    if (step === 3) {
      // Quaternary: multiple subunits (like haemoglobin — 4 subunits)
      const positions = [[-70, -50], [70, -50], [-70, 50], [70, 50]];
      const colors = [C_PRIMARY, C_RED, C_CYAN, C_PURPLE];
      const labels = ["α₁", "β₁", "α₂", "β₂"];
      positions.forEach(([dx, dy], i) => {
        ctx.fillStyle = `${colors[i]}22`;
        ctx.beginPath(); ctx.ellipse(cx + dx, cy + dy, 50, 38, i * 0.3, 0, TAU); ctx.fill();
        ctx.strokeStyle = colors[i]; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(cx + dx, cy + dy, 50, 38, i * 0.3, 0, TAU); ctx.stroke();
        ctx.fillStyle = colors[i]; ctx.font = "bold 13px Inter,sans-serif"; ctx.textAlign = "center";
        ctx.fillText(labels[i], cx + dx, cy + dy + 5);
      });
      // Haem groups
      for (const [dx, dy] of positions) {
        ctx.fillStyle = C_RED;
        ctx.beginPath(); ctx.arc(cx + dx + 28, cy + dy + 20, 7, 0, TAU); ctx.fill();
        ctx.fillStyle = C_BG; ctx.font = "7px Inter,sans-serif"; ctx.textAlign = "center";
        ctx.fillText("Fe", cx + dx + 28, cy + dy + 23);
      }
      ctx.fillStyle = C_DIM; ctx.font = "11px Inter,sans-serif"; ctx.textAlign = "center";
      ctx.fillText("Haemoglobin: 4 subunits, each carrying O₂ via Fe haem", cx, H - 20);
    }
  }, [step]);

  return (
    <ModelWrap
      viz={<canvas ref={ref} width={580} height={340} className="w-full h-full" />}
      controls={
        <>
          <StepNav steps={FOLD_STEPS} current={step} onChange={setStep} />
          <div className="space-y-1 mt-2">
            <Stat label="Forces involved" value={["Peptide bonds", "H-bonds", "Hydrophobic, disulfide", "Non-covalent"][step]} />
          </div>
        </>
      }
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Action Potential
// ─────────────────────────────────────────────────────────────────────────────
export function ActionPotential() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [speed, setSpeed] = useState(1);

  useRaf((t) => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);

    const pad = { l: 60, r: 20, t: 30, b: 50 };
    const gw = W - pad.l - pad.r, gh = H - pad.t - pad.b;
    const x0 = pad.l, y0 = pad.t + gh;

    drawAxes(ctx, x0, y0, gw, gh, "Time (ms)", "Voltage (mV)");

    // Y axis labels
    const vLabels = [[70, -70], [50, -55], [40, 0], [30, +30], [10, -90]];
    ctx.fillStyle = C_DIM; ctx.font = "10px Inter,sans-serif"; ctx.textAlign = "right";
    vLabels.forEach(([pct, mv]) => {
      const y = y0 - (pct / 100) * gh;
      ctx.fillText(`${mv}`, x0 - 6, y + 4);
      ctx.strokeStyle = "rgba(255,255,255,0.06)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + gw, y); ctx.stroke();
    });

    // Action potential waveform function
    const vAtT = (ms: number): number => {
      if (ms < 0) return -70;
      if (ms < 0.5) return lerp(-70, -55, ms / 0.5);   // threshold
      if (ms < 1.2) return lerp(-55, 30, (ms - 0.5) / 0.7);  // depolarise
      if (ms < 2.0) return lerp(30, -70, (ms - 1.2) / 0.8);  // repolarise
      if (ms < 2.8) return lerp(-70, -90, (ms - 2.0) / 0.8); // hyperpolar
      if (ms < 4.0) return lerp(-90, -70, (ms - 2.8) / 1.2); // return
      return -70;
    };
    const totalMs = 5;
    const scroll = (t * speed) % (totalMs + 1);

    // Draw voltage curve
    ctx.strokeStyle = C_GREEN; ctx.lineWidth = 2.5; ctx.beginPath();
    for (let px = 0; px <= gw; px++) {
      const ms = (px / gw) * totalMs - scroll + totalMs * 0.5;
      const v = vAtT(ms < 0 ? ms + totalMs * 2 : ms);
      const vy = y0 - ((v + 90) / 130) * gh;
      px === 0 ? ctx.moveTo(x0 + px, vy) : ctx.lineTo(x0 + px, vy);
    }
    ctx.stroke();

    // Phase labels
    const phases = [
      { ms: 0.85, label: "Na⁺ rush in", color: C_CYAN },
      { ms: 1.6,  label: "K⁺ rush out", color: C_AMBER },
      { ms: 2.4,  label: "Hyperpolar.", color: C_PURPLE },
    ];
    phases.forEach(({ ms, label, color }) => {
      const adjMs = ms - scroll + totalMs * 0.5;
      const px = ((adjMs / totalMs) * gw + x0);
      if (px < x0 + 20 || px > x0 + gw - 20) return;
      const v = vAtT(ms);
      const vy = y0 - ((v + 90) / 130) * gh;
      ctx.fillStyle = color; ctx.font = "9px Inter,sans-serif"; ctx.textAlign = "center";
      ctx.fillText(label, px, vy - 12);
    });

    // Resting line
    ctx.strokeStyle = "rgba(255,255,255,0.2)"; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
    const restY = y0 - (((-70) + 90) / 130) * gh;
    ctx.beginPath(); ctx.moveTo(x0, restY); ctx.lineTo(x0 + gw, restY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C_DIM; ctx.font = "9px Inter,sans-serif"; ctx.textAlign = "left";
    ctx.fillText("resting (−70 mV)", x0 + 4, restY - 4);
  }, true);

  return (
    <ModelWrap
      viz={<canvas ref={ref} width={580} height={340} className="w-full h-full" />}
      controls={
        <>
          <Slider label="Playback Speed" value={speed} min={0.2} max={3} step={0.1} onChange={setSpeed} />
          <div className="space-y-1 mt-2">
            <Stat label="Resting potential" value="−70 mV" />
            <Stat label="Threshold" value="−55 mV" />
            <Stat label="Peak (overshoot)" value="+30 mV" />
            <Stat label="Refractory period" value="~2 ms" />
          </div>
        </>
      }
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Synaptic Transmission
// ─────────────────────────────────────────────────────────────────────────────
const SYN_STEPS = ["Action Potential Arrives", "Vesicles Fuse", "Neurotransmitters Released", "Receptor Binding", "Signal Terminated"];

export function SynapticTransmission() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const cx = W / 2;

    // Pre-synaptic terminal
    ctx.fillStyle = "rgba(91,127,239,0.15)";
    ctx.strokeStyle = C_PRIMARY; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(cx, 90, 110, 65, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C_PRIMARY; ctx.font = "bold 10px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText("Pre-synaptic Terminal", cx, 52);

    // Synaptic cleft
    ctx.fillStyle = "rgba(34,211,238,0.06)";
    ctx.fillRect(cx - 120, 160, 240, 28);
    ctx.fillStyle = C_CYAN; ctx.font = "9px Inter,sans-serif";
    ctx.fillText("Synaptic Cleft (~20 nm)", cx, 178);

    // Post-synaptic membrane
    ctx.fillStyle = "rgba(74,222,128,0.15)";
    ctx.strokeStyle = C_GREEN; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(cx, 255, 110, 55, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C_GREEN; ctx.font = "bold 10px Inter,sans-serif";
    ctx.fillText("Post-synaptic Neuron", cx, 290);

    // Vesicles
    const vesicleCount = 8;
    for (let i = 0; i < vesicleCount; i++) {
      const vx = cx - 70 + (i % 4) * 38 + (Math.floor(i / 4)) * 10;
      const vy = step >= 1 ? 140 + (i % 2) * 8 : 80 + (i % 2) * 20;
      const released = step >= 2 && i < 3;
      if (!released) {
        ctx.fillStyle = "rgba(251,191,36,0.5)";
        ctx.strokeStyle = C_AMBER; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(vx, vy, 10, 0, TAU); ctx.fill(); ctx.stroke();
        // Neurotransmitter dots inside
        ctx.fillStyle = C_AMBER;
        ctx.beginPath(); ctx.arc(vx - 3, vy, 2, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(vx + 3, vy, 2, 0, TAU); ctx.fill();
      }
    }

    // Released neurotransmitters
    if (step >= 2) {
      for (let i = 0; i < 10; i++) {
        const ntx = cx - 80 + i * 17;
        const nty = step >= 3 ? 195 : 175;
        ctx.fillStyle = C_AMBER;
        ctx.beginPath(); ctx.arc(ntx, nty, 4, 0, TAU); ctx.fill();
      }
    }

    // Receptors on post-synaptic
    for (let i = 0; i < 5; i++) {
      const rx = cx - 70 + i * 35, ry = 200;
      const bound = step >= 3 && i < 3;
      ctx.fillStyle = bound ? C_GREEN : "rgba(74,222,128,0.3)";
      ctx.strokeStyle = C_GREEN; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(rx - 8, ry); ctx.lineTo(rx - 8, ry + 15);
      ctx.lineTo(rx, ry + 22); ctx.lineTo(rx + 8, ry + 15); ctx.lineTo(rx + 8, ry); ctx.stroke();
      if (bound) { ctx.fillStyle = C_AMBER; ctx.beginPath(); ctx.arc(rx, ry, 4, 0, TAU); ctx.fill(); }
    }

    // Step 4: reuptake
    if (step >= 4) {
      ctx.strokeStyle = C_PRIMARY; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(cx + 90, 190); ctx.bezierCurveTo(cx + 130, 165, cx + 130, 100, cx + 80, 100); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = C_PRIMARY; ctx.font = "9px Inter,sans-serif"; ctx.textAlign = "right";
      ctx.fillText("Reuptake", cx + 125, 150);
    }

    // Action potential arrow (step 0)
    if (step === 0) {
      ctx.strokeStyle = C_GREEN; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(20, 60); ctx.lineTo(cx - 115, 60); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - 115, 60); ctx.lineTo(cx - 107, 54); ctx.lineTo(cx - 107, 66); ctx.closePath(); ctx.fill();
      ctx.fillStyle = C_GREEN; ctx.font = "bold 10px Inter,sans-serif"; ctx.textAlign = "left";
      ctx.fillText("AP →", 24, 56);
    }
  }, [step]);

  return (
    <ModelWrap
      viz={<canvas ref={ref} width={580} height={340} className="w-full h-full" />}
      controls={
        <>
          <StepNav steps={SYN_STEPS} current={step} onChange={setStep} />
          <Slider label="Step" value={step} min={0} max={4} step={1} onChange={setStep} />
          <div className="space-y-1 mt-2">
            <Stat label="Neurotransmitters" value="ACh, Dopamine, GABA…" />
            <Stat label="Cleft width" value="~20 nm" />
          </div>
        </>
      }
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. Homeostasis (Blood Glucose)
// ─────────────────────────────────────────────────────────────────────────────
export function Homeostasis() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [meal, setMeal] = useState(50);

  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);

    const pad = { l: 65, r: 20, t: 30, b: 50 };
    const gw = W - pad.l - pad.r, gh = H - pad.t - pad.b;
    const x0 = pad.l, y0 = pad.t + gh;

    drawAxes(ctx, x0, y0, gw, gh, "Time (hours)", "Blood Glucose (mmol/L)");

    // Y labels
    [2, 4, 6, 8, 10, 12].forEach(v => {
      const y = y0 - ((v - 2) / 10) * gh;
      ctx.fillStyle = C_DIM; ctx.font = "10px Inter,sans-serif"; ctx.textAlign = "right";
      ctx.fillText(`${v}`, x0 - 6, y + 4);
      ctx.strokeStyle = "rgba(255,255,255,0.06)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + gw, y); ctx.stroke();
    });

    // Set point line
    const setPoint = 5.0;
    const setY = y0 - ((setPoint - 2) / 10) * gh;
    ctx.strokeStyle = "rgba(74,222,128,0.35)"; ctx.lineWidth = 1; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(x0, setY); ctx.lineTo(x0 + gw, setY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C_GREEN; ctx.font = "9px Inter,sans-serif"; ctx.textAlign = "left";
    ctx.fillText("Set point ~5 mmol/L", x0 + 4, setY - 5);

    // Normal range band
    const hiY = y0 - ((7 - 2) / 10) * gh, loY = y0 - ((4 - 2) / 10) * gh;
    ctx.fillStyle = "rgba(74,222,128,0.05)";
    ctx.fillRect(x0, hiY, gw, loY - hiY);

    // Glucose curve
    const spike = 2 + (meal / 100) * 7;
    const pts: [number, number][] = [];
    for (let i = 0; i <= 100; i++) {
      const timeH = (i / 100) * 4;
      let glucose = setPoint;
      // Meal spike at t=0.3
      if (timeH > 0.3) {
        const dt = timeH - 0.3;
        glucose = setPoint + spike * Math.exp(-dt * 1.8) * Math.sin(dt * 2.5);
        glucose = Math.max(glucose, setPoint - 0.8);
      }
      pts.push([x0 + (i / 100) * gw, y0 - ((glucose - 2) / 10) * gh]);
    }
    drawCurve(ctx, pts, C_PRIMARY, 2.5);

    // Insulin/glucagon labels
    ctx.fillStyle = C_CYAN; ctx.font = "bold 9px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText("↑ Insulin (pancreas)", x0 + gw * 0.2, y0 - ((6 - 2) / 10) * gh - 8);
    ctx.fillStyle = C_AMBER;
    ctx.fillText("↑ Glucagon", x0 + gw * 0.6, y0 - ((3.8 - 2) / 10) * gh - 8);

    // Meal arrow
    ctx.strokeStyle = C_AMBER; ctx.lineWidth = 2;
    const mealX = x0 + gw * 0.07;
    ctx.beginPath(); ctx.moveTo(mealX, y0 + 10); ctx.lineTo(mealX, y0 - 10); ctx.stroke();
    ctx.fillStyle = C_AMBER; ctx.font = "9px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText("Meal", mealX, y0 + 22);
  }, [meal]);

  return (
    <ModelWrap
      viz={<canvas ref={ref} width={580} height={340} className="w-full h-full" />}
      controls={
        <>
          <Slider label="Meal Size" value={meal} min={10} max={100} unit="%" onChange={setMeal} color={C_AMBER} />
          <div className="space-y-1 mt-2">
            <Stat label="Normal fasting" value="3.9–5.5 mmol/L" />
            <Stat label="Diabetic threshold" value=">7.0 mmol/L" />
            <Stat label="Hormone: high glucose" value="Insulin (β cells)" />
            <Stat label="Hormone: low glucose" value="Glucagon (α cells)" />
          </div>
        </>
      }
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. Phylogenetic Trees
// ─────────────────────────────────────────────────────────────────────────────
export function PhylogeneticTrees() {
  const [highlight, setHighlight] = useState<string | null>(null);
  const taxa = [
    { id: "fungi",    x: 80,  y: 60,  label: "Fungi",       color: C_AMBER },
    { id: "plants",   x: 80,  y: 130, label: "Plants",      color: C_GREEN },
    { id: "insects",  x: 80,  y: 200, label: "Insects",     color: C_CYAN },
    { id: "fish",     x: 80,  y: 260, label: "Fish",        color: C_PRIMARY },
    { id: "reptiles", x: 80,  y: 310, label: "Reptiles",    color: C_AMBER },
    { id: "birds",    x: 420, y: 270, label: "Birds",       color: C_RED },
    { id: "mammals",  x: 420, y: 310, label: "Mammals",     color: C_PURPLE },
  ];
  const nodes = [
    { id: "n1", x: 200, y: 95,  label: "Opisthokonta" },
    { id: "n2", x: 300, y: 160, label: "Animalia" },
    { id: "n3", x: 380, y: 230, label: "Amniota" },
    { id: "n4", x: 450, y: 290, label: "Archosauria" },
    { id: "root", x: 520, y: 185, label: "LUCA" },
  ];

  const infoMap: Record<string, string> = {
    fungi: "Fungi & animals share a common opisthokont ancestor.",
    plants: "Plants (embryophytes) diverged from algae ~470 Ma.",
    insects: "Arthropods — most species-rich animal group.",
    fish: "Jawless vertebrates appeared ~530 Ma.",
    reptiles: "Amniote egg freed vertebrates from water.",
    birds: "Avian dinosaurs — only surviving dinosaur lineage.",
    mammals: "Warm-blooded amniotes; ~6,500 species.",
  };

  const edges = [
    ["root", "n2"], ["root", "plants"], ["root", "fungi"],
    ["n1", "fungi"], ["n1", "n2"],
    ["n2", "insects"], ["n2", "fish"], ["n2", "n3"],
    ["n3", "n4"], ["n3", "mammals"],
    ["n4", "birds"], ["n4", "reptiles"],
  ];

  const allNodes = [...taxa, ...nodes];
  const getNode = (id: string) => allNodes.find(n => n.id === id)!;

  return (
    <ModelWrap
      darkBg={false}
      viz={
        <svg viewBox="0 0 580 340" className="w-full h-full">
          <rect width={580} height={340} fill="#080e1c" />
          {edges.map(([a, b], i) => {
            const n1 = getNode(a), n2 = getNode(b);
            if (!n1 || !n2) return null;
            return <line key={i} x1={n1.x} y1={n1.y} x2={n2.x} y2={n2.y}
              stroke={highlight === a || highlight === b ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)"}
              strokeWidth={highlight === a || highlight === b ? 2 : 1.5} />;
          })}
          {nodes.map(n => (
            <g key={n.id}>
              <circle cx={n.x} cy={n.y} r={6} fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.4)" strokeWidth={1.5} />
              <text x={n.x + 10} y={n.y + 4} fill="rgba(255,255,255,0.3)" fontSize={8}>{n.label}</text>
            </g>
          ))}
          {taxa.map(t => (
            <g key={t.id} onClick={() => setHighlight(highlight === t.id ? null : t.id)} style={{ cursor: "pointer" }}>
              <circle cx={t.x} cy={t.y} r={highlight === t.id ? 16 : 12}
                fill={`${t.color}22`} stroke={t.color} strokeWidth={highlight === t.id ? 2.5 : 1.5} />
              <text x={t.x} y={t.y + 4} fill={t.color} fontSize={9} textAnchor="middle" fontWeight="bold">{t.label}</text>
            </g>
          ))}
          {highlight && infoMap[highlight] && (
            <foreignObject x={140} y={8} width={300} height={44}>
              <div style={{ background: "rgba(8,14,28,0.95)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "6px 10px", color: "rgba(255,255,255,0.8)", fontSize: 10 }}>
                {infoMap[highlight]}
              </div>
            </foreignObject>
          )}
          <text x={540} y={182} fill="rgba(255,255,255,0.5)" fontSize={8} textAnchor="middle">Root</text>
          <text x={20} y={18} fill="rgba(255,255,255,0.3)" fontSize={9}>← Older</text>
          <text x={560} y={18} fill="rgba(255,255,255,0.3)" fontSize={9} textAnchor="end">Newer →</text>
        </svg>
      }
      controls={
        <>
          <SectionLabel>Click a taxon</SectionLabel>
          <p className="text-xs text-muted-foreground">Tap a species group to highlight its lineage.</p>
          <div className="space-y-1 mt-2">
            <Stat label="Root node" value="LUCA (~3.8 Ga)" />
            <Stat label="Method" value="Maximum parsimony" />
          </div>
        </>
      }
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. Cell Membrane (Fluid Mosaic)
// ─────────────────────────────────────────────────────────────────────────────
export function CellMembrane() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [temp, setTemp] = useState(37);
  const particlesRef = useRef<{ x: number; vx: number; type: number }[]>([]);

  useEffect(() => {
    const W = 580, rows = 12;
    particlesRef.current = Array.from({ length: rows * 2 }, (_, i) => ({
      x: (i % rows) * (W / rows) + (W / rows) / 2,
      vx: (Math.random() - 0.5) * 0.5,
      type: Math.random() > 0.8 ? 1 : 0, // 1=protein
    }));
  }, []);

  useRaf((_, dt) => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);

    const speed = (temp / 37) * 1.5;
    const cy1 = H / 2 - 22, cy2 = H / 2 + 22;
    const headR = 9, tailL = 22;

    // Update positions
    particlesRef.current.forEach(p => {
      p.x += p.vx * speed * 0.6;
      if (p.x < 10) { p.x = 10; p.vx = Math.abs(p.vx); }
      if (p.x > W - 10) { p.x = W - 10; p.vx = -Math.abs(p.vx); }
      p.vx += (Math.random() - 0.5) * 0.1;
      p.vx = clamp(p.vx, -2, 2);
    });

    // Draw bilayer
    const pts1 = particlesRef.current.slice(0, particlesRef.current.length / 2);
    const pts2 = particlesRef.current.slice(particlesRef.current.length / 2);

    pts1.forEach((p, i) => {
      if (p.type === 1) return; // draw proteins later
      // Head (towards outside)
      ctx.fillStyle = C_PRIMARY;
      ctx.beginPath(); ctx.arc(p.x, cy1 - headR, headR, 0, TAU); ctx.fill();
      // Tail (towards inside)
      ctx.strokeStyle = "rgba(91,127,239,0.5)"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(p.x, cy1); ctx.lineTo(p.x, cy1 + tailL); ctx.stroke();
    });
    pts2.forEach(p => {
      if (p.type === 1) return;
      ctx.fillStyle = C_CYAN;
      ctx.beginPath(); ctx.arc(p.x, cy2 + headR, headR, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(34,211,238,0.5)"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(p.x, cy2); ctx.lineTo(p.x, cy2 - tailL); ctx.stroke();
    });

    // Proteins spanning bilayer
    [...pts1, ...pts2].forEach(p => {
      if (p.type !== 1) return;
      const cx = p.x;
      ctx.fillStyle = "rgba(167,139,250,0.35)";
      ctx.strokeStyle = C_PURPLE; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(cx, H / 2, 10, 34, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C_PURPLE; ctx.font = "7px Inter,sans-serif"; ctx.textAlign = "center";
      ctx.fillText("P", cx, H / 2 + 3);
    });

    // Labels
    ctx.fillStyle = C_DIM; ctx.font = "10px Inter,sans-serif"; ctx.textAlign = "left";
    ctx.fillText("Extracellular", 10, cy1 - headR - 16);
    ctx.fillText("Cytoplasm", 10, cy2 + headR + 22);
    ctx.fillStyle = C_PRIMARY; ctx.fillText("● Phospholipid head", 10, H - 30);
    ctx.fillStyle = C_PURPLE; ctx.fillText("  ◉ Integral protein", 10, H - 16);
  }, true);

  return (
    <ModelWrap
      viz={<canvas ref={ref} width={580} height={340} className="w-full h-full" />}
      controls={
        <>
          <Slider label="Temperature" value={temp} min={10} max={45} unit="°C" onChange={setTemp} color={C_RED} />
          <div className="space-y-1 mt-2">
            <Stat label="Thickness" value="~7–8 nm" />
            <Stat label="Fluidity" value={temp > 40 ? "Very fluid" : temp > 37 ? "Fluid" : temp > 20 ? "Normal" : "Rigid"} />
            <Stat label="Model" value="Singer & Nicolson 1972" />
          </div>
        </>
      }
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. Carbon Cycle
// ─────────────────────────────────────────────────────────────────────────────
export function CarbonCycle() {
  const [humanEmissions, setHumanEmissions] = useState(40);
  const [hovered, setHovered] = useState<string | null>(null);

  // Clean 4-quadrant layout: Atmosphere top-centre, Land left, Ocean right, Fossil bottom
  const reservoirs = [
    { id: "atm",    x: 290, y: 52,  w: 148, h: 46, label: "Atmosphere",   amount: "860 GtC",   color: C_CYAN },
    { id: "biota",  x: 95,  y: 165, w: 140, h: 46, label: "Land Biota",   amount: "550 GtC",   color: C_GREEN },
    { id: "ocean",  x: 485, y: 165, w: 140, h: 46, label: "Ocean",        amount: "38,000 GtC",color: C_PRIMARY },
    { id: "soil",   x: 95,  y: 255, w: 140, h: 46, label: "Soil & Litter","amount": "1,500 GtC", color: C_AMBER },
    { id: "fossil", x: 290, y: 285, w: 148, h: 46, label: "Fossil Fuels", amount: "3,700 GtC",  color: C_RED },
  ];

  const emW = clamp(humanEmissions / 20, 1, 5);
  const emLabel = (humanEmissions / 10).toFixed(1) + " GtC/yr";

  const tooltips: Record<string, string> = {
    atm: "Atmosphere: ~860 GtC stored as CO₂ (~420 ppm). Rising due to human emissions.",
    biota: "Land Biota: forests & vegetation store ~550 GtC. Photosynthesis absorbs ~120 GtC/yr.",
    ocean: "Ocean: largest active reservoir (~38,000 GtC). Absorbs ~2.5 GtC/yr from atmosphere.",
    soil: "Soil & Litter: ~1,500 GtC in organic matter. Released by decomposition & respiration.",
    fossil: "Fossil Fuels: ~3,700 GtC locked underground. Burning releases CO₂ back to atmosphere.",
  };

  return (
    <ModelWrap
      darkBg={false}
      viz={
        <div className="w-full h-full relative">
          <svg viewBox="0 0 580 340" className="w-full h-full">
            <rect width={580} height={340} fill="#080e1c" />
            <defs>
              <marker id="ca" markerWidth={7} markerHeight={7} refX={6} refY={3.5} orient="auto">
                <path d="M0,0 L7,3.5 L0,7 Z" fill="rgba(255,255,255,0.4)" />
              </marker>
              <marker id="car" markerWidth={7} markerHeight={7} refX={6} refY={3.5} orient="auto">
                <path d="M0,0 L7,3.5 L0,7 Z" fill={C_RED} />
              </marker>
            </defs>

            {/* Photosynthesis: atm → biota (left curved) */}
            <path d="M 218 52 Q 155 80 165 142" stroke={C_GREEN} strokeWidth={2} fill="none" markerEnd="url(#ca)" />
            <text x={160} y={98} fill={C_GREEN} fontSize={8} textAnchor="middle">Photo-</text>
            <text x={160} y={108} fill={C_GREEN} fontSize={8} textAnchor="middle">synthesis</text>
            <text x={160} y={118} fill={C_GREEN} fontSize={7} textAnchor="middle">120 GtC/yr</text>

            {/* Respiration: biota → atm */}
            <path d="M 168 142 Q 200 90 218 75" stroke={C_AMBER} strokeWidth={1.5} fill="none" markerEnd="url(#ca)" />
            <text x={215} y={108} fill={C_AMBER} fontSize={7} textAnchor="middle">Resp.</text>
            <text x={215} y={118} fill={C_AMBER} fontSize={7} textAnchor="middle">60 GtC</text>

            {/* Decomp: soil → atm */}
            <path d="M 95 232 Q 90 140 220 70" stroke={C_AMBER} strokeWidth={1.5} strokeDasharray="5,3" fill="none" markerEnd="url(#ca)" />
            <text x={70} y={155} fill={C_AMBER} fontSize={7}>Decomp.</text>

            {/* Ocean ↔ atm */}
            <path d="M 415 52 Q 460 80 415 142" stroke={C_CYAN} strokeWidth={2} fill="none" markerEnd="url(#ca)" />
            <text x={448} y={95} fill={C_CYAN} fontSize={7} textAnchor="middle">Ocean</text>
            <text x={448} y={105} fill={C_CYAN} fontSize={7} textAnchor="middle">uptake</text>
            <path d="M 415 142 Q 430 100 413 72" stroke={C_PRIMARY} strokeWidth={1.5} strokeDasharray="5,3" fill="none" markerEnd="url(#ca)" />
            <text x={468} y={118} fill={C_PRIMARY} fontSize={7} textAnchor="middle">Outgassing</text>

            {/* Human emissions: fossil → atm */}
            <path d="M 290 262 Q 290 160 290 75" stroke={C_RED} strokeWidth={emW} fill="none" markerEnd="url(#car)" />
            <text x={305} y={178} fill={C_RED} fontSize={8}>{emLabel}</text>
            <text x={305} y={190} fill={C_RED} fontSize={7}>Human emis.</text>

            {/* Reservoir boxes */}
            {reservoirs.map(r => (
              <g key={r.id} style={{ cursor: "pointer" }}
                onMouseEnter={() => setHovered(r.id)} onMouseLeave={() => setHovered(null)}>
                <rect x={r.x - r.w / 2} y={r.y - r.h / 2} width={r.w} height={r.h}
                  rx={8} fill={hovered === r.id ? `${r.color}30` : `${r.color}18`} stroke={r.color} strokeWidth={hovered === r.id ? 2 : 1.5} />
                <text x={r.x} y={r.y - 6} fill={r.color} fontSize={9} textAnchor="middle" fontWeight="bold">{r.label}</text>
                <text x={r.x} y={r.y + 9} fill="rgba(255,255,255,0.45)" fontSize={8} textAnchor="middle">{r.amount}</text>
              </g>
            ))}
          </svg>
          {hovered && tooltips[hovered] && (
            <div className="absolute bottom-2 left-2 right-2 bg-black/85 text-xs text-white/80 rounded-lg px-3 py-2 leading-relaxed pointer-events-none">
              {tooltips[hovered]}
            </div>
          )}
        </div>
      }
      controls={
        <>
          <Slider label="Human Emissions" value={humanEmissions} min={5} max={100} unit="%" onChange={setHumanEmissions} color={C_RED} />
          <p className="text-xs text-muted-foreground">Hover boxes for details</p>
          <div className="space-y-1 mt-2">
            <Stat label="Atmospheric CO₂" value="~420 ppm" />
            <Stat label="Pre-industrial" value="~280 ppm" />
            <Stat label="Annual human emis." value="~10 GtC/yr" />
          </div>
        </>
      }
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 13. Osmosis & Diffusion
// ─────────────────────────────────────────────────────────────────────────────
type Particle = { x: number; y: number; vx: number; vy: number; type: "solute" | "water"; side: "left" | "right" };

export function OsmosisDiffusion() {
  const ref = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const [concentration, setConcentration] = useState(60);
  const [mode, setMode] = useState<"osmosis" | "diffusion">("osmosis");
  const [speed, setSpeed] = useState(1);
  const speedRef = useRef(1);
  useEffect(() => { speedRef.current = speed; }, [speed]);

  useEffect(() => {
    const W = 580, H = 340;
    const mem = W / 2;
    const ps: Particle[] = [];
    // Left side: high concentration of solute
    for (let i = 0; i < 30; i++) {
      ps.push({ x: 40 + Math.random() * (mem - 60), y: 40 + Math.random() * (H - 80), vx: (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.5) * 1.5, type: "solute", side: "left" });
    }
    // Right side: low concentration
    for (let i = 0; i < 10; i++) {
      ps.push({ x: mem + 20 + Math.random() * (W - mem - 60), y: 40 + Math.random() * (H - 80), vx: (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.5) * 1.5, type: "solute", side: "right" });
    }
    // Water molecules
    for (let i = 0; i < 50; i++) {
      const side = i < 20 ? "left" : "right";
      ps.push({ x: side === "left" ? 20 + Math.random() * (mem - 40) : mem + 20 + Math.random() * (W - mem - 40), y: 20 + Math.random() * (H - 40), vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, type: "water", side });
    }
    particlesRef.current = ps;
  }, []);

  useRaf(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const mem = W / 2;

    // Solution backgrounds
    ctx.fillStyle = `rgba(91,127,239,${0.04 + concentration / 100 * 0.08})`;
    ctx.fillRect(0, 0, mem, H);
    ctx.fillStyle = "rgba(34,211,238,0.04)";
    ctx.fillRect(mem, 0, W - mem, H);

    // Membrane
    const poreCount = 12;
    ctx.fillStyle = "rgba(251,191,36,0.6)";
    for (let i = 0; i <= H; i += 6) {
      const isPore = (Math.floor(i / 6) % Math.floor(H / 6 / poreCount)) === 0;
      if (!isPore) ctx.fillRect(mem - 3, i, 6, 4);
    }
    ctx.fillStyle = C_AMBER; ctx.font = "9px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText("Semi-permeable membrane", mem, H - 8);

    // Update and draw particles
    const spd = speedRef.current;
    particlesRef.current.forEach(p => {
      p.x += p.vx * spd; p.y += p.vy * spd;
      // Bounce off walls
      if (p.x < 10) { p.x = 10; p.vx = Math.abs(p.vx); }
      if (p.y < 10) { p.y = 10; p.vy = Math.abs(p.vy); }
      if (p.y > H - 10) { p.y = H - 10; p.vy = -Math.abs(p.vy); }
      // Membrane crossing
      const canCross = mode === "diffusion" || p.type === "water";
      if (p.x < mem - 3 && p.vx > 0 && !canCross) { p.vx = -Math.abs(p.vx); }
      if (p.x > mem + 3 && p.vx < 0 && !canCross) { p.vx = Math.abs(p.vx); }
      if (p.x > W - 10) { p.x = W - 10; p.vx = -Math.abs(p.vx); }

      if (p.type === "solute") {
        ctx.fillStyle = C_RED;
        ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, TAU); ctx.fill();
      } else {
        ctx.fillStyle = C_CYAN;
        ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, TAU); ctx.fill();
      }
    });

    // Labels
    ctx.fillStyle = C_DIM; ctx.font = "bold 10px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText("High [solute]", mem / 2, 22);
    ctx.fillText("Low [solute]", mem + (W - mem) / 2, 22);
    ctx.fillStyle = C_RED; ctx.fillText("● Solute", 60, H - 22);
    ctx.fillStyle = C_CYAN; ctx.fillText("● Water", 140, H - 22);
  }, true);

  return (
    <ModelWrap
      viz={<canvas ref={ref} width={580} height={340} className="w-full h-full" />}
      controls={
        <>
          <SectionLabel>Mode</SectionLabel>
          <div className="flex gap-1.5">
            {(["osmosis", "diffusion"] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium border transition-colors
                  ${mode === m ? "bg-primary/20 text-primary border-primary/30" : "text-muted-foreground border-transparent hover:bg-secondary"}`}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
          <Slider label="Solute Concentration" value={concentration} min={10} max={100} unit="%" onChange={setConcentration} color={C_RED} />
          <Slider label="Speed" value={speed} min={0.2} max={4} step={0.1} onChange={setSpeed} />
          <div className="space-y-1 mt-1">
            <Stat label="Water net movement" value="→ High [solute]" />
            <Stat label="Osmotic pressure" value={`~${Math.round(concentration * 0.3)} kPa`} />
          </div>
        </>
      }
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 14. Enzyme-Substrate (Michaelis-Menten)
// ─────────────────────────────────────────────────────────────────────────────
export function EnzymeSubstrate() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [substrate, setSubstrate] = useState(40);
  const [inhibitor, setInhibitor] = useState(0);

  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);

    const pad = { l: 65, r: 20, t: 30, b: 50 };
    const gw = W - pad.l - pad.r, gh = H - pad.t - pad.b;
    const x0 = pad.l, y0 = pad.t + gh;

    drawAxes(ctx, x0, y0, gw, gh, "[Substrate] S (mM)", "Reaction Rate v");

    // Vmax line
    const km = 15 + inhibitor * 0.8;
    const vmax = 100 - inhibitor * 0.4;
    const vmaxY = y0 - gh * 0.9;
    ctx.strokeStyle = "rgba(255,255,255,0.2)"; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(x0, vmaxY); ctx.lineTo(x0 + gw, vmaxY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C_DIM; ctx.font = "9px Inter,sans-serif"; ctx.textAlign = "left";
    ctx.fillText(`Vmax = ${vmax.toFixed(0)}`, x0 + 4, vmaxY - 4);

    // Michaelis-Menten curve: v = Vmax*[S] / (Km + [S])
    const curve: [number, number][] = [];
    for (let i = 1; i <= 100; i++) {
      const s = (i / 100) * 100;
      const v = vmax * s / (km + s);
      curve.push([x0 + (i / 100) * gw, y0 - (v / 100) * gh * 0.9]);
    }
    drawCurve(ctx, curve, C_GREEN, 2.5);

    // Km line (Vmax/2)
    const kmX = x0 + (km / 100) * gw;
    const halfVY = y0 - gh * 0.9 * 0.5;
    ctx.strokeStyle = C_AMBER; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(x0, halfVY); ctx.lineTo(kmX, halfVY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(kmX, y0); ctx.lineTo(kmX, halfVY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C_AMBER; ctx.font = "9px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText(`Km=${km.toFixed(0)}`, kmX, y0 + 16);

    // Current substrate marker
    const s0 = substrate;
    const v0 = vmax * s0 / (km + s0);
    const mx = x0 + (s0 / 100) * gw, my = y0 - (v0 / 100) * gh * 0.9;
    ctx.fillStyle = C_RED;
    ctx.beginPath(); ctx.arc(mx, my, 6, 0, TAU); ctx.fill();
    ctx.fillStyle = C_FG; ctx.font = "bold 10px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText(`v = ${v0.toFixed(1)}`, mx, my - 12);

    // Y axis labels
    [0, 25, 50, 75, 100].forEach(v => {
      const y = y0 - (v / 100) * gh * 0.9;
      ctx.fillStyle = C_DIM; ctx.font = "9px Inter,sans-serif"; ctx.textAlign = "right";
      ctx.fillText(`${v}%`, x0 - 5, y + 4);
    });

    // Inhibitor label
    if (inhibitor > 0) {
      ctx.fillStyle = C_RED; ctx.font = "10px Inter,sans-serif"; ctx.textAlign = "right";
      ctx.fillText(`⬤ Competitive inhibitor active`, W - 10, 20);
    }
  }, [substrate, inhibitor]);

  return (
    <ModelWrap
      viz={<canvas ref={ref} width={580} height={340} className="w-full h-full" />}
      controls={
        <>
          <Slider label="[Substrate]" value={substrate} min={1} max={100} unit=" mM" onChange={setSubstrate} />
          <Slider label="Inhibitor" value={inhibitor} min={0} max={60} unit="%" onChange={setInhibitor} color={C_RED} />
          <div className="space-y-1 mt-1">
            <Stat label="Current rate" value={`${(100 * substrate / ((15 + inhibitor * 0.8) + substrate) * (1 - inhibitor * 0.004)).toFixed(1)}%`} />
            <Stat label="Effect of inhibitor" value="Raises Km, lowers Vmax" />
          </div>
        </>
      }
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 15. Gas Exchange (Alveolus)
// ─────────────────────────────────────────────────────────────────────────────
export function GasExchange() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [breathRate, setBreathRate] = useState(15);
  const [o2Level, setO2Level] = useState(21);
  const breathRef = useRef(15);
  const o2Ref = useRef(21);
  useEffect(() => { breathRef.current = breathRate; }, [breathRate]);
  useEffect(() => { o2Ref.current = o2Level; }, [o2Level]);

  useRaf((t) => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height, cx = W / 2, cy = 155;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);

    const breathPhase = (t * breathRef.current / 60) % 1;
    const expand = Math.sin(breathPhase * Math.PI * 2) * 0.5 + 0.5;
    const rx = 110 + expand * 15, ry = 90 + expand * 12;

    // Capillary path
    ctx.lineWidth = 20; ctx.strokeStyle = "rgba(248,113,113,0.35)";
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx + 22, ry + 22, 0, Math.PI * 0.15, Math.PI * 1.85);
    ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = "rgba(248,113,113,0.7)";
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx + 22, ry + 22, 0, Math.PI * 0.15, Math.PI * 1.85);
    ctx.stroke();

    // Alveolus
    ctx.fillStyle = `rgba(91,127,239,${0.05 + o2Ref.current / 21 * 0.08})`;
    ctx.strokeStyle = C_PRIMARY; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); ctx.fill(); ctx.stroke();

    // O2 particles moving inward (alveolus → capillary)
    for (let i = 0; i < 6; i++) {
      const p = (t * 0.4 + i / 6) % 1;
      const angle = (i / 6) * TAU - Math.PI / 2;
      const startR = rx * 0.7, endR = rx + 20;
      const pr = lerp(startR, endR, p);
      const px = cx + Math.cos(angle) * pr;
      const py = cy + Math.sin(angle) * pr * (ry / rx);
      const alpha = p < 0.5 ? p * 2 : (1 - p) * 2;
      ctx.beginPath(); ctx.arc(px, py, 4, 0, TAU);
      ctx.fillStyle = `rgba(34,211,238,${alpha * 0.9})`; ctx.fill();
    }

    // CO2 particles moving outward (capillary → alveolus)
    for (let i = 0; i < 4; i++) {
      const p = (t * 0.3 + i / 4 + 0.5) % 1;
      const angle = (i / 4) * TAU + Math.PI / 4;
      const startR = rx + 20, endR = rx * 0.6;
      const pr = lerp(startR, endR, p);
      const px = cx + Math.cos(angle) * pr;
      const py = cy + Math.sin(angle) * pr * (ry / rx);
      const alpha = p < 0.5 ? p * 2 : (1 - p) * 2;
      ctx.beginPath(); ctx.arc(px, py, 4, 0, TAU);
      ctx.fillStyle = `rgba(251,191,36,${alpha * 0.9})`; ctx.fill();
    }

    // Labels
    ctx.fillStyle = C_PRIMARY; ctx.font = "bold 11px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText("Alveolus", cx, cy - ry - 12);
    ctx.fillStyle = C_RED; ctx.font = "9px Inter,sans-serif";
    ctx.fillText("Capillary", cx + rx + 35, cy);

    ctx.fillStyle = C_CYAN; ctx.font = "bold 10px Inter,sans-serif";
    ctx.fillText("O₂ →", cx - rx - 10, cy - 15);
    ctx.fillStyle = C_AMBER;
    ctx.fillText("← CO₂", cx + rx + 18, cy + 20);

    // Partial pressure info
    ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.font = "8px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText(`pO₂ alveolar: ${(o2Ref.current * 5).toFixed(0)} mmHg  |  pO₂ capillary in: 40 mmHg`, cx, H - 28);
    ctx.fillText("Diffusion driven by partial pressure gradient across 0.5 μm wall", cx, H - 14);
  }, true);

  return (
    <ModelWrap
      viz={<canvas ref={ref} width={580} height={340} className="w-full h-full" />}
      controls={
        <>
          <Slider label="Breathing Rate" value={breathRate} min={8} max={30} unit="/min" onChange={setBreathRate} />
          <Slider label="O₂ Level" value={o2Level} min={10} max={30} unit="%" onChange={setO2Level} color={C_CYAN} />
          <div className="space-y-1 mt-2">
            <Stat label="Tidal volume" value="~500 mL" />
            <Stat label="Surface area" value="~70 m²" />
            <Stat label="Wall thickness" value="~0.5 μm" />
            <Stat label="O₂ gradient" value="60 mmHg" />
          </div>
        </>
      }
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 16. Water Cycle
// ─────────────────────────────────────────────────────────────────────────────
export function WaterCycle() {
  const [hovered, setHovered] = useState<string | null>(null);
  const tooltips: Record<string, string> = {
    cloud: "Clouds form when water vapour cools and condenses around dust particles (condensation nuclei).",
    ocean: "Oceans hold 97% of Earth's water. Solar energy drives evaporation at the surface.",
    evap: "Evaporation: liquid water absorbs solar energy and becomes water vapour. ~86% occurs over oceans.",
    precip: "Precipitation: water falls as rain, snow, sleet, or hail when cloud droplets combine and become heavy enough.",
    runoff: "Surface runoff: water flows over land into rivers and lakes, eventually returning to the ocean.",
    gw: "Groundwater: water seeps through soil into aquifers. Can stay underground for thousands of years.",
    transp: "Transpiration: plants release water vapour through leaf pores (stomata). ~10% of atmospheric moisture.",
    sun: "Solar energy drives the entire water cycle — powering evaporation and atmospheric circulation.",
  };

  return (
    <ModelWrap
      darkBg={false}
      viz={
        <div className="w-full h-full relative">
          <svg viewBox="0 0 580 340" className="w-full h-full">
            <rect width={580} height={340} fill="#080e1c" />
            <rect width={580} height={160} fill="rgba(91,127,239,0.05)" />
            <rect y={230} width={580} height={110} fill="rgba(74,222,128,0.07)" />
            {/* Ocean/lake */}
            <g style={{ cursor: "pointer" }} onMouseEnter={() => setHovered("ocean")} onMouseLeave={() => setHovered(null)}>
              <ellipse cx={90} cy={245} rx={80} ry={30} fill={hovered==="ocean" ? "rgba(34,211,238,0.35)" : "rgba(34,211,238,0.2)"} stroke={C_CYAN} strokeWidth={1.5} />
              <text x={90} y={248} fill={C_CYAN} fontSize={9} textAnchor="middle">Ocean / Lake</text>
            </g>
            {/* Mountain */}
            <polygon points="430,230 490,130 550,230" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.2)" strokeWidth={1.5} />
            <text x={490} y={210} fill="rgba(255,255,255,0.4)" fontSize={8} textAnchor="middle">Mountain</text>
            <polygon points="463,185 490,135 517,185" fill="rgba(255,255,255,0.3)" />
            {/* Cloud */}
            <g style={{ cursor: "pointer" }} onMouseEnter={() => setHovered("cloud")} onMouseLeave={() => setHovered(null)}>
              <ellipse cx={290} cy={65} rx={70} ry={28} fill={hovered==="cloud" ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.12)"} stroke="rgba(255,255,255,0.4)" strokeWidth={1.5} />
              <ellipse cx={250} cy={72} rx={40} ry={22} fill={hovered==="cloud" ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.12)"} stroke="rgba(255,255,255,0.4)" strokeWidth={1.5} />
              <ellipse cx={330} cy={72} rx={44} ry={20} fill={hovered==="cloud" ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.12)"} stroke="rgba(255,255,255,0.4)" strokeWidth={1.5} />
              <text x={290} y={62} fill="rgba(255,255,255,0.7)" fontSize={9} textAnchor="middle">Cloud</text>
            </g>
            {/* Sun */}
            <g style={{ cursor: "pointer" }} onMouseEnter={() => setHovered("sun")} onMouseLeave={() => setHovered(null)}>
              <circle cx={520} cy={50} r={28} fill={hovered==="sun" ? "rgba(251,191,36,0.4)" : "rgba(251,191,36,0.2)"} stroke={C_AMBER} strokeWidth={2} />
              <text x={520} y={54} fill={C_AMBER} fontSize={10} textAnchor="middle">☀</text>
            </g>
            {/* Evaporation */}
            <g style={{ cursor: "pointer" }} onMouseEnter={() => setHovered("evap")} onMouseLeave={() => setHovered(null)}>
              <line x1={70} y1={220} x2={210} y2={92} stroke={hovered==="evap" ? C_CYAN : "rgba(34,211,238,0.5)"} strokeWidth={hovered==="evap" ? 2.5 : 1.5} strokeDasharray="5,4" markerEnd="url(#wca)" />
              <text x={120} y={145} fill={C_CYAN} fontSize={9} transform="rotate(-36,120,145)">Evaporation</text>
            </g>
            <text x={290} y={100} fill="rgba(255,255,255,0.5)" fontSize={8} textAnchor="middle">Condensation</text>
            {/* Precipitation */}
            <g style={{ cursor: "pointer" }} onMouseEnter={() => setHovered("precip")} onMouseLeave={() => setHovered(null)}>
              <line x1={270} y1={93} x2={250} y2={230} stroke={hovered==="precip" ? C_PRIMARY : "rgba(91,127,239,0.6)"} strokeWidth={hovered==="precip" ? 2.5 : 1.5} markerEnd="url(#wca)" />
              <line x1={290} y1={93} x2={290} y2={230} stroke={hovered==="precip" ? C_PRIMARY : "rgba(91,127,239,0.6)"} strokeWidth={hovered==="precip" ? 2.5 : 1.5} markerEnd="url(#wca)" />
              <line x1={310} y1={93} x2={330} y2={230} stroke={hovered==="precip" ? C_PRIMARY : "rgba(91,127,239,0.6)"} strokeWidth={hovered==="precip" ? 2.5 : 1.5} markerEnd="url(#wca)" />
              <text x={290} y={172} fill={C_PRIMARY} fontSize={9} textAnchor="middle">Precipitation</text>
            </g>
            {/* Runoff */}
            <g style={{ cursor: "pointer" }} onMouseEnter={() => setHovered("runoff")} onMouseLeave={() => setHovered(null)}>
              <path d="M 350 230 Q 280 245 170 245" stroke={hovered==="runoff" ? C_GREEN : "rgba(74,222,128,0.6)"} strokeWidth={hovered==="runoff" ? 2.5 : 2} fill="none" markerEnd="url(#wca)" />
              <text x={265} y={240} fill={C_GREEN} fontSize={8} textAnchor="middle">Surface Runoff</text>
            </g>
            {/* Groundwater */}
            <g style={{ cursor: "pointer" }} onMouseEnter={() => setHovered("gw")} onMouseLeave={() => setHovered(null)}>
              <path d="M 350 265 Q 280 268 170 265" stroke={hovered==="gw" ? C_AMBER : "rgba(251,191,36,0.5)"} strokeWidth={hovered==="gw" ? 2 : 1.5} strokeDasharray="4,3" fill="none" markerEnd="url(#wca)" />
              <text x={265} y={282} fill={C_AMBER} fontSize={8} textAnchor="middle">Groundwater flow</text>
            </g>
            {/* Transpiration */}
            <g style={{ cursor: "pointer" }} onMouseEnter={() => setHovered("transp")} onMouseLeave={() => setHovered(null)}>
              <path d="M 390 228 Q 380 160 310 90" stroke={hovered==="transp" ? C_GREEN : "rgba(74,222,128,0.5)"} strokeWidth={hovered==="transp" ? 2 : 1.5} strokeDasharray="4,3" fill="none" markerEnd="url(#wca)" />
              <text x={365} y={155} fill={C_GREEN} fontSize={8}>Transpiration</text>
            </g>
            {/* Tree */}
            <line x1={390} y1={230} x2={390} y2={190} stroke="#8B5E3C" strokeWidth={4} />
            <ellipse cx={390} cy={178} rx={20} ry={16} fill="rgba(74,222,128,0.4)" stroke={C_GREEN} strokeWidth={1} />
            <defs>
              <marker id="wca" markerWidth={6} markerHeight={6} refX={5} refY={3} orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,0.5)" />
              </marker>
            </defs>
          </svg>
          {hovered && tooltips[hovered] && (
            <div className="absolute bottom-2 left-2 right-2 bg-black/85 text-xs text-white/80 rounded-lg px-3 py-2 leading-relaxed pointer-events-none">
              {tooltips[hovered]}
            </div>
          )}
        </div>
      }
      controls={
        <>
          <SectionLabel>Hover to explore</SectionLabel>
          <p className="text-xs text-muted-foreground">Mouse over any element for process details.</p>
          <div className="space-y-1 mt-2">
            <Stat label="Evaporation driver" value="Solar energy" />
            <Stat label="Annual precip. avg." value="~1000 mm/yr" />
            <Stat label="Transpiration share" value="~10% of cycle" />
            <Stat label="Groundwater storage" value="~30% of fresh water" />
          </div>
        </>
      }
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 17. Immune Response
// ─────────────────────────────────────────────────────────────────────────────
const IMM_STEPS = ["Pathogen Enters", "Innate Response", "Antigen Presentation", "Adaptive Response", "Memory Cells Formed"];

export function ImmuneResponse() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const cx = W / 2;

    const drawCell = (x: number, y: number, r: number, color: string, label: string) => {
      ctx.fillStyle = `${color}22`; ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = color; ctx.font = `bold ${Math.max(8, r / 2.5)}px Inter,sans-serif`; ctx.textAlign = "center";
      ctx.fillText(label, x, y + 4);
    };

    if (step >= 0) {
      // Pathogen
      ctx.fillStyle = C_RED; ctx.font = "bold 11px Inter,sans-serif"; ctx.textAlign = "center";
      ctx.fillText("Pathogen enters", cx, 24);
      for (let i = 0; i < 5; i++) {
        const px = 80 + i * 100, py = 55;
        ctx.fillStyle = "rgba(248,113,113,0.3)"; ctx.strokeStyle = C_RED; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(px, py, 12, 0, TAU); ctx.fill(); ctx.stroke();
        // Spikes
        for (let j = 0; j < 6; j++) {
          const a = (j / 6) * TAU;
          ctx.strokeStyle = C_RED; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(px + Math.cos(a) * 12, py + Math.sin(a) * 12);
          ctx.lineTo(px + Math.cos(a) * 18, py + Math.sin(a) * 18); ctx.stroke();
        }
      }
    }

    if (step >= 1) {
      drawCell(100, 155, 28, C_AMBER, "Neutrophil");
      drawCell(210, 150, 28, C_AMBER, "Macrophage");
      ctx.fillStyle = C_AMBER; ctx.font = "9px Inter,sans-serif"; ctx.textAlign = "center";
      ctx.fillText("Phagocytosis & inflammation", 160, 195);
      // Phagocytosis arms
      ctx.strokeStyle = C_AMBER; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(210, 124); ctx.bezierCurveTo(195, 75, 280, 70, 320, 55); ctx.stroke();
    }

    if (step >= 2) {
      drawCell(350, 155, 28, C_PURPLE, "Dendritic\nCell");
      ctx.strokeStyle = C_PURPLE; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(238, 150); ctx.lineTo(322, 155); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = C_PURPLE; ctx.font = "8px Inter,sans-serif"; ctx.textAlign = "center";
      ctx.fillText("Presents antigen", 290, 145);
    }

    if (step >= 3) {
      drawCell(200, 265, 26, C_PRIMARY, "T Cell");
      drawCell(350, 265, 26, C_GREEN, "B Cell");
      ctx.strokeStyle = C_PURPLE; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(350, 183); ctx.lineTo(350, 239); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(350, 183); ctx.lineTo(200, 239); ctx.stroke();
      // Antibodies
      ctx.fillStyle = C_GREEN; ctx.font = "9px Inter,sans-serif"; ctx.textAlign = "center";
      ctx.fillText("Antibodies secreted →", 460, 265);
    }

    if (step >= 4) {
      ctx.fillStyle = "rgba(74,222,128,0.15)";
      ctx.fillRect(cx - 140, 305, 280, 28);
      ctx.strokeStyle = C_GREEN; ctx.lineWidth = 1.5; ctx.strokeRect(cx - 140, 305, 280, 28);
      ctx.fillStyle = C_GREEN; ctx.font = "bold 10px Inter,sans-serif"; ctx.textAlign = "center";
      ctx.fillText("Memory B & T cells persist → faster response next time", cx, 323);
    }
  }, [step]);

  return (
    <ModelWrap
      viz={<canvas ref={ref} width={580} height={340} className="w-full h-full" />}
      controls={
        <>
          <StepNav steps={IMM_STEPS} current={step} onChange={setStep} />
          <Slider label="Phase" value={step} min={0} max={4} step={1} onChange={setStep} />
          <div className="space-y-1 mt-2">
            <Stat label="Innate response" value="Minutes–hours" />
            <Stat label="Adaptive response" value="Days–weeks" />
            <Stat label="Memory duration" value="Years–lifelong" />
          </div>
        </>
      }
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 18. Food Webs
// ─────────────────────────────────────────────────────────────────────────────
// Web-layout food web nodes with cross-level edges
const FW_NODES = [
  { id: 0, label: "Grass",       x: 120, y: 295, color: C_GREEN,   desc: "Producer — converts sunlight to energy" },
  { id: 1, label: "Plants",      x: 290, y: 295, color: C_GREEN,   desc: "Producer — photosynthesis, base of web" },
  { id: 2, label: "Algae",       x: 460, y: 295, color: C_GREEN,   desc: "Aquatic producer" },
  { id: 3, label: "Rabbit",      x: 80,  y: 210, color: C_CYAN,    desc: "Primary consumer — eats grass & plants" },
  { id: 4, label: "Deer",        x: 250, y: 215, color: C_CYAN,    desc: "Primary consumer — grazes on grass & plants" },
  { id: 5, label: "Insect",      x: 400, y: 205, color: C_CYAN,    desc: "Primary consumer — feeds on plants & algae" },
  { id: 6, label: "Fish",        x: 500, y: 210, color: C_CYAN,    desc: "Primary consumer — eats algae" },
  { id: 7, label: "Fox",         x: 130, y: 120, color: C_PRIMARY, desc: "Secondary consumer — preys on rabbit & deer" },
  { id: 8, label: "Owl",         x: 330, y: 115, color: C_PRIMARY, desc: "Secondary consumer — hunts rabbit & insect" },
  { id: 9, label: "Heron",       x: 490, y: 118, color: C_PRIMARY, desc: "Secondary consumer — eats fish & insect" },
  { id: 10, label: "Eagle",      x: 290, y: 30,  color: C_RED,     desc: "Apex predator — hunts fox, owl, rabbit, deer" },
];
const FW_EDGES = [
  [0,3],[0,4],[1,3],[1,4],[1,5],[2,5],[2,6],
  [3,7],[3,8],[4,7],[5,8],[5,9],[6,9],
  [7,10],[8,10],[3,10],[4,10],
];

export function FoodWebs() {
  const [selected, setSelected] = useState(-1);

  const connectedEdges = selected >= 0
    ? FW_EDGES.filter(([a, b]) => a === selected || b === selected)
    : [];
  const connectedIds = new Set(connectedEdges.flatMap(e => e));

  return (
    <ModelWrap
      darkBg={false}
      viz={
        <svg viewBox="0 0 580 340" className="w-full h-full" style={{ cursor: "default" }}>
          <rect width={580} height={340} fill="#080e1c" />
          <defs>
            <marker id="fwa" markerWidth={5} markerHeight={5} refX={4} refY={2.5} orient="auto">
              <path d="M0,0 L5,2.5 L0,5 Z" fill="rgba(255,255,255,0.3)" />
            </marker>
            <marker id="fwa-hi" markerWidth={5} markerHeight={5} refX={4} refY={2.5} orient="auto">
              <path d="M0,0 L5,2.5 L0,5 Z" fill={C_AMBER} />
            </marker>
          </defs>
          {FW_EDGES.map(([a, b], i) => {
            const n1 = FW_NODES[a], n2 = FW_NODES[b];
            const hi = connectedEdges.some(([ea, eb]) => ea === a && eb === b);
            return (
              <line key={i} x1={n1.x} y1={n1.y} x2={n2.x} y2={n2.y}
                stroke={hi ? C_AMBER : "rgba(255,255,255,0.12)"}
                strokeWidth={hi ? 2 : 1}
                markerEnd={hi ? "url(#fwa-hi)" : "url(#fwa)"} />
            );
          })}
          {FW_NODES.map(n => {
            const isSelected = n.id === selected;
            const isConnected = connectedIds.has(n.id);
            const dim = selected >= 0 && !isSelected && !isConnected;
            return (
              <g key={n.id} onClick={() => setSelected(selected === n.id ? -1 : n.id)} style={{ cursor: "pointer" }}>
                <circle cx={n.x} cy={n.y} r={isSelected ? 26 : 22}
                  fill={`${n.color}${isSelected ? "44" : dim ? "10" : "22"}`}
                  stroke={n.color} strokeWidth={isSelected ? 2.5 : 1.5}
                  opacity={dim ? 0.4 : 1} />
                <text x={n.x} y={n.y + 4} fill={n.color} fontSize={8} textAnchor="middle"
                  fontWeight={isSelected ? "bold" : "normal"} opacity={dim ? 0.4 : 1}>
                  {n.label}
                </text>
              </g>
            );
          })}
          {selected >= 0 && (
            <foreignObject x={10} y={310} width={380} height={28}>
              <div style={{ background: "rgba(8,14,28,0.95)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, padding: "4px 8px", color: "rgba(255,255,255,0.8)", fontSize: 9, lineHeight: 1.4 }}>
                {FW_NODES[selected].desc}
              </div>
            </foreignObject>
          )}
          <text x={570} y={300} fill={C_GREEN} fontSize={7} textAnchor="end">Producers</text>
          <text x={570} y={218} fill={C_CYAN} fontSize={7} textAnchor="end">Primary</text>
          <text x={570} y={125} fill={C_PRIMARY} fontSize={7} textAnchor="end">Secondary</text>
          <text x={570} y={38} fill={C_RED} fontSize={7} textAnchor="end">Apex</text>
        </svg>
      }
      controls={
        <>
          <SectionLabel>Click a node</SectionLabel>
          <p className="text-xs text-muted-foreground">Select any organism to see its feeding connections.</p>
          <div className="space-y-1 mt-2">
            <Stat label="Energy transfer" value="~10% per level" />
            <Stat label="Most energy lost as" value="Heat (respiration)" />
            <Stat label="Nodes" value={FW_NODES.length + ""} />
            <Stat label="Edges" value={FW_EDGES.length + ""} />
          </div>
        </>
      }
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 19. Pollination
// ─────────────────────────────────────────────────────────────────────────────
const POLL_STEPS = ["Flower Blooms", "Pollinator Visits", "Pollen Transfer", "Pollen Tube Grows", "Fertilisation & Seed"];
const POLL_DESCS = [
  "The flower opens, exposing the stamen (anthers) and pistil (stigma). Colourful petals and nectar attract pollinators.",
  "A bee arrives, attracted by colour and scent. As it collects nectar, pollen grains from the anthers stick to its body.",
  "The bee visits another flower of the same species. Pollen from its body contacts the sticky stigma — pollination occurs.",
  "The pollen grain germinates on the stigma, growing a pollen tube down through the style to reach the ovary.",
  "A sperm cell travels down the pollen tube to fertilise the ovule — a seed begins to form inside the ovary.",
];

export function Pollination() {
  const [step, setStep] = useState(0);

  // Bee x position changes per step
  const beeX = [430, 350, 310, 310, 310];
  const beeY = [100, 100, 90, 100, 120];
  const pollenOnBee = step >= 1;
  const pollenOnStigma = step >= 2;
  const pollen_tube = step >= 3;
  const seed = step >= 4;

  return (
    <ModelWrap
      darkBg={false}
      viz={
        <svg viewBox="0 0 580 340" className="w-full h-full">
          <rect width={580} height={340} fill="#080e1c" />
          {/* Stem */}
          <rect x={187} y={255} width={6} height={75} fill="#4a7c3f" />
          {/* Petals — scale up from step 0 */}
          {[0,60,120,180,240,300].map((angle, i) => {
            const petalScale = step === 0 ? 0.7 : 1;
            const pcx = 190 + Math.cos(angle * Math.PI / 180) * 55;
            const pcy = 165 + Math.sin(angle * Math.PI / 180) * 55;
            return (
              <ellipse key={i} cx={pcx} cy={pcy}
                rx={30 * petalScale} ry={18 * petalScale}
                fill="rgba(248,113,113,0.35)" stroke={C_RED} strokeWidth={1.5}
                transform={`rotate(${angle}, ${pcx}, ${pcy})`} />
            );
          })}
          {/* Receptacle */}
          <circle cx={190} cy={165} r={32} fill="rgba(251,191,36,0.2)" stroke={C_AMBER} strokeWidth={2} />
          {/* Stamens */}
          {[0,90,180,270].map((a, i) => {
            const fx = 190 + Math.cos(a * Math.PI / 180) * 16;
            const fy = 165 + Math.sin(a * Math.PI / 180) * 16;
            return (
              <g key={i}>
                <line x1={190} y1={165} x2={fx} y2={fy} stroke={C_GREEN} strokeWidth={2} />
                <ellipse cx={fx} cy={fy} rx={6} ry={4} fill={C_AMBER} />
              </g>
            );
          })}
          {/* Pistil */}
          <line x1={190} y1={133} x2={190} y2={165} stroke={C_PRIMARY} strokeWidth={3} />
          <ellipse cx={190} cy={129} rx={8} ry={6} fill={pollenOnStigma ? C_AMBER : "rgba(91,127,239,0.5)"} stroke={C_PRIMARY} strokeWidth={2} />
          {/* Pollen tube */}
          {pollen_tube && (
            <line x1={190} y1={135} x2={190} y2={188} stroke={C_AMBER} strokeWidth={2} strokeDasharray="4,2" />
          )}
          {/* Ovary / Seed */}
          <ellipse cx={190} cy={195} rx={14} ry={10} fill={seed ? "rgba(74,222,128,0.5)" : "rgba(74,222,128,0.2)"} stroke={C_GREEN} strokeWidth={1.5} />
          {seed && <ellipse cx={190} cy={195} rx={6} ry={5} fill={C_GREEN} />}
          {/* Labels */}
          <text x={215} y={132} fill={C_PRIMARY} fontSize={8}>Stigma</text>
          <text x={160} y={165} fill={C_AMBER} fontSize={8}>Anther</text>
          <text x={208} y={198} fill={C_GREEN} fontSize={8}>Ovary</text>

          {/* Second flower (source) */}
          <rect x={397} y={255} width={6} height={75} fill="#4a7c3f" />
          {[0,60,120,180,240,300].map((angle, i) => {
            const pcx = 400 + Math.cos(angle * Math.PI / 180) * 42;
            const pcy = 200 + Math.sin(angle * Math.PI / 180) * 42;
            return (
              <ellipse key={i} cx={pcx} cy={pcy} rx={24} ry={14}
                fill="rgba(167,139,250,0.3)" stroke={C_PURPLE} strokeWidth={1}
                transform={`rotate(${angle}, ${pcx}, ${pcy})`} />
            );
          })}
          <circle cx={400} cy={200} r={24} fill="rgba(251,191,36,0.15)" stroke={C_AMBER} strokeWidth={1.5} />
          <text x={400} y={148} fill={C_PURPLE} fontSize={8} textAnchor="middle">Source flower</text>

          {/* Bee */}
          <g style={{ transition: "transform 0.5s" }}>
            <ellipse cx={beeX[step]} cy={beeY[step]} rx={18} ry={11} fill="rgba(251,191,36,0.5)" stroke={C_AMBER} strokeWidth={1.5} />
            <text x={beeX[step]} y={beeY[step] + 4} fill={C_AMBER} fontSize={12} textAnchor="middle">🐝</text>
          </g>
          {/* Pollen on bee */}
          {pollenOnBee && !pollenOnStigma && (
            <>
              <circle cx={beeX[step] - 8} cy={beeY[step] - 5} r={4} fill={C_AMBER} opacity={0.9} />
              <circle cx={beeX[step] + 6} cy={beeY[step] - 4} r={3} fill={C_AMBER} opacity={0.7} />
            </>
          )}

          {/* Phase label */}
          <text x={290} y={325} fill="rgba(255,255,255,0.4)" fontSize={8} textAnchor="middle">
            {POLL_STEPS[step]}
          </text>
        </svg>
      }
      controls={
        <>
          <StepNav steps={POLL_STEPS} current={step} onChange={setStep} />
          <Slider label="Stage" value={step} min={0} max={4} step={1} onChange={setStep} />
          <p className="text-xs text-muted-foreground leading-relaxed mt-1">{POLL_DESCS[step]}</p>
          <div className="space-y-1 mt-2">
            <Stat label="Pollination type" value="Biotic (bee)" />
            <Stat label="Pollen tube" value="mm–cm" />
          </div>
        </>
      }
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 20. Skeletal Biomechanics
// ─────────────────────────────────────────────────────────────────────────────
export function SkeletalBiomechanics() {
  const [joint, setJoint] = useState(0);
  const jointTypes = ["Ball & Socket (Hip)", "Hinge (Knee)", "Pivot (Radius/Ulna)"];

  return (
    <ModelWrap
      darkBg={false}
      viz={
        <svg viewBox="0 0 580 340" className="w-full h-full">
          <rect width={580} height={340} fill="#080e1c" />
          {joint === 0 && (
            <g>
              {/* Ball */}
              <circle cx={290} cy={160} r={45} fill="rgba(251,191,36,0.15)" stroke={C_AMBER} strokeWidth={2} />
              <circle cx={290} cy={145} r={22} fill={C_AMBER} />
              {/* Socket */}
              <path d="M 245 145 Q 245 220 290 225 Q 335 220 335 145" fill="rgba(251,191,36,0.2)" stroke={C_AMBER} strokeWidth={2} />
              {/* Motion arcs */}
              <path d="M 235 100 Q 290 60 345 100" stroke={C_CYAN} strokeWidth={1.5} strokeDasharray="4,3" fill="none" />
              <path d="M 235 220 Q 290 260 345 220" stroke={C_CYAN} strokeWidth={1.5} strokeDasharray="4,3" fill="none" />
              <path d="M 235 100 Q 195 160 235 220" stroke={C_CYAN} strokeWidth={1.5} strokeDasharray="4,3" fill="none" />
              <path d="M 345 100 Q 385 160 345 220" stroke={C_CYAN} strokeWidth={1.5} strokeDasharray="4,3" fill="none" />
              <text x={290} y={300} fill={C_DIM} fontSize={10} textAnchor="middle">3° of freedom — flexion, abduction, rotation</text>
              <text x={290} y={42} fill={C_AMBER} fontSize={11} textAnchor="middle" fontWeight="bold">Ball & Socket Joint</text>
              <text x={290} y={57} fill={C_DIM} fontSize={9} textAnchor="middle">Hip, Shoulder</text>
            </g>
          )}
          {joint === 1 && (
            <g>
              {/* Femur */}
              <rect x={260} y={60} width={60} height={110} rx={8} fill="rgba(91,127,239,0.2)" stroke={C_PRIMARY} strokeWidth={2} />
              {/* Tibia */}
              <rect x={265} y={195} width={50} height={100} rx={8} fill="rgba(34,211,238,0.2)" stroke={C_CYAN} strokeWidth={2} />
              {/* Hinge point */}
              <circle cx={290} cy={190} r={12} fill={C_AMBER} />
              {/* Rotation arc */}
              <path d="M 240 190 Q 290 150 340 190" stroke={C_GREEN} strokeWidth={2} strokeDasharray="5,4" fill="none" />
              <text x={380} y={190} fill={C_GREEN} fontSize={9}>~140° range</text>
              <text x={290} y={300} fill={C_DIM} fontSize={10} textAnchor="middle">1° of freedom — flexion & extension only</text>
              <text x={290} y={42} fill={C_PRIMARY} fontSize={11} textAnchor="middle" fontWeight="bold">Hinge Joint</text>
              <text x={290} y={57} fill={C_DIM} fontSize={9} textAnchor="middle">Knee, Elbow, Fingers</text>
            </g>
          )}
          {joint === 2 && (
            <g>
              {/* Radius */}
              <rect x={220} y={100} width={140} height={40} rx={8} fill="rgba(167,139,250,0.2)" stroke={C_PURPLE} strokeWidth={2} />
              {/* Ulna */}
              <rect x={220} y={200} width={140} height={40} rx={8} fill="rgba(91,127,239,0.2)" stroke={C_PRIMARY} strokeWidth={2} />
              {/* Pivot point */}
              <circle cx={225} cy={170} r={14} fill={C_AMBER} />
              <circle cx={225} cy={170} r={6} fill={C_BG} />
              {/* Rotation arc */}
              <path d="M 290 90 Q 390 140 370 220 Q 340 270 290 250" stroke={C_GREEN} strokeWidth={2} strokeDasharray="5,4" fill="none" />
              <text x={400} y={160} fill={C_GREEN} fontSize={9}>180° rotation</text>
              <text x={290} y={300} fill={C_DIM} fontSize={10} textAnchor="middle">Rotation only — pronation & supination of forearm</text>
              <text x={290} y={42} fill={C_PURPLE} fontSize={11} textAnchor="middle" fontWeight="bold">Pivot Joint</text>
              <text x={290} y={57} fill={C_DIM} fontSize={9} textAnchor="middle">Radius/Ulna, Atlas/Axis (neck)</text>
            </g>
          )}
        </svg>
      }
      controls={
        <>
          <StepNav steps={jointTypes} current={joint} onChange={setJoint} />
          <div className="space-y-1 mt-2">
            <Stat label="Type" value={["Synovial", "Synovial", "Synovial"][joint]} />
            <Stat label="Degrees of freedom" value={["3", "1", "1"][joint]} />
            <Stat label="Location" value={["Hip, Shoulder", "Knee, Elbow", "Forearm, Neck"][joint]} />
          </div>
        </>
      }
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 21. Bacterial Binary Fission
// ─────────────────────────────────────────────────────────────────────────────
export function BinaryFission() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [speed, setSpeed] = useState(1);
  const phaseRef = useRef(0);
  const lastTRef2 = useRef(0);
  const speedRef2 = useRef(1);
  useEffect(() => { speedRef2.current = speed; }, [speed]);

  useRaf((t) => {
    const dt = t - lastTRef2.current; lastTRef2.current = t;
    phaseRef.current += dt * speedRef2.current * 0.25;
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2;
    const cycle = phaseRef.current % 1;

    if (cycle < 0.5) {
      // Single cell growing
      const scale = 1 + cycle * 0.8;
      const rx = 60 * scale, ry = 38;
      ctx.fillStyle = "rgba(74,222,128,0.15)";
      ctx.strokeStyle = C_GREEN; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); ctx.fill(); ctx.stroke();
      // Nucleoid (circular chromosome)
      const dnaPhase = cycle / 0.5;
      if (dnaPhase < 0.5) {
        // Single chromosome
        ctx.strokeStyle = C_CYAN; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(cx, cy, 22, 16, 0, 0, TAU); ctx.stroke();
      } else {
        // Replicating — two chromosomes
        const sep = (dnaPhase - 0.5) * 80;
        ctx.strokeStyle = C_CYAN; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(cx - sep / 2, cy, 16, 12, 0, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(cx + sep / 2, cy, 16, 12, 0, 0, TAU); ctx.stroke();
      }
      ctx.fillStyle = C_DIM; ctx.font = "10px Inter,sans-serif"; ctx.textAlign = "center";
      ctx.fillText(dnaPhase < 0.5 ? "Cell growing & DNA replicating" : "Chromosomes segregating", cx, cy + ry + 22);
    } else {
      // Septum forming → two cells
      const sep = (cycle - 0.5) / 0.5;
      const gap = sep * 30;
      const shrinkRx = 48 * (1 + (1 - sep) * 0.4);

      for (const sign of [-1, 1]) {
        const ocx = cx + sign * (30 + gap / 2);
        ctx.fillStyle = "rgba(74,222,128,0.15)";
        ctx.strokeStyle = C_GREEN; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(ocx, cy, shrinkRx * 0.9, 38, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = C_CYAN; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(ocx, cy, 14, 10, 0, 0, TAU); ctx.stroke();
      }
      // Septum
      if (sep < 0.6) {
        const sWidth = (1 - sep / 0.6) * 6;
        ctx.strokeStyle = C_AMBER; ctx.lineWidth = sWidth;
        ctx.beginPath(); ctx.moveTo(cx, cy - 38); ctx.lineTo(cx, cy + 38); ctx.stroke();
      }
      ctx.fillStyle = C_DIM; ctx.font = "10px Inter,sans-serif"; ctx.textAlign = "center";
      ctx.fillText(sep < 0.5 ? "Septum forming" : "Two daughter cells", cx, cy + 65);
    }

    // Generation time label
    ctx.fillStyle = C_DIM; ctx.font = "9px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText("E. coli generation time: ~20 min", cx, H - 18);
  }, true);

  return (
    <ModelWrap
      viz={<canvas ref={ref} width={580} height={340} className="w-full h-full" />}
      controls={
        <>
          <Slider label="Speed" value={speed} min={0.2} max={4} step={0.1} onChange={setSpeed} />
          <div className="space-y-1 mt-2">
            <Stat label="Type" value="Asexual — no meiosis" />
            <Stat label="E. coli gen. time" value="~20 min" />
            <Stat label="Result" value="2 identical daughter cells" />
            <Stat label="Genetic variation" value="Mutation only" />
          </div>
        </>
      }
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 22. Viral Replication (Lytic Cycle)
// ─────────────────────────────────────────────────────────────────────────────
const VIRAL_STEPS = ["Attachment", "Injection", "Replication", "Assembly", "Lysis"];

export function ViralReplication() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2;

    // Host cell (bacteria)
    ctx.fillStyle = "rgba(74,222,128,0.12)";
    ctx.strokeStyle = C_GREEN; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(cx, cy + 20, 140, 100, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C_GREEN; ctx.font = "10px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText("Host bacterium", cx, cy + 136);

    // Bacteriophage drawing helper
    const drawPhage = (px: number, py: number, scale = 1, injecting = false) => {
      // Head
      ctx.fillStyle = "rgba(248,113,113,0.4)"; ctx.strokeStyle = C_RED; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(px, py - 22 * scale);
      ctx.lineTo(px + 14 * scale, py); ctx.lineTo(px, py + 8 * scale);
      ctx.lineTo(px - 14 * scale, py); ctx.closePath(); ctx.fill(); ctx.stroke();
      // Tail
      ctx.strokeStyle = C_RED; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(px, py + 8 * scale); ctx.lineTo(px, py + 28 * scale); ctx.stroke();
      // Tail fibers
      for (const side of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(px, py + 28 * scale);
        ctx.lineTo(px + side * 12 * scale, py + 40 * scale); ctx.stroke();
      }
      // DNA injection arrow
      if (injecting) {
        ctx.strokeStyle = C_CYAN; ctx.lineWidth = 2; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(px, py + 10); ctx.lineTo(px, cy - 30); ctx.stroke();
        ctx.setLineDash([]);
      }
    };

    if (step === 0) {
      drawPhage(cx, cy - 165);
      ctx.strokeStyle = "rgba(248,113,113,0.4)"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(cx, cy - 125); ctx.lineTo(cx, cy - 80); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = C_DIM; ctx.font = "10px Inter,sans-serif"; ctx.textAlign = "center";
      ctx.fillText("Phage tail fibres recognise surface receptors", cx, H - 18);
    }
    if (step === 1) {
      drawPhage(cx, cy - 78, 1, true);
      ctx.fillStyle = C_CYAN; ctx.font = "9px Inter,sans-serif"; ctx.textAlign = "left";
      ctx.fillText("DNA injected →", cx + 12, cy - 50);
    }
    if (step === 2) {
      // Replication inside cell
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        const rx = cx + Math.cos(a) * 70, ry = cy + 20 + Math.sin(a) * 50;
        ctx.strokeStyle = C_CYAN; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(rx, ry, 16, 10, a, 0, TAU); ctx.stroke();
      }
      ctx.fillStyle = C_CYAN; ctx.font = "10px Inter,sans-serif"; ctx.textAlign = "center";
      ctx.fillText("Viral DNA hijacks ribosomes → copies", cx, cy - 80);
    }
    if (step === 3) {
      // Assembly — new phages forming
      for (let i = 0; i < 5; i++) {
        const px = cx - 80 + i * 40, py = cy + 10;
        drawPhage(px, py, 0.7);
      }
      ctx.fillStyle = C_AMBER; ctx.font = "10px Inter,sans-serif"; ctx.textAlign = "center";
      ctx.fillText("~100–200 new phage particles assembled", cx, cy - 80);
    }
    if (step === 4) {
      // Lysis — cell bursting
      ctx.fillStyle = "rgba(248,113,113,0.08)";
      ctx.strokeStyle = "rgba(248,113,113,0.5)"; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.ellipse(cx, cy + 20, 140, 100, 0, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        drawPhage(cx + Math.cos(a) * 160, cy + 20 + Math.sin(a) * 120, 0.65);
      }
      ctx.fillStyle = C_RED; ctx.font = "bold 11px Inter,sans-serif"; ctx.textAlign = "center";
      ctx.fillText("Cell lyses — phages released to infect new hosts", cx, H - 18);
    }
  }, [step]);

  return (
    <ModelWrap
      viz={<canvas ref={ref} width={580} height={340} className="w-full h-full" />}
      controls={
        <>
          <StepNav steps={VIRAL_STEPS} current={step} onChange={setStep} />
          <Slider label="Stage" value={step} min={0} max={4} step={1} onChange={setStep} />
          <div className="space-y-1 mt-2">
            <Stat label="Burst size" value="~100–300 phages" />
            <Stat label="Latent period" value="~25 min" />
            <Stat label="Alternative" value="Lysogenic cycle" />
          </div>
        </>
      }
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 23. CRISPR-Cas9
// ─────────────────────────────────────────────────────────────────────────────
const CRISPR_STEPS = ["Design Guide RNA", "Cas9 Binding", "Target Search", "DNA Cut (DSB)", "Repair (NHEJ / HDR)"];

export function CRISPRCas9() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const cx = W / 2;

    // DNA double helix (simplified — two parallel lines with rungs)
    const dnaY = 120, dnaLeft = 60, dnaRight = W - 60;
    const drawDNA = (cutAt?: number) => {
      // Strand 1
      ctx.strokeStyle = C_PRIMARY; ctx.lineWidth = 3;
      if (cutAt !== undefined) {
        ctx.beginPath(); ctx.moveTo(dnaLeft, dnaY); ctx.lineTo(cutAt - 4, dnaY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cutAt + 4, dnaY); ctx.lineTo(dnaRight, dnaY); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.moveTo(dnaLeft, dnaY); ctx.lineTo(dnaRight, dnaY); ctx.stroke();
      }
      // Strand 2
      ctx.strokeStyle = C_CYAN; ctx.lineWidth = 3;
      if (cutAt !== undefined) {
        ctx.beginPath(); ctx.moveTo(dnaLeft, dnaY + 24); ctx.lineTo(cutAt - 4, dnaY + 24); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cutAt + 4, dnaY + 24); ctx.lineTo(dnaRight, dnaY + 24); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.moveTo(dnaLeft, dnaY + 24); ctx.lineTo(dnaRight, dnaY + 24); ctx.stroke();
      }
      // Base pairs (rungs)
      ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.lineWidth = 1.5;
      for (let x = dnaLeft + 20; x < dnaRight; x += 20) {
        if (cutAt && Math.abs(x - cutAt) < 8) continue;
        ctx.beginPath(); ctx.moveTo(x, dnaY); ctx.lineTo(x, dnaY + 24); ctx.stroke();
      }
    };

    if (step === 0) {
      drawDNA();
      // Guide RNA
      ctx.fillStyle = "rgba(167,139,250,0.2)"; ctx.strokeStyle = C_PURPLE; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.rect(160, 180, 200, 40); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C_PURPLE; ctx.font = "bold 10px Inter,sans-serif"; ctx.textAlign = "center";
      ctx.fillText("gRNA: 5'-GGTTGCGGCTCTTGAATCGA-3'", 260, 204);
      ctx.fillStyle = C_DIM; ctx.font = "9px Inter,sans-serif";
      ctx.fillText("Guide RNA (20 nt) matches target DNA sequence", 260, 250);
      ctx.fillText("Adjacent to PAM sequence (NGG)", 260, 268);
    }
    if (step === 1) {
      drawDNA();
      // Cas9 protein blob
      ctx.fillStyle = "rgba(251,191,36,0.2)"; ctx.strokeStyle = C_AMBER; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(cx, 200, 70, 50, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C_AMBER; ctx.font = "bold 11px Inter,sans-serif"; ctx.textAlign = "center";
      ctx.fillText("Cas9", cx, 198);
      ctx.fillText("Protein", cx, 213);
      // gRNA loaded
      ctx.strokeStyle = C_PURPLE; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx, 150); ctx.lineTo(cx, 166); ctx.stroke();
      ctx.fillStyle = C_PURPLE; ctx.font = "9px Inter,sans-serif";
      ctx.fillText("gRNA loaded", cx + 10, 162);
    }
    if (step === 2) {
      drawDNA();
      // Cas9 scanning
      ctx.fillStyle = "rgba(251,191,36,0.2)"; ctx.strokeStyle = C_AMBER; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(cx + 80, 195, 60, 44, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C_AMBER; ctx.font = "bold 10px Inter,sans-serif"; ctx.textAlign = "center";
      ctx.fillText("Cas9+gRNA", cx + 80, 198);
      // Scan arrows
      ctx.strokeStyle = C_DIM; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(120, 210); ctx.lineTo(cx + 20, 195); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = C_DIM; ctx.font = "9px Inter,sans-serif";
      ctx.fillText("Scans DNA for matching sequence + PAM", cx - 50, 268);
    }
    if (step === 3) {
      drawDNA(cx);
      // Cut marks
      ctx.strokeStyle = C_RED; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx - 4, dnaY - 6); ctx.lineTo(cx + 4, dnaY + 30); ctx.stroke();
      ctx.fillStyle = C_RED; ctx.font = "bold 11px Inter,sans-serif"; ctx.textAlign = "center";
      ctx.fillText("✂ Double-strand break (DSB)", cx, dnaY + 55);
      ctx.fillStyle = "rgba(251,191,36,0.2)"; ctx.strokeStyle = C_AMBER; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(cx, 220, 55, 40, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C_AMBER; ctx.font = "10px Inter,sans-serif";
      ctx.fillText("Cas9", cx, 216); ctx.fillText("cuts", cx, 229);
    }
    if (step === 4) {
      drawDNA(cx);
      // NHEJ path
      ctx.fillStyle = "rgba(248,113,113,0.15)"; ctx.strokeStyle = C_RED; ctx.lineWidth = 1.5;
      ctx.fillRect(60, 195, 170, 50); ctx.strokeRect(60, 195, 170, 50);
      ctx.fillStyle = C_RED; ctx.font = "bold 10px Inter,sans-serif"; ctx.textAlign = "center";
      ctx.fillText("NHEJ", 145, 213);
      ctx.fillStyle = C_DIM; ctx.font = "9px Inter,sans-serif";
      ctx.fillText("Error-prone re-join", 145, 228);
      ctx.fillText("→ gene knockout", 145, 241);
      // HDR path
      ctx.fillStyle = "rgba(74,222,128,0.15)"; ctx.strokeStyle = C_GREEN; ctx.lineWidth = 1.5;
      ctx.fillRect(350, 195, 170, 50); ctx.strokeRect(350, 195, 170, 50);
      ctx.fillStyle = C_GREEN; ctx.font = "bold 10px Inter,sans-serif";
      ctx.fillText("HDR", 435, 213);
      ctx.fillStyle = C_DIM; ctx.font = "9px Inter,sans-serif";
      ctx.fillText("Template-directed repair", 435, 228);
      ctx.fillText("→ precise edit", 435, 241);
    }
  }, [step]);

  return (
    <ModelWrap
      viz={<canvas ref={ref} width={580} height={340} className="w-full h-full" />}
      controls={
        <>
          <StepNav steps={CRISPR_STEPS} current={step} onChange={setStep} />
          <Slider label="Stage" value={step} min={0} max={4} step={1} onChange={setStep} />
          <div className="space-y-1 mt-2">
            <Stat label="Cas9 source" value="S. pyogenes" />
            <Stat label="gRNA length" value="~20 nucleotides" />
            <Stat label="PAM sequence" value="5'-NGG-3'" />
          </div>
        </>
      }
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 24. Carbon Sequestration
// ─────────────────────────────────────────────────────────────────────────────
export function CarbonSequestration() {
  const [deforestation, setDeforestation] = useState(20);
  const forestStore = Math.max(10, 550 - deforestation * 4);
  const soilStore = 1500;
  const oceanStore = 38000;

  return (
    <ModelWrap
      darkBg={false}
      viz={
        <svg viewBox="0 0 580 340" className="w-full h-full">
          <rect width={580} height={340} fill="#080e1c" />
          {/* Sky */}
          <rect width={580} height={140} fill="rgba(34,211,238,0.04)" />
          {/* Ground */}
          <rect y={200} width={580} height={50} fill="rgba(251,191,36,0.07)" />
          {/* Underground */}
          <rect y={250} width={580} height={90} fill="rgba(251,191,36,0.04)" />
          {/* Ocean */}
          <rect x={380} y={140} width={200} height={160} fill="rgba(91,127,239,0.12)" />
          <text x={480} y={165} fill={C_PRIMARY} fontSize={9} textAnchor="middle" fontWeight="bold">Ocean</text>
          <text x={480} y={180} fill={C_PRIMARY} fontSize={8} textAnchor="middle">{oceanStore.toLocaleString()} GtC</text>

          {/* Atmosphere CO2 */}
          <text x={170} y={30} fill={C_CYAN} fontSize={10} textAnchor="middle" fontWeight="bold">Atmosphere</text>
          <text x={170} y={46} fill={C_CYAN} fontSize={9} textAnchor="middle">~860 GtC (↑ w/ deforestation)</text>

          {/* Trees */}
          {Array.from({ length: Math.max(2, Math.round((100 - deforestation) / 12)) }).map((_, i) => {
            const tx = 40 + i * 52;
            return (
              <g key={i}>
                <rect x={tx - 3} y={190} width={6} height={30} fill="#6B4226" />
                <ellipse cx={tx} cy={178} rx={18} ry={16} fill={`rgba(74,222,128,${0.5 - deforestation / 300})`} stroke={C_GREEN} strokeWidth={1} />
              </g>
            );
          })}
          <text x={170} y={232} fill={C_GREEN} fontSize={9} textAnchor="middle" fontWeight="bold">Forest Biota: {forestStore} GtC</text>

          {/* Soil */}
          <text x={190} y={270} fill={C_AMBER} fontSize={9} textAnchor="middle" fontWeight="bold">Soil & Detritus: {soilStore} GtC</text>

          {/* Photosynthesis arrow */}
          <line x1={170} y1={60} x2={170} y2={168} stroke={C_GREEN} strokeWidth={2} markerEnd="url(#sq)" />
          <text x={192} y={120} fill={C_GREEN} fontSize={8}>Photosynthesis</text>
          <text x={192} y={132} fill={C_GREEN} fontSize={8}>120 GtC/yr</text>
          {/* Respiration arrow */}
          <line x1={150} y1={168} x2={130} y2={60} stroke={C_AMBER} strokeWidth={2} strokeDasharray="4,3" markerEnd="url(#sq)" />
          <text x={60} y={120} fill={C_AMBER} fontSize={8}>Respiration</text>
          <text x={60} y={132} fill={C_AMBER} fontSize={8}>~60 GtC/yr</text>
          {/* Ocean exchange */}
          <line x1={378} y1={170} x2={310} y2={55} stroke={C_PRIMARY} strokeWidth={1.5} strokeDasharray="4,3" markerEnd="url(#sq)" />
          <text x={330} y={100} fill={C_PRIMARY} fontSize={8}>Ocean uptake</text>
          <text x={330} y={112} fill={C_PRIMARY} fontSize={8}>~2.5 GtC/yr</text>
          {/* Deforestation emissions */}
          {deforestation > 10 && (
            <g>
              <line x1={220} y1={180} x2={270} y2={55} stroke={C_RED} strokeWidth={clamp(deforestation / 25, 1, 4)} markerEnd="url(#sq)" />
              <text x={260} y={140} fill={C_RED} fontSize={8}>Deforestation</text>
              <text x={260} y={152} fill={C_RED} fontSize={8}>{(deforestation * 0.12).toFixed(1)} GtC/yr</text>
            </g>
          )}
          <defs>
            <marker id="sq" markerWidth={6} markerHeight={6} refX={5} refY={3} orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,0.5)" />
            </marker>
          </defs>
        </svg>
      }
      controls={
        <>
          <Slider label="Deforestation Rate" value={deforestation} min={0} max={100} unit="%" onChange={setDeforestation} color={C_RED} />
          <div className="space-y-1 mt-2">
            <Stat label="Forest carbon store" value={`${forestStore} GtC`} />
            <Stat label="Annual forest loss" value={`${(deforestation * 0.12).toFixed(1)} GtC/yr`} />
            <Stat label="Ocean uptake" value="~2.5 GtC/yr" />
          </div>
        </>
      }
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 25. Biome Distribution (Whittaker Diagram)
// ─────────────────────────────────────────────────────────────────────────────
const BIOMES = [
  { name: "Tropical Rainforest", color: "#1a6b1a", tMin: 20, tMax: 35, pMin: 2000, pMax: 4500 },
  { name: "Tropical Savanna",    color: "#8db830", tMin: 20, tMax: 35, pMin: 500,  pMax: 2000 },
  { name: "Desert",              color: "#d4a020", tMin: 10, tMax: 40, pMin: 0,    pMax: 500  },
  { name: "Mediterranean",       color: "#c8a045", tMin: 10, tMax: 25, pMin: 300,  pMax: 900  },
  { name: "Temperate Rainforest",color: "#2d7a4a", tMin: 5,  tMax: 20, pMin: 1400, pMax: 3000 },
  { name: "Temperate Forest",    color: "#4a8f30", tMin: 5,  tMax: 20, pMin: 600,  pMax: 1500 },
  { name: "Temperate Grassland", color: "#a0c040", tMin: -5, tMax: 20, pMin: 200,  pMax: 750  },
  { name: "Boreal (Taiga)",      color: "#2a6060", tMin: -15,tMax: 10, pMin: 300,  pMax: 850  },
  { name: "Tundra",              color: "#7090a0", tMin: -25,tMax: 5,  pMin: 100,  pMax: 600  },
  { name: "Polar / Ice",         color: "#aaccdd", tMin: -55,tMax: -5, pMin: 0,    pMax: 400  },
];

export function BiomeDistribution() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [temp, setTemp] = useState(22);
  const [precip, setPrecip] = useState(2200);

  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);

    const pad = { l: 70, r: 20, t: 30, b: 55 };
    const gw = W - pad.l - pad.r, gh = H - pad.t - pad.b;
    const x0 = pad.l, y0 = pad.t + gh;

    // Axis ranges
    const tRange = [-55, 40], pRange = [0, 4500];
    const tToX = (t: number) => x0 + ((t - tRange[0]) / (tRange[1] - tRange[0])) * gw;
    const pToY = (p: number) => y0 - ((p - pRange[0]) / (pRange[1] - pRange[0])) * gh;

    // Draw biome regions as filled rects (approximate)
    BIOMES.forEach(b => {
      const x1 = tToX(b.tMin), x2 = tToX(b.tMax);
      const y1 = pToY(b.pMax), y2 = pToY(b.pMin);
      ctx.fillStyle = b.color + "55";
      ctx.strokeStyle = b.color + "99"; ctx.lineWidth = 1;
      ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      // Label
      ctx.fillStyle = b.color; ctx.font = "8px Inter,sans-serif"; ctx.textAlign = "center";
      ctx.fillText(b.name.split(" ")[0], (x1 + x2) / 2, (y1 + y2) / 2 + 4);
    });

    drawAxes(ctx, x0, y0, gw, gh, "Mean Annual Temp (°C)", "Annual Precip. (mm)");

    // T axis labels
    [-40, -20, 0, 20, 40].forEach(t => {
      const x = tToX(t);
      ctx.fillStyle = C_DIM; ctx.font = "9px Inter,sans-serif"; ctx.textAlign = "center";
      ctx.fillText(`${t}°`, x, y0 + 14);
    });
    // P axis labels
    [0, 1000, 2000, 3000, 4000].forEach(p => {
      const y = pToY(p);
      ctx.fillStyle = C_DIM; ctx.font = "9px Inter,sans-serif"; ctx.textAlign = "right";
      ctx.fillText(`${p}`, x0 - 4, y + 4);
    });

    // Current climate point
    const px = tToX(temp), py = pToY(precip);
    ctx.fillStyle = C_RED;
    ctx.beginPath(); ctx.arc(px, py, 7, 0, TAU); ctx.fill();
    ctx.strokeStyle = "white"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(px, py, 7, 0, TAU); ctx.stroke();

    // Current biome label
    const biome = BIOMES.find(b =>
      temp >= b.tMin && temp <= b.tMax && precip >= b.pMin && precip <= b.pMax
    );
    ctx.fillStyle = C_FG; ctx.font = "bold 11px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText(biome ? `Biome: ${biome.name}` : "Transition zone", W / 2, H - 14);
  }, [temp, precip]);

  return (
    <ModelWrap
      viz={<canvas ref={ref} width={580} height={340} className="w-full h-full" />}
      controls={
        <>
          <Slider label="Mean Temp" value={temp} min={-55} max={40} unit="°C" onChange={setTemp} />
          <Slider label="Annual Precip." value={precip} min={0} max={4500} unit=" mm" onChange={setPrecip} color={C_CYAN} />
          <div className="space-y-1 mt-1">
            <Stat label="Current biome" value={BIOMES.find(b => temp >= b.tMin && temp <= b.tMax && precip >= b.pMin && precip <= b.pMax)?.name ?? "Transition"} />
          </div>
        </>
      }
    />
  );
}
