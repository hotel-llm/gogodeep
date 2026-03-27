import { useLocation, Link } from "react-router-dom";
import { DiagnosisResult } from "@/lib/mockData";
import { Target, Zap, BookOpen, ArrowLeft, FileSearch, TriangleAlert, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import PageTransition from "@/components/PageTransition";

const getStatusCopy = (errorCategory: string) => {
  if (errorCategory.toLowerCase() === "conceptual") {
    return {
      label: "Conceptual Gap",
      classes: "bg-destructive/10 text-destructive border-destructive/20",
      hint: "Student likely needs concept re-teaching before more problem volume.",
    };
  }
  return {
    label: "Procedural Slip",
    classes: "bg-signal-yellow/10 text-signal-yellow border-signal-yellow/20",
    hint: "Student understands core concept but needs process correction and repetition.",
  };
};

const BlindSpotReport = () => {
  const location = useLocation();
  const state = location.state as { imageUrl?: string; diagnosis?: DiagnosisResult } | null;
  const imageUrl = state?.imageUrl;
  const diagnosis = state?.diagnosis;
  const status = getStatusCopy(diagnosis?.error_category ?? "procedural");
  const rootCause = (diagnosis?.explanation ?? "").split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 2).join(" ");
  const fixBullets = (diagnosis?.practice_problems ?? []).slice(0, 3).map((p) => p.question);

  if (!diagnosis) {
    return (
      <PageTransition>
        <div className="relative z-10 min-h-screen pt-14 flex items-center justify-center">
          <div className="text-center space-y-4">
            <BookOpen className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold">No report available</p>
            <p className="text-sm text-muted-foreground">Upload an image in the Lab first.</p>
            <Link to="/lab">
              <Button variant="outline" className="border-border gap-2 mt-4">
                <ArrowLeft className="h-3.5 w-3.5" />
                Go to Lab
              </Button>
            </Link>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="relative z-10 min-h-screen pt-14 pb-12">
        <div className="container py-10">
          <div className="mb-8 flex items-center gap-4">
            <Link to="/lab" className="text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Diagnostic Report</p>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Misconception Analysis</h1>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="border-border bg-card p-5 lg:col-span-1">
              <div className="mb-4 flex items-center gap-2">
                <FileSearch className="h-4 w-4 text-primary" />
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Submitted Work</p>
              </div>
              <div className="flex items-center justify-center p-6 min-h-[300px]">
                {imageUrl ? (
                  <img src={imageUrl} alt="Submitted work" className="max-h-96 w-full rounded-md border border-border object-contain" />
                ) : (
                  <p className="text-sm text-muted-foreground">No image</p>
                )}
              </div>
            </Card>

            <div className="space-y-6 lg:col-span-2">
              <Card className="border-border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Status</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      <Badge className={`border text-xs font-semibold ${status.classes}`}>{status.label}</Badge>
                    </div>
                  </div>
                  <div className="rounded-md border border-border bg-secondary px-3 py-2 text-xs text-muted-foreground">{status.hint}</div>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">Detected tag:</span> {diagnosis.error_tag}
                </p>
              </Card>

              <Card className="border-border bg-card p-6">
                <div className="mb-3 flex items-center gap-2">
                  <TriangleAlert className="h-4 w-4 text-destructive" />
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Root Cause</p>
                </div>
                <p className="text-lg font-bold leading-relaxed text-foreground">{rootCause || diagnosis.explanation}</p>
              </Card>

              <Card className="border-border bg-card p-5">
                <div className="mb-5 flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-primary" />
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">The Fix</p>
                </div>
                <ul className="space-y-3 text-sm text-foreground">
                  {(fixBullets.length ? fixBullets : diagnosis.practice_problems.map((p) => p.question)).slice(0, 3).map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                      <Zap className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4">
                  <Link to="/lab">
                    <Button className="bg-primary hover:bg-primary/90">Run another scan</Button>
                  </Link>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default BlindSpotReport;
