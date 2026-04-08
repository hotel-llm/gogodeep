import { useState, useCallback, useRef, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, Link } from "react-router-dom";
import { Upload, Loader2, Microscope, ArrowRight, Lock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import EducatorLayout from "@/components/EducatorLayout";
import { checkScanCredits, SCAN_CACHE_KEY } from "@/lib/supabase";
import { pendingFileStore } from "@/lib/pendingFile";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const SCAN_STEPS = ["Uploading", "Analysis", "Mapping gaps"] as const;

const DiagnosticLab = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [scanStep, setScanStep] = useState(0);
  const [textInput, setTextInput] = useState("");
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

        let processedFile: File | Blob = file;
        let safeMime = file.type === "image/jpg" ? "image/jpeg" : file.type;

        if (file.type === "image/heic" || file.type === "image/heif") {
          try {
            const heic2any = (await import("heic2any")).default;
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
          body: { image: base64, mimeType: safeMime, mode: "guide" },
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

        const topic = (data as any)?.concept_label ?? (data as any)?.question_summary ?? null;

        if (!user?.id) {
          pendingNavRef.current = { imageUrl: url, diagnosis: data };
          setIsAnalyzing(false);
          setScanStep(0);
          setShowLoginGate(true);
          return;
        }

        const [{ data: insertedScan, error: insertError }] = await Promise.all([
          (supabase as any)
            .from("error_logs")
            .insert({ student_id: user.id, subject: "STEM", topic, specific_error_tag: null, error_category: null })
            .select("id")
            .single(),
          (supabase as any).rpc("increment_scan_count", { user_id: user.id }),
        ]);

        if (insertError) {
          console.error("error_logs insert failed:", insertError);
          toast.error(`Scan save failed: ${insertError.message}. Check Supabase RLS policies.`);
        }

        const scanId = insertedScan?.id;
        if (scanId) {
          try {
            localStorage.setItem(
              SCAN_CACHE_KEY(scanId),
              JSON.stringify({ imageBase64: base64, mimeType: file.type, diagnosis: data, mode: "guide" })
            );
          } catch {
            // Storage quota exceeded — history won't be available on this device
          }
        }

        queryClient.invalidateQueries({ queryKey: ["history", "error_logs"] });
        navigate("/report", { state: { imageUrl: url, diagnosis: data, mode: "guide", scanId } });
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

  const analyzeText = useCallback(async () => {
    const trimmed = textInput.trim();
    if (!trimmed) return;

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

      const { data, error } = await supabase.functions.invoke("diagnose-image", {
        body: { text: trimmed, mode: "guide" },
      });

      stepTimers.forEach(clearTimeout);

      if (error) {
        toast.error(`Scan failed: ${(error as any)?.message ?? String(error)}`);
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

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const topic = (data as any)?.concept_label ?? (data as any)?.question_summary ?? null;

      if (!user?.id) {
        pendingNavRef.current = { imageUrl: "", diagnosis: data };
        setIsAnalyzing(false);
        setScanStep(0);
        setShowLoginGate(true);
        return;
      }

      const [{ data: insertedScan, error: insertError }] = await Promise.all([
        (supabase as any)
          .from("error_logs")
          .insert({ student_id: user.id, subject: "STEM", topic, specific_error_tag: null, error_category: null })
          .select("id")
          .single(),
        (supabase as any).rpc("increment_scan_count", { user_id: user.id }),
      ]);

      if (insertError) {
        console.error("error_logs insert failed:", insertError);
      }

      const scanId = insertedScan?.id;
      if (scanId) {
        try {
          localStorage.setItem(
            SCAN_CACHE_KEY(scanId),
            JSON.stringify({ imageBase64: null, mimeType: null, diagnosis: data, mode: "guide" })
          );
        } catch {
          // Storage quota exceeded — history won't be available on this device
        }
      }

      queryClient.invalidateQueries({ queryKey: ["history", "error_logs"] });
      navigate("/report", { state: { imageUrl: null, diagnosis: data, mode: "guide", scanId } });
    } catch (err: unknown) {
      console.error("Text analysis failed:", err);
      toast.error(`Scan failed: ${err instanceof Error ? err.message : String(err)}`);
      setIsAnalyzing(false);
      setScanStep(0);
    }
  }, [textInput, navigate, queryClient]);

  useEffect(() => {
    const file = pendingFileStore.get();
    if (file) {
      pendingFileStore.clear();
      setSelectedFile(file);
      analyzeImage(file);
    }
  }, [analyzeImage]);

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
    analyzeImage(file);
  }, [analyzeImage]);

  const onFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif"].includes(file.type)) {
      toast.error("Unsupported format. Please use JPG, PNG, WebP, or HEIC.");
      return;
    }
    setSelectedFile(file);
    analyzeImage(file);
  }, [analyzeImage]);

  return (
    <EducatorLayout title="Diagnostic Lab" subtitle="Upload a question and we'll guide you through it step by step.">
      <Helmet>
        <title>Diagnostic Lab — AI Scanner for Hard STEM Questions | Gogodeep</title>
        <meta name="description" content="Upload a photo of your exam working or handwritten notes. Gogodeep analyses hard STEM questions, finds your error, and guides you step by step. Supports Physics HL, Math HL AA, AP Calculus BC, and AP Statistics." />
      </Helmet>
      <div className="mx-auto max-w-2xl mt-12" data-feature="ai-scanner-for-hard-stem-questions" data-input-type="handwritten-notes,photo-upload,exam-working">
        <div className="rounded-xl border border-border bg-card">
          <div className="p-5 sm:p-6">
            <label
              aria-label="Upload photo of handwritten notes or exam working for AI analysis"
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
                  <p className="text-sm font-semibold tracking-tight text-foreground">
                    {selectedFile ? selectedFile.name : "Drop a file or tap to browse"}
                  </p>
                </div>
              )}
            </label>

            <div className="mt-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                disabled={isAnalyzing}
                placeholder="Manually enter a difficult problem…"
                rows={3}
                className="w-full resize-none rounded-lg border border-border bg-secondary/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && textInput.trim()) {
                    e.preventDefault();
                    analyzeText();
                  }
                }}
              />
              <Button
                onClick={analyzeText}
                disabled={isAnalyzing || !textInput.trim()}
                className="mt-2 w-full bg-primary hover:bg-primary/90 disabled:opacity-40"
              >
                {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Analyse"}
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
              Out of scan credits
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              You've used all your scans for today{remainingCredits !== null ? ` (${remainingCredits} left)` : ""}. Upgrade to Intermediate or Deep for more scans.
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
            <DialogTitle className="text-foreground">Sign up to save your results</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Create a free account to save your scan and track your progress over time.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex flex-col gap-2">
            <Link to="/signup" state={{ pendingReport: pendingNavRef.current }}>
              <Button className="w-full bg-primary hover:bg-primary/90">
                Sign up free
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
