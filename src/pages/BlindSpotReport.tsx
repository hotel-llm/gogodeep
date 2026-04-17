import { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation, Link, useNavigate } from "react-router-dom";
import {
  BookOpen, ArrowLeft, TriangleAlert, Lightbulb, ClipboardList,
  ChevronRight, ArrowRight, FileSearch, Lock, Loader2, Microscope, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import EducatorLayout from "@/components/EducatorLayout";
import { RichText } from "@/components/RichText";
import { supabase } from "@/integrations/supabase/client";
import { checkScanCredits, SCAN_CACHE_KEY } from "@/lib/supabase";
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
};

type ReportTab = "steps" | "error" | "concept" | "practice";

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

function PracticeTab({ problems, plan, onScanQuestion, onGenerateMore, isGeneratingMore, isLoadingPractice }: {
  problems: PracticeItem[];
  plan: string;
  onScanQuestion: (question: string) => Promise<void>;
  onGenerateMore: () => Promise<void>;
  isGeneratingMore: boolean;
  isLoadingPractice: boolean;
}) {
  const isPaid = FREE_FOR_ALL || plan === "intermediate" || plan === "deep";
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [upgradeType, setUpgradeType] = useState<"paid" | null>(null);
  const [scanningId, setScanningId] = useState<number | null>(null);

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
              <div className="mt-3 border-t border-border pt-3">
                <button
                  disabled={scanningId === p.id}
                  onClick={async () => {
                    setScanningId(p.id);
                    await onScanQuestion(p.question);
                    setScanningId(null);
                  }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                >
                  {scanningId === p.id
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <Microscope className="h-3 w-3" />}
                  {scanningId === p.id ? "Scanning…" : "Scan this question (1 credit)"}
                </button>
              </div>
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

function StepsTab({ diagnosis, revealed, setRevealed, plan }: {
  diagnosis: GuideDiagnosis;
  revealed: number;
  setRevealed: React.Dispatch<React.SetStateAction<number>>;
  plan: string;
}) {
  const steps = Array.isArray(diagnosis.steps) ? diagnosis.steps : [];
  const isPaid = FREE_FOR_ALL || plan === "intermediate" || plan === "deep";

  function askWhale(stepNum: number, stepText: string) {
    window.dispatchEvent(new CustomEvent("whale-context", {
      detail: { stepNum, stepText, questionSummary: diagnosis.question_summary },
    }));
  }

  return (
    <div className="space-y-4">
      {diagnosis.question_summary && (
        <p className="rounded-lg border border-border bg-secondary/40 px-4 py-3 text-sm italic text-muted-foreground">
          <RichText text={diagnosis.question_summary} />
        </p>
      )}
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
      ) : steps.length > 0 ? (
        <p className="text-center text-xs text-muted-foreground">All steps revealed.</p>
      ) : null}
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
  const [loadingConcept, setLoadingConcept] = useState(false);
  const [loadingPractice, setLoadingPractice] = useState(false);

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

  const scanPracticeQuestion = useCallback(async (question: string) => {
    const credits = await checkScanCredits();
    if (!credits.allowed) {
      whaleToast.error("No scan credits left. Upgrade to continue.");
      return;
    }
    const base64 = questionToBase64(question);
    const mimeType = "image/png";
    const { data, error } = await supabase.functions.invoke("diagnose-image", {
      body: { image: base64, mimeType, mode: "guide" },
    });
    if (error || (data as any)?.error) {
      whaleToast.error(`Scan failed: ${(error as any)?.message ?? (data as any)?.error}`);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    const [{ data: insertedScan }] = await Promise.all([
      (supabase as any).from("error_logs").insert({
        student_id: user?.id ?? null,
        subject: "Practice",
        topic: (data as any)?.concept_label ?? (data as any)?.question_summary ?? null,
        diagnosis: data,
      }).select("id").single(),
      user?.id ? (supabase as any).rpc("increment_scan_count", { user_id: user.id }) : Promise.resolve(null),
    ]);
    const scanId = insertedScan?.id;
    if (scanId) {
      localStorage.setItem(SCAN_CACHE_KEY(scanId), JSON.stringify({ imageBase64: base64, mimeType, diagnosis: data, mode: "guide" }));
    }
    navigate("/report", { state: { imageBase64: base64, mimeType, diagnosis: data, mode: "guide", scanId } });
  }, [navigate]);

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

  const basePractice = lazyPractice ?? (Array.isArray(diagnosis.practice_problems) ? diagnosis.practice_problems : []);
  const practice = [...basePractice, ...extraProblems];
  const effectiveConcept = lazyConceptData?.core_concept ?? (diagnosis as any)?.core_concept;
  const effectiveRecognitionCue = lazyConceptData?.recognition_cue ?? (diagnosis as any)?.recognition_cue;

  return (
    <EducatorLayout>
      <Helmet>
        <title>Your AI Analysis Breakdown | Gogodeep</title>
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
            const tabList = mode === "guide"
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
            const activeIdx = tabList.findIndex((t) => t.value === activeTab);
            return (
              <>
                <div className="relative mb-4 flex w-full rounded-md border border-border bg-secondary p-1">
                  <div
                    className="absolute bottom-1 top-1 rounded-sm bg-card shadow-sm transition-transform duration-200 ease-out"
                    style={{ width: `calc((100% - 8px) / 3)`, transform: `translateX(calc(${activeIdx} * 100%))` }}
                  />
                  {tabList.map(({ value, label, Icon }) => (
                    <button
                      key={value}
                      onClick={() => setActiveTab(value)}
                      className={`relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-sm py-1.5 text-sm font-medium transition-colors duration-200 ${
                        activeTab === value ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
                <div className="animate-in fade-in duration-200">
                  {activeTab === "steps" && <StepsTab diagnosis={diagnosis as GuideDiagnosis} revealed={revealedSteps} setRevealed={setRevealedSteps} plan={plan} />}
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
                  {activeTab === "practice" && <PracticeTab problems={practice} plan={plan} onScanQuestion={scanPracticeQuestion} onGenerateMore={generateMoreProblems} isGeneratingMore={isGeneratingMore} isLoadingPractice={loadingPractice} />}
                </div>
              </>
            );
          })()}
        </div>

      </div>

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
