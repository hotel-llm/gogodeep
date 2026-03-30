import { useMemo, useState, useCallback, useRef } from "react";
import heic2any from "heic2any";
import { useNavigate, Link } from "react-router-dom";
import { Upload, Loader2, Microscope, ArrowRight, Lock, Search, BookOpen } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import EducatorLayout from "@/components/EducatorLayout";
import { checkScanCredits, SCAN_CACHE_KEY } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const SCAN_STEPS = ["Uploading", "Analysis", "Mapping gaps"] as const;

type ScanMode = "guide" | "identify";

const DiagnosticLab = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [scanStep, setScanStep] = useState(0);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showModeDialog, setShowModeDialog] = useState(false);
  const [remainingCredits, setRemainingCredits] = useState<number | null>(null);
  const [showLoginGate, setShowLoginGate] = useState(false);
  const pendingNavRef = useRef<{ imageUrl: string; diagnosis: unknown } | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const analyzeImage = useCallback(
    async (file: File, mode: ScanMode) => {
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

        let processedFile: File | Blob = file;
        let safeMime = file.type === "image/jpg" ? "image/jpeg" : file.type;

        if (file.type === "image/heic" || file.type === "image/heif") {
          try {
            const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
            processedFile = Array.isArray(converted) ? converted[0] : converted;
            safeMime = "image/jpeg";
          } catch {
            toast.error("Could not convert HEIC image. Please export as JPG and try again.");
            setScanStep(0); setIsAnalyzing(false);
            return;
          }
        }

        const url = URL.createObjectURL(processedFile);
        const buffer = await processedFile.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
        );

        const { data, error } = await supabase.functions.invoke("diagnose-image", {
          body: { image: base64, mimeType: safeMime, mode },
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
              : "That doesn't look like a STEM image. Please upload a clear PNG or JPG."
          );
          setIsAnalyzing(false);
          setScanStep(0);
          return;
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        const topic = mode === "guide"
          ? (data as any)?.concept_label ?? (data as any)?.question_summary ?? null
          : (data as any)?.error_tag ?? null;

        const [{ data: insertedScan, error: insertError }] = await Promise.all([
          (supabase as any)
            .from("error_logs")
            .insert({
              student_id: user?.id ?? null,
              subject: "STEM",
              topic,
              specific_error_tag: mode === "identify" ? ((data as any)?.error_tag ?? null) : null,
              error_category: mode === "identify" ? ((data as any)?.error_category ?? null) : null,
            })
            .select("id")
            .single(),
          user?.id
            ? (supabase as any).rpc("increment_scan_count", { user_id: user.id })
            : Promise.resolve(null),
        ]);

        if (insertError) {
          console.error("error_logs insert failed:", insertError);
          toast.error(`Scan save failed: ${insertError.message}. Check Supabase RLS policies.`);
        }

        const scanId = insertedScan?.id;
        if (scanId) {
          localStorage.setItem(
            SCAN_CACHE_KEY(scanId),
            JSON.stringify({ imageBase64: base64, mimeType: file.type, diagnosis: data, mode })
          );
        }

        queryClient.invalidateQueries({ queryKey: ["history", "error_logs"] });

        if (!user?.id) {
          pendingNavRef.current = { imageUrl: url, diagnosis: data };
          setIsAnalyzing(false);
          setScanStep(0);
          setShowLoginGate(true);
          return;
        }

        navigate("/report", { state: { imageUrl: url, diagnosis: data, mode, scanId } });
      } catch (err: unknown) {
        console.error("Analysis failed:", err);
        const msg = err instanceof Error ? err.message : String(err);
        toast.error(`Scan failed: ${msg}`);
        setIsAnalyzing(false);
        setScanStep(0);
      }
    },
    [navigate, queryClient]
  );

  const canAnalyze = useMemo(() => !!selectedFile && !isAnalyzing, [selectedFile, isAnalyzing]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (!["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif"].includes(file.type)) {
      toast.error("Unsupported format. Please use JPG, PNG, WebP, or HEIC.");
      return;
    }
    setSelectedFile(file);
  }, []);

  const onFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif"].includes(file.type)) {
      toast.error("Unsupported format. Please use JPG, PNG, WebP, or HEIC.");
      return;
    }
    setSelectedFile(file);
  }, []);

  const handleRunScan = () => {
    if (!selectedFile) { toast.error("Select an image first."); return; }
    setShowModeDialog(true);
  };

  const handleModeSelect = (mode: ScanMode) => {
    setShowModeDialog(false);
    if (selectedFile) analyzeImage(selectedFile, mode);
  };

  return (
    <EducatorLayout title="Diagnostic Lab" subtitle="Upload a question for us to guide you through, or upload your working on a difficult question for us to identify the error.">
      <div className="mx-auto max-w-2xl mt-12">
        <div className="rounded-xl border border-border bg-card">
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
                      {selectedFile ? selectedFile.name : "Drop a file or tap to browse"}
                    </p>
                    {selectedFile && (
                      <p className="mt-1 text-xs text-muted-foreground">Ready to scan. Click Run scan below.</p>
                    )}
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
                onClick={handleRunScan}
                disabled={!canAnalyze}
              >
                <Microscope className="mr-2 h-4 w-4" />
                Run scan
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mode selection dialog */}
      <Dialog open={showModeDialog} onOpenChange={setShowModeDialog}>
        <DialogContent className="border border-border bg-card sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">What do you need?</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Choose how you want us to analyse your image.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <button
              onClick={() => handleModeSelect("guide")}
              className="flex flex-col items-start gap-3 rounded-xl border border-border bg-secondary/50 p-5 text-left transition-all duration-200 hover:border-primary/60 hover:bg-primary/5"
            >
              <BookOpen className="h-6 w-6 text-primary" />
              <div>
                <p className="font-semibold text-foreground">Guide me</p>
                <p className="mt-1 text-xs text-muted-foreground">I have a question I need help solving step by step.</p>
              </div>
            </button>
            <button
              onClick={() => handleModeSelect("identify")}
              className="flex flex-col items-start gap-3 rounded-xl border border-border bg-secondary/50 p-5 text-left transition-all duration-200 hover:border-primary/60 hover:bg-primary/5"
            >
              <Search className="h-6 w-6 text-primary" />
              <div>
                <p className="font-semibold text-foreground">Find my error</p>
                <p className="mt-1 text-xs text-muted-foreground">I attempted a question and want to know where I went wrong.</p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

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
                Sign up free to see my results
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
