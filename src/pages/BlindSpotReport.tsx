import { useState, useEffect, useCallback } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import {
  BookOpen, ArrowLeft, TriangleAlert, Lightbulb, ClipboardList,
  ChevronRight, ArrowRight, FileSearch, Lock, Loader2, Microscope, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import EducatorLayout from "@/components/EducatorLayout";
import { supabase } from "@/integrations/supabase/client";
import { checkScanCredits, SCAN_CACHE_KEY } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  is_correct?: boolean;
  error_category: string;
  error_tag: string;
  explanation: string;
  underlying_concept: string;
  practice_problems: PracticeItem[];
};

type GuideDiagnosis = {
  mode: "guide";
  question_summary: string;
  underlying_concept: string;
  steps: string[];
  practice_problems: PracticeItem[];
};

type Diagnosis = IdentifyDiagnosis | GuideDiagnosis;

type NavState = {
  imageUrl?: string;
  imageBase64?: string;
  mimeType?: string;
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
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" className="border-border" onClick={onClose}>Not now</Button>
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

function PracticeTab({ problems, plan, onScanQuestion }: { problems: PracticeItem[]; plan: string; onScanQuestion: (question: string) => Promise<void> }) {
  const isPaid = plan === "intermediate" || plan === "deep";
  const isDeep = plan === "deep";
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [showMore, setShowMore] = useState(false);
  const [upgradeType, setUpgradeType] = useState<"paid" | "deep" | null>(null);
  const [scanningId, setScanningId] = useState<number | null>(null);

  if (!problems?.length) {
    return <p className="text-sm text-muted-foreground">No practice problems available.</p>;
  }

  const baseCount = isPaid ? 3 : 1;
  const visibleProblems = showMore ? problems : problems.slice(0, baseCount);
  const hiddenCount = problems.length - baseCount;

  return (
    <>
      <div className="space-y-3">
        {visibleProblems.map((p) => {
          const open = revealed.has(p.id);
          return (
            <div key={p.id} className="rounded-lg border border-border bg-secondary/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-foreground">
                  <span className="mr-2 text-muted-foreground/60">Q{p.id}.</span>
                  {p.question}
                </p>
                <button
                  onClick={() => {
                    if (!isPaid) { setUpgradeType("paid"); return; }
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
                  {p.answer}
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

        {!isPaid && hiddenCount > 0 && (
          <button
            onClick={() => setUpgradeType("paid")}
            className="flex w-full items-center justify-between rounded-lg border border-dashed border-border bg-secondary/20 px-4 py-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <span className="text-sm text-muted-foreground">
              +{hiddenCount} more question{hiddenCount > 1 ? "s" : ""} — upgrade to unlock
            </span>
            <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        )}
      </div>

      {isPaid && !showMore && hiddenCount > 0 && (
        <Button
          variant="outline"
          className="mt-4 w-full border-border"
          onClick={() => isDeep ? setShowMore(true) : setUpgradeType("deep")}
        >
          <ChevronRight className="mr-2 h-4 w-4" />
          Generate more
        </Button>
      )}

      <UpgradeDialog open={upgradeType === "paid"} onClose={() => setUpgradeType(null)} />
      <UpgradeDialog open={upgradeType === "deep"} onClose={() => setUpgradeType(null)} deep />
    </>
  );
}

// ── Concept tab ───────────────────────────────────────────────────────────────

function ConceptTab({ concept, plan, onMasterClick }: { concept: string; plan: string; onMasterClick: () => void }) {
  const isPaid = plan === "intermediate" || plan === "deep";
  const [showUpgrade, setShowUpgrade] = useState(false);

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
          <p className="text-sm leading-relaxed text-foreground">{concept}</p>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <p className="text-sm leading-relaxed text-foreground line-clamp-2">{concept}</p>
              {hasMore && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-secondary/80 to-transparent" />
              )}
            </div>
            {hasMore && (
              <button
                onClick={() => setShowUpgrade(true)}
                className="flex items-center gap-1.5 text-xs text-primary underline underline-offset-2 hover:text-primary/80"
              >
                <Lock className="h-3 w-3" />
                Upgrade to read the full explanation
              </button>
            )}
          </div>
        )}
        <Button className="mt-4 w-full bg-primary hover:bg-primary/90" onClick={onMasterClick}>
          Master this concept
          <ChevronRight className="ml-2 h-4 w-4" />
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

  if (diagnosis.is_correct) {
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
        <p className="text-sm leading-relaxed text-foreground">{diagnosis.explanation}</p>
      </div>
    </div>
  );
}

// ── Steps tab ─────────────────────────────────────────────────────────────────

function StepsTab({ diagnosis }: { diagnosis: GuideDiagnosis }) {
  const [revealed, setRevealed] = useState(1);
  const steps = diagnosis.steps ?? [];

  return (
    <div className="space-y-4">
      {diagnosis.question_summary && (
        <p className="rounded-lg border border-border bg-secondary/40 px-4 py-3 text-sm italic text-muted-foreground">
          {diagnosis.question_summary}
        </p>
      )}
      <div className="space-y-2">
        {steps.slice(0, revealed).map((step, i) => (
          <div key={i} className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 animate-in fade-in slide-in-from-top-1 duration-200">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
              {i + 1}
            </span>
            <p className="text-sm text-foreground">{step}</p>
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
  const state: NavState = location.state ?? {};
  const diagnosis = state.diagnosis;
  const mode = diagnosis?.mode ?? "identify";
  const imageSrc = resolveImageSrc(state);

  const [plan, setPlan] = useState<string>("free");
  const [activeTab, setActiveTab] = useState<ReportTab>(mode === "guide" ? "steps" : "error");

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user || !mounted) return;
      const { data } = await (supabase as any)
        .from("profiles")
        .select("plan")
        .eq("id", user.id)
        .single();
      if (mounted) setPlan(data?.plan ?? "free");
    });
    return () => { mounted = false; };
  }, []);

  const scanPracticeQuestion = useCallback(async (question: string) => {
    const credits = await checkScanCredits();
    if (!credits.allowed) {
      toast.error("No scan credits left. Upgrade to continue.", { action: { label: "Upgrade", onClick: () => navigate("/pricing") } });
      return;
    }
    const base64 = questionToBase64(question);
    const mimeType = "image/png";
    const { data, error } = await supabase.functions.invoke("diagnose-image", {
      body: { image: base64, mimeType, mode: "guide" },
    });
    if (error || (data as any)?.error) {
      toast.error(`Scan failed: ${(error as any)?.message ?? (data as any)?.error}`);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    const [{ data: insertedScan }] = await Promise.all([
      (supabase as any).from("error_logs").insert({
        student_id: user?.id ?? null,
        subject: "Practice",
        topic: (data as any)?.concept_label ?? (data as any)?.question_summary ?? null,
      }).select("id").single(),
      user?.id ? (supabase as any).rpc("increment_scan_count", { user_id: user.id }) : Promise.resolve(null),
    ]);
    const scanId = insertedScan?.id;
    if (scanId) {
      localStorage.setItem(SCAN_CACHE_KEY(scanId), JSON.stringify({ imageBase64: base64, mimeType, diagnosis: data, mode: "guide" }));
    }
    navigate("/report", { state: { imageBase64: base64, mimeType, diagnosis: data, mode: "guide", scanId } });
  }, [navigate]);

  if (!diagnosis) {
    return (
      <EducatorLayout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="space-y-4 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">No report available</p>
            <p className="text-sm text-muted-foreground">Upload an image in the Lab first.</p>
            <Link to="/lab">
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

  const practice = diagnosis.practice_problems ?? [];
  const concept = diagnosis.underlying_concept ?? "";

  return (
    <EducatorLayout>
      <div className="grid gap-6 lg:grid-cols-5">

        {/* Image panel */}
        <div className="lg:col-span-2">
          <div className="sticky top-4 rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <FileSearch className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Uploaded image</p>
            </div>
            <div className="flex min-h-[220px] items-center justify-center rounded-lg bg-secondary/40 p-3">
              {imageSrc ? (
                <img src={imageSrc} alt="Uploaded work" className="max-h-80 w-full rounded object-contain" />
              ) : (
                <p className="text-xs text-muted-foreground">Image not available</p>
              )}
            </div>
            <div className="mt-4">
              <Link to="/lab">
                <Button variant="outline" className="w-full gap-2 border-border text-sm">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  New scan
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Tabs panel */}
        <div className="lg:col-span-3">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ReportTab)}>
            <TabsList className="mb-4 w-full border border-border bg-secondary">
              {mode === "guide" ? (
                <TabsTrigger value="steps" className="flex-1 gap-1.5 data-[state=active]:bg-card">
                  <ArrowRight className="h-3.5 w-3.5" />
                  Step by Step
                </TabsTrigger>
              ) : (
                <TabsTrigger value="error" className="flex-1 gap-1.5 data-[state=active]:bg-card">
                  <TriangleAlert className="h-3.5 w-3.5" />
                  Error Found
                </TabsTrigger>
              )}
              <TabsTrigger value="concept" className="flex-1 gap-1.5 data-[state=active]:bg-card">
                <Lightbulb className="h-3.5 w-3.5" />
                Concept
              </TabsTrigger>
              <TabsTrigger value="practice" className="flex-1 gap-1.5 data-[state=active]:bg-card">
                <ClipboardList className="h-3.5 w-3.5" />
                Practice
              </TabsTrigger>
            </TabsList>
            {mode === "guide" ? (
              <TabsContent value="steps" className="animate-in fade-in duration-200">
                <StepsTab diagnosis={diagnosis as GuideDiagnosis} />
              </TabsContent>
            ) : (
              <TabsContent value="error" className="animate-in fade-in duration-200">
                <IdentifyErrorTab diagnosis={diagnosis as IdentifyDiagnosis} />
              </TabsContent>
            )}
            <TabsContent value="concept" className="animate-in fade-in duration-200">
              <ConceptTab concept={concept} plan={plan} onMasterClick={() => setActiveTab("practice")} />
            </TabsContent>
            <TabsContent value="practice" className="animate-in fade-in duration-200">
              <PracticeTab problems={practice} plan={plan} onScanQuestion={scanPracticeQuestion} />
            </TabsContent>
          </Tabs>
        </div>

      </div>
    </EducatorLayout>
  );
};

export default BlindSpotReport;
