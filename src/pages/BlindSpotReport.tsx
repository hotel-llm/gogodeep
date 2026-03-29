import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import {
  BookOpen, ArrowLeft, TriangleAlert, Lightbulb, ClipboardList,
  ChevronDown, ChevronRight, ArrowRight, FileSearch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EducatorLayout from "@/components/EducatorLayout";
import { cn } from "@/lib/utils";

type PracticeItem = { id: number; question: string; answer: string };

type IdentifyDiagnosis = {
  mode: "identify";
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

function resolveImageSrc(state: NavState): string | null {
  if (state.imageUrl) return state.imageUrl;
  if (state.imageBase64 && state.mimeType) return `data:${state.mimeType};base64,${state.imageBase64}`;
  return null;
}

// ── Practice tab (shared) ────────────────────────────────────────────────────

function PracticeTab({ problems }: { problems: PracticeItem[] }) {
  const [revealed, setRevealed] = useState<Set<number>>(new Set());

  if (!problems?.length) {
    return <p className="text-sm text-muted-foreground">No practice problems available.</p>;
  }

  return (
    <div className="space-y-3">
      {problems.map((p) => {
        const open = revealed.has(p.id);
        return (
          <div key={p.id} className="rounded-lg border border-border bg-secondary/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-foreground">
                <span className="mr-2 text-muted-foreground/60">Q{p.id}.</span>
                {p.question}
              </p>
              <button
                onClick={() => setRevealed((prev) => {
                  const next = new Set(prev);
                  open ? next.delete(p.id) : next.add(p.id);
                  return next;
                })}
                className="shrink-0 text-xs text-primary underline underline-offset-2 hover:text-primary/80"
              >
                {open ? "Hide" : "Answer"}
              </button>
            </div>
            {open && (
              <p className="mt-3 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-foreground">
                {p.answer}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Concept tab (shared) ─────────────────────────────────────────────────────

function ConceptTab({ concept }: { concept: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/40 p-5">
      <div className="mb-3 flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-primary" />
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Key Concept</p>
      </div>
      <p className="text-sm leading-relaxed text-foreground">{concept}</p>
    </div>
  );
}

// ── Identify tabs ────────────────────────────────────────────────────────────

function IdentifyErrorTab({ diagnosis }: { diagnosis: IdentifyDiagnosis }) {
  const categoryColor: Record<string, string> = {
    Conceptual: "bg-destructive/10 text-destructive border-destructive/20",
    Procedural: "bg-yellow-400/10 text-yellow-400 border-yellow-400/20",
    Computational: "bg-orange-400/10 text-orange-400 border-orange-400/20",
    Notational: "bg-blue-400/10 text-blue-400 border-blue-400/20",
  };

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

// ── Guide tabs ───────────────────────────────────────────────────────────────

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
          <div
            key={i}
            className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
              {i + 1}
            </span>
            <p className="text-sm text-foreground">{step}</p>
          </div>
        ))}
      </div>
      {revealed < steps.length ? (
        <Button
          variant="outline"
          className="w-full border-border"
          onClick={() => setRevealed((v) => v + 1)}
        >
          Show next step
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      ) : steps.length > 0 ? (
        <p className="text-center text-xs text-muted-foreground">All steps revealed.</p>
      ) : null}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

const BlindSpotReport = () => {
  const location = useLocation();
  const rawState = location.state as NavState | null;

  // Also try loading from localStorage if state came from sidebar click
  const state: NavState = rawState ?? {};
  const diagnosis = state.diagnosis;
  const mode = diagnosis?.mode ?? state.mode ?? "identify";
  const imageSrc = resolveImageSrc(state);

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
          {mode === "guide" ? (
            <Tabs defaultValue="steps">
              <TabsList className="mb-4 w-full border border-border bg-secondary">
                <TabsTrigger value="steps" className="flex-1 gap-1.5 data-[state=active]:bg-card">
                  <ArrowRight className="h-3.5 w-3.5" />
                  Step by Step
                </TabsTrigger>
                <TabsTrigger value="concept" className="flex-1 gap-1.5 data-[state=active]:bg-card">
                  <Lightbulb className="h-3.5 w-3.5" />
                  Concept
                </TabsTrigger>
                <TabsTrigger value="practice" className="flex-1 gap-1.5 data-[state=active]:bg-card">
                  <ClipboardList className="h-3.5 w-3.5" />
                  Practice
                </TabsTrigger>
              </TabsList>
              <TabsContent value="steps">
                <StepsTab diagnosis={diagnosis as GuideDiagnosis} />
              </TabsContent>
              <TabsContent value="concept">
                <ConceptTab concept={concept} />
              </TabsContent>
              <TabsContent value="practice">
                <PracticeTab problems={practice} />
              </TabsContent>
            </Tabs>
          ) : (
            <Tabs defaultValue="error">
              <TabsList className="mb-4 w-full border border-border bg-secondary">
                <TabsTrigger value="error" className="flex-1 gap-1.5 data-[state=active]:bg-card">
                  <TriangleAlert className="h-3.5 w-3.5" />
                  Error Found
                </TabsTrigger>
                <TabsTrigger value="concept" className="flex-1 gap-1.5 data-[state=active]:bg-card">
                  <Lightbulb className="h-3.5 w-3.5" />
                  Concept
                </TabsTrigger>
                <TabsTrigger value="practice" className="flex-1 gap-1.5 data-[state=active]:bg-card">
                  <ClipboardList className="h-3.5 w-3.5" />
                  Practice
                </TabsTrigger>
              </TabsList>
              <TabsContent value="error">
                <IdentifyErrorTab diagnosis={diagnosis as IdentifyDiagnosis} />
              </TabsContent>
              <TabsContent value="concept">
                <ConceptTab concept={concept} />
              </TabsContent>
              <TabsContent value="practice">
                <PracticeTab problems={practice} />
              </TabsContent>
            </Tabs>
          )}
        </div>

      </div>
    </EducatorLayout>
  );
};

export default BlindSpotReport;
