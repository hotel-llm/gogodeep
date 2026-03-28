import { useMemo, useState, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Upload, Loader2, Microscope, ArrowRight, Lock, ScanLine } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import EducatorLayout from "@/components/EducatorLayout";
import { checkScanCredits } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const SCAN_STEPS = ["Uploading", "Analysis", "Mapping gaps"] as const;

const DiagnosticLab = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [scanStep, setScanStep] = useState(0);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [remainingCredits, setRemainingCredits] = useState<number | null>(null);
  const [showLoginGate, setShowLoginGate] = useState(false);
  const pendingNavRef = useRef<{ imageUrl: string; diagnosis: unknown } | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const analyzeImage = useCallback(
    async (file: File) => {
      setIsAnalyzing(true);
      setScanStep(0);

      try {
        const credits = await checkScanCredits();
        if (!credits.allowed) {
          setIsAnalyzing(false);
          setRemainingCredits(credits.credits);
          setShowUpgradeModal(true);
          return;
        }

        const stepTimers = [window.setTimeout(() => setScanStep(1), 500), window.setTimeout(() => setScanStep(2), 1200)];

        const url = URL.createObjectURL(file);
        const buffer = await file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
        );

        const { data, error } = await supabase.functions.invoke("diagnose-image", {
          body: { image: base64, mimeType: file.type },
        });

        stepTimers.forEach(clearTimeout);

        if (error) {
          const msg = (error as any)?.message ?? String(error);
          toast.error(`Scan failed: ${msg}`);
          setIsAnalyzing(false);
          setScanStep(0);
          return;
        }

        if ((data as any)?.error) {
          toast.error(`Scan failed: ${(data as any).error}`);
          setIsAnalyzing(false);
          setScanStep(0);
          return;
        }

        const inputStatus = (data as any)?.input_status as string | undefined;
        if (inputStatus && inputStatus !== "ok") {
          toast.error(
            inputStatus === "blurry"
              ? "Image is too blurry to read. Please retake a clearer photo."
              : "That doesn't look like student STEM working. Please upload a clear PNG or JPG of the work."
          );
          setIsAnalyzing(false);
          setScanStep(0);
          return;
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        await (supabase as any).from("error_logs").insert({
          student_id: user?.id ?? null,
          subject: "STEM",
          topic: (data as any)?.error_tag ?? null,
          specific_error_tag: (data as any)?.error_tag ?? null,
          error_category: (data as any)?.error_category ?? null,
        });

        queryClient.invalidateQueries({ queryKey: ["history", "error_logs"] });

        if (!user?.id) {
          pendingNavRef.current = { imageUrl: url, diagnosis: data };
          setIsAnalyzing(false);
          setScanStep(0);
          setShowLoginGate(true);
          return;
        }

        navigate("/report", { state: { imageUrl: url, diagnosis: data } });
      } catch (err: unknown) {
        console.error("Analysis failed:", err);
        const msg = err instanceof Error ? err.message : String(err);
        toast.error(`Scan failed: ${msg}`);
        setIsAnalyzing(false);
        setScanStep(0);
      }
    },
    [navigate]
  );

  const canAnalyze = useMemo(() => !!selectedFile && !isAnalyzing, [selectedFile, isAnalyzing]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please drop an image file (PNG or JPG).");
      return;
    }
    setSelectedFile(file);
  }, []);

  const onFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (PNG or JPG).");
      return;
    }
    setSelectedFile(file);
  }, []);

  return (
    <EducatorLayout title="Diagnostic Lab" subtitle="Upload your working — a test problem, handwritten notes, whiteboard, or typed solution.">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Diagnostic bay</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Well-lit photo, full page in frame. PNG or JPG up to ~10 MB.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-xs text-muted-foreground">
                <ScanLine className="h-3.5 w-3.5 shrink-0 text-primary" />
                Structured report + practice
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <label
              onDragOver={(e) => { e.preventDefault(); if (!isAnalyzing) setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { if (isAnalyzing) return; onDrop(e); }}
              className={cn(
                "group relative flex min-h-[18rem] w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors",
                isDragging ? "border-primary bg-primary/5" : "border-border bg-secondary/50 hover:border-primary/50",
                isAnalyzing && "cursor-not-allowed"
              )}
            >
              <input type="file" accept="image/*" className="hidden" onChange={onFileInput} disabled={isAnalyzing} />
              {isAnalyzing ? (
                <div className="flex flex-col items-center gap-4 px-6 text-center">
                  <Loader2 className="h-9 w-9 animate-spin text-primary" />
                  <div className="space-y-2">
                    {SCAN_STEPS.map((step, idx) => (
                      <div key={step} className="flex items-center gap-2">
                        <div className={cn("h-2 w-2 rounded-full transition-colors", idx <= scanStep ? "bg-primary" : "bg-border")} />
                        <span className={cn("text-xs", idx <= scanStep ? "font-medium text-foreground" : "text-muted-foreground")}>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 px-6 text-center">
                  {isDragging ? (
                    <Microscope className="h-9 w-9 text-primary" />
                  ) : (
                    <Upload className="h-9 w-9 text-muted-foreground transition-colors group-hover:text-primary" />
                  )}
                  <div>
                    <p className="text-sm font-semibold tracking-tight text-foreground">
                      {selectedFile ? selectedFile.name : "Place work in the bay"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {selectedFile ? "Ready to scan — click Run scan below" : "Drop a file or tap to browse"}
                    </p>
                  </div>
                </div>
              )}
            </label>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-border"
                onClick={() => { setSelectedFile(null); setIsDragging(false); }}
                disabled={isAnalyzing || !selectedFile}
              >
                Clear
              </Button>
              <Button
                type="button"
                className="bg-primary hover:bg-primary/90"
                onClick={() => {
                  if (!selectedFile) { toast.error("Select an image first."); return; }
                  analyzeImage(selectedFile);
                }}
                disabled={!canAnalyze}
              >
                <Microscope className="mr-2 h-4 w-4" />
                Run scan
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent className="border border-border bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Lock className="h-4 w-4 text-primary" />
              Upgrade to Pro
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              You're out of scan credits{remainingCredits !== null ? ` (${remainingCredits} left)` : ""}. Upgrade for unlimited scans.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-border bg-secondary p-4 text-sm text-muted-foreground">
            Pro includes unlimited scans, full history, and a learning dashboard.
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" className="border-border" onClick={() => setShowUpgradeModal(false)}>Not now</Button>
            <Button className="bg-primary hover:bg-primary/90" onClick={() => navigate("/pricing")}>
              View plans
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showLoginGate} onOpenChange={setShowLoginGate}>
        <DialogContent className="border border-border bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Your diagnosis is ready</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Create a free account to see your results and track your progress over time.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex flex-col gap-2">
            <Link to="/signup" state={{ pendingReport: pendingNavRef.current }}>
              <Button className="w-full bg-primary hover:bg-primary/90">
                Sign up free — see my results
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login" state={{ pendingReport: pendingNavRef.current }}>
              <Button variant="outline" className="w-full border-border">Already have an account? Log in</Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </EducatorLayout>
  );
};

export default DiagnosticLab;
