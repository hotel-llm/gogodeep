import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Camera, Microscope, Route, ArrowRight, ScanLine, Zap, TriangleAlert, BookOpen, TrendingUp, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import PageTransition from "@/components/PageTransition";
import gogodeepLogo from "@/assets/gogodeep-logo.png";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

const steps = [
  { icon: Camera, step: "01", title: "Capture", desc: "Snap a photo of notebook, worksheet, or board work." },
  { icon: Microscope, step: "02", title: "Diagnose", desc: "Gogodeep finds the issue and reveals the underlying concept." },
  { icon: Route, step: "03", title: "Repair", desc: "Students complete targeted practice to repair their gap." },
];

// ─── Dashboard ────────────────────────────────────────────────────────────────

type ErrorLog = {
  error_category: string | null;
  specific_error_tag: string | null;
  topic: string | null;
};

type DashboardData = {
  totalScans: number;
  scanCredits: number | null;
  conceptualCount: number;
  proceduralCount: number;
  topTags: { tag: string; count: number }[];
  recentTopics: string[];
};

const Dashboard = ({ user }: { user: User }) => {
  const username = user.user_metadata?.username ?? user.email?.split("@")[0] ?? "there";
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [logsRes, profileRes] = await Promise.all([
        (supabase as any).from("error_logs").select("error_category, specific_error_tag, topic").eq("student_id", user.id),
        (supabase as any).from("profiles").select("scan_credits").eq("id", user.id).single(),
      ]);

      const logs: ErrorLog[] = logsRes.data ?? [];
      const scanCredits = profileRes.data?.scan_credits ?? null;

      const conceptualCount = logs.filter((l) => l.error_category?.toLowerCase() === "conceptual").length;
      const proceduralCount = logs.filter((l) => l.error_category?.toLowerCase() !== "conceptual").length;

      const tagCounts: Record<string, number> = {};
      for (const l of logs) {
        const tag = l.specific_error_tag ?? l.topic;
        if (tag) tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
      }
      const topTags = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([tag, count]) => ({ tag, count }));

      const recentTopics = logs
        .map((l) => l.topic)
        .filter(Boolean)
        .slice(-3)
        .reverse() as string[];

      setData({ totalScans: logs.length, scanCredits, conceptualCount, proceduralCount, topTags, recentTopics });
      setLoading(false);
    };
    load();
  }, [user.id]);

  const conceptualPct = data && data.totalScans > 0 ? Math.round((data.conceptualCount / data.totalScans) * 100) : 0;
  const proceduralPct = data && data.totalScans > 0 ? Math.round((data.proceduralCount / data.totalScans) * 100) : 0;

  return (
    <PageTransition>
      <div className="relative z-10 min-h-screen pt-14">
        <div className="container py-10">

          {/* Header */}
          <div className="mb-8 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Dashboard</p>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-foreground">
                Welcome back, {username}
              </h1>
            </div>
            <Link to="/lab">
              <Button className="mt-4 h-10 gap-2 bg-primary px-6 text-sm font-semibold hover:bg-primary/90 sm:mt-0">
                <ScanLine className="h-4 w-4" />
                New Scan
              </Button>
            </Link>
          </div>

          {/* Stat cards */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-border bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Total Scans</p>
              <p className="mt-2 text-4xl font-extrabold text-foreground">
                {loading ? "—" : data?.totalScans ?? 0}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">All-time diagnoses run</p>
            </Card>

            <Card className="border-border bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Credits Left</p>
              <p className="mt-2 text-4xl font-extrabold text-foreground">
                {loading ? "—" : data?.scanCredits ?? 0}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Remaining scan credits</p>
            </Card>

            <Card className="border-border bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Conceptual Gaps</p>
              <p className="mt-2 text-4xl font-extrabold text-destructive">
                {loading ? "—" : data?.conceptualCount ?? 0}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Require concept re-teaching</p>
            </Card>

            <Card className="border-border bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Procedural Slips</p>
              <p className="mt-2 text-4xl font-extrabold" style={{ color: "hsl(var(--signal-yellow))" }}>
                {loading ? "—" : data?.proceduralCount ?? 0}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Process correction needed</p>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">

            {/* Error breakdown */}
            <Card className="border-border bg-card p-6">
              <div className="mb-5 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Error Breakdown</p>
              </div>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="h-3 w-32 rounded bg-secondary animate-pulse" />
                      <div className="h-2.5 w-full rounded-full bg-secondary animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : data?.totalScans === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <BookOpen className="h-8 w-8 text-muted-foreground/40" />
                  <p className="mt-3 text-sm text-muted-foreground">No scans yet — run your first diagnosis to see your breakdown.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 font-medium text-foreground">
                        <TriangleAlert className="h-3.5 w-3.5 text-destructive" /> Conceptual
                      </span>
                      <span className="text-muted-foreground">{data.conceptualCount} ({conceptualPct}%)</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-destructive transition-all duration-700"
                        style={{ width: `${conceptualPct}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 font-medium text-foreground">
                        <Zap className="h-3.5 w-3.5" style={{ color: "hsl(var(--signal-yellow))" }} /> Procedural
                      </span>
                      <span className="text-muted-foreground">{data.proceduralCount} ({proceduralPct}%)</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${proceduralPct}%`, background: "hsl(var(--signal-yellow))" }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">Credits used</span>
                      <span className="text-muted-foreground">{data.totalScans} scans</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                      {data.scanCredits !== null && (
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-700"
                          style={{
                            width: `${Math.round((data.totalScans / (data.totalScans + data.scanCredits)) * 100)}%`,
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Top error tags */}
            <Card className="border-border bg-card p-6">
              <div className="mb-5 flex items-center gap-2">
                <Microscope className="h-4 w-4 text-primary" />
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Top Blindspots</p>
              </div>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 w-full rounded-lg bg-secondary animate-pulse" />
                  ))}
                </div>
              ) : !data?.topTags.length ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <BookOpen className="h-8 w-8 text-muted-foreground/40" />
                  <p className="mt-3 text-sm text-muted-foreground">Your most common error patterns will appear here after your first scan.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.topTags.map(({ tag, count }, i) => (
                    <div key={tag} className="flex items-center justify-between rounded-lg border border-border bg-secondary px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-muted-foreground">#{i + 1}</span>
                        <span className="text-sm font-medium text-foreground">{tag}</span>
                      </div>
                      <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        {count}×
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* CTA if no scans */}
          {!loading && data?.totalScans === 0 && (
            <Card className="mt-6 border-border bg-card p-8 text-center">
              <Microscope className="mx-auto h-10 w-10 text-primary/60" />
              <h2 className="mt-4 text-xl font-bold tracking-tight text-foreground">Run your first scan</h2>
              <p className="mt-2 text-sm text-muted-foreground">Upload a photo of student work and get an instant misconception report.</p>
              <Link to="/lab" className="mt-6 inline-block">
                <Button className="gap-2 bg-primary hover:bg-primary/90">
                  <ArrowRight className="h-4 w-4" />
                  Go to Diagnostic Lab
                </Button>
              </Link>
            </Card>
          )}

        </div>
      </div>
    </PageTransition>
  );
};

// ─── Landing page ─────────────────────────────────────────────────────────────

const PRACTICE_QS = [
  "Evaluate ∫x·sin(x) dx using the correct technique. Show all working.",
  "Find ∫x²·eˣ dx. Identify which method applies before starting.",
  "Calculate ∫ln(x) dx step by step, stating each step clearly.",
  "Solve ∫x·cos(2x) dx. What is the key decision at the first step?",
];

const DemoPanel = () => {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const durations = [1800, 2400, 1400, 7500];
    const t = setTimeout(() => setPhase((p) => (p + 1) % 4), durations[phase]);
    return () => clearTimeout(t);
  }, [phase]);

  return (
    <div className="relative h-[480px] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
      {/* Fake window chrome */}
      <div className="flex items-center gap-1.5 border-b border-border bg-secondary/50 px-4 py-3">
        <div className="h-2.5 w-2.5 rounded-full bg-destructive/50" />
        <div className="h-2.5 w-2.5 rounded-full" style={{ background: "hsl(var(--signal-yellow) / 0.5)" }} />
        <div className="h-2.5 w-2.5 rounded-full" style={{ background: "hsl(var(--signal-green) / 0.5)" }} />
        <span className="ml-3 text-xs text-muted-foreground">Diagnostic Lab — live demo</span>
      </div>

      <div className="relative h-[calc(100%-41px)]">
        {/* Phase 0: idle drop zone */}
        {phase === 0 && (
          <div className="flex h-full items-center justify-center p-8">
            <div className="flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border/50 py-14 text-center">
              <Upload className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">Drop your working here</p>
              <p className="text-xs text-muted-foreground/50">PNG or JPG · any subject</p>
            </div>
          </div>
        )}

        {/* Phase 1: paper sliding in */}
        {phase === 1 && (
          <div className="flex h-full items-center justify-center p-8">
            <div className="animate-slide-in-paper w-64 rounded-xl bg-amber-50 p-5 shadow-xl">
              <div className="mb-3 h-3 w-2/3 rounded bg-gray-600" />
              <div className="space-y-2">
                <div className="h-2 w-full rounded bg-gray-300" />
                <div className="h-2 w-5/6 rounded bg-gray-300" />
                <div className="mt-3 flex items-center gap-1.5">
                  <div className="h-2 w-8 rounded bg-gray-500" />
                  <div className="h-2 w-3 rounded bg-gray-400" />
                  <div className="h-2 w-10 rounded bg-gray-500" />
                  <div className="h-2 w-3 rounded bg-gray-400" />
                  <div className="h-2 w-6 rounded bg-gray-500" />
                </div>
                <div className="h-2 w-4/5 rounded bg-gray-300" />
                <div className="h-2 w-full rounded bg-gray-300" />
                <div className="mt-3 flex items-center gap-1.5">
                  <div className="h-2 w-5 rounded bg-gray-400" />
                  <div className="h-2 w-2 rounded bg-gray-400" />
                  <div className="h-2 w-12 rounded bg-gray-500" />
                </div>
                <div className="mt-1 h-4 w-20 rounded bg-gray-700" />
                <div className="h-2 w-3/5 rounded bg-gray-300" />
              </div>
            </div>
          </div>
        )}

        {/* Phase 2: scanning */}
        {phase === 2 && (
          <div className="relative flex h-full items-center justify-center p-8">
            <div className="w-64 rounded-xl bg-amber-50 p-5 opacity-60 shadow-xl">
              <div className="mb-3 h-3 w-2/3 rounded bg-gray-400" />
              <div className="space-y-2">
                <div className="h-2 w-full rounded bg-gray-200" />
                <div className="h-2 w-5/6 rounded bg-gray-200" />
                <div className="mt-3 flex items-center gap-1.5">
                  <div className="h-2 w-8 rounded bg-gray-300" />
                  <div className="h-2 w-10 rounded bg-gray-300" />
                </div>
                <div className="h-2 w-4/5 rounded bg-gray-200" />
                <div className="h-2 w-full rounded bg-gray-200" />
                <div className="mt-3 h-4 w-20 rounded bg-gray-400" />
              </div>
            </div>
            <div
              className="animate-scan-sweep absolute inset-x-6 h-px"
              style={{ background: "hsl(var(--primary))", boxShadow: "0 0 10px 2px hsl(var(--primary) / 0.5)" }}
            />
            <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2 rounded-lg border border-border bg-card/90 px-3 py-2 backdrop-blur-sm">
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Analysing misconception…</span>
            </div>
          </div>
        )}

        {/* Phase 3: results */}
        {phase === 3 && (
          <div className="animate-fade-up flex h-full flex-col p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded-full border border-destructive/20 bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">
                Conceptual Gap
              </span>
              <span className="text-xs text-muted-foreground">Integration · Calculus</span>
            </div>
            <p className="mb-1 text-sm font-bold text-foreground">Integration by Parts — wrong method applied</p>
            <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
              Student used u-substitution on ∫x·eˣdx. The product of two unrelated functions signals integration by parts, not substitution.
            </p>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Targeted practice</p>
            <div className="flex-1 space-y-2 overflow-y-auto pr-1">
              {PRACTICE_QS.map((q, i) => (
                <div key={i} className="flex gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <span className="mt-0.5 shrink-0 text-xs font-bold text-primary">{i + 1}.</span>
                  <span className="text-xs leading-relaxed text-foreground">{q}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Landing = () => {
  const logoRef = useRef<HTMLDivElement>(null);
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!logoRef.current) return;
      const rect = logoRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxOffset = 6;
      const factor = Math.min(dist / 300, 1);
      setEyeOffset({
        x: (dx / (dist || 1)) * maxOffset * factor,
        y: (dy / (dist || 1)) * maxOffset * factor,
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <PageTransition>
      <div className="relative z-10 min-h-screen pt-14">

        {/* ── Hero ── */}
        <section className="container py-14 md:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="grid items-center gap-12 lg:grid-cols-2">

              {/* Left */}
              <div className="flex flex-col items-start">
                <Link to="/lab" className="relative mb-8 inline-block">
                  <div
                    ref={logoRef}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    className="relative cursor-pointer"
                    style={{ width: 100, height: 100, transform: isHovered ? "scale(1.12)" : "scale(1)", transition: "transform 0.3s ease" }}
                  >
                    <div
                      className="absolute inset-0 rounded-full transition-all duration-500"
                      style={{
                        background: isHovered
                          ? "radial-gradient(circle, hsl(225 75% 55% / 0.5) 0%, transparent 70%)"
                          : "radial-gradient(circle, hsl(225 75% 55% / 0.15) 0%, transparent 70%)",
                        transform: isHovered ? "scale(1.6)" : "scale(1.2)",
                        filter: isHovered ? "blur(20px)" : "blur(12px)",
                      }}
                    />
                    <img
                      src={gogodeepLogo}
                      alt="Gogodeep logo"
                      className="relative z-10 h-full w-full object-contain"
                      style={{
                        animation: "float 4s ease-in-out infinite",
                        transform: `translate(${eyeOffset.x * 0.3}px, ${eyeOffset.y * 0.3}px)`,
                      }}
                    />
                    <div
                      className="absolute -bottom-8 left-1/2 -translate-x-1/2 transition-all duration-300"
                      style={{ opacity: isHovered ? 1 : 0, transform: `translateX(-50%) translateY(${isHovered ? "0px" : "4px"})` }}
                    >
                      <span className="whitespace-nowrap rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                        Try now
                      </span>
                    </div>
                  </div>
                </Link>

                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Diagnostic Teaching</p>
                <h1 className="mt-4 text-5xl font-extrabold tracking-tight text-foreground md:text-6xl">
                  Fix the thinking,<br />not just the answer.
                </h1>
                <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
                  Turn handwritten work into instant insight so you can fix root misconceptions faster.
                </p>
                <div className="mt-8">
                  <Link to="/signup">
                    <Button className="h-12 px-8 text-base font-semibold bg-primary hover:bg-primary/90">
                      Get Started Free
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Right — live demo */}
              <DemoPanel />
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="container pb-24">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-10 text-center text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">How it works</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {steps.map(({ icon: Icon, step, title, desc }) => (
                <Card key={step} className="border border-border bg-card p-8 transition-colors hover:bg-accent/50">
                  <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-secondary text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">{step}</p>
                  <h3 className="mt-2 text-xl font-bold tracking-tight text-foreground">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <footer className="border-t border-border">
          <div className="container flex flex-col items-center justify-between gap-3 py-8 text-sm text-muted-foreground md:flex-row">
            <p>Built for students, teachers, and schools.</p>
            <Link to="/pricing" className="font-medium text-primary hover:underline">Pricing</Link>
          </div>
        </footer>
      </div>
    </PageTransition>
  );
};

// ─── Root ─────────────────────────────────────────────────────────────────────

const Home = () => {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (user === undefined) return null; // brief auth check

  return user ? <Dashboard user={user} /> : <Landing />;
};

export default Home;
