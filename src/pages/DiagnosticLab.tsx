import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, Link } from "react-router-dom";
import { Upload, Loader2, Waves, ArrowRight, Lock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { whaleToast } from "@/lib/whaleToast";
import { Button } from "@/components/ui/button";
import EducatorLayout from "@/components/EducatorLayout";
import { checkScanCredits, SCAN_CACHE_KEY } from "@/lib/supabase";
import { pendingFileStore, scanImageStore } from "@/lib/pendingFile";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const SESSION_REPORT_KEY = "gogodeep_pending_report";

function useUtcResetCountdown() {
  const get = () => {
    const now = new Date();
    const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    const s = Math.floor((midnight.getTime() - now.getTime()) / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h}h ${String(m).padStart(2, "0")}m`;
  };
  const [label, setLabel] = useState(get);
  useEffect(() => { const id = setInterval(() => setLabel(get()), 30000); return () => clearInterval(id); }, []);
  return label;
}
const GUEST_SCAN_KEY = "gogodeep_guest_scan_used";

function WhaleScanLoader({ complete }: { complete: boolean }) {
  return (
    <div className="flex flex-col items-center gap-5 px-6 text-center">
      <img
        src="/whale-e.png"
        alt=""
        className="whale-img h-24 w-24 object-contain"
        style={{ animation: "float 4s ease-in-out infinite" }}
      />
      <div className="w-32 overflow-hidden rounded-full bg-secondary h-1">
        <div
          className="h-full rounded-full bg-primary"
          style={{
            animation: complete
              ? "none"
              : "loading-bar 1.6s ease-in-out infinite",
            width: complete ? "100%" : undefined,
          }}
        />
      </div>
      <p className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">
        Analysing
      </p>
    </div>
  );
}

const COMPLEXITY_KEY = "gogodeep_complexity";
const COMPLEXITY_LABELS = ["", "Simple", "Standard", "Advanced", "Expert"] as const;

const DiagnosticLab = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState("");
  const [complexity, setComplexity] = useState<number>(() => {
    const stored = parseInt(localStorage.getItem(COMPLEXITY_KEY) ?? "2", 10);
    return stored >= 1 && stored <= 4 ? stored : 2;
  });
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [remainingCredits, setRemainingCredits] = useState<number | null>(null);
  const resetCountdown = useUtcResetCountdown();
  const [showLoginGate, setShowLoginGate] = useState(false);
  const pendingNavRef = useRef<{ imageUrl: string; diagnosis: unknown } | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const analyzeImage = useCallback(
    async (file: File, complexityLevel = complexity) => {
      // Check if guest already used their free scan
      const {
        data: { user: preCheckUser },
      } = await supabase.auth.getUser();
      if (!preCheckUser?.id && localStorage.getItem(GUEST_SCAN_KEY)) {
        setShowLoginGate(true);
        return;
      }

      setIsAnalyzing(true);

      try {
        const credits = await checkScanCredits();
        if (!credits.allowed) {
          setIsAnalyzing(false);
          setRemainingCredits(credits.credits);
          setShowUpgradeModal(true);
          return;
        }

        let processedFile: File | Blob = file;
        let safeMime = file.type === "image/jpg" ? "image/jpeg" : file.type;

        if (file.type === "image/heic" || file.type === "image/heif") {
          try {
            const heic2any = (await import("heic2any")).default;
            const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
            processedFile = Array.isArray(converted) ? converted[0] : converted;
            safeMime = "image/jpeg";
          } catch {
            whaleToast.error("Could not convert HEIC image. Please export as JPG and try again.");
            setIsAnalyzing(false);
            return;
          }
        }

        const url = URL.createObjectURL(processedFile);
        const buffer = await processedFile.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
        );

        const { data, error } = await supabase.functions.invoke("diagnose-image", {
          body: { image: base64, mimeType: safeMime, mode: "guide_steps", complexity: complexityLevel },
        });

        if (error) {
          const msg = (error as any)?.message ?? String(error);
          whaleToast.error(`Scan failed: ${msg}`);
          setIsAnalyzing(false);
          return;
        }

        if ((data as any)?.error) {
          whaleToast.error(`Scan failed: ${(data as any).error}`);
          setIsAnalyzing(false);
          return;
        }

        const inputStatus = (data as any)?.input_status as string | undefined;
        if (inputStatus && inputStatus !== "ok") {
          whaleToast.error(
            inputStatus === "blurry"
              ? "Image is too blurry to read. Please retake a clearer photo."
              : "That doesn't look like a STEM image. Please upload a clear PNG or JPG."
          );
          setIsAnalyzing(false);
          return;
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        const topic = (data as any)?.concept_label ?? (data as any)?.question_summary ?? null;

        if (!user?.id) {
          // Guest gets 1 free scan — navigate directly to report, no DB insert
          localStorage.setItem(GUEST_SCAN_KEY, "1");
          window.dispatchEvent(new CustomEvent("whale-scan-done"));
          try {
            sessionStorage.setItem(SESSION_REPORT_KEY, JSON.stringify({ diagnosis: data, mode: "guide", guest: true }));
          } catch { /* ignore */ }
          setScanComplete(true);
          await new Promise((r) => setTimeout(r, 580));
          navigate("/report", { state: { imageUrl: url, diagnosis: data, mode: "guide", guest: true } });
          return;
        }

        const [{ data: insertedScan, error: insertError }] = await Promise.all([
          (supabase as any)
            .from("error_logs")
            .insert({ student_id: user.id, subject: "STEM", topic, specific_error_tag: null, error_category: null, diagnosis: data })
            .select("id")
            .single(),
          (supabase as any).rpc("increment_scan_count", { user_id: user.id }),
        ]);

        if (insertError) {
          console.error("error_logs insert failed:", insertError);
          whaleToast.error(`Scan save failed: ${insertError.message}. Check Supabase RLS policies.`);
        }

        const scanId = insertedScan?.id;
        if (scanId) {
          try {
            localStorage.setItem(SCAN_CACHE_KEY(scanId), JSON.stringify({ diagnosis: data, mode: "guide", imageBase64: base64, mimeType: safeMime }));
          } catch {
            // quota exceeded — Supabase is the fallback
          }
          // Store image in memory so tab-switch doesn't lose the blob URL
          const reader = new FileReader();
          reader.onload = () => { if (reader.result) scanImageStore.set(scanId, reader.result as string); };
          reader.readAsDataURL(processedFile);
        }

        queryClient.invalidateQueries({ queryKey: ["history", "error_logs"] });
        // Persist to sessionStorage — survives tab suspension/restore
        try {
          sessionStorage.setItem(SESSION_REPORT_KEY, JSON.stringify({ diagnosis: data, mode: "guide", scanId }));
        } catch { /* ignore */ }
        setScanComplete(true);
        await new Promise((r) => setTimeout(r, 580));
        navigate("/report", { state: { imageUrl: url, diagnosis: data, mode: "guide", scanId } });
      } catch (err: unknown) {
        console.error("Analysis failed:", err);
        const msg = err instanceof Error ? err.message : String(err);
        whaleToast.error(`Scan failed: ${msg}`);
        setIsAnalyzing(false);
        setScanComplete(false);
      }
    },
    [navigate, queryClient, complexity]
  );

  const analyzeText = useCallback(async () => {
    const trimmed = textInput.trim();
    if (!trimmed) return;

    // Check if guest already used their free scan
    const {
      data: { user: preCheckUser },
    } = await supabase.auth.getUser();
    if (!preCheckUser?.id && localStorage.getItem(GUEST_SCAN_KEY)) {
      setShowLoginGate(true);
      return;
    }

    setIsAnalyzing(true);

    try {
      const credits = await checkScanCredits();
      if (!credits.allowed) {
        setIsAnalyzing(false);
        setRemainingCredits(credits.credits);
        setShowUpgradeModal(true);
        return;
      }

      const { data, error } = await supabase.functions.invoke("diagnose-image", {
        body: { text: trimmed, mode: "guide_steps", complexity },
      });

      if (error) {
        whaleToast.error(`Scan failed: ${(error as any)?.message ?? String(error)}`);
        setIsAnalyzing(false);
        return;
      }

      if ((data as any)?.error) {
        whaleToast.error(`Scan failed: ${(data as any).error}`);
        setIsAnalyzing(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const topic = (data as any)?.concept_label ?? (data as any)?.question_summary ?? null;

      if (!user?.id) {
        // Guest gets 1 free scan — navigate directly to report, no DB insert
        localStorage.setItem(GUEST_SCAN_KEY, "1");
        window.dispatchEvent(new CustomEvent("whale-scan-done"));
        try {
          sessionStorage.setItem(SESSION_REPORT_KEY, JSON.stringify({ diagnosis: data, mode: "guide", guest: true, inputText: trimmed }));
        } catch { /* ignore */ }
        setScanComplete(true);
        await new Promise((r) => setTimeout(r, 580));
        navigate("/report", { state: { imageUrl: null, inputText: trimmed, diagnosis: data, mode: "guide", guest: true } });
        return;
      }

      const [{ data: insertedScan, error: insertError }] = await Promise.all([
        (supabase as any)
          .from("error_logs")
          .insert({ student_id: user.id, subject: "STEM", topic, specific_error_tag: null, error_category: null, diagnosis: data })
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
          localStorage.setItem(SCAN_CACHE_KEY(scanId), JSON.stringify({ diagnosis: data, mode: "guide", inputText: trimmed }));
        } catch {
          // quota exceeded — Supabase is the fallback
        }
      }

      queryClient.invalidateQueries({ queryKey: ["history", "error_logs"] });
      // Persist to sessionStorage — survives tab suspension/restore
      try {
        sessionStorage.setItem(SESSION_REPORT_KEY, JSON.stringify({ diagnosis: data, mode: "guide", scanId, inputText: trimmed }));
      } catch { /* ignore */ }
      setScanComplete(true);
      await new Promise((r) => setTimeout(r, 580));
      navigate("/report", { state: { imageUrl: null, inputText: trimmed, diagnosis: data, mode: "guide", scanId } });
    } catch (err: unknown) {
      console.error("Text analysis failed:", err);
      whaleToast.error(`Scan failed: ${err instanceof Error ? err.message : String(err)}`);
      setIsAnalyzing(false);
      setScanComplete(false);
    }
  }, [textInput, navigate, queryClient, complexity]);

  useEffect(() => {
    const file = pendingFileStore.get();
    if (file) {
      pendingFileStore.clear();
      setSelectedFile(file);
      analyzeImage(file);
    }
  }, [analyzeImage]);

  // Accept drops anywhere on the page
  useEffect(() => {
    const TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif"];
    const onOver = (e: DragEvent) => e.preventDefault();
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (isAnalyzing) return;
      const file = e.dataTransfer?.files[0];
      if (!file) return;
      if (!TYPES.includes(file.type)) { whaleToast.error("Unsupported format. Please use JPG, PNG, WebP, or HEIC."); return; }
      setSelectedFile(file);
      analyzeImage(file);
    };
    document.addEventListener("dragover", onOver);
    document.addEventListener("drop", onDrop);
    return () => {
      document.removeEventListener("dragover", onOver);
      document.removeEventListener("drop", onDrop);
    };
  }, [isAnalyzing, analyzeImage]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (!["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif"].includes(file.type)) {
      whaleToast.error("Unsupported format. Please use JPG, PNG, WebP, or HEIC.");
      return;
    }
    setSelectedFile(file);
    analyzeImage(file);
  }, [analyzeImage]);

  const onFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif"].includes(file.type)) {
      whaleToast.error("Unsupported format. Please use JPG, PNG, WebP, or HEIC.");
      return;
    }
    setSelectedFile(file);
    analyzeImage(file);
  }, [analyzeImage]);

  return (
    <EducatorLayout title="Workspace" subtitle="Upload a question and you will understand it within minutes." noSidebar>
      <Helmet>
        <title>Workspace</title>
        <meta name="description" content="Upload a photo of your exam working or handwritten notes. Gogodeep analyses hard STEM questions, finds your error, and guides you step by step. Supports Physics HL, Math HL AA, AP Calculus BC, and AP Statistics." />
        <link rel="canonical" href="https://gogodeep.com/workspace" />
      </Helmet>
      <div className="mx-auto max-w-2xl mt-12" data-feature="ai-scanner-for-hard-stem-questions" data-input-type="handwritten-notes,photo-upload,exam-working">
        <div className="flex justify-end mb-2">
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              Complexity <span className="inline-block w-16 text-right text-primary font-semibold">{COMPLEXITY_LABELS[complexity]}</span>
              <span className="group relative">
                <span className="flex h-3.5 w-3.5 cursor-default items-center justify-center rounded-full border border-muted-foreground/40 text-[9px] font-bold text-muted-foreground/60 leading-none select-none">?</span>
                <span className="pointer-events-none absolute right-0 top-5 z-50 w-48 rounded-lg border border-border bg-card px-3 py-2 text-[11px] leading-relaxed text-muted-foreground opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                  Controls how technical the explanations are.
                </span>
              </span>
            </span>
            <input
              type="range"
              min={1}
              max={4}
              step={1}
              value={complexity}
              disabled={isAnalyzing}
              onChange={(e) => {
                const v = Number(e.target.value);
                setComplexity(v);
                localStorage.setItem(COMPLEXITY_KEY, String(v));
              }}
              className="w-24 accent-primary disabled:cursor-not-allowed"
            />
          </div>
        </div>
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
                <WhaleScanLoader complete={scanComplete} />
              ) : (
                <div className="flex flex-col items-center gap-4 px-6 text-center">
                  {isDragging ? (
                    <Waves className="h-9 w-9 text-primary" />
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
        <DialogContent className="border border-border bg-card sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground text-base">All 3 scans used for today</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Your free scans reset in <span className="font-medium text-foreground">{resetCountdown}</span>. Go Deep for unlimited scans — no daily cap.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex items-center justify-between">
            <button className="text-xs text-muted-foreground hover:text-foreground transition-colors" onClick={() => setShowUpgradeModal(false)}>
              Wait for reset
            </button>
            <Button className="bg-primary hover:bg-primary/90" onClick={() => { setShowUpgradeModal(false); navigate("/pricing"); }}>
              Go Deep
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showLoginGate} onOpenChange={setShowLoginGate}>
        <DialogContent className="border border-border bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Sign up to keep going</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              It only takes 10 seconds. Sign up free to save this scan and keep going.
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
