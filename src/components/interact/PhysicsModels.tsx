import { useRef, useState, useEffect } from "react";
import {
  ModelWrap, Slider, Stat, SectionLabel, StepNav, useRaf,
  C_BG, C_FG, C_DIM, C_PRIMARY, C_GREEN, C_RED, C_AMBER, C_CYAN, C_PURPLE,
  clamp, lerp, TAU, drawAxes, drawCurve,
} from "./shared";

// ─── 1. Simple Harmonic Motion ────────────────────────────────────────────────
export function SHM() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [freq, setFreq] = useState(1);
  const [amp, setAmp] = useState(80);
  const [mode, setMode] = useState(0); // 0=spring, 1=pendulum

  useRaf((t) => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2;
    const x = amp * Math.sin(TAU * freq * t);
    const v = amp * TAU * freq * Math.cos(TAU * freq * t);

    if (mode === 0) {
      // Spring
      const restY = 60, bobY = restY + 120 + x;
      // Spring coil
      ctx.strokeStyle = C_DIM; ctx.lineWidth = 1.5;
      const coils = 10;
      ctx.beginPath();
      for (let i = 0; i <= coils * 8; i++) {
        const frac = i / (coils * 8);
        const sy = restY + frac * (bobY - restY - 20);
        const sx = cx + (i % 2 === 0 ? 12 : -12) * (i > 0 && i < coils * 8 ? 1 : 0);
        i === 0 ? ctx.moveTo(cx, restY) : ctx.lineTo(sx, sy);
      }
      ctx.lineTo(cx, bobY - 18); ctx.stroke();
      // Ceiling
      ctx.fillStyle = C_DIM; ctx.fillRect(cx - 40, restY - 8, 80, 8);
      // Bob
      ctx.fillStyle = C_PRIMARY; ctx.strokeStyle = C_CYAN; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, bobY, 18, 0, TAU); ctx.fill(); ctx.stroke();
      // Equilibrium line
      ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.lineWidth = 1; ctx.setLineDash([4,4]);
      ctx.beginPath(); ctx.moveTo(cx - 60, restY + 120); ctx.lineTo(cx + 60, restY + 120); ctx.stroke();
      ctx.setLineDash([]);
    } else {
      // Pendulum
      const pivotX = cx, pivotY = 40, L = 160;
      const angle = (amp / 160) * 0.8 * Math.sin(TAU * freq * t);
      const bobX = pivotX + L * Math.sin(angle);
      const bobY = pivotY + L * Math.cos(angle);
      ctx.strokeStyle = C_DIM; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(pivotX, pivotY); ctx.lineTo(bobX, bobY); ctx.stroke();
      ctx.fillStyle = "#555"; ctx.fillRect(pivotX - 40, pivotY - 8, 80, 8);
      ctx.fillStyle = C_AMBER; ctx.strokeStyle = C_RED; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(bobX, bobY, 16, 0, TAU); ctx.fill(); ctx.stroke();
      // Angle arc
      ctx.strokeStyle = "rgba(34,211,238,0.4)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(pivotX, pivotY, 40, Math.PI/2 - 0.4, Math.PI/2 + 0.4); ctx.stroke();
    }

    // Graph on right
    const gx = W - 170, gy = 30, gw = 150, gh = H - 60;
    ctx.strokeStyle = "rgba(255,255,255,0.1)"; ctx.lineWidth = 1;
    ctx.strokeRect(gx, gy, gw, gh);
    const pts: [number,number][] = [];
    for (let i = 0; i < 100; i++) {
      const tt = t - (100 - i) * 0.02;
      pts.push([gx + (i/100)*gw, gy + gh/2 - (amp/100 * Math.sin(TAU*freq*tt)) * gh * 0.45]);
    }
    drawCurve(ctx, pts, C_GREEN, 1.5);
    ctx.fillStyle = C_DIM; ctx.font = "9px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText("x(t)", gx + gw/2, gy - 4);

    ctx.fillStyle = C_FG; ctx.font = "bold 11px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText(`v = ${v.toFixed(1)} cm/s`, 180, H - 18);
  }, true);

  return (
    <ModelWrap
      viz={<canvas ref={ref} width={580} height={340} className="w-full h-full" />}
      controls={
        <>
          <SectionLabel>System</SectionLabel>
          <div className="flex gap-1.5">
            {["Spring","Pendulum"].map((m,i)=>(
              <button key={m} onClick={()=>setMode(i)} className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium border transition-colors ${mode===i?"bg-primary/20 text-primary border-primary/30":"text-muted-foreground border-transparent hover:bg-secondary"}`}>{m}</button>
            ))}
          </div>
          <Slider label="Frequency" value={freq} min={0.2} max={3} step={0.1} unit=" Hz" onChange={setFreq}/>
          <Slider label="Amplitude" value={amp} min={10} max={120} unit=" cm" onChange={setAmp}/>
          <div className="space-y-1"><Stat label="Period" value={`${(1/freq).toFixed(2)} s`}/><Stat label="ω" value={`${(TAU*freq).toFixed(2)} rad/s`}/></div>
        </>
      }
    />
  );
}

// ─── 2. Electromagnetic Induction ────────────────────────────────────────────
export function EMInduction() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [speed, setSpeed] = useState(1);
  const histRef = useRef<number[]>([]);

  useRaf((t) => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const magX = 80 + 180 * (0.5 + 0.5 * Math.sin(t * speed * 2));
    const emf = -speed * 2 * Math.cos(t * speed * 2) * 40;
    histRef.current.push(emf);
    if (histRef.current.length > 120) histRef.current.shift();

    // Coil
    const coilX = 320, coilY = H/2, coilW = 100, coilH = 80;
    ctx.strokeStyle = C_PRIMARY; ctx.lineWidth = 2.5;
    for (let i = 0; i < 6; i++) {
      const x = coilX - coilW/2 + i * (coilW/5);
      ctx.beginPath(); ctx.ellipse(x, coilY, 5, coilH/2, 0, 0, TAU); ctx.stroke();
    }
    ctx.strokeStyle = C_CYAN; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(coilX - coilW/2, coilY); ctx.lineTo(coilX - coilW/2 - 20, coilY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(coilX + coilW/2, coilY); ctx.lineTo(coilX + coilW/2 + 20, coilY); ctx.stroke();

    // Magnet
    const mw = 40, mh = 70;
    ctx.fillStyle = C_RED;
    ctx.fillRect(magX - mw/2, coilY - mh/2, mw, mh/2);
    ctx.fillStyle = C_PRIMARY;
    ctx.fillRect(magX - mw/2, coilY, mw, mh/2);
    ctx.fillStyle = "#fff"; ctx.font = "bold 14px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText("N", magX, coilY - mh/4 + 5);
    ctx.fillText("S", magX, coilY + mh/4 + 5);

    // Field lines
    for (let i = -2; i <= 2; i++) {
      const fy = coilY + i * 18;
      const dir = magX < coilX ? 1 : -1;
      ctx.strokeStyle = `rgba(248,113,113,${0.3 - Math.abs(i)*0.06})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(magX + dir*25, fy); ctx.lineTo(coilX - coilW/2 - 5, fy); ctx.stroke();
    }

    // EMF graph
    const gx = 20, gy = 200, gw = 140, gh = 110;
    ctx.fillStyle = "rgba(255,255,255,0.04)"; ctx.fillRect(gx, gy, gw, gh);
    ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.lineWidth = 1; ctx.strokeRect(gx, gy, gw, gh);
    ctx.fillStyle = C_DIM; ctx.font = "9px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText("EMF (V)", gx + gw/2, gy - 4);
    const hist = histRef.current;
    if (hist.length > 1) {
      const pts: [number,number][] = hist.map((v,i) => [gx + (i/120)*gw, gy + gh/2 - v * (gh/100)]);
      drawCurve(ctx, pts, C_GREEN, 1.5);
    }
    ctx.strokeStyle = "rgba(255,255,255,0.2)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(gx, gy+gh/2); ctx.lineTo(gx+gw, gy+gh/2); ctx.stroke();

    ctx.fillStyle = C_FG; ctx.font = "bold 10px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText(`EMF = ${emf.toFixed(1)} V`, 90, H - 18);
  }, true);

  return (
    <ModelWrap
      viz={<canvas ref={ref} width={580} height={340} className="w-full h-full" />}
      controls={
        <>
          <Slider label="Magnet Speed" value={speed} min={0.2} max={3} step={0.1} onChange={setSpeed}/>
          <div className="space-y-1 mt-2">
            <Stat label="Faraday's Law" value="ε = −dΦ/dt"/>
            <Stat label="Lenz's Law" value="Opposes change"/>
          </div>
        </>
      }
    />
  );
}

// ─── 3. Centripetal Force ────────────────────────────────────────────────────
export function CentripetalForce() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [angVel, setAngVel] = useState(2);
  const [radius, setRadius] = useState(100);
  const mass = 2;

  useRaf((t) => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const cx = 240, cy = H/2;
    const angle = t * angVel;
    const bx = cx + radius * Math.cos(angle), by = cy + radius * Math.sin(angle);
    const fc = mass * angVel * angVel * radius;

    // Orbit path
    ctx.strokeStyle = "rgba(255,255,255,0.1)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, TAU); ctx.stroke();

    // String / rod
    ctx.strokeStyle = C_DIM; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(bx, by); ctx.stroke();

    // Centre pivot
    ctx.fillStyle = C_AMBER;
    ctx.beginPath(); ctx.arc(cx, cy, 6, 0, TAU); ctx.fill();

    // Ball
    ctx.fillStyle = C_PRIMARY; ctx.strokeStyle = C_CYAN; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(bx, by, 14, 0, TAU); ctx.fill(); ctx.stroke();

    // Centripetal force arrow (toward centre)
    const len = clamp(fc / 5, 15, 70);
    const dx = (cx - bx) / radius, dy = (cy - by) / radius;
    ctx.strokeStyle = C_RED; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + dx*len, by + dy*len); ctx.stroke();
    ctx.fillStyle = C_RED;
    ctx.beginPath(); ctx.moveTo(bx + dx*len, by + dy*len);
    ctx.lineTo(bx + dx*len - dy*6 - dx*8, by + dy*len + dx*6 - dy*8);
    ctx.lineTo(bx + dx*len + dy*6 - dx*8, by + dy*len - dx*6 - dy*8);
    ctx.closePath(); ctx.fill();

    // Velocity arrow (tangential)
    ctx.strokeStyle = C_GREEN; ctx.lineWidth = 2;
    const vx = -Math.sin(angle), vy = Math.cos(angle);
    const vlen = clamp(angVel * radius / 3, 15, 60);
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + vx*vlen, by + vy*vlen); ctx.stroke();

    // Labels
    ctx.fillStyle = C_RED; ctx.font = "9px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText("Fc", bx + dx*len*0.5 + 12, by + dy*len*0.5);
    ctx.fillStyle = C_GREEN;
    ctx.fillText("v", bx + vx*vlen + 8, by + vy*vlen);

    // Stats panel
    const px = W - 155;
    ctx.fillStyle = C_FG; ctx.font = "bold 11px Inter,sans-serif"; ctx.textAlign = "left";
    ctx.fillText(`Fc = ${fc.toFixed(1)} N`, px, H/2 - 20);
    ctx.fillText(`v = ${(angVel*radius/100).toFixed(2)} m/s`, px, H/2);
    ctx.fillText(`T = ${(TAU/angVel).toFixed(2)} s`, px, H/2 + 20);
  }, true);

  return (
    <ModelWrap
      viz={<canvas ref={ref} width={580} height={340} className="w-full h-full" />}
      controls={
        <>
          <Slider label="Angular Velocity" value={angVel} min={0.5} max={5} step={0.1} unit=" rad/s" onChange={setAngVel}/>
          <Slider label="Radius" value={radius} min={40} max={140} unit=" cm" onChange={setRadius}/>
          <div className="space-y-1 mt-1">
            <Stat label="Fc = mv²/r" value={`${(mass*angVel*angVel*radius).toFixed(1)} N`}/>
            <Stat label="Period" value={`${(TAU/angVel).toFixed(2)} s`}/>
          </div>
        </>
      }
    />
  );
}

// ─── 4. Bernoulli's Principle ─────────────────────────────────────────────────
export function Bernoulli() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [flow, setFlow] = useState(50);

  useEffect(()=>{}, []); // trigger initial draw
  useRaf((t) => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const cy = H/2;
    // Pipe shape: wide → narrow → wide
    const wideH = 90, narrowH = 36;
    const x1=60, x2=200, x3=360, x4=500;

    // Pipe walls
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    // Top wall
    ctx.beginPath();
    ctx.moveTo(x1, cy-wideH/2); ctx.lineTo(x2, cy-wideH/2);
    ctx.lineTo(x3, cy-narrowH/2); ctx.lineTo(x4, cy-narrowH/2); ctx.lineTo(x4, cy-narrowH/2-8);
    ctx.lineTo(x3, cy-narrowH/2-8); ctx.lineTo(x2, cy-wideH/2-8); ctx.lineTo(x1, cy-wideH/2-8);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x1,cy-wideH/2); ctx.lineTo(x2,cy-wideH/2); ctx.lineTo(x3,cy-narrowH/2); ctx.lineTo(x4,cy-narrowH/2); ctx.stroke();
    // Bottom wall
    ctx.beginPath(); ctx.moveTo(x1,cy+wideH/2); ctx.lineTo(x2,cy+wideH/2); ctx.lineTo(x3,cy+narrowH/2); ctx.lineTo(x4,cy+narrowH/2); ctx.stroke();

    // Fluid flow arrows
    const v1 = flow * 0.6, v2 = flow * 1.5;
    const regions = [{x:90,v:v1,h:wideH},{x:280,v:v2,h:narrowH},{x:430,v:v1,h:wideH}];
    regions.forEach(({x,v,h}) => {
      const speed = v/100 * 2;
      const offset = (t * speed * 80) % 40;
      for (let o = -offset; o < h-10; o += 20) {
        const fy = cy - h/2 + 10 + o;
        if (fy < cy-h/2+4 || fy > cy+h/2-4) continue;
        const len = clamp(v/50*20, 8, 35);
        ctx.strokeStyle = C_PRIMARY; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x-len/2, fy); ctx.lineTo(x+len/2, fy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x+len/2, fy); ctx.lineTo(x+len/2-5, fy-3); ctx.lineTo(x+len/2-5, fy+3); ctx.closePath(); ctx.fill();
      }
    });

    // Pressure columns (manometer style)
    const p1 = 100 - (v1*v1)*0.006, p2 = 100 - (v2*v2)*0.006;
    [[130, p1],[280, p2],[440, p1]].forEach(([x,p],i) => {
      const colH = p * 0.9;
      ctx.fillStyle = "rgba(34,211,238,0.25)"; ctx.strokeStyle = C_CYAN; ctx.lineWidth = 1.5;
      ctx.fillRect(x-6, cy-wideH/2-colH, 12, colH);
      ctx.strokeRect(x-6, cy-wideH/2-90, 12, 90);
      ctx.fillStyle = C_CYAN; ctx.font = "9px Inter,sans-serif"; ctx.textAlign = "center";
      ctx.fillText(`P${i===1?"₂":"₁"}`, x, cy-wideH/2-92);
    });

    ctx.fillStyle = C_DIM; ctx.font = "10px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText("Higher velocity → Lower pressure (Bernoulli)", W/2, H-14);
  }, true);

  return (
    <ModelWrap
      viz={<canvas ref={ref} width={580} height={340} className="w-full h-full" />}
      controls={
        <>
          <Slider label="Flow Rate" value={flow} min={10} max={100} unit="%" onChange={setFlow}/>
          <div className="space-y-1 mt-2">
            <Stat label="Principle" value="P + ½ρv² = const"/>
            <Stat label="Constriction effect" value="↑v → ↓P"/>
            <Stat label="Applications" value="Wings, carburettors"/>
          </div>
        </>
      }
    />
  );
}

// ─── 5. Carnot Cycle ──────────────────────────────────────────────────────────
export function CarnotCycle() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [Th, setTh] = useState(600);
  const [Tc, setTc] = useState(300);
  const [step, setStep] = useState(0);

  useEffect(()=>{
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const pad={l:65,r:20,t:30,b:50};
    const gw=W-pad.l-pad.r, gh=H-pad.t-pad.b;
    const x0=pad.l, y0=pad.t+gh;
    drawAxes(ctx,x0,y0,gw,gh,"Volume →","Pressure →");

    // Carnot cycle: 4 processes
    const pts = [
      [0.2,0.9],[0.55,0.75],[0.8,0.2],[0.45,0.35]
    ].map(([vf,pf])=>[x0+vf*gw, y0-pf*gh] as [number,number]);

    const colors = [C_RED, C_DIM, C_PRIMARY, C_DIM];
    const labels = ["Isothermal Expansion (Th)","Adiabatic Expansion","Isothermal Compression (Tc)","Adiabatic Compression"];
    const arcs: [number,number,number,number][] = [
      [pts[0][0],pts[0][1],pts[1][0],pts[1][1]],
      [pts[1][0],pts[1][1],pts[2][0],pts[2][1]],
      [pts[2][0],pts[2][1],pts[3][0],pts[3][1]],
      [pts[3][0],pts[3][1],pts[0][0],pts[0][1]],
    ];

    arcs.forEach(([x1,y1,x2,y2],i)=>{
      const mx=(x1+x2)/2, my=(y1+y2)/2 + (i%2===0?-20:20);
      ctx.strokeStyle = i===step ? colors[i] : "rgba(255,255,255,0.2)";
      ctx.lineWidth = i===step ? 2.5 : 1.5;
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.quadraticCurveTo(mx,my,x2,y2); ctx.stroke();
      // Arrow
      const dx=x2-x1, dy=y2-y1, len=Math.sqrt(dx*dx+dy*dy);
      const nx=dx/len*8, ny=dy/len*8;
      ctx.fillStyle = i===step ? colors[i] : "rgba(255,255,255,0.2)";
      ctx.beginPath(); ctx.moveTo(x2,y2); ctx.lineTo(x2-ny-nx,y2+nx-ny); ctx.lineTo(x2+ny-nx,y2-nx-ny); ctx.closePath(); ctx.fill();
    });

    // State points
    pts.forEach(([x,y],i)=>{
      ctx.fillStyle = C_FG;
      ctx.beginPath(); ctx.arc(x,y,5,0,TAU); ctx.fill();
      ctx.fillStyle = C_DIM; ctx.font="9px Inter,sans-serif"; ctx.textAlign="center";
      ctx.fillText(`${i+1}`,x,y-10);
    });

    const eff = (1 - Tc/Th)*100;
    ctx.fillStyle = C_FG; ctx.font="bold 11px Inter,sans-serif"; ctx.textAlign="center";
    ctx.fillText(`η = 1 − Tc/Th = ${eff.toFixed(1)}%`, W/2, H-16);
    ctx.fillStyle = step<4 ? colors[step] : C_DIM;
    ctx.font="10px Inter,sans-serif";
    ctx.fillText(labels[step]||"", W/2, H-32);
  },[step,Th,Tc]);

  const steps4 = ["Isothermal Exp.","Adiabatic Exp.","Isothermal Comp.","Adiabatic Comp."];
  return (
    <ModelWrap
      viz={<canvas ref={ref} width={580} height={340} className="w-full h-full" />}
      controls={
        <>
          <Slider label="Hot Reservoir Th" value={Th} min={400} max={1000} unit=" K" onChange={setTh} color={C_RED}/>
          <Slider label="Cold Reservoir Tc" value={Tc} min={100} max={400} unit=" K" onChange={v=>setTc(Math.min(v,Th-50))} color={C_PRIMARY}/>
          <StepNav steps={steps4} current={step} onChange={setStep}/>
          <div className="space-y-1"><Stat label="Efficiency" value={`${((1-Tc/Th)*100).toFixed(1)}%`}/></div>
        </>
      }
    />
  );
}

// ─── 6. Optics — Refraction & Reflection ─────────────────────────────────────
export function Optics() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [n2, setN2] = useState(1.5);
  const [angle, setAngle] = useState(40);
  const [mode, setMode] = useState(0); // 0=refraction, 1=reflection

  useEffect(()=>{
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const cx=W/2, iy=H/2;

    // Interface
    ctx.fillStyle = "rgba(91,127,239,0.08)";
    ctx.fillRect(0,iy,W,H-iy);
    ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0,iy); ctx.lineTo(W,iy); ctx.stroke();
    ctx.fillStyle = C_DIM; ctx.font="9px Inter,sans-serif"; ctx.textAlign="left";
    ctx.fillText("n₁ = 1.0 (air)",12,iy-8);
    ctx.fillText(`n₂ = ${n2} (glass/water)`,12,iy+16);

    // Normal
    ctx.strokeStyle="rgba(255,255,255,0.2)"; ctx.lineWidth=1; ctx.setLineDash([5,5]);
    ctx.beginPath(); ctx.moveTo(cx,iy-120); ctx.lineTo(cx,iy+120); ctx.stroke();
    ctx.setLineDash([]);

    const incRad = angle * Math.PI/180;
    const incX = cx - Math.sin(incRad)*150, incY = iy - Math.cos(incRad)*150;

    // Incident ray
    ctx.strokeStyle = C_AMBER; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.moveTo(incX,incY); ctx.lineTo(cx,iy); ctx.stroke();
    // Arrow
    ctx.fillStyle = C_AMBER;
    const dx=cx-incX, dy=iy-incY, len=Math.sqrt(dx*dx+dy*dy);
    ctx.beginPath(); ctx.moveTo(cx,iy); ctx.lineTo(cx-dy/len*7-dx/len*12,iy+dx/len*7-dy/len*12); ctx.lineTo(cx+dy/len*7-dx/len*12,iy-dx/len*7-dy/len*12); ctx.closePath(); ctx.fill();

    if (mode===0) {
      // Snell's law: n1 sinθ1 = n2 sinθ2
      const sinRef = Math.sin(incRad)/n2;
      if (Math.abs(sinRef) <= 1) {
        const refRad = Math.asin(sinRef);
        const rfX = cx + Math.sin(refRad)*150, rfY = iy + Math.cos(refRad)*150;
        ctx.strokeStyle = C_CYAN; ctx.lineWidth=2.5;
        ctx.beginPath(); ctx.moveTo(cx,iy); ctx.lineTo(rfX,rfY); ctx.stroke();
        ctx.fillStyle = C_CYAN; ctx.font="10px Inter,sans-serif"; ctx.textAlign="center";
        ctx.fillText(`θ₂ = ${(refRad*180/Math.PI).toFixed(1)}°`, rfX+30, rfY-10);
      } else {
        ctx.fillStyle = C_RED; ctx.font="bold 11px Inter,sans-serif"; ctx.textAlign="center";
        ctx.fillText("Total Internal Reflection!", cx, iy+60);
      }
    } else {
      // Reflection: θr = θi
      const rrX = cx + Math.sin(incRad)*150, rrY = iy - Math.cos(incRad)*150;
      ctx.strokeStyle = C_GREEN; ctx.lineWidth=2.5;
      ctx.beginPath(); ctx.moveTo(cx,iy); ctx.lineTo(rrX,rrY); ctx.stroke();
    }
    ctx.fillStyle = C_AMBER; ctx.font="10px Inter,sans-serif"; ctx.textAlign="center";
    ctx.fillText(`θ₁ = ${angle}°`,incX-20, incY+10);
    ctx.fillStyle = C_DIM; ctx.font="10px Inter,sans-serif"; ctx.textAlign="center";
    ctx.fillText("Snell's Law: n₁sinθ₁ = n₂sinθ₂", W/2, H-16);
  },[angle,n2,mode]);

  return (
    <ModelWrap
      viz={<canvas ref={ref} width={580} height={340} className="w-full h-full" />}
      controls={
        <>
          <SectionLabel>Mode</SectionLabel>
          <div className="flex gap-1.5">{["Refraction","Reflection"].map((m,i)=>(
            <button key={m} onClick={()=>setMode(i)} className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium border transition-colors ${mode===i?"bg-primary/20 text-primary border-primary/30":"text-muted-foreground border-transparent hover:bg-secondary"}`}>{m}</button>
          ))}</div>
          <Slider label="Incident Angle" value={angle} min={5} max={80} unit="°" onChange={setAngle}/>
          <Slider label="n₂ (lower medium)" value={n2} min={1.0} max={2.5} step={0.05} onChange={setN2}/>
          <div className="space-y-1"><Stat label="Critical angle" value={n2>1?`${(Math.asin(1/n2)*180/Math.PI).toFixed(1)}°`:"N/A"}/></div>
        </>
      }
    />
  );
}

// ─── 7. Wave Interference ─────────────────────────────────────────────────────
export function WaveInterference() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [freq1, setFreq1] = useState(2);
  const [freq2, setFreq2] = useState(2);
  const [phase, setPhase] = useState(0);

  useRaf((t) => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const rowH = H/3;
    const labels = ["Wave 1","Wave 2","Superposition"];
    const colors = [C_PRIMARY, C_RED, C_GREEN];

    for (let row=0; row<3; row++) {
      const cy = rowH*row + rowH/2;
      ctx.strokeStyle = "rgba(255,255,255,0.06)"; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(0,cy); ctx.lineTo(W,cy); ctx.stroke();
      ctx.fillStyle = C_DIM; ctx.font="9px Inter,sans-serif"; ctx.textAlign="left";
      ctx.fillText(labels[row], 8, cy-rowH/2+14);

      const amp = rowH*0.38;
      const pts: [number,number][] = [];
      for (let x=0; x<W; x++) {
        const frac = x/W;
        let y = 0;
        if (row===0) y = Math.sin(frac*TAU*freq1 - t*freq1*2)*amp;
        else if (row===1) y = Math.sin(frac*TAU*freq2 - t*freq2*2 + phase)*amp;
        else y = (Math.sin(frac*TAU*freq1 - t*freq1*2) + Math.sin(frac*TAU*freq2 - t*freq2*2 + phase)) * amp*0.5;
        pts.push([x, cy - y]);
      }
      drawCurve(ctx, pts, colors[row], 2);
    }
    // Dividers
    ctx.strokeStyle="rgba(255,255,255,0.08)"; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(0,rowH); ctx.lineTo(W,rowH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,rowH*2); ctx.lineTo(W,rowH*2); ctx.stroke();
  }, true);

  return (
    <ModelWrap
      viz={<canvas ref={ref} width={580} height={340} className="w-full h-full" />}
      controls={
        <>
          <Slider label="Frequency 1" value={freq1} min={0.5} max={5} step={0.5} unit=" Hz" onChange={setFreq1}/>
          <Slider label="Frequency 2" value={freq2} min={0.5} max={5} step={0.5} unit=" Hz" onChange={setFreq2}/>
          <Slider label="Phase offset" value={phase} min={0} max={Math.PI*2} step={0.1} unit=" rad" onChange={setPhase}/>
          <div className="space-y-1 mt-1">
            <Stat label="Constructive" value="Phase diff = 0, 2π…"/>
            <Stat label="Destructive" value="Phase diff = π, 3π…"/>
          </div>
        </>
      }
    />
  );
}

// ─── 8. Electric Circuits ─────────────────────────────────────────────────────
export function ElectricCircuits() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [r1, setR1] = useState(10);
  const [r2, setR2] = useState(20);
  const [voltage, setVoltage] = useState(12);
  const [mode, setMode] = useState(0); // 0=series, 1=parallel

  useEffect(()=>{
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const cx=W/2, cy=H/2;

    const totalR = mode===0 ? r1+r2 : 1/(1/r1+1/r2);
    const totalI = voltage/totalR;
    const p = voltage*totalI;

    const draw = (x1:number,y1:number,x2:number,y2:number,label:string,color:string) => {
      ctx.strokeStyle=color; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
      ctx.fillStyle=color; ctx.font="bold 10px Inter,sans-serif"; ctx.textAlign="center";
      ctx.fillText(label,(x1+x2)/2,(y1+y2)/2-8);
    };
    const drawR = (x:number,y:number,w:number,h:number,label:string) => {
      ctx.fillStyle="rgba(251,191,36,0.15)"; ctx.strokeStyle=C_AMBER; ctx.lineWidth=2;
      ctx.fillRect(x-w/2,y-h/2,w,h); ctx.strokeRect(x-w/2,y-h/2,w,h);
      ctx.fillStyle=C_AMBER; ctx.font="bold 10px Inter,sans-serif"; ctx.textAlign="center";
      ctx.fillText(label,x,y+4);
    };
    const drawBat = (x:number,y:number) => {
      ctx.strokeStyle=C_GREEN; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(x,y-30); ctx.lineTo(x,y+30); ctx.stroke();
      for (const [dy,w] of [[-10,20],[10,12],[-30,20],[30,12]]) {
        ctx.beginPath(); ctx.moveTo(x-w/2,y+dy); ctx.lineTo(x+w/2,y+dy); ctx.stroke();
      }
      ctx.fillStyle=C_GREEN; ctx.font="10px Inter,sans-serif"; ctx.textAlign="center";
      ctx.fillText(`${voltage}V`,x+28,y+4);
    };

    if (mode===0) {
      // Series: battery on left, R1 on top, R2 on right
      draw(80,cy,cx,cy-90,"",C_DIM); draw(cx,cy-90,W-80,cy-90,"",C_DIM);
      draw(W-80,cy-90,W-80,cy+90,"",C_DIM); draw(W-80,cy+90,80,cy+90,"",C_DIM);
      draw(80,cy+90,80,cy,"",C_DIM);
      drawBat(80,cy);
      drawR(cx,cy-90,80,28,`R₁=${r1}Ω`);
      drawR(W-80,cy,28,80,`R₂=${r2}Ω`);
      ctx.fillStyle=C_CYAN; ctx.font="bold 10px Inter,sans-serif"; ctx.textAlign="center";
      ctx.fillText(`I = ${totalI.toFixed(2)} A (same everywhere)`, cx, cy+110);
    } else {
      // Parallel
      draw(80,cy,150,cy,"",C_DIM); draw(410,cy,W-80,cy,"",C_DIM);
      draw(80,cy-70,80,cy+70,"",C_DIM); draw(W-80,cy-70,W-80,cy+70,"",C_DIM);
      draw(80,cy-70,150,cy-70,"",C_DIM); draw(410,cy-70,W-80,cy-70,"",C_DIM);
      draw(80,cy+70,150,cy+70,"",C_DIM); draw(410,cy+70,W-80,cy+70,"",C_DIM);
      drawBat(80,cy);
      drawR(280,cy-70,100,28,`R₁=${r1}Ω`);
      drawR(280,cy+70,100,28,`R₂=${r2}Ω`);
      ctx.fillStyle=C_CYAN; ctx.font="bold 10px Inter,sans-serif"; ctx.textAlign="center";
      ctx.fillText(`I₁=${(voltage/r1).toFixed(2)}A  I₂=${(voltage/r2).toFixed(2)}A  Itotal=${totalI.toFixed(2)}A`,cx,cy+110);
    }

    ctx.fillStyle=C_FG; ctx.font="bold 11px Inter,sans-serif"; ctx.textAlign="center";
    ctx.fillText(`Req=${totalR.toFixed(1)}Ω   P=${p.toFixed(1)}W`,cx,H-18);
  },[r1,r2,voltage,mode]);

  return (
    <ModelWrap
      viz={<canvas ref={ref} width={580} height={340} className="w-full h-full" />}
      controls={
        <>
          <SectionLabel>Layout</SectionLabel>
          <div className="flex gap-1.5">{["Series","Parallel"].map((m,i)=>(
            <button key={m} onClick={()=>setMode(i)} className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium border transition-colors ${mode===i?"bg-primary/20 text-primary border-primary/30":"text-muted-foreground border-transparent hover:bg-secondary"}`}>{m}</button>
          ))}</div>
          <Slider label="Voltage" value={voltage} min={1} max={24} unit=" V" onChange={setVoltage} color={C_GREEN}/>
          <Slider label="R₁" value={r1} min={1} max={100} unit=" Ω" onChange={setR1}/>
          <Slider label="R₂" value={r2} min={1} max={100} unit=" Ω" onChange={setR2}/>
          <div className="space-y-1"><Stat label="Total R" value={`${(mode===0?r1+r2:1/(1/r1+1/r2)).toFixed(1)} Ω`}/></div>
        </>
      }
    />
  );
}

// ─── 9. General Relativity ────────────────────────────────────────────────────
export function GeneralRelativity() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [mass, setMass] = useState(50);
  useRaf((t) => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const cx = W/2, cy = H/2;
    const rows = 14, cols = 20;
    const gx = W/cols, gy = H/rows;
    for (let r=0; r<=rows; r++) {
      for (let c=0; c<=cols; c++) {
        const wx = c*gx, wy = r*gy;
        const dx=wx-cx, dy=wy-cy;
        const dist = Math.sqrt(dx*dx+dy*dy);
        const warp = (mass/50) * 60 * Math.exp(-dist/120);
        const nx = wx + (dx/Math.max(dist,1))*warp * (1 - Math.exp(-dist/80));
        const ny = wy + (dy/Math.max(dist,1))*warp * (1 - Math.exp(-dist/80));
        if (c>0) {
          const px = (c-1)*gx, py = r*gy;
          const pdx=px-cx, pdy=py-cy, pdist=Math.sqrt(pdx*pdx+pdy*pdy);
          const pwarp=(mass/50)*60*Math.exp(-pdist/120);
          const pnx=px+(pdx/Math.max(pdist,1))*pwarp*(1-Math.exp(-pdist/80));
          const pny=py+(pdy/Math.max(pdist,1))*pwarp*(1-Math.exp(-pdist/80));
          const alpha = Math.min(0.5, 0.15 + (warp+pwarp)/200);
          ctx.strokeStyle = `rgba(91,127,239,${alpha})`; ctx.lineWidth=0.8;
          ctx.beginPath(); ctx.moveTo(pnx,pny); ctx.lineTo(nx,ny); ctx.stroke();
        }
        if (r>0) {
          const px=c*gx, py=(r-1)*gy;
          const pdx=px-cx,pdy=py-cy,pdist=Math.sqrt(pdx*pdx+pdy*pdy);
          const pwarp=(mass/50)*60*Math.exp(-pdist/120);
          const pnx=px+(pdx/Math.max(pdist,1))*pwarp*(1-Math.exp(-pdist/80));
          const pny=py+(pdy/Math.max(pdist,1))*pwarp*(1-Math.exp(-pdist/80));
          const alpha = Math.min(0.5,0.15+(warp+pwarp)/200);
          ctx.strokeStyle=`rgba(91,127,239,${alpha})`; ctx.lineWidth=0.8;
          ctx.beginPath(); ctx.moveTo(pnx,pny); ctx.lineTo(nx,ny); ctx.stroke();
        }
      }
    }
    // Massive object
    ctx.fillStyle=`rgba(251,191,36,${0.3+mass/200})`;
    const mr = 8+mass/10;
    ctx.beginPath(); ctx.arc(cx,cy,mr,0,TAU); ctx.fill();
    ctx.strokeStyle=C_AMBER; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(cx,cy,mr,0,TAU); ctx.stroke();
    // Orbiting test mass
    const oAngle = t*0.8, oR = 80+mass*0.3;
    const ox=cx+Math.cos(oAngle)*oR, oy=cy+Math.sin(oAngle)*oR;
    ctx.fillStyle=C_CYAN; ctx.beginPath(); ctx.arc(ox,oy,5,0,TAU); ctx.fill();
    ctx.fillStyle=C_DIM; ctx.font="10px Inter,sans-serif"; ctx.textAlign="center";
    ctx.fillText("Mass warps spacetime — objects follow geodesics", cx, H-16);
  }, true);
  return (
    <ModelWrap
      viz={<canvas ref={ref} width={580} height={340} className="w-full h-full" />}
      controls={
        <>
          <Slider label="Mass" value={mass} min={5} max={100} onChange={setMass} color={C_AMBER}/>
          <div className="space-y-1 mt-2">
            <Stat label="Theory" value="Einstein 1915"/>
            <Stat label="Key equation" value="Gμν = 8πG Tμν"/>
            <Stat label="Verified by" value="Mercury precession"/>
          </div>
        </>
      }
    />
  );
}

// ─── 10. Doppler Effect ────────────────────────────────────────────────────────
export function DopplerEffect() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [sourceV, setSourceV] = useState(0.3);
  useRaf((t) => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const cy = H/2, vs = 340, v = sourceV*vs;
    const sx = (W * ((t*v/vs*0.5)%1));
    const nWaves = 8;
    for (let i=0; i<nWaves; i++) {
      const emitFrac = (i/nWaves);
      const emitX = sx - (v/vs)*W*emitFrac;
      const r = (W/nWaves)*emitFrac*(1-sourceV*0.3);
      ctx.strokeStyle=`rgba(34,211,238,${0.5-i*0.05})`; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.arc(clamp(emitX,0,W), cy, r, 0, TAU); ctx.stroke();
    }
    // Source
    ctx.fillStyle=C_RED; ctx.beginPath(); ctx.arc(sx%W, cy, 10, 0, TAU); ctx.fill();
    ctx.fillStyle=C_RED; ctx.font="9px Inter,sans-serif"; ctx.textAlign="center";
    ctx.fillText("source", sx%W, cy-16);
    // Observers
    const f0=440;
    const fFront = f0*(1/(1-sourceV));
    const fBack  = f0*(1/(1+sourceV));
    ctx.fillStyle=C_GREEN; ctx.font="bold 11px Inter,sans-serif"; ctx.textAlign="center";
    ctx.fillText(`Front observer: ${fFront.toFixed(0)} Hz ↑`, W*0.2, H-30);
    ctx.fillText(`Behind observer: ${fBack.toFixed(0)} Hz ↓`, W*0.75, H-30);
    ctx.fillStyle=C_DIM; ctx.font="9px Inter,sans-serif";
    ctx.fillText(`f₀ = ${f0} Hz  |  vs = ${v.toFixed(0)} m/s`, W/2, H-14);
  }, true);
  return (
    <ModelWrap
      viz={<canvas ref={ref} width={580} height={340} className="w-full h-full" />}
      controls={
        <>
          <Slider label="Source Speed (v/c_sound)" value={sourceV} min={0} max={0.9} step={0.05} onChange={setSourceV}/>
          <div className="space-y-1 mt-2">
            <Stat label="Formula" value="f' = f₀(1/(1∓vs/v))"/>
            <Stat label="Uses" value="Radar, ultrasound, astronomy"/>
          </div>
        </>
      }
    />
  );
}

// ─── 11. Quantum Tunneling ─────────────────────────────────────────────────────
export function QuantumTunneling() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [barrierH, setBarrierH] = useState(60);
  const [barrierW, setBarrierW] = useState(30);
  const [energy, setEnergy] = useState(40);
  useEffect(()=>{
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const pad={l:50,r:30,t:30,b:50};
    const gw=W-pad.l-pad.r, gh=H-pad.t-pad.b;
    const x0=pad.l, y0=pad.t+gh;
    drawAxes(ctx,x0,y0,gw,gh,"Position →","Energy / ψ²");
    // Barrier
    const bx1=x0+gw*0.38, bx2=x0+gw*0.38+bx1*0, bw=barrierW/100*gw*0.3;
    const bHeight = barrierH/100*gh;
    ctx.fillStyle="rgba(248,113,113,0.2)"; ctx.strokeStyle=C_RED; ctx.lineWidth=2;
    ctx.fillRect(bx1,y0-bHeight,bw,bHeight); ctx.strokeRect(bx1,y0-bHeight,bw,bHeight);
    ctx.fillStyle=C_RED; ctx.font="9px Inter,sans-serif"; ctx.textAlign="center";
    ctx.fillText("Barrier",bx1+bw/2,y0-bHeight-6);
    // Energy line
    const eY = y0 - energy/100*gh;
    ctx.strokeStyle=C_AMBER; ctx.lineWidth=1.5; ctx.setLineDash([5,4]);
    ctx.beginPath(); ctx.moveTo(x0,eY); ctx.lineTo(x0+gw,eY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle=C_AMBER; ctx.font="9px Inter,sans-serif"; ctx.textAlign="left";
    ctx.fillText(`E=${energy}%`,x0+4,eY-4);
    // Wavefunction
    const T = Math.exp(-2*(barrierW/50)*Math.sqrt(Math.max(0,(barrierH-energy)/30)));
    const pts: [number,number][] = [];
    for (let i=0; i<200; i++) {
      const x=x0+(i/200)*gw;
      const frac=i/200;
      let amp=1, psi=0;
      if (x < bx1) {
        psi=Math.sin(frac*TAU*6)*amp;
        const reflected=(1-T)*0.6;
        psi+=reflected*Math.sin(frac*TAU*6*-1+0.5);
      } else if (x <= bx1+bw) {
        const inside=(x-bx1)/bw;
        amp = energy<barrierH ? Math.exp(-inside*2*(barrierW/50)) : 1;
        psi=amp*Math.sin(inside*Math.PI);
      } else {
        amp=T*0.8;
        psi=amp*Math.sin((frac-0.5)*TAU*6);
      }
      pts.push([x, eY - psi*60]);
    }
    drawCurve(ctx,pts,C_PRIMARY,2);
    ctx.fillStyle=C_FG; ctx.font="bold 11px Inter,sans-serif"; ctx.textAlign="center";
    ctx.fillText(`Transmission probability: ${(T*100).toFixed(1)}%`, W/2, H-16);
  },[barrierH,barrierW,energy]);
  return (
    <ModelWrap
      viz={<canvas ref={ref} width={580} height={340} className="w-full h-full" />}
      controls={
        <>
          <Slider label="Barrier Height" value={barrierH} min={10} max={100} unit="%" onChange={setBarrierH} color={C_RED}/>
          <Slider label="Barrier Width" value={barrierW} min={5} max={80} unit="%" onChange={setBarrierW}/>
          <Slider label="Particle Energy" value={energy} min={5} max={95} unit="%" onChange={setEnergy} color={C_AMBER}/>
          <div className="space-y-1 mt-1"><Stat label="Transmission T" value={`${(Math.exp(-2*(barrierW/50)*Math.sqrt(Math.max(0,(barrierH-energy)/30)))*100).toFixed(1)}%`}/></div>
        </>
      }
    />
  );
}

// ─── 12. Friction & Inclined Plane ────────────────────────────────────────────
export function Friction() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [angle, setAngle] = useState(25);
  const [mu, setMu] = useState(0.35);
  const mass = 5; const g = 9.81;
  useEffect(()=>{
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const rad = angle*Math.PI/180;
    const L=320, ox=120, oy=H-60;
    const tx=ox+L*Math.cos(rad), ty=oy-L*Math.sin(rad);
    ctx.fillStyle="rgba(255,255,255,0.08)"; ctx.strokeStyle="rgba(255,255,255,0.4)"; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(ox,oy); ctx.lineTo(tx,ty); ctx.lineTo(tx,oy); ctx.closePath(); ctx.fill(); ctx.stroke();
    // Block
    const bfrac=0.5, bx=ox+L*bfrac*Math.cos(rad), by=oy-L*bfrac*Math.sin(rad);
    const bw=36, bh=28;
    ctx.save(); ctx.translate(bx,by); ctx.rotate(-rad);
    ctx.fillStyle="rgba(91,127,239,0.4)"; ctx.strokeStyle=C_PRIMARY; ctx.lineWidth=2;
    ctx.fillRect(-bw/2,-bh,bw,bh); ctx.strokeRect(-bw/2,-bh,bw,bh);
    ctx.restore();
    // Forces
    const Fg=mass*g, Fn=Fg*Math.cos(rad), Ff=mu*Fn, Fg_para=Fg*Math.sin(rad);
    const scale=6;
    const drawArrow=(x:number,y:number,dx:number,dy:number,color:string,label:string)=>{
      ctx.strokeStyle=color; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+dx,y+dy); ctx.stroke();
      ctx.fillStyle=color;
      const len=Math.sqrt(dx*dx+dy*dy);
      ctx.beginPath(); ctx.moveTo(x+dx,y+dy); ctx.lineTo(x+dx-dy/len*6-dx/len*10,y+dy+dx/len*6-dy/len*10); ctx.lineTo(x+dx+dy/len*6-dx/len*10,y+dy-dx/len*6-dy/len*10); ctx.closePath(); ctx.fill();
      ctx.font="9px Inter,sans-serif"; ctx.fillText(label,x+dx+5,y+dy+4);
    };
    drawArrow(bx,by,0,Fg*scale/10,C_RED,"Fg");
    drawArrow(bx,by,-Math.sin(rad)*Fn*scale/10,Math.cos(rad)*Fn*scale/10,C_GREEN,"Fn");
    if (Ff < Fg_para) {
      drawArrow(bx,by,Math.cos(rad)*Ff*scale/10,Math.sin(rad)*Ff*scale/10,C_AMBER,"Ff");
    }
    const sliding = Fg_para > Ff;
    const a = sliding ? (Fg_para-Ff)/mass : 0;
    ctx.fillStyle=C_FG; ctx.font="bold 11px Inter,sans-serif"; ctx.textAlign="center";
    ctx.fillText(sliding?`Sliding! a=${a.toFixed(2)} m/s²`:`Static — Fg∥=${Fg_para.toFixed(1)}N < Ff=${Ff.toFixed(1)}N`, W/2, H-18);
    ctx.fillStyle=C_DIM; ctx.font="9px Inter,sans-serif";
    ctx.fillText(`θ=${angle}°  μ=${mu}  Fn=${Fn.toFixed(1)}N`, W/2, H-36);
  },[angle,mu]);
  return (
    <ModelWrap
      viz={<canvas ref={ref} width={580} height={340} className="w-full h-full" />}
      controls={
        <>
          <Slider label="Incline Angle" value={angle} min={0} max={70} unit="°" onChange={setAngle}/>
          <Slider label="Coefficient μ" value={mu} min={0} max={1} step={0.01} onChange={setMu} color={C_AMBER}/>
          <div className="space-y-1 mt-1">
            <Stat label="Normal force" value={`${(mass*9.81*Math.cos(angle*Math.PI/180)).toFixed(1)} N`}/>
            <Stat label="Friction force" value={`${(mu*mass*9.81*Math.cos(angle*Math.PI/180)).toFixed(1)} N`}/>
            <Stat label="Status" value={Math.sin(angle*Math.PI/180)>mu?"Sliding":"Static"}/>
          </div>
        </>
      }
    />
  );
}

// ─── 13. Photoelectric Effect ────────────────────────────────────────────────
export function Photoelectric() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [freq, setFreq] = useState(6);
  const h=6.626e-34, phi=3.0;
  useRaf((t) => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const metalY=H/2, metalX1=120, metalX2=W-80;
    // Metal surface
    ctx.fillStyle="rgba(251,191,36,0.15)"; ctx.strokeStyle=C_AMBER; ctx.lineWidth=2;
    ctx.fillRect(metalX1,metalY,metalX2-metalX1,90);
    ctx.strokeRect(metalX1,metalY,metalX2-metalX1,90);
    ctx.fillStyle=C_AMBER; ctx.font="bold 10px Inter,sans-serif"; ctx.textAlign="center";
    ctx.fillText("Metal surface",W/2,metalY+50);
    // Photons coming in
    const fMin=phi*2.418e14/1e14, aboveThresh=freq>fMin;
    const cols=[C_PURPLE,C_PRIMARY,C_CYAN,C_GREEN,C_AMBER][Math.floor(clamp((freq-4)/2,0,4))];
    const nPhotons=4;
    for (let i=0; i<nPhotons; i++) {
      const px=metalX1+60+i*(metalX2-metalX1-120)/nPhotons;
      const py=metalY-60-(((t*1.5+i*0.5)%1.0)*60);
      ctx.fillStyle=cols;
      ctx.beginPath(); ctx.arc(px,py,6,0,TAU); ctx.fill();
      ctx.strokeStyle=cols; ctx.lineWidth=1; ctx.setLineDash([3,3]);
      ctx.beginPath(); ctx.moveTo(px,py+6); ctx.lineTo(px,metalY); ctx.stroke();
      ctx.setLineDash([]);
      if (aboveThresh) {
        const ePy=metalY-((t*2+i*0.4)%1.0)*120;
        ctx.fillStyle=C_RED; ctx.beginPath(); ctx.arc(px,ePy,4,0,TAU); ctx.fill();
      }
    }
    const eKmax=aboveThresh?freq*0.414e-14-phi*0.414e-14:0;
    ctx.fillStyle=aboveThresh?C_GREEN:C_RED; ctx.font="bold 11px Inter,sans-serif"; ctx.textAlign="center";
    ctx.fillText(aboveThresh?`Electrons emitted! KE_max=${eKmax.toFixed(2)} eV`:`Below threshold — no emission`, W/2, H-18);
    ctx.fillStyle=C_DIM; ctx.font="9px Inter,sans-serif";
    ctx.fillText(`f=${freq}×10¹⁴Hz  threshold≈${fMin.toFixed(1)}×10¹⁴Hz`, W/2, H-36);
  }, true);
  return (
    <ModelWrap
      viz={<canvas ref={ref} width={580} height={340} className="w-full h-full" />}
      controls={
        <>
          <Slider label="Photon Frequency" value={freq} min={2} max={12} step={0.5} unit="×10¹⁴ Hz" onChange={setFreq} color={C_PURPLE}/>
          <div className="space-y-1 mt-2">
            <Stat label="Work function φ" value="3.0 eV (typical)"/>
            <Stat label="E = hf" value={`${(freq*0.414).toFixed(2)} eV`}/>
            <Stat label="KE_max = hf − φ" value={`${Math.max(0,freq*0.414-3.0).toFixed(2)} eV`}/>
          </div>
        </>
      }
    />
  );
}

// ─── 14. Momentum Conservation ────────────────────────────────────────────────
export function Momentum() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [v1, setV1] = useState(5);
  const [m1, setM1] = useState(3);
  const [m2, setM2] = useState(2);
  const [elastic, setElastic] = useState(true);
  useRaf((t) => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const cy=H/2, v2=0;
    // Collision occurs at t=1s, cx=W/2
    let x1: number, x2: number, vel1: number, vel2: number;
    const e = elastic?1:0;
    const v1f=((m1-e*m2)*v1+m2*(1+e)*v2)/(m1+m2);
    const v2f=(m1*(1+e)*v1+(m2-e*m1)*v2)/(m1+m2);
    const phase = t%3;
    if (phase<1) { x1=W*0.15+phase*v1*18; x2=W*0.75; vel1=v1; vel2=0; }
    else if (phase<1.1) { x1=W/2-m1*10; x2=W/2+m2*10; vel1=v1; vel2=0; }
    else { const p=phase-1.1; x1=W/2-m1*10+p*v1f*18; x2=W/2+m2*10+p*v2f*18; vel1=v1f; vel2=v2f; }
    // Ground
    ctx.strokeStyle="rgba(255,255,255,0.2)"; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(0,cy+40); ctx.lineTo(W,cy+40); ctx.stroke();
    // Balls
    const drawBall=(x:number,r:number,col:string,v:number,label:string)=>{
      ctx.fillStyle=col; ctx.strokeStyle="rgba(255,255,255,0.4)"; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.arc(clamp(x,r,W-r),cy,r,0,TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle=C_FG; ctx.font=`bold ${Math.max(9,r/2)}px Inter,sans-serif`; ctx.textAlign="center";
      ctx.fillText(label,clamp(x,r,W-r),cy+4);
      ctx.fillStyle=C_DIM; ctx.font="9px Inter,sans-serif";
      ctx.fillText(`v=${v.toFixed(1)}`,clamp(x,r,W-r),cy-r-8);
    };
    drawBall(x1,m1*7,C_PRIMARY,vel1,`${m1}kg`);
    drawBall(x2,m2*7,C_RED,vel2,`${m2}kg`);
    ctx.fillStyle=C_FG; ctx.font="bold 10px Inter,sans-serif"; ctx.textAlign="center";
    ctx.fillText(`v₁'=${v1f.toFixed(2)} m/s   v₂'=${v2f.toFixed(2)} m/s`, W/2, H-18);
    ctx.fillStyle=C_DIM; ctx.font="9px Inter,sans-serif";
    ctx.fillText(`p_before=${(m1*v1).toFixed(1)} kg·m/s  p_after=${(m1*v1f+m2*v2f).toFixed(1)} kg·m/s`, W/2, H-36);
  }, true);
  return (
    <ModelWrap
      viz={<canvas ref={ref} width={580} height={340} className="w-full h-full" />}
      controls={
        <>
          <SectionLabel>Collision Type</SectionLabel>
          <div className="flex gap-1.5">{["Elastic","Inelastic"].map((m,i)=>(
            <button key={m} onClick={()=>setElastic(i===0)} className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium border transition-colors ${elastic===(i===0)?"bg-primary/20 text-primary border-primary/30":"text-muted-foreground border-transparent hover:bg-secondary"}`}>{m}</button>
          ))}</div>
          <Slider label="v₁ initial" value={v1} min={1} max={10} unit=" m/s" onChange={setV1}/>
          <Slider label="Mass 1" value={m1} min={1} max={8} unit=" kg" onChange={setM1}/>
          <Slider label="Mass 2" value={m2} min={1} max={8} unit=" kg" onChange={setM2}/>
        </>
      }
    />
  );
}

// ─── 15. Heat Transfer ────────────────────────────────────────────────────────
export function HeatTransfer() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState(0);
  const [Thot, setThot] = useState(200);
  useRaf((t) => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
    const cx=W/2;
    if (mode===0) {
      // Conduction — rod with temperature gradient
      const rx=80,rw=W-160,ry=H/2-20,rh=40;
      const grad=ctx.createLinearGradient(rx,0,rx+rw,0);
      grad.addColorStop(0,`rgba(248,113,113,${Thot/250})`);
      grad.addColorStop(1,"rgba(91,127,239,0.4)");
      ctx.fillStyle=grad; ctx.fillRect(rx,ry,rw,rh);
      ctx.strokeStyle="rgba(255,255,255,0.3)"; ctx.lineWidth=2; ctx.strokeRect(rx,ry,rw,rh);
      // Heat flow arrows
      const speed=(Thot/200)*2;
      for (let i=0; i<5; i++) {
        const ax=rx+(((i*rw/5)+(t*speed*rw/8))%(rw-20));
        ctx.strokeStyle=C_RED; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(ax,ry+rh+10); ctx.lineTo(ax+20,ry+rh+10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ax+20,ry+rh+10); ctx.lineTo(ax+14,ry+rh+5); ctx.lineTo(ax+14,ry+rh+15); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle=C_RED; ctx.font="10px Inter,sans-serif"; ctx.textAlign="left"; ctx.fillText(`Hot (${Thot}°C)`,rx-2,ry-8);
      ctx.fillStyle=C_PRIMARY; ctx.textAlign="right"; ctx.fillText("Cold (20°C)",rx+rw+2,ry-8);
      ctx.fillStyle=C_DIM; ctx.font="10px Inter,sans-serif"; ctx.textAlign="center";
      ctx.fillText("Q/t = kA(ΔT/L)  — Fourier's Law", cx, H-16);
    } else if (mode===1) {
      // Convection — rising hot fluid
      const n=8;
      for (let i=0; i<n; i++) {
        const cx2=80+i*(W-160)/(n-1);
        const yBase=H-60;
        const riseY=((t*60+i*40)%(H-80))+40;
        const col=riseY>H/2?`rgba(248,113,113,0.7)`:`rgba(91,127,239,0.7)`;
        ctx.fillStyle=col; ctx.beginPath(); ctx.arc(cx2,yBase-riseY%(H-100),8,0,TAU); ctx.fill();
      }
      ctx.fillStyle=C_RED; ctx.fillRect(0,H-50,W,50); // hot plate
      ctx.fillStyle=C_FG; ctx.font="10px Inter,sans-serif"; ctx.textAlign="center";
      ctx.fillText("Hot plate — fluid heated → rises → cools → sinks", cx, H-32);
      ctx.fillStyle=C_DIM; ctx.fillText("Convection: density-driven bulk fluid motion", cx, H-16);
    } else {
      // Radiation — photons emitted
      const n=12;
      for (let i=0; i<n; i++) {
        const a=(i/n)*TAU;
        const dist=((t*80+i*30)%120);
        const px=cx+Math.cos(a)*dist, py=H/2+Math.sin(a)*dist;
        const alpha=Math.max(0,1-dist/120);
        ctx.fillStyle=`rgba(251,191,36,${alpha*0.8})`;
        ctx.beginPath(); ctx.arc(px,py,3,0,TAU); ctx.fill();
      }
      ctx.fillStyle=`rgba(248,113,113,${0.3+Thot/500})`;
      ctx.beginPath(); ctx.arc(cx,H/2,28,0,TAU); ctx.fill();
      ctx.strokeStyle=C_AMBER; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(cx,H/2,28,0,TAU); ctx.stroke();
      ctx.fillStyle=C_DIM; ctx.font="10px Inter,sans-serif"; ctx.textAlign="center";
      ctx.fillText(`P = εσT⁴A — Stefan-Boltzmann Law  (T=${Thot}K)`, cx, H-16);
    }
  }, true);
  return (
    <ModelWrap
      viz={<canvas ref={ref} width={580} height={340} className="w-full h-full" />}
      controls={
        <>
          <StepNav steps={["Conduction","Convection","Radiation"]} current={mode} onChange={setMode}/>
          <Slider label="Temperature" value={Thot} min={50} max={500} unit={mode===2?" K":"°C"} onChange={setThot} color={C_RED}/>
          <div className="space-y-1 mt-1">
            <Stat label="Method" value={["Particle vibration","Fluid movement","EM waves (photons)"][mode]}/>
            <Stat label="Needs medium?" value={["Yes","Yes","No"][mode]}/>
          </div>
        </>
      }
    />
  );
}

// ─── 16. Kinetic Theory of Gases ──────────────────────────────────────────────
export function KineticTheory() {
  type GasParticle = {x:number;y:number;vx:number;vy:number};
  const ref = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<GasParticle[]>([]);
  const [temp, setTemp] = useState(300);
  const [nParticles, setNParticles] = useState(40);
  useEffect(()=>{
    const speed = Math.sqrt(temp/300)*3;
    particlesRef.current = Array.from({length:nParticles},()=>({
      x:80+Math.random()*420, y:30+Math.random()*280,
      vx:(Math.random()-0.5)*speed*2, vy:(Math.random()-0.5)*speed*2,
    }));
  },[temp,nParticles]);
  useRaf(()=>{
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W=canvas.width, H=canvas.height;
    ctx.fillStyle=C_BG; ctx.fillRect(0,0,W,H);
    const bx=70,by=20,bw=430,bh=280;
    ctx.strokeStyle="rgba(255,255,255,0.3)"; ctx.lineWidth=2; ctx.strokeRect(bx,by,bw,bh);
    ctx.fillStyle="rgba(255,255,255,0.03)"; ctx.fillRect(bx,by,bw,bh);
    const speedMult=Math.sqrt(temp/300);
    let totalKE=0;
    particlesRef.current.forEach(p=>{
      p.x+=p.vx*speedMult; p.y+=p.vy*speedMult;
      if(p.x<bx+5){p.x=bx+5;p.vx=Math.abs(p.vx);}
      if(p.x>bx+bw-5){p.x=bx+bw-5;p.vx=-Math.abs(p.vx);}
      if(p.y<by+5){p.y=by+5;p.vy=Math.abs(p.vy);}
      if(p.y>by+bh-5){p.y=by+bh-5;p.vy=-Math.abs(p.vy);}
      const speed=Math.sqrt(p.vx*p.vx+p.vy*p.vy);
      totalKE+=0.5*speed*speed;
      const hue=Math.min(240,Math.max(0,240-speed*15));
      ctx.fillStyle=`hsl(${hue},80%,65%)`;
      ctx.beginPath(); ctx.arc(p.x,p.y,4,0,TAU); ctx.fill();
    });
    const P=totalKE*2/(3*bw*bh/10000);
    ctx.fillStyle=C_FG; ctx.font="bold 11px Inter,sans-serif"; ctx.textAlign="center";
    ctx.fillText(`T=${temp}K  P∝${P.toFixed(0)} Pa  n=${nParticles}`, W/2,H-18);
    ctx.fillStyle=C_DIM; ctx.font="9px Inter,sans-serif";
    ctx.fillText("PV = nRT  |  KE_avg = 3/2 kT", W/2, H-36);
  },true);
  return (
    <ModelWrap
      viz={<canvas ref={ref} width={580} height={340} className="w-full h-full" />}
      controls={
        <>
          <Slider label="Temperature" value={temp} min={50} max={1000} unit=" K" onChange={setTemp} color={C_RED}/>
          <Slider label="# Particles" value={nParticles} min={10} max={80} onChange={setNParticles}/>
          <div className="space-y-1 mt-1">
            <Stat label="Avg KE" value={`∝ ${(temp/300).toFixed(2)} × room temp`}/>
            <Stat label="RMS speed" value={`∝ √T`}/>
          </div>
        </>
      }
    />
  );
}

// ─── 17. Rotational Inertia ───────────────────────────────────────────────────
export function RotationalInertia() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [shape, setShape] = useState(0);
  const [angV, setAngV] = useState(2);
  useRaf((t)=>{
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W=canvas.width, H=canvas.height;
    ctx.fillStyle=C_BG; ctx.fillRect(0,0,W,H);
    const cx=220,cy=H/2, angle=t*angV;
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(angle);
    if(shape===0){
      ctx.strokeStyle=C_PRIMARY; ctx.lineWidth=3;
      ctx.beginPath(); ctx.arc(0,0,70,0,TAU); ctx.stroke();
      ctx.fillStyle="rgba(91,127,239,0.2)"; ctx.fill();
      ctx.strokeStyle=C_DIM; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(-70,0); ctx.lineTo(70,0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,-70); ctx.lineTo(0,70); ctx.stroke();
    } else if(shape===1){
      ctx.fillStyle="rgba(91,127,239,0.2)"; ctx.strokeStyle=C_PRIMARY; ctx.lineWidth=3;
      ctx.fillRect(-55,-55,110,110); ctx.strokeRect(-55,-55,110,110);
      ctx.strokeStyle=C_DIM; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(-55,0); ctx.lineTo(55,0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,-55); ctx.lineTo(0,55); ctx.stroke();
    } else {
      for(let i=0;i<4;i++){
        const a=(i/4)*TAU;
        ctx.fillStyle=C_PRIMARY; ctx.beginPath(); ctx.arc(Math.cos(a)*60,Math.sin(a)*60,14,0,TAU); ctx.fill();
        ctx.strokeStyle=C_DIM; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(a)*60,Math.sin(a)*60); ctx.stroke();
      }
      ctx.fillStyle=C_AMBER; ctx.beginPath(); ctx.arc(0,0,8,0,TAU); ctx.fill();
    }
    ctx.restore();
    const I_labels=["I = MR² (ring)","I = MR²/2 (disc/solid)","I = Σmᵢrᵢ² (point masses)"];
    const I_vals=["MR²","(1/12)ML² or MR²/2","4mr²"];
    ctx.fillStyle=C_FG; ctx.font="bold 11px Inter,sans-serif"; ctx.textAlign="center";
    ctx.fillText(I_labels[shape], W/2, H-34);
    ctx.fillStyle=C_CYAN; ctx.font="10px Inter,sans-serif";
    ctx.fillText(`I = ${I_vals[shape]}   ω = ${angV} rad/s`, W/2, H-16);
    // KE label
    ctx.fillStyle=C_AMBER; ctx.textAlign="left"; ctx.font="10px Inter,sans-serif";
    ctx.fillText(`KE_rot = ½Iω²`, W-180, 30);
    ctx.fillText(`L = Iω`, W-180, 46);
  },true);
  return (
    <ModelWrap
      viz={<canvas ref={ref} width={580} height={340} className="w-full h-full" />}
      controls={
        <>
          <StepNav steps={["Ring / Hoop","Solid Disc","Point Masses"]} current={shape} onChange={setShape}/>
          <Slider label="Angular Velocity" value={angV} min={0.2} max={6} step={0.1} unit=" rad/s" onChange={setAngV}/>
          <div className="space-y-1 mt-1">
            <Stat label="Key insight" value="Mass farther out → larger I"/>
            <Stat label="Ring vs disc" value="Ring I = 2× disc"/>
          </div>
        </>
      }
    />
  );
}

// ─── 18. Hydrostatic Pressure ─────────────────────────────────────────────────
export function HydrostaticPressure() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [depth, setDepth] = useState(5);
  const [fluid, setFluid] = useState(0);
  const rhos=[1000,1025,800,13600];
  const fluidNames=["Water","Seawater","Oil","Mercury"];
  useEffect(()=>{
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W=canvas.width, H=canvas.height;
    ctx.fillStyle=C_BG; ctx.fillRect(0,0,W,H);
    const cx=W/2, colX=80, colW=120, maxH=220, surfY=50;
    const scaleH=maxH/20;
    const rho=rhos[fluid], g=9.81;
    // Fluid column
    const grad=ctx.createLinearGradient(0,surfY,0,surfY+maxH);
    grad.addColorStop(0,`rgba(34,211,238,0.3)`);
    grad.addColorStop(1,`rgba(34,211,238,0.08)`);
    ctx.fillStyle=grad;
    ctx.fillRect(colX,surfY,colW,maxH);
    ctx.strokeStyle=C_CYAN; ctx.lineWidth=2;
    ctx.strokeRect(colX,surfY,colW,maxH);
    // Depth marker
    const dY=surfY+depth*scaleH;
    ctx.strokeStyle=C_RED; ctx.lineWidth=2; ctx.setLineDash([5,4]);
    ctx.beginPath(); ctx.moveTo(colX-20,dY); ctx.lineTo(colX+colW+60,dY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle=C_RED; ctx.font="bold 10px Inter,sans-serif"; ctx.textAlign="left";
    ctx.fillText(`d=${depth}m`,colX+colW+5,dY+4);
    // Pressure arrows on both sides
    const P=rho*g*depth/1000;
    const arrLen=clamp(P*0.8,5,120);
    ctx.strokeStyle=C_AMBER; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.moveTo(colX-5,dY); ctx.lineTo(colX-5-arrLen,dY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(colX+colW+5,dY); ctx.lineTo(colX+colW+5+arrLen,dY); ctx.stroke();
    // Depth labels
    [0,5,10,15,20].forEach(d=>{
      const y=surfY+d*scaleH;
      ctx.fillStyle=C_DIM; ctx.font="9px Inter,sans-serif"; ctx.textAlign="right";
      ctx.fillText(`${d}m`,colX-24,y+4);
      ctx.strokeStyle="rgba(255,255,255,0.08)"; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(colX,y); ctx.lineTo(colX+colW,y); ctx.stroke();
    });
    ctx.fillStyle=C_FG; ctx.font="bold 12px Inter,sans-serif"; ctx.textAlign="center";
    ctx.fillText(`P = ρgd = ${P.toFixed(1)} kPa`, cx+80, H/2);
    ctx.fillStyle=C_DIM; ctx.font="10px Inter,sans-serif";
    ctx.fillText(`ρ = ${rho} kg/m³ (${fluidNames[fluid]})`, cx+80, H/2+20);
    ctx.fillText(`P_atm not shown (adds 101 kPa)`, cx+80, H/2+38);
    ctx.fillStyle=C_CYAN; ctx.font="9px Inter,sans-serif";
    ctx.fillText(fluidNames[fluid],colX+colW/2,surfY-8);
  },[depth,fluid]);
  return (
    <ModelWrap
      viz={<canvas ref={ref} width={580} height={340} className="w-full h-full" />}
      controls={
        <>
          <Slider label="Depth" value={depth} min={0} max={20} unit=" m" onChange={setDepth}/>
          <SectionLabel>Fluid</SectionLabel>
          <div className="grid grid-cols-2 gap-1">
            {fluidNames.map((f,i)=>(
              <button key={f} onClick={()=>setFluid(i)} className={`rounded px-1 py-1 text-xs border transition-colors ${fluid===i?"bg-primary/20 text-primary border-primary/30":"text-muted-foreground border-transparent hover:bg-secondary"}`}>{f}</button>
            ))}
          </div>
          <div className="space-y-1 mt-1"><Stat label="Pressure" value={`${(rhos[fluid]*9.81*depth/1000).toFixed(1)} kPa`}/></div>
        </>
      }
    />
  );
}

// ─── 19. Nuclear Fission & Fusion ────────────────────────────────────────────
const NUKE_STEPS=["Stable Nucleus","Neutron Capture / Approach","Deformation","Products + Energy"];
export function NuclearFissionFusion() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState(0);
  useEffect(()=>{
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W=canvas.width,H=canvas.height;
    ctx.fillStyle=C_BG; ctx.fillRect(0,0,W,H);
    const cx=W/2,cy=H/2;
    const drawNucleus=(x:number,y:number,r:number,color:string,label:string)=>{
      ctx.fillStyle=`${color}33`; ctx.strokeStyle=color; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.fill(); ctx.stroke();
      // Nucleon dots
      const n=Math.round(r/6);
      for(let i=0;i<Math.min(n*2,14);i++){
        const a=(i/Math.min(n*2,14))*TAU;
        ctx.fillStyle=i%2===0?C_RED:C_PRIMARY;
        ctx.beginPath(); ctx.arc(x+Math.cos(a)*r*0.55,y+Math.sin(a)*r*0.55,5,0,TAU); ctx.fill();
      }
      ctx.fillStyle=color; ctx.font="bold 10px Inter,sans-serif"; ctx.textAlign="center";
      ctx.fillText(label,x,y+r+16);
    };
    if(mode===0) {
      if(step===0) { drawNucleus(cx,cy,50,C_AMBER,"²³⁵U"); }
      if(step===1) {
        drawNucleus(cx,cy,50,C_AMBER,"²³⁵U");
        ctx.fillStyle=C_CYAN; ctx.beginPath(); ctx.arc(cx-90,cy,8,0,TAU); ctx.fill();
        ctx.strokeStyle=C_CYAN; ctx.lineWidth=2;
        ctx.beginPath(); ctx.moveTo(cx-90,cy); ctx.lineTo(cx-60,cy); ctx.stroke();
        ctx.fillStyle=C_CYAN; ctx.font="9px Inter,sans-serif"; ctx.textAlign="center"; ctx.fillText("n",cx-90,cy-16);
      }
      if(step===2) {
        ctx.save(); ctx.translate(cx,cy);
        const wob=Math.sin(Date.now()/200)*0.15;
        ctx.scale(1+wob,1-wob*0.5);
        ctx.fillStyle="rgba(251,191,36,0.3)"; ctx.strokeStyle=C_AMBER; ctx.lineWidth=2.5;
        ctx.beginPath(); ctx.ellipse(0,0,55,42,0,0,TAU); ctx.fill(); ctx.stroke();
        ctx.restore();
        ctx.fillStyle=C_AMBER; ctx.font="10px Inter,sans-serif"; ctx.textAlign="center";
        ctx.fillText("²³⁶U* (unstable)",cx,cy+68);
      }
      if(step===3) {
        drawNucleus(cx-100,cy,30,C_GREEN,"⁹²Kr");
        drawNucleus(cx+100,cy,36,C_RED,"¹⁴¹Ba");
        for(let i=0;i<3;i++){
          const a=(i/3)*TAU*0.5+Math.PI*0.25;
          ctx.fillStyle=C_CYAN; ctx.beginPath(); ctx.arc(cx+Math.cos(a)*60,cy+Math.sin(a)*60,7,0,TAU); ctx.fill();
          ctx.fillStyle=C_CYAN; ctx.font="8px Inter,sans-serif"; ctx.textAlign="center";
          ctx.fillText("n",cx+Math.cos(a)*78,cy+Math.sin(a)*78);
        }
        ctx.fillStyle=C_AMBER; ctx.font="bold 11px Inter,sans-serif"; ctx.textAlign="center";
        ctx.fillText("~200 MeV released per fission event",cx,H-20);
      }
    } else {
      if(step===0) { drawNucleus(cx-80,cy,22,C_PRIMARY,"²H"); drawNucleus(cx+80,cy,22,C_CYAN,"³H"); }
      if(step===1) {
        drawNucleus(cx-55,cy,22,C_PRIMARY,"²H"); drawNucleus(cx+55,cy,22,C_CYAN,"³H");
        ctx.strokeStyle="rgba(248,113,113,0.5)"; ctx.lineWidth=1.5; ctx.setLineDash([4,4]);
        ctx.beginPath(); ctx.arc(cx,cy,90,0,TAU); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle=C_DIM; ctx.font="9px Inter,sans-serif"; ctx.textAlign="center";
        ctx.fillText("Coulomb barrier — needs 10 keV",cx,cy+105);
      }
      if(step===2) {
        drawNucleus(cx,cy,38,"#ff6060","⁵He*");
        ctx.fillStyle=C_RED; ctx.font="10px Inter,sans-serif"; ctx.textAlign="center";
        ctx.fillText("Compound nucleus (unstable)",cx,cy+60);
      }
      if(step===3) {
        drawNucleus(cx-80,cy,30,C_GREEN,"⁴He");
        ctx.fillStyle=C_CYAN; ctx.beginPath(); ctx.arc(cx+80,cy,9,0,TAU); ctx.fill();
        ctx.fillStyle=C_CYAN; ctx.font="bold 10px Inter,sans-serif"; ctx.textAlign="center"; ctx.fillText("n",cx+80,cy+22);
        ctx.fillStyle=C_AMBER; ctx.font="bold 11px Inter,sans-serif";
        ctx.fillText("~17.6 MeV released (fusion is 4× denser)",cx,H-20);
      }
    }
    ctx.fillStyle=C_DIM; ctx.font="9px Inter,sans-serif"; ctx.textAlign="center";
    ctx.fillText(mode===0?"Fission: heavy nucleus splits":"Fusion: light nuclei merge",cx,20);
  },[step,mode]);
  return (
    <ModelWrap
      viz={<canvas ref={ref} width={580} height={340} className="w-full h-full" />}
      controls={
        <>
          <SectionLabel>Reaction</SectionLabel>
          <div className="flex gap-1.5">{["Fission","Fusion"].map((m,i)=>(
            <button key={m} onClick={()=>{setMode(i);setStep(0);}} className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium border transition-colors ${mode===i?"bg-primary/20 text-primary border-primary/30":"text-muted-foreground border-transparent hover:bg-secondary"}`}>{m}</button>
          ))}</div>
          <StepNav steps={NUKE_STEPS} current={step} onChange={setStep}/>
        </>
      }
    />
  );
}

// ─── 20. Solar Cell ───────────────────────────────────────────────────────────
export function SolarCell() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [intensity, setIntensity] = useState(70);
  useRaf((t)=>{
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W=canvas.width,H=canvas.height;
    ctx.fillStyle=C_BG; ctx.fillRect(0,0,W,H);
    const cx=W/2, cellY=H/2-30, cellH=80;
    // P-N junction
    ctx.fillStyle="rgba(248,113,113,0.2)"; ctx.fillRect(cx-120,cellY,120,cellH);
    ctx.fillStyle="rgba(91,127,239,0.2)"; ctx.fillRect(cx,cellY,120,cellH);
    ctx.strokeStyle="rgba(255,255,255,0.3)"; ctx.lineWidth=2;
    ctx.strokeRect(cx-120,cellY,240,cellH);
    ctx.strokeStyle="rgba(255,255,255,0.4)"; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(cx,cellY); ctx.lineTo(cx,cellY+cellH); ctx.stroke();
    ctx.fillStyle=C_RED; ctx.font="bold 9px Inter,sans-serif"; ctx.textAlign="center";
    ctx.fillText("P-type",cx-60,cellY+cellH/2+4);
    ctx.fillStyle=C_PRIMARY; ctx.fillText("N-type",cx+60,cellY+cellH/2+4);
    // Photons coming in
    const n=6;
    for(let i=0;i<n;i++){
      const px=cx-100+i*40;
      const py=cellY-(((t*(intensity/60)+i*0.3)%1.0)*100+10);
      if(py>cellY-10) continue;
      ctx.fillStyle=C_AMBER;
      ctx.beginPath(); ctx.arc(px,py,5,0,TAU); ctx.fill();
      // Photon label
      if(i===0){ctx.fillStyle=C_AMBER;ctx.font="9px Inter,sans-serif";ctx.fillText("hν",px-18,py);}
    }
    // Electrons & holes
    if(intensity>20){
      const eCount=Math.round(intensity/15);
      for(let i=0;i<eCount;i++){
        const ex=cx-10+(((t*intensity/50+i*0.4)%1.0))*(intensity*1.2);
        const ey=cellY+cellH/4+i*8;
        if(ey>cellY+cellH-5||ex>cx+115) continue;
        ctx.fillStyle=C_PRIMARY; ctx.beginPath(); ctx.arc(ex,ey,4,0,TAU); ctx.fill();
        ctx.fillStyle=C_RED; ctx.beginPath(); ctx.arc(cx-20-(((t*intensity/50+i*0.4)%1.0))*(intensity*1.2)*0.6,ey+20,4,0,TAU); ctx.fill();
      }
    }
    // External circuit
    ctx.strokeStyle=C_GREEN; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(cx-120,cellY); ctx.lineTo(cx-150,cellY); ctx.lineTo(cx-150,cellY-60); ctx.lineTo(cx+150,cellY-60); ctx.lineTo(cx+150,cellY); ctx.lineTo(cx+120,cellY); ctx.stroke();
    // Bulb
    ctx.fillStyle="rgba(251,191,36,0.5)"; ctx.beginPath(); ctx.arc(cx,cellY-60,12,0,TAU); ctx.fill();
    ctx.font="16px Inter"; ctx.textAlign="center"; ctx.fillStyle=C_AMBER;
    ctx.fillText("💡",cx,cellY-55);
    const power=(intensity/100)*15;
    ctx.fillStyle=C_FG; ctx.font="bold 11px Inter,sans-serif"; ctx.textAlign="center";
    ctx.fillText(`Power output: ${power.toFixed(1)} W  |  η ≈ 20%`, cx, H-16);
  },true);
  return (
    <ModelWrap
      viz={<canvas ref={ref} width={580} height={340} className="w-full h-full" />}
      controls={
        <>
          <Slider label="Light Intensity" value={intensity} min={0} max={100} unit="%" onChange={setIntensity} color={C_AMBER}/>
          <div className="space-y-1 mt-2">
            <Stat label="Effect" value="Photovoltaic"/>
            <Stat label="Power output" value={`${((intensity/100)*15).toFixed(1)} W`}/>
            <Stat label="Typical efficiency" value="15–22%"/>
          </div>
        </>
      }
    />
  );
}

// ─── 21. Aerodynamics — Lift ──────────────────────────────────────────────────
export function Aerodynamics() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [aoa, setAoa] = useState(8);
  const [speed, setSpeed] = useState(50);
  useEffect(()=>{
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W=canvas.width,H=canvas.height;
    ctx.fillStyle=C_BG; ctx.fillRect(0,0,W,H);
    const cx=W/2, cy=H/2;
    const rad=aoa*Math.PI/180;
    // Aerofoil cross-section
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(-rad);
    ctx.fillStyle="rgba(91,127,239,0.3)"; ctx.strokeStyle=C_PRIMARY; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.moveTo(-100,0);
    ctx.bezierCurveTo(-60,-28,60,-22,100,0);
    ctx.bezierCurveTo(60,8,-60,10,-100,0);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    // Airflow streamlines
    const lift=(speed/50)*(aoa/8)*40;
    const drag=(speed/50)*2+(aoa/8)*5;
    for(let i=-4;i<=4;i++){
      const y0=cy+i*28;
      const deflect=(i===0?0:-lift/50*(4-Math.abs(i))*0.5)*Math.sign(i);
      ctx.strokeStyle=`rgba(34,211,238,${0.4-Math.abs(i)*0.04})`; ctx.lineWidth=1.5;
      ctx.beginPath();
      for(let x=30;x<W-30;x+=5){
        const frac=(x-30)/(W-60);
        const dip=Math.abs(frac-0.5)<0.15?deflect*(1-Math.abs(frac-0.5)/0.15*0.5):deflect*(1-Math.abs(frac-0.5))*0.3;
        const y=y0-dip;
        x===30?ctx.moveTo(x,y):ctx.lineTo(x,y);
      }
      ctx.stroke();
    }
    // Lift arrow
    ctx.strokeStyle=C_GREEN; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx,cy-clamp(lift,5,100)); ctx.stroke();
    ctx.fillStyle=C_GREEN; ctx.beginPath(); ctx.moveTo(cx,cy-clamp(lift,5,100)); ctx.lineTo(cx-7,cy-clamp(lift,5,100)+12); ctx.lineTo(cx+7,cy-clamp(lift,5,100)+12); ctx.closePath(); ctx.fill();
    ctx.fillStyle=C_GREEN; ctx.font="10px Inter,sans-serif"; ctx.textAlign="right"; ctx.fillText(`Lift=${lift.toFixed(1)}`,cx-10,cy-lift*0.5);
    // Drag arrow
    ctx.strokeStyle=C_RED; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+clamp(drag,5,80),cy); ctx.stroke();
    ctx.fillStyle=C_RED; ctx.font="10px Inter,sans-serif"; ctx.textAlign="left"; ctx.fillText(`Drag=${drag.toFixed(1)}`,cx+drag*0.6+4,cy-8);
    ctx.fillStyle=C_DIM; ctx.font="10px Inter,sans-serif"; ctx.textAlign="center";
    ctx.fillText(`L/D ratio = ${(lift/drag).toFixed(1)}  |  AoA=${aoa}°`, cx, H-16);
  },[aoa,speed]);
  return (
    <ModelWrap
      viz={<canvas ref={ref} width={580} height={340} className="w-full h-full" />}
      controls={
        <>
          <Slider label="Angle of Attack" value={aoa} min={-5} max={20} unit="°" onChange={setAoa}/>
          <Slider label="Airspeed" value={speed} min={10} max={100} unit=" m/s" onChange={setSpeed}/>
          <div className="space-y-1 mt-1">
            <Stat label="Stall" value={aoa>15?"Yes — flow separated":"No"}/>
            <Stat label="Bernoulli" value="↑v upper → ↓P → Lift"/>
          </div>
        </>
      }
    />
  );
}

// ─── 22. Particle Accelerators ────────────────────────────────────────────────
export function ParticleAccelerators() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [energy, setEnergy] = useState(50);
  useRaf((t)=>{
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W=canvas.width,H=canvas.height;
    ctx.fillStyle=C_BG; ctx.fillRect(0,0,W,H);
    const cx=W/2,cy=H/2,r=110;
    // Ring
    ctx.strokeStyle="rgba(91,127,239,0.3)"; ctx.lineWidth=18;
    ctx.beginPath(); ctx.arc(cx,cy,r,0,TAU); ctx.stroke();
    ctx.strokeStyle=C_PRIMARY; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(cx,cy,r,0,TAU); ctx.stroke();
    ctx.strokeStyle="rgba(34,211,238,0.2)"; ctx.lineWidth=14;
    ctx.beginPath(); ctx.arc(cx,cy,r+9,0,TAU); ctx.stroke();
    // Particle
    const speed=1+energy/30;
    const angle=t*speed;
    const px=cx+Math.cos(angle)*r, py=cy+Math.sin(angle)*r;
    ctx.fillStyle=C_AMBER;
    ctx.beginPath(); ctx.arc(px,py,7,0,TAU); ctx.fill();
    // Trail
    ctx.strokeStyle=`rgba(251,191,36,0.6)`; ctx.lineWidth=2;
    ctx.beginPath();
    for(let i=20;i>0;i--){
      const ta=angle-i*0.06;
      const alpha=i/20;
      const tx=cx+Math.cos(ta)*r, ty=cy+Math.sin(ta)*r;
      i===20?ctx.moveTo(tx,ty):ctx.lineTo(tx,ty);
    }
    ctx.stroke();
    // Magnets
    for(let i=0;i<8;i++){
      const a=(i/8)*TAU;
      ctx.fillStyle="rgba(248,113,113,0.4)"; ctx.strokeStyle=C_RED; ctx.lineWidth=1;
      const mx=cx+Math.cos(a)*(r-20),my=cy+Math.sin(a)*(r-20);
      ctx.fillRect(mx-8,my-8,16,16); ctx.strokeRect(mx-8,my-8,16,16);
    }
    // RF cavity (acceleration point)
    ctx.fillStyle="rgba(74,222,128,0.5)"; ctx.strokeStyle=C_GREEN; ctx.lineWidth=2;
    ctx.fillRect(cx-15,cy+r-10,30,20); ctx.strokeRect(cx-15,cy+r-10,30,20);
    ctx.fillStyle=C_GREEN; ctx.font="8px Inter,sans-serif"; ctx.textAlign="center";
    ctx.fillText("RF",cx,cy+r+4);
    ctx.fillStyle=C_FG; ctx.font="bold 11px Inter,sans-serif"; ctx.textAlign="center";
    ctx.fillText(`KE ≈ ${(energy*10).toLocaleString()} MeV  |  v ≈ ${Math.min(99.9,(energy/50*99)).toFixed(1)}% c`, cx, H-16);
  },true);
  return (
    <ModelWrap
      viz={<canvas ref={ref} width={580} height={340} className="w-full h-full" />}
      controls={
        <>
          <Slider label="Beam Energy" value={energy} min={5} max={100} onChange={setEnergy} color={C_AMBER}/>
          <div className="space-y-1 mt-2">
            <Stat label="Type shown" value="Synchrotron"/>
            <Stat label="Steering" value="Dipole magnets"/>
            <Stat label="Acceleration" value="RF cavities"/>
            <Stat label="Example" value="LHC (CERN): 6.5 TeV"/>
          </div>
        </>
      }
    />
  );
}

// ─── 23. Tidal Forces ────────────────────────────────────────────────────────
export function TidalForces() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [moonDist, setMoonDist] = useState(60);
  useRaf((t)=>{
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W=canvas.width,H=canvas.height;
    ctx.fillStyle=C_BG; ctx.fillRect(0,0,W,H);
    const earthX=200,cy=H/2;
    const moonX=earthX+moonDist*2+80;
    const tidalF=1/(moonDist*moonDist)*300;
    // Earth (deformed)
    const deform=clamp(tidalF/5,0,30);
    ctx.fillStyle="rgba(34,211,238,0.3)"; ctx.strokeStyle=C_CYAN; ctx.lineWidth=2;
    ctx.beginPath(); ctx.ellipse(earthX,cy,35+deform,35,0,0,TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle=C_CYAN; ctx.font="9px Inter,sans-serif"; ctx.textAlign="center";
    ctx.fillText("Earth",earthX,cy+48);
    // Ocean bulges
    ctx.fillStyle="rgba(91,127,239,0.5)";
    ctx.beginPath(); ctx.ellipse(earthX+35+deform,cy,deform+4,12,0,0,TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(earthX-35-deform,cy,deform+4,12,Math.PI,0,TAU); ctx.fill();
    // Moon
    ctx.fillStyle="rgba(251,191,36,0.4)"; ctx.strokeStyle=C_AMBER; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(moonX,cy,20,0,TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle=C_AMBER; ctx.font="9px Inter,sans-serif"; ctx.textAlign="center";
    ctx.fillText("Moon",moonX,cy+34);
    // Gravity gradient arrows
    for(let i=-3;i<=3;i++){
      const ay=cy+i*25, ax=earthX;
      const relDist=Math.sqrt((ax-moonX)**2+(ay-cy)**2);
      const fLen=clamp(5000/relDist**2,4,40);
      const angle=Math.atan2(cy-ay,moonX-ax);
      ctx.strokeStyle=`rgba(248,113,113,0.6)`; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(ax+Math.cos(angle)*fLen,ay+Math.sin(angle)*fLen); ctx.stroke();
    }
    ctx.fillStyle=C_FG; ctx.font="bold 11px Inter,sans-serif"; ctx.textAlign="center";
    ctx.fillText(`Tidal stretch ∝ 1/d³ = ${tidalF.toFixed(0)} units`, W/2, H-16);
  },true);
  return (
    <ModelWrap
      viz={<canvas ref={ref} width={580} height={340} className="w-full h-full" />}
      controls={
        <>
          <Slider label="Moon Distance" value={moonDist} min={20} max={100} onChange={setMoonDist}/>
          <div className="space-y-1 mt-2">
            <Stat label="Tidal force law" value="∝ M/d³"/>
            <Stat label="# tides per day" value="2 high, 2 low"/>
            <Stat label="Sun contributes" value="~46% of tidal force"/>
          </div>
        </>
      }
    />
  );
}

// ─── 24. Bridge Loading ───────────────────────────────────────────────────────
export function BridgeLoading() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [load, setLoad] = useState(50);
  const [pos, setPos] = useState(50);
  useEffect(()=>{
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W=canvas.width,H=canvas.height;
    ctx.fillStyle=C_BG; ctx.fillRect(0,0,W,H);
    const bx=80,bw=W-160,by=H/2,bh=14;
    const loadX=bx+(pos/100)*bw;
    // Deflection
    const R1=load*(1-pos/100), R2=load*(pos/100);
    const maxDefl=load*0.3;
    const defPts: [number,number][] = [];
    for(let i=0;i<=100;i++){
      const x=bx+(i/100)*bw;
      const frac=i/100, p=pos/100;
      const defl=frac<p ? frac*(1-p)/p*(1-frac)*maxDefl*1.5 : p*(1-frac)/(1-p)*frac*maxDefl*1.5;
      defPts.push([x, by+defl]);
    }
    // Beam
    ctx.fillStyle="rgba(255,255,255,0.06)"; ctx.strokeStyle="rgba(255,255,255,0.4)"; ctx.lineWidth=2;
    drawCurve(ctx,defPts,"rgba(255,255,255,0.4)",3);
    // Supports
    [[bx,by],[bx+bw,by]].forEach(([sx,sy])=>{
      ctx.fillStyle=C_GREEN;
      ctx.beginPath(); ctx.moveTo(sx-16,sy+bh); ctx.lineTo(sx+16,sy+bh); ctx.lineTo(sx,sy); ctx.closePath(); ctx.fill();
    });
    // Load arrow
    ctx.strokeStyle=C_RED; ctx.lineWidth=2.5;
    const defl=defPts[pos]?defPts[pos][1]-by:0;
    ctx.beginPath(); ctx.moveTo(loadX,by-50); ctx.lineTo(loadX,by+defl-5); ctx.stroke();
    ctx.fillStyle=C_RED; ctx.beginPath(); ctx.moveTo(loadX,by+defl); ctx.lineTo(loadX-7,by+defl-12); ctx.lineTo(loadX+7,by+defl-12); ctx.closePath(); ctx.fill();
    ctx.fillStyle=C_RED; ctx.font="10px Inter,sans-serif"; ctx.textAlign="center"; ctx.fillText(`F=${load}kN`,loadX,by-56);
    // Reactions
    ctx.fillStyle=C_GREEN; ctx.font="10px Inter,sans-serif"; ctx.textAlign="center";
    ctx.fillText(`R₁=${R1.toFixed(1)}kN`,bx,by+bh+30);
    ctx.fillText(`R₂=${R2.toFixed(1)}kN`,bx+bw,by+bh+30);
    // Tension/compression labels
    ctx.fillStyle=C_AMBER; ctx.font="9px Inter,sans-serif";
    ctx.fillText("⬤ Tension (bottom)",bx+bw/2,by+bh+55);
    ctx.fillStyle=C_CYAN;
    ctx.fillText("⬤ Compression (top)",bx+bw/2,by+bh+70);
  },[load,pos]);
  return (
    <ModelWrap
      viz={<canvas ref={ref} width={580} height={340} className="w-full h-full" />}
      controls={
        <>
          <Slider label="Load" value={load} min={5} max={100} unit=" kN" onChange={setLoad} color={C_RED}/>
          <Slider label="Load Position" value={pos} min={0} max={100} unit="%" onChange={setPos}/>
          <div className="space-y-1 mt-1">
            <Stat label="R₁" value={`${(load*(1-pos/100)).toFixed(1)} kN`}/>
            <Stat label="R₂" value={`${(load*(pos/100)).toFixed(1)} kN`}/>
            <Stat label="Max deflection at" value={`${pos}% span`}/>
          </div>
        </>
      }
    />
  );
}
