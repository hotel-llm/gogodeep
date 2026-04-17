import { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation, Link, useNavigate } from "react-router-dom";
import {
  BookOpen, ArrowLeft, TriangleAlert, Lightbulb, ClipboardList,
  ChevronRight, ArrowRight, FileSearch, Lock, Loader2, Microscope, CheckCircle2, Layers,
} from "lucide-react";
import { UnitCircle, LawOfSinesCosines, TrigIdentities, PythagoreanTheorem, QuadraticEquations, TheDerivative, DefiniteIntegrals, LimitsAndContinuity, TaylorSeries, DifferentialEquations, LinearRegression, BinomialDistribution, Vectors2D, ComplexNumbers, Logarithms, ConicSections, MatrixTransformations, SequencesSeries, Optimization, SimilarTriangles, Inequalities } from "@/components/interact/MathModels2";
import { NormalDistribution } from "@/components/interact/MathCSModels";
import { SHM, EMInduction, CentripetalForce, Optics, WaveInterference, ElectricCircuits, DopplerEffect, Momentum, HeatTransfer, KineticTheory, RotationalInertia } from "@/components/interact/PhysicsModels";
import { BohrModel, TitrationCurves, ReactionKinetics, IdealGasLaw, PHScale, RadioactiveDecay, GalvanicCells, LeChatelier } from "@/components/interact/ChemistryModels";
import { MitosisMeiosis, DNADoubleHelix, Photosynthesis, CirculatorySystem, OsmosisDiffusion, EnzymeSubstrate, CellMembrane, ActionPotential } from "@/components/interact/BiologyModels";
import { KeplerLaws, StellarLifecycle, GreenhouseEffect, AtmosphereLayers } from "@/components/interact/EarthSpaceModels";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import EducatorLayout from "@/components/EducatorLayout";
import { RichText } from "@/components/RichText";
import { supabase } from "@/integrations/supabase/client";
import { SCAN_CACHE_KEY } from "@/lib/supabase";
import { FREE_FOR_ALL } from "@/lib/featureFlags";
import { scanImageStore } from "@/lib/pendingFile";
import { whaleToast } from "@/lib/whaleToast";
import { cn } from "@/lib/utils";

const SESSION_REPORT_KEY = "gogodeep_pending_report";

/** Read location state, fall back to sessionStorage if tab was suspended/restored */
function resolveReportState(locationState: unknown): NavState {
  const ls = (locationState as NavState | null) ?? {};
  if (ls.diagnosis) return ls;
  try {
    const stored = sessionStorage.getItem(SESSION_REPORT_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<NavState>;
      if (parsed.diagnosis) return { ...ls, ...parsed } as NavState;
    }
  } catch { /* ignore */ }
  return ls;
}

function questionToBase64(text: string): string {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const padding = 28;
  const lineHeight = 26;
  const maxTextWidth = 656;
  ctx.font = "17px system-ui, sans-serif";
  const lines: string[] = [];
  for (const word of text.split(" ")) {
    const last = lines[lines.length - 1] ?? "";
    const test = last ? last + " " + word : word;
    if (ctx.measureText(test).width > maxTextWidth && last) lines.push(word);
    else lines[lines.length === 0 ? 0 : lines.length - 1] = test;
  }
  if (!lines.length) lines.push(text);
  canvas.width = 712;
  canvas.height = padding * 2 + lines.length * lineHeight;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#111111";
  ctx.font = "17px system-ui, sans-serif";
  lines.forEach((l, i) => ctx.fillText(l, padding, padding + (i + 1) * lineHeight - 4));
  return canvas.toDataURL("image/png").split(",")[1];
}

type PracticeItem = { id: number; question: string; answer: string };

type IdentifyDiagnosis = {
  mode: "identify";
  error_category: string;
  error_tag: string;
  explanation: string;
  what_happened?: string;
  core_concept?: string;
  recognition_cue?: string;
  underlying_concept?: string;
  practice_problems: PracticeItem[];
};

type GuideDiagnosis = {
  mode: "guide";
  question_summary: string;
  what_happened?: string;
  core_concept?: string;
  recognition_cue?: string;
  underlying_concept?: string;
  steps: string[];
  practice_problems: PracticeItem[];
};

type Diagnosis = IdentifyDiagnosis | GuideDiagnosis;

type NavState = {
  imageUrl?: string;
  imageBase64?: string;
  mimeType?: string;
  inputText?: string;
  diagnosis?: Diagnosis;
  mode?: "guide" | "identify";
  guest?: boolean;
};

type ReportTab = "steps" | "error" | "concept" | "practice" | "model";

// ── Model matching ────────────────────────────────────────────────────────────

interface ModelEntry { title: string; Component: React.ComponentType }

// Ordered list of keyword → model mappings. First match wins.
const MODEL_MAP: { keywords: string[]; model: ModelEntry }[] = [
  { keywords: ["unit circle","sin","cos","tan","sine","cosine","tangent","radian","trig ratio"], model: { title: "Unit Circle", Component: UnitCircle } },
  { keywords: ["law of sine","law of cosine","sine rule","cosine rule","non-right triangle","oblique"], model: { title: "Law of Sines & Cosines", Component: LawOfSinesCosines } },
  { keywords: ["trig identit","pythagorean identit","double angle","sum to product","compound angle"], model: { title: "Trig Identities", Component: TrigIdentities } },
  { keywords: ["pythagorean theorem","right triangle","hypotenuse","a² + b²"], model: { title: "Pythagorean Theorem", Component: PythagoreanTheorem } },
  { keywords: ["similar triangle","scale factor","proportional sides"], model: { title: "Similar Triangles", Component: SimilarTriangles } },
  { keywords: ["quadratic","parabola","discriminant","vertex","roots of","factori"], model: { title: "Quadratic Equations", Component: QuadraticEquations } },
  { keywords: ["conic","ellipse","hyperbola","parabola equation","eccentricity"], model: { title: "Conic Sections", Component: ConicSections } },
  { keywords: ["derivative","differentiat","chain rule","product rule","quotient rule","slope of","rate of change","gradient"], model: { title: "The Derivative", Component: TheDerivative } },
  { keywords: ["integral","integrat","area under","antiderivative","fundamental theorem"], model: { title: "Definite Integrals", Component: DefiniteIntegrals } },
  { keywords: ["limit","continuity","approaching","l'hôpital","l'hopital"], model: { title: "Limits & Continuity", Component: LimitsAndContinuity } },
  { keywords: ["taylor","maclaurin","power series expansion"], model: { title: "Taylor Series", Component: TaylorSeries } },
  { keywords: ["differential equation","ode","separation of variable","first order","second order"], model: { title: "Differential Equations", Component: DifferentialEquations } },
  { keywords: ["logarithm","log base","ln ","natural log","exponential equation"], model: { title: "Logarithms", Component: Logarithms } },
  { keywords: ["sequence","series","arithmetic","geometric sequence","geometric series","convergence","divergence","sigma"], model: { title: "Sequences & Series", Component: SequencesSeries } },
  { keywords: ["complex number","argand","modulus argument","imaginary","real part"], model: { title: "Complex Numbers", Component: ComplexNumbers } },
  { keywords: ["vector","dot product","cross product","magnitude direction"], model: { title: "Vectors 2D", Component: Vectors2D } },
  { keywords: ["matrix","transformation","eigenvalue","determinant","linear map"], model: { title: "Matrix Transformations", Component: MatrixTransformations } },
  { keywords: ["optimis","optimiz","maxima","minima","critical point","second derivative test"], model: { title: "Optimisation", Component: Optimization } },
  { keywords: ["linear regression","correlation","line of best fit","least squares"], model: { title: "Linear Regression", Component: LinearRegression } },
  { keywords: ["binomial distribution","binomial probability","n choose r","combination"], model: { title: "Binomial Distribution", Component: BinomialDistribution } },
  { keywords: ["normal distribution","bell curve","z-score","standard deviation","gaussian"], model: { title: "Normal Distribution", Component: NormalDistribution } },
  { keywords: ["inequality","inequalit","number line","absolute value"], model: { title: "Inequalities", Component: Inequalities } },
  { keywords: ["simple harmonic","oscillat","spring","pendulum","shm"], model: { title: "Simple Harmonic Motion", Component: SHM } },
  { keywords: ["wave interference","diffraction","superposition","double slit","young"], model: { title: "Wave Interference", Component: WaveInterference } },
  { keywords: ["optic","refract","reflect","snell","lens","mirror","focal"], model: { title: "Optics", Component: Optics } },
  { keywords: ["circuit","resistor","capacitor","ohm","kirchhoff","voltage","current","emf"], model: { title: "Electric Circuits", Component: ElectricCircuits } },
  { keywords: ["electromagnetic induction","faraday","lenz","flux","induced emf"], model: { title: "EM Induction", Component: EMInduction } },
  { keywords: ["centripetal","circular motion","angular velocity","centrifug"], model: { title: "Centripetal Force", Component: CentripetalForce } },
  { keywords: ["momentum","impulse","conservation of momentum","collision","elastic","inelastic"], model: { title: "Momentum & Impulse", Component: Momentum } },
  { keywords: ["heat transfer","conduction","convection","radiation","thermal"], model: { title: "Heat Transfer", Component: HeatTransfer } },
  { keywords: ["kinetic theory","ideal gas","boltzmann","rms speed","pressure of gas"], model: { title: "Kinetic Theory", Component: KineticTheory } },
  { keywords: ["rotational","moment of inertia","torque","angular momentum"], model: { title: "Rotational Inertia", Component: RotationalInertia } },
  { keywords: ["doppler","frequency shift","moving source"], model: { title: "Doppler Effect", Component: DopplerEffect } },
  { keywords: ["bohr model","atomic orbital","energy level","hydrogen atom","emission spectrum"], model: { title: "Bohr Model", Component: BohrModel } },
  { keywords: ["titration","acid base","buffer","equivalence point","neutralis"], model: { title: "Titration Curves", Component: TitrationCurves } },
  { keywords: ["reaction kinetics","rate constant","activation energy","arrhenius","rate law"], model: { title: "Reaction Kinetics", Component: ReactionKinetics } },
  { keywords: ["ideal gas law","pv=nrt","boyle","charles","avogadro"], model: { title: "Ideal Gas Law", Component: IdealGasLaw } },
  { keywords: ["ph scale","acid","base","hydroxide","hydrogen ion","logarithmic scale"], model: { title: "pH Scale", Component: PHScale } },
  { keywords: ["radioactive decay","half-life","nuclear","alpha","beta","gamma decay"], model: { title: "Radioactive Decay", Component: RadioactiveDecay } },
  { keywords: ["galvanic cell","electrochemical","oxidation","reduction","redox","electrode potential"], model: { title: "Galvanic Cells", Component: GalvanicCells } },
  { keywords: ["le chatelier","equilibrium","equilibrium constant","kc","kp","shift in equilibrium"], model: { title: "Le Chatelier's Principle", Component: LeChatelier } },
  { keywords: ["mitosis","meiosis","cell division","chromosome"], model: { title: "Mitosis & Meiosis", Component: MitosisMeiosis } },
  { keywords: ["dna","double helix","base pair","nucleotide","transcription","replication"], model: { title: "DNA Double Helix", Component: DNADoubleHelix } },
  { keywords: ["photosynthesis","chloroplast","light reaction","calvin cycle","glucose"], model: { title: "Photosynthesis", Component: Photosynthesis } },
  { keywords: ["osmosis","diffusion","concentration gradient","semipermeable"], model: { title: "Osmosis & Diffusion", Component: OsmosisDiffusion } },
  { keywords: ["enzyme","substrate","active site","inhibitor","km","vmax"], model: { title: "Enzyme–Substrate", Component: EnzymeSubstrate } },
  { keywords: ["action potential","neuron","depolarisation","repolarisation","sodium pump"], model: { title: "Action Potential", Component: ActionPotential } },
  { keywords: ["kepler","orbital","elliptical orbit","planet","eccentricity of orbit"], model: { title: "Kepler's Laws", Component: KeplerLaws } },
  { keywords: ["stellar","main sequence","star","hertzsprung","red giant","white dwarf"], model: { title: "Stellar Lifecycle", Component: StellarLifecycle } },
  { keywords: ["greenhouse","global warming","climate","co2","carbon dioxide effect"], model: { title: "Greenhouse Effect", Component: GreenhouseEffect } },
];

function findRelatedModel(diagnosis: Diagnosis | undefined): ModelEntry | null {
  if (!diagnosis) return null;
  const text = [
    (diagnosis as any)?.concept_label,
    (diagnosis as any)?.question_summary,
    (diagnosis as any)?.error_tag,
    (diagnosis as any)?.core_concept,
    (diagnosis as any)?.what_happened,
    (diagnosis as any)?.underlying_concept,
  ].filter(Boolean).join(" ").toLowerCase();

  for (const { keywords, model } of MODEL_MAP) {
    if (keywords.some((kw) => text.includes(kw))) return model;
  }
  return null;
}

function resolveImageSrc(state: NavState): string | null {
  if (state.imageUrl) return state.imageUrl;
  if (state.imageBase64 && state.mimeType) return `data:${state.mimeType};base64,${state.imageBase64}`;
  return null;
}

// ── Shared upgrade dialog ─────────────────────────────────────────────────────

function UpgradeDialog({ open, onClose, deep = false }: { open: boolean; onClose: () => void; deep?: boolean }) {
  const navigate = useNavigate();
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="border border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Lock className={cn("h-4 w-4", deep ? "text-yellow-400" : "text-primary")} />
            {deep ? "Deep plan required" : "Upgrade to unlock"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {deep
              ? "Generating more practice questions is exclusive to the Deep plan."
              : "Upgrade to Intermediate or Deep to access full concept explanations and all practice questions."}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex justify-end">
          <Button
            className={deep ? "bg-yellow-400 text-black hover:bg-yellow-400/90" : "bg-primary hover:bg-primary/90"}
            onClick={() => navigate("/pricing")}
          >
            {deep ? "Upgrade to Deep" : "View plans"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Practice tab ──────────────────────────────────────────────────────────────

function PracticeTab({ problems, plan, onGenerateMore, isGeneratingMore, isLoadingPractice }: {
  problems: PracticeItem[];
  plan: string;
  onGenerateMore: () => Promise<void>;
  isGeneratingMore: boolean;
  isLoadingPractice: boolean;
}) {
  const isPaid = FREE_FOR_ALL || plan === "intermediate" || plan === "deep";
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [upgradeType, setUpgradeType] = useState<"paid" | null>(null);

  if (isLoadingPractice) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Generating practice questions…</p>
        </div>
      </div>
    );
  }

  if (!Array.isArray(problems) || problems.length === 0) {
    return <p className="text-sm text-muted-foreground">No practice problems available.</p>;
  }

  return (
    <>
      <div className="space-y-3">
        {problems.map((p, idx) => {
          const open = revealed.has(p.id);
          const canReveal = isPaid || idx === 0;
          return (
            <div key={p.id} className="rounded-lg border border-border bg-secondary/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-foreground">
                  <span className="mr-2 text-muted-foreground/60">Q{idx + 1}.</span>
                  <RichText text={p.question} />
                </p>
                <button
                  onClick={() => {
                    if (!canReveal) { setUpgradeType("paid"); return; }
                    setRevealed((prev) => {
                      const next = new Set(prev);
                      open ? next.delete(p.id) : next.add(p.id);
                      return next;
                    });
                  }}
                  className="shrink-0 text-xs text-primary underline underline-offset-2 hover:text-primary/80"
                >
                  {open ? "Hide" : "Answer"}
                </button>
              </div>
              {open && (
                <p className="mt-3 animate-in fade-in slide-in-from-top-1 duration-200 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-foreground">
                  <RichText text={p.answer} />
                </p>
              )}
            </div>
          );
        })}
      </div>

      <Button
        variant="outline"
        className="mt-4 w-full border-border"
        disabled={isGeneratingMore}
        onClick={() => {
          if (!isPaid) { setUpgradeType("paid"); return; }
          onGenerateMore();
        }}
      >
        {isGeneratingMore
          ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          : <ChevronRight className="mr-2 h-4 w-4" />}
        {isGeneratingMore ? "Generating…" : "Generate more questions"}
      </Button>

      <UpgradeDialog open={upgradeType === "paid"} onClose={() => setUpgradeType(null)} />
    </>
  );
}

// ── Concept tab ───────────────────────────────────────────────────────────────

function ConceptTab({
  whatHappened, coreConcept, recognitionCue, legacyConcept, plan, onMasterClick, isLoadingConcept,
}: {
  whatHappened?: string; coreConcept?: string; recognitionCue?: string;
  legacyConcept?: string; plan: string; onMasterClick: () => void; isLoadingConcept?: boolean;
}) {
  const isPaid = FREE_FOR_ALL || plan === "intermediate" || plan === "deep";
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Legacy fallback for old cached scans
  if (!whatHappened) {
    const concept = legacyConcept ?? "";
    const firstSentence = concept.split(/(?<=[.!?])\s+/)[0] ?? concept;
    const hasMore = concept.length > firstSentence.length;
    return (
      <>
        <div className="rounded-lg border border-border bg-secondary/40 p-5">
          <div className="mb-3 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Key Concept</p>
          </div>
          {isPaid ? (
            <p className="text-sm leading-relaxed text-foreground"><RichText text={concept} /></p>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <p className="text-sm leading-relaxed text-foreground line-clamp-2"><RichText text={concept} /></p>
                {hasMore && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-secondary/80 to-transparent" />
                )}
              </div>
              {hasMore && (
                <button onClick={() => setShowUpgrade(true)} className="flex items-center gap-1.5 text-xs text-primary underline underline-offset-2 hover:text-primary/80">
                  <Lock className="h-3 w-3" />
                  Upgrade to read the full explanation
                </button>
              )}
            </div>
          )}
          <Button className="mt-4 w-full bg-primary hover:bg-primary/90" onClick={onMasterClick}>
            Master this concept <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
        <UpgradeDialog open={showUpgrade} onClose={() => setShowUpgrade(false)} />
      </>
    );
  }

  // New three-section layout
  const sections = [
    {
      id: "happened",
      label: "In this problem",
      Icon: Microscope,
      content: whatHappened,
      locked: false,
      cardClass: "border-border bg-secondary/40",
      labelClass: "text-muted-foreground",
      iconClass: "text-muted-foreground",
    },
    {
      id: "concept",
      label: "The concept",
      Icon: Lightbulb,
      content: coreConcept,
      locked: !isPaid,
      cardClass: "border-primary/20 bg-primary/5",
      labelClass: "text-primary",
      iconClass: "text-primary",
    },
    {
      id: "cue",
      label: "When you see this",
      Icon: ArrowRight,
      content: recognitionCue,
      locked: !isPaid,
      cardClass: "border-border bg-secondary/60",
      labelClass: "text-muted-foreground",
      iconClass: "text-muted-foreground",
    },
  ];

  return (
    <>
      <div className="space-y-3" data-feature="root-cause-analysis-exam-mistakes" data-content="ai-analysis-breakdown,underlying-concept,targeted-practice">
        {sections.map(({ id, label, Icon, content, locked, cardClass, labelClass, iconClass }) => (
          <div
            key={id}
            className={`relative rounded-lg border p-5 ${cardClass} ${locked ? "cursor-pointer" : ""}`}
            style={{ minHeight: "8rem" }}
            onClick={locked ? () => setShowUpgrade(true) : undefined}
          >
            <div className="mb-2.5 flex items-center gap-2">
              <Icon className={`h-4 w-4 ${iconClass}`} />
              <p className={`text-xs font-semibold uppercase tracking-[0.15em] ${labelClass}`}>{label}</p>
            </div>
            {isLoadingConcept && locked ? (
              <div className="flex items-center gap-2 py-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Loading…</span>
              </div>
            ) : locked ? (
              <div className="relative">
                <div className="overflow-hidden" style={{ maxHeight: "4.2rem" }}>
                  <p className="text-sm leading-relaxed text-foreground select-none">
                    <RichText text={content ?? ""} />
                  </p>
                </div>
                <div className="pointer-events-none absolute inset-x-0 top-0 bottom-0 bg-gradient-to-b from-transparent via-card/70 to-card" style={{ top: "1.4rem" }} />
                <div className="relative mt-2 flex items-center gap-1.5">
                  <Lock className="h-3 w-3 text-primary" />
                  <span className="text-xs font-semibold text-primary">Upgrade to unlock</span>
                </div>
              </div>
            ) : isLoadingConcept ? (
              <div className="flex items-center gap-2 py-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Loading…</span>
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-foreground">
                <RichText text={content ?? ""} />
              </p>
            )}
          </div>
        ))}
        <Button className="w-full bg-primary hover:bg-primary/90" onClick={onMasterClick}>
          Practice this concept <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
      <UpgradeDialog open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </>
  );
}

// ── Identify error tab ────────────────────────────────────────────────────────

function IdentifyErrorTab({ diagnosis }: { diagnosis: IdentifyDiagnosis }) {
  const categoryColor: Record<string, string> = {
    Conceptual: "bg-destructive/10 text-destructive border-destructive/20",
    Procedural: "bg-yellow-400/10 text-yellow-400 border-yellow-400/20",
    Computational: "bg-orange-400/10 text-orange-400 border-orange-400/20",
    Notational: "bg-blue-400/10 text-blue-400 border-blue-400/20",
  };

  if (diagnosis.error_category === "Correct") {
    return (
      <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-5">
        <div className="mb-2 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-green-500">All correct</p>
        </div>
        <p className="text-sm leading-relaxed text-foreground">Your working is correct. Check the Concept and Practice tabs to strengthen your understanding.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={cn("border text-xs font-semibold", categoryColor[diagnosis.error_category] ?? "bg-secondary text-foreground")}>
          {diagnosis.error_category}
        </Badge>
        <span className="rounded-full border border-border bg-secondary px-3 py-0.5 text-xs font-medium text-foreground">
          {diagnosis.error_tag}
        </span>
      </div>
      <div className="rounded-lg border border-border bg-secondary/40 p-5">
        <div className="mb-3 flex items-center gap-2">
          <TriangleAlert className="h-4 w-4 text-destructive" />
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Where you went wrong</p>
        </div>
        <p className="text-sm leading-relaxed text-foreground"><RichText text={diagnosis.explanation} /></p>
      </div>
    </div>
  );
}

// ── Steps tab ─────────────────────────────────────────────────────────────────

function StepsTab({ diagnosis, steps, revealed, setRevealed, plan, isLoading }: {
  diagnosis: GuideDiagnosis;
  steps: string[];
  revealed: number;
  setRevealed: React.Dispatch<React.SetStateAction<number>>;
  plan: string;
  isLoading?: boolean;
}) {
  const isPaid = FREE_FOR_ALL || plan === "intermediate" || plan === "deep";

  function askWhale(stepNum: number, stepText: string) {
    window.dispatchEvent(new CustomEvent("whale-context", {
      detail: { stepNum, stepText, questionSummary: diagnosis.question_summary },
    }));
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Generating steps…</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {diagnosis.question_summary && (
        <p className="rounded-lg border border-border bg-secondary/40 px-4 py-3 text-sm italic text-muted-foreground">
          <RichText text={diagnosis.question_summary} />
        </p>
      )}
      {steps.length === 0 ? (
        <p className="text-sm text-muted-foreground">No steps available for this scan.</p>
      ) : (
        <>
          <div className="space-y-2">
            {steps.slice(0, revealed).map((step, i) => (
              <div key={i} className="rounded-lg border border-primary/20 bg-primary/5 p-4 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <p className="text-sm text-foreground leading-relaxed"><RichText text={step} /></p>
                </div>
                {isPaid && (
                  <div className="mt-3 border-t border-primary/10 pt-3">
                    <button
                      onClick={() => askWhale(i + 1, step)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-primary"
                    >
                      <img src="/whale-e.png" alt="" className="whale-img h-3.5 w-3.5 rounded-full object-cover" />
                      Ask Whal-E about this step
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {revealed < steps.length ? (
            <Button variant="outline" className="w-full border-border" onClick={() => setRevealed((v) => v + 1)}>
              Show next step
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <p className="text-center text-xs text-muted-foreground">All steps revealed.</p>
          )}
        </>
      )}
    </div>
  );
}

// ── Guest Whal-E nudge ────────────────────────────────────────────────────────

const NUDGE_MESSAGES = [
  "Sign up to save your results!",
  "Don't lose this scan — it takes 10 seconds.",
  "Create a free account to keep your progress.",
  "Want to come back to this later? Sign up free.",
  "Save your scan so you can review it anytime.",
];

function WhaleNudge() {
  const navigate = useNavigate();
  const [msgIdx, setMsgIdx] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Appear after a short delay
    const t = setTimeout(() => setVisible(true), 1800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (dismissed) return;
    const interval = setInterval(() => {
      setMsgIdx((i) => (i + 1) % NUDGE_MESSAGES.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [dismissed]);

  if (dismissed) return null;

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 flex items-end gap-3 transition-all duration-500",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6 pointer-events-none"
      )}
    >
      {/* Speech bubble */}
      <div className="relative max-w-[220px] rounded-xl border border-border bg-card px-4 py-3 shadow-lg">
        <button
          onClick={() => setDismissed(true)}
          className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground hover:bg-border"
          aria-label="Dismiss"
        >
          ×
        </button>
        <p className="text-xs font-medium text-foreground leading-snug">{NUDGE_MESSAGES[msgIdx]}</p>
        <button
          onClick={() => navigate("/signup")}
          className="mt-2 text-xs font-semibold text-primary underline underline-offset-2 hover:text-primary/80"
        >
          Sign up free →
        </button>
        {/* Tail pointing right toward whale */}
        <span className="absolute -right-2 bottom-4 h-0 w-0 border-y-4 border-l-8 border-y-transparent border-l-card" />
        <span className="absolute -right-[9px] bottom-4 h-0 w-0 border-y-4 border-l-8 border-y-transparent border-l-border" />
      </div>
      {/* Whale avatar */}
      <img
        src="/whale-e.png"
        alt="Whal-E"
        className="h-14 w-14 object-contain"
        style={{ animation: "float 4s ease-in-out infinite" }}
      />
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

const BlindSpotReport = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const state = resolveReportState(location.state);
  const diagnosis = state.diagnosis;
  const mode = state.mode ?? (diagnosis as any)?.mode ?? "guide";
  const imageSrc = resolveImageSrc(state);
  const inputText = state.inputText ?? null;
  const scanId = (state as any).scanId as string | undefined;
  const isGuest = !!(state as any).guest;

  const [displaySrc, setDisplaySrc] = useState<string | null>(imageSrc);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [plan, setPlan] = useState<string>("free");
  const [planLoaded, setPlanLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<ReportTab>(mode === "guide" ? "steps" : "error");
  const [revealedSteps, setRevealedSteps] = useState(1);
  const [extraProblems, setExtraProblems] = useState<PracticeItem[]>([]);
  const [isGeneratingMore, setIsGeneratingMore] = useState(false);
  const [lazyConceptData, setLazyConceptData] = useState<{ core_concept?: string; recognition_cue?: string } | null>(null);
  const [lazyPractice, setLazyPractice] = useState<PracticeItem[] | null>(null);
  const [lazySteps, setLazySteps] = useState<string[] | null>(null);
  const [loadingConcept, setLoadingConcept] = useState(false);
  const [loadingPractice, setLoadingPractice] = useState(false);
  const [loadingSteps, setLoadingSteps] = useState(false);

  // Keep displaySrc in sync when navigation brings a new image
  useEffect(() => {
    setDisplaySrc(imageSrc);
  }, [imageSrc]);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user || !mounted) return;
      const { data } = await (supabase as any)
        .from("profiles")
        .select("plan")
        .eq("id", user.id)
        .single();
      if (mounted) { setPlan(data?.plan ?? "free"); setPlanLoaded(true); }
    });
    return () => { mounted = false; };
  }, []);

  // Lazy load steps if they are missing from the diagnosis (always fetch — credit-independent)
  useEffect(() => {
    if (mode !== "guide") return;
    const existingSteps = Array.isArray((diagnosis as any)?.steps) ? (diagnosis as any).steps as string[] : [];
    if (existingSteps.length > 0) return;   // already have steps
    if (lazySteps !== null) return;         // already fetched
    if (loadingSteps) return;
    const topic = (diagnosis as any)?.concept_label ?? (diagnosis as any)?.question_summary ?? "STEM";
    const questionSummary = (diagnosis as any)?.question_summary ?? "";
    setLoadingSteps(true);
    supabase.functions.invoke("diagnose-image", {
      body: { text: questionSummary || topic, mode: "guide_steps" },
    }).then(({ data, error }) => {
      setLoadingSteps(false);
      if (error || (data as any)?.error) return; // silent — don't toast, steps pane handles empty state
      const steps: string[] = Array.isArray((data as any)?.steps) ? (data as any).steps : [];
      if (steps.length) {
        setLazySteps(steps);
        setRevealedSteps(1);
        if (scanId) {
          try {
            const key = SCAN_CACHE_KEY(scanId);
            const cached = localStorage.getItem(key);
            if (cached) {
              const parsed = JSON.parse(cached);
              parsed.diagnosis = { ...parsed.diagnosis, steps };
              localStorage.setItem(key, JSON.stringify(parsed));
            }
          } catch { /* ignore */ }
        }
      }
    });
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lazy load concept when Concept tab is first clicked
  useEffect(() => {
    if (activeTab !== "concept") return;
    if (loadingConcept || lazyConceptData) return;
    if ((diagnosis as any)?.core_concept) return; // already in cached diagnosis
    const topic = (diagnosis as any)?.concept_label ?? (diagnosis as any)?.question_summary ?? "STEM";
    setLoadingConcept(true);
    supabase.functions.invoke("diagnose-image", {
      body: { mode: "guide_concept", topic, what_happened: (diagnosis as any)?.what_happened },
    }).then(({ data, error }) => {
      setLoadingConcept(false);
      if (error || (data as any)?.error) { whaleToast.error("Failed to load concept."); return; }
      const result = { core_concept: (data as any)?.core_concept, recognition_cue: (data as any)?.recognition_cue };
      setLazyConceptData(result);
      if (scanId) {
        try {
          const key = SCAN_CACHE_KEY(scanId);
          const cached = localStorage.getItem(key);
          if (cached) {
            const parsed = JSON.parse(cached);
            parsed.diagnosis = { ...parsed.diagnosis, ...result };
            localStorage.setItem(key, JSON.stringify(parsed));
          }
        } catch { /* ignore */ }
      }
    });
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lazy load practice when Practice tab is first clicked (waits for plan)
  useEffect(() => {
    if (activeTab !== "practice") return;
    if (!planLoaded) return;
    if (loadingPractice || lazyPractice !== null) return;
    if (Array.isArray((diagnosis as any)?.practice_problems) && (diagnosis as any).practice_problems.length > 0) return;
    const topic = (diagnosis as any)?.concept_label ?? (diagnosis as any)?.question_summary ?? "STEM";
    const practice_count = (!FREE_FOR_ALL && plan === "free") ? 1 : 3;
    setLoadingPractice(true);
    supabase.functions.invoke("diagnose-image", {
      body: { mode: "more_practice", topic, practice_count, start_id: 1 },
    }).then(({ data, error }) => {
      setLoadingPractice(false);
      if (error || (data as any)?.error) { whaleToast.error("Failed to load practice questions."); return; }
      const problems: PracticeItem[] = (data as any)?.practice_problems ?? [];
      setLazyPractice(problems);
      if (scanId) {
        try {
          const key = SCAN_CACHE_KEY(scanId);
          const cached = localStorage.getItem(key);
          if (cached) {
            const parsed = JSON.parse(cached);
            parsed.diagnosis = { ...parsed.diagnosis, practice_problems: problems };
            localStorage.setItem(key, JSON.stringify(parsed));
          }
        } catch { /* ignore */ }
      }
    });
  }, [activeTab, planLoaded]); // eslint-disable-line react-hooks/exhaustive-deps


  const generateMoreProblems = useCallback(async () => {
    if (isGeneratingMore) return;
    setIsGeneratingMore(true);
    const basePractice = lazyPractice ?? (Array.isArray(diagnosis?.practice_problems) ? diagnosis.practice_problems : []);
    const allProblems = [...basePractice, ...extraProblems];
    const topic = (diagnosis as any)?.concept_label ?? (diagnosis as any)?.question_summary ?? "STEM";
    const { data, error } = await supabase.functions.invoke("diagnose-image", {
      body: { mode: "more_practice", topic, practice_count: 2, start_id: allProblems.length + 1 },
    });
    setIsGeneratingMore(false);
    if (error || (data as any)?.error) {
      whaleToast.error("Failed to generate more questions.");
      return;
    }
    const newProblems: PracticeItem[] = (data as any)?.practice_problems ?? [];
    setExtraProblems((prev) => [...prev, ...newProblems]);
  }, [diagnosis, extraProblems, isGeneratingMore]);

  if (!diagnosis) {
    return (
      <EducatorLayout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="space-y-4 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">No report available</p>
            <p className="text-sm text-muted-foreground">Upload an image in the Workspace first.</p>
            <Link to="/workspace">
              <Button variant="outline" className="mt-4 gap-2 border-border">
                <ArrowLeft className="h-3.5 w-3.5" />
                Go to Lab
              </Button>
            </Link>
          </div>
        </div>
      </EducatorLayout>
    );
  }

  const effectiveSteps = lazySteps ?? (Array.isArray((diagnosis as any).steps) ? (diagnosis as any).steps as string[] : []);
  const basePractice = lazyPractice ?? (Array.isArray(diagnosis.practice_problems) ? diagnosis.practice_problems : []);
  const practice = [...basePractice, ...extraProblems];
  const effectiveConcept = lazyConceptData?.core_concept ?? (diagnosis as any)?.core_concept;
  const effectiveRecognitionCue = lazyConceptData?.recognition_cue ?? (diagnosis as any)?.recognition_cue;
  const relatedModel = findRelatedModel(diagnosis);

  return (
    <EducatorLayout>
      <Helmet>
        <title>Report</title>
        <meta name="description" content="See the root cause of your mistake, the underlying concept explained, and targeted practice to close the gap. AI working analysis for IB, AP, and A-Level STEM subjects." />
      </Helmet>
      <div className={cn("grid gap-6", (displaySrc || inputText) ? "lg:grid-cols-5" : "lg:grid-cols-1")}>

        {/* Left panel — image or typed question */}
        {(displaySrc || inputText) && (
          <div className="lg:col-span-2">
            <div className="sticky top-4 rounded-xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <FileSearch className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  {displaySrc ? "Uploaded image" : "Your question"}
                </p>
              </div>
              <div className={cn("rounded-lg bg-secondary/40 p-3", displaySrc ? "flex min-h-[220px] items-center justify-center" : "")}>
                {displaySrc ? (
                  <img
                    src={displaySrc}
                    alt="Uploaded work"
                    className="max-h-80 w-full cursor-zoom-in rounded object-contain"
                    onClick={() => setLightboxOpen(true)}
                    onError={() => {
                      const fallback = scanId ? scanImageStore.get(scanId) : null;
                      if (fallback) setDisplaySrc(fallback);
                      else setDisplaySrc(null);
                    }}
                  />
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{inputText}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tabs panel */}
        <div className={(imageSrc || inputText) ? "lg:col-span-3" : "lg:col-span-1"}>
          {(() => {
            const baseTabList = mode === "guide"
              ? [
                  { value: "steps" as ReportTab, label: "Step by Step", Icon: ArrowRight },
                  { value: "concept" as ReportTab, label: "Concept", Icon: Lightbulb },
                  { value: "practice" as ReportTab, label: "Practice", Icon: ClipboardList },
                ]
              : [
                  { value: "error" as ReportTab, label: "Error Found", Icon: TriangleAlert },
                  { value: "concept" as ReportTab, label: "Concept", Icon: Lightbulb },
                  { value: "practice" as ReportTab, label: "Practice", Icon: ClipboardList },
                ];
            const tabList = relatedModel
              ? [...baseTabList, { value: "model" as ReportTab, label: relatedModel.title, Icon: Layers }]
              : baseTabList;
            const activeIdx = tabList.findIndex((t) => t.value === activeTab);
            const tabCount = tabList.length;
            return (
              <>
                <div className="relative mb-4 flex w-full rounded-md border border-border bg-secondary p-1">
                  <div
                    className="absolute bottom-1 top-1 rounded-sm bg-card shadow-sm transition-transform duration-200 ease-out"
                    style={{ width: `calc((100% - 8px) / ${tabCount})`, transform: `translateX(calc(${activeIdx} * 100%))` }}
                  />
                  {tabList.map(({ value, label, Icon }) => (
                    <button
                      key={value}
                      onClick={() => setActiveTab(value)}
                      className={`relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-sm py-1.5 text-xs sm:text-sm font-medium transition-colors duration-200 ${
                        activeTab === value ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                      <span className="truncate">{label}</span>
                    </button>
                  ))}
                </div>
                <div className="animate-in fade-in duration-200">
                  {activeTab === "steps" && <StepsTab diagnosis={diagnosis as GuideDiagnosis} steps={effectiveSteps} revealed={revealedSteps} setRevealed={setRevealedSteps} plan={plan} isLoading={loadingSteps} />}
                  {activeTab === "error" && <IdentifyErrorTab diagnosis={diagnosis as IdentifyDiagnosis} />}
                  {activeTab === "concept" && <ConceptTab
                    whatHappened={diagnosis.what_happened}
                    coreConcept={effectiveConcept}
                    recognitionCue={effectiveRecognitionCue}
                    legacyConcept={diagnosis.underlying_concept}
                    plan={plan}
                    onMasterClick={() => setActiveTab("practice")}
                    isLoadingConcept={loadingConcept}
                  />}
                  {activeTab === "practice" && <PracticeTab problems={practice} plan={plan} onGenerateMore={generateMoreProblems} isGeneratingMore={isGeneratingMore} isLoadingPractice={loadingPractice} />}
                  {activeTab === "model" && relatedModel && (
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                      <div className="px-4 pt-4 pb-2">
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Interactive Model</p>
                        <p className="mt-0.5 text-sm font-semibold text-foreground">{relatedModel.title}</p>
                      </div>
                      <relatedModel.Component />
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </div>

      </div>

      {/* Guest Whal-E nudge */}
      {isGuest && <WhaleNudge />}

      {/* Lightbox */}
      {lightboxOpen && displaySrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setLightboxOpen(false)}
        >
          <img
            src={displaySrc}
            alt="Uploaded work"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </EducatorLayout>
  );
};

export default BlindSpotReport;
