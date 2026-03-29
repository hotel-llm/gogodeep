import { Link, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Camera, Microscope, Route, ArrowRight, ScanLine, TriangleAlert, BookOpen, TrendingUp, Upload, Loader2, Flame, ChevronRight, BrainCircuit, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import PageTransition from "@/components/PageTransition";
import gogodeepLogo from "@/assets/gogodeep-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { SCAN_LIMITS } from "@/lib/supabase";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

const steps = [
  { icon: Camera, step: "01", title: "Capture", desc: "Snap a photo of notebook, worksheet, or board work." },
  { icon: Microscope, step: "02", title: "Diagnose", desc: "Gogodeep finds the issue and reveals the underlying concept." },
  { icon: Route, step: "03", title: "Repair", desc: "Students complete targeted practice to repair their gap." },
];

// ─── Dashboard ────────────────────────────────────────────────────────────────

type ErrorLog = {
  id: string;
  error_category: string | null;
  specific_error_tag: string | null;
  topic: string | null;
  created_at: string | null;
};

type DashboardData = {
  totalScans: number;
  creditsLeft: number | null;
  plan: string;
  conceptualCount: number;
  conceptsLearned: number;
  topTags: { tag: string; count: number }[];
  recentTopics: string[];
  recentScans: { id: string; label: string; created_at: string | null }[];
  loginStreak: number;
  bonusScans: number;
};

function useUtcResetCountdown() {
  const getSecondsLeft = () => {
    const now = new Date();
    const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    return Math.floor((midnight.getTime() - now.getTime()) / 1000);
  };
  const [secs, setSecs] = useState(getSecondsLeft);
  useEffect(() => {
    const id = setInterval(() => setSecs(getSecondsLeft()), 1000);
    return () => clearInterval(id);
  }, []);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

type QuizQuestion = {
  topic: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
};

type QuizState = {
  questions: QuizQuestion[];
  current: number;
  selected: number | null;
  score: number;
  finished: boolean;
};

const Dashboard = ({ user }: { user: User }) => {
  const username = user.user_metadata?.username ?? user.email?.split("@")[0] ?? "there";
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const resetCountdown = useUtcResetCountdown();
  const location = useLocation();

  // Show success toast when redirected back from Stripe
  useEffect(() => {
    if (new URLSearchParams(location.search).get("upgraded") === "1") {
      toast.success("Plan activated. Enjoy your upgraded scans!");
      window.history.replaceState({}, "", "/");
    }
  }, [location.search]);

  useEffect(() => {
    const load = async () => {
      const [logsRes, profileRes] = await Promise.all([
        (supabase as any).from("error_logs").select("id, error_category, specific_error_tag, topic, created_at").eq("student_id", user.id).order("created_at", { ascending: false }),
        (supabase as any).from("profiles").select("daily_scan_count, scan_reset_date, plan, login_streak, last_login_date, bonus_scans").eq("id", user.id).single(),
      ]);

      const logs: ErrorLog[] = logsRes.data ?? [];
      const plan: string = profileRes.data?.plan ?? "free";
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      const isNewDay = (profileRes.data?.scan_reset_date ?? "") < today;
      if (isNewDay) {
        await (supabase as any).from("profiles").update({ daily_scan_count: 0, scan_reset_date: today }).eq("id", user.id);
      }
      const used = isNewDay ? 0 : (profileRes.data?.daily_scan_count ?? 0);
      let bonusScans: number = profileRes.data?.bonus_scans ?? 0;
      const limit = SCAN_LIMITS[plan] ?? SCAN_LIMITS.free;

      // Streak logic
      const lastLogin: string = profileRes.data?.last_login_date ?? "";
      let loginStreak: number = profileRes.data?.login_streak ?? 0;
      if (lastLogin < today) {
        loginStreak = lastLogin === yesterday ? loginStreak + 1 : 1;
        const streakUpdates: Record<string, unknown> = { last_login_date: today, login_streak: loginStreak };
        if (loginStreak >= 7) {
          bonusScans += 5;
          streakUpdates.login_streak = 0;
          streakUpdates.bonus_scans = bonusScans;
          toast.success("7-day streak! You've earned 5 bonus credits.");
          // keep loginStreak at 7 locally so the bar displays complete
        }
        await (supabase as any).from("profiles").update(streakUpdates).eq("id", user.id);
      }

      const creditsLeft = limit === null ? null : Math.max(0, limit - used) + bonusScans;

      const conceptualCount = logs.filter((l) => l.error_category?.toLowerCase() === "conceptual").length;
      const conceptsLearned = new Set(logs.map((l) => l.topic).filter(Boolean)).size;

      const tagCounts: Record<string, number> = {};
      for (const l of logs) {
        const tag = l.specific_error_tag ?? l.topic;
        if (tag) tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
      }
      const topTags = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([tag, count]) => ({ tag, count }));

      const recentTopics = logs.map((l) => l.topic).filter(Boolean).slice(0, 3) as string[];

      const recentScans = logs.slice(0, 8).map((l) => ({
        id: l.id,
        label: l.specific_error_tag ?? l.topic ?? "Unnamed scan",
        created_at: l.created_at,
      }));

      setData({ totalScans: logs.length, creditsLeft, plan, conceptualCount, conceptsLearned, topTags, recentTopics, recentScans, loginStreak, bonusScans });
      setLoading(false);
    };
    load();
  }, [user.id]);

  const startQuiz = async () => {
    const topics = (data?.topTags?.length ? data.topTags.map((t) => t.tag) : data?.recentScans?.map((s) => s.label)) ?? [];
    if (!topics.length) { toast.error("Run some scans first to generate a quiz."); return; }
    setQuizLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("generate-quiz", { body: { topics: topics.slice(0, 5) } });
      if (error || result?.error) throw new Error(error?.message ?? result?.error);
      setQuiz({ questions: result.questions, current: 0, selected: null, score: 0, finished: false });
    } catch (e) {
      toast.error("Failed to generate quiz. Try again.");
    } finally {
      setQuizLoading(false);
    }
  };

  const selectAnswer = (i: number) => {
    if (!quiz || quiz.selected !== null) return;
    setQuiz((q) => ({ ...q!, selected: i }));
  };

  const nextQuestion = () => {
    setQuiz((q) => {
      if (!q) return q;
      const correct = q.selected === q.questions[q.current].correct;
      const newScore = q.score + (correct ? 1 : 0);
      const isLast = q.current === q.questions.length - 1;
      return { ...q, score: newScore, current: isLast ? q.current : q.current + 1, selected: null, finished: isLast };
    });
  };

  const conceptualPct = data && data.totalScans > 0 ? Math.round((data.conceptualCount / data.totalScans) * 100) : 0;

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
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Credits Left</p>
                {!loading && data?.plan !== "deep" ? (
                  <Link to="/pricing" className="shrink-0 text-[10px] font-semibold text-primary hover:underline">Upgrade →</Link>
                ) : !loading ? (
                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary capitalize">{data?.plan}</span>
                ) : null}
              </div>
              <p className="mt-2 text-4xl font-extrabold text-foreground">
                {loading ? "—" : data?.creditsLeft === null ? "∞" : data?.creditsLeft}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {data?.creditsLeft === null ? "Unlimited scans" : `of ${SCAN_LIMITS[data?.plan ?? "free"] ?? SCAN_LIMITS.free} daily · resets in ${resetCountdown}`}
              </p>
            </Card>

            <Card className="border-border bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Conceptual Gaps</p>
              <p className="mt-2 text-4xl font-extrabold text-destructive">
                {loading ? "—" : data?.conceptualCount ?? 0}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Require concept re-teaching</p>
            </Card>

            <Card className="border-border bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Concepts Learned</p>
              <p className="mt-2 text-4xl font-extrabold" style={{ color: "hsl(var(--signal-green))" }}>
                {loading ? "—" : data?.conceptsLearned ?? 0}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Unique topics diagnosed</p>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">

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
                  <p className="mt-3 text-sm text-muted-foreground">No scans yet. Run your first diagnosis to see your breakdown.</p>
                  <Link to="/lab" className="mt-4 inline-block">
                    <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90">
                      <ScanLine className="h-3.5 w-3.5" />
                      Run your first scan
                    </Button>
                  </Link>
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
                        <BookOpen className="h-3.5 w-3.5" style={{ color: "hsl(var(--signal-green))" }} /> Concepts Learned
                      </span>
                      <span className="text-muted-foreground">{data.conceptsLearned} unique topics</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: data.totalScans > 0 ? `${Math.min(Math.round((data.conceptsLearned / data.totalScans) * 100), 100)}%` : "0%",
                          background: "hsl(var(--signal-green))",
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">Credits used</span>
                      <span className="text-muted-foreground">{data.totalScans} scans</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                      {data.creditsLeft !== null && (
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-700"
                          style={{
                            width: `${Math.round((data.totalScans / (data.totalScans + data.creditsLeft)) * 100)}%`,
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Previous Concepts */}
            <Card className="border-border bg-card p-6">
              <div className="mb-5 flex items-center gap-2">
                <Microscope className="h-4 w-4 text-primary" />
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Previous Concepts</p>
              </div>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 w-full rounded-lg bg-secondary animate-pulse" />
                  ))}
                </div>
              ) : !data?.recentScans.length ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <BookOpen className="h-8 w-8 text-muted-foreground/40" />
                  <p className="mt-3 text-sm text-muted-foreground">Concepts from your scans will appear here.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.recentScans.map((scan) => (
                    <Link key={scan.id} to="/lab" className="flex items-center justify-between rounded-lg border border-border bg-secondary px-4 py-3 hover:bg-accent transition-colors">
                      <span className="text-sm font-medium text-foreground truncate">{scan.label}</span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground ml-2" />
                    </Link>
                  ))}
                </div>
              )}
            </Card>

            {/* Recap Quiz */}
            <Card className="border-border bg-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="h-4 w-4 text-primary" />
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Recap Quiz</p>
                </div>
                {quiz && !quiz.finished && (
                  <span className="text-xs text-muted-foreground">{quiz.current + 1} / {quiz.questions.length}</span>
                )}
              </div>

              {!quiz ? (
                <div className="flex flex-col items-center gap-3 py-4 text-center">
                  <p className="text-sm text-muted-foreground">Test yourself on your previous concepts.</p>
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/90"
                    onClick={startQuiz}
                    disabled={quizLoading || loading || !data?.totalScans}
                  >
                    {quizLoading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                    {quizLoading ? "Generating..." : "Start Quiz"}
                  </Button>
                </div>
              ) : quiz.finished ? (
                <div className="flex flex-col items-center gap-3 py-4 text-center">
                  <p className="text-2xl font-extrabold text-foreground">{quiz.score} / {quiz.questions.length}</p>
                  <p className="text-sm text-muted-foreground">
                    {quiz.score === quiz.questions.length ? "Perfect score!" : quiz.score >= quiz.questions.length / 2 ? "Good work. Keep going." : "Keep practising. You'll get there."}
                  </p>
                  <Button size="sm" variant="outline" className="border-border mt-1" onClick={() => setQuiz(null)}>
                    Try again
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-primary mb-2">{quiz.questions[quiz.current].topic}</p>
                    <p className="text-sm font-medium text-foreground">{quiz.questions[quiz.current].question}</p>
                  </div>
                  <div className="space-y-2">
                    {quiz.questions[quiz.current].options.map((opt, i) => {
                      const answered = quiz.selected !== null;
                      const isCorrect = i === quiz.questions[quiz.current].correct;
                      const isSelected = i === quiz.selected;
                      return (
                        <button
                          key={i}
                          onClick={() => selectAnswer(i)}
                          disabled={answered}
                          className={`flex items-center gap-2 w-full rounded-lg border px-4 py-2.5 text-left text-sm transition-colors ${
                            !answered
                              ? "border-border bg-secondary hover:border-primary/50 hover:bg-accent"
                              : isCorrect
                              ? "border-green-500/50 bg-green-500/10 text-foreground"
                              : isSelected
                              ? "border-destructive/50 bg-destructive/10 text-foreground"
                              : "border-border bg-secondary text-muted-foreground"
                          }`}
                        >
                          {answered && isCorrect && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />}
                          {answered && isSelected && !isCorrect && <XCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />}
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  {quiz.selected !== null && (
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground">{quiz.questions[quiz.current].explanation}</p>
                      <div className="flex justify-end">
                        <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={nextQuestion}>
                          {quiz.current === quiz.questions.length - 1 ? "Finish" : "Next"}
                          <ArrowRight className="ml-2 h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* Streaks */}
          <Card className="mt-6 border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <Flame className="h-4 w-4 text-primary" />
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Login Streak</p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-extrabold text-foreground">
                  {loading ? "—" : data?.loginStreak ?? 0}
                  <span className="ml-1 text-base font-medium text-muted-foreground">/ 7 days</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {loading ? "" : (data?.loginStreak ?? 0) >= 7
                    ? "Streak complete! 5 bonus credits awarded."
                    : `${7 - (data?.loginStreak ?? 0)} more day${7 - (data?.loginStreak ?? 0) === 1 ? "" : "s"} to earn 5 bonus credits`}
                </p>
              </div>
              {!loading && (data?.bonusScans ?? 0) > 0 && (
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  +{data?.bonusScans} bonus
                </span>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2.5 flex-1 rounded-full transition-colors ${
                    i === 6
                      ? i < (data?.loginStreak ?? 0)
                        ? "bg-yellow-400"
                        : "bg-yellow-400/20"
                      : i < (data?.loginStreak ?? 0)
                      ? "bg-primary"
                      : "bg-secondary"
                  }`}
                />
              ))}
            </div>
          </Card>

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

const PHYSICS_QS = [
  "A ball is projected at 30° to the horizontal at 20 m/s. Calculate the maximum height reached.",
  "Find the horizontal range of a projectile launched at 45° with initial speed 15 m/s. Ignore air resistance.",
  "At what launch angle is horizontal range maximised? Explain using horizontal and vertical components.",
  "A stone is thrown horizontally from a 75 m cliff at 12 m/s. Find the time of flight and landing distance.",
];

const DemoPanel = () => {
  const [phase, setPhase] = useState(0);
  const [slide, setSlide] = useState(0); // 0 = math, 1 = physics

  useEffect(() => {
    const durations = [1800, 2400, 1400, 7500];
    const t = setTimeout(() => {
      const next = (phase + 1) % 4;
      setPhase(next);
      if (next === 0) setSlide((s) => (s + 1) % 2);
    }, durations[phase]);
    return () => clearTimeout(t);
  }, [phase]);

  const fileName = slide === 0 ? "Math AA Mock Test 2.JPG" : "Physics AS Forces Practice.jpg";

  return (
    <div className="relative h-[480px] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
      {/* Fake window chrome */}
      <div className="flex items-center gap-1.5 border-b border-border bg-secondary/50 px-4 py-3">
        <div className="h-2.5 w-2.5 rounded-full bg-destructive/50" />
        <div className="h-2.5 w-2.5 rounded-full" style={{ background: "hsl(var(--signal-yellow) / 0.5)" }} />
        <div className="h-2.5 w-2.5 rounded-full" style={{ background: "hsl(var(--signal-green) / 0.5)" }} />
        <span className="ml-3 text-xs text-muted-foreground">Gogodeep live demo</span>
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
          <div className="flex h-full flex-col items-center justify-center gap-3 p-8">
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
            <div className="flex items-center gap-1.5 rounded-md border border-border bg-secondary/60 px-3 py-1.5">
              <Camera className="h-3 w-3 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground">{fileName}</span>
            </div>
          </div>
        )}

        {/* Phase 2: scanning */}
        {phase === 2 && (
          <div className="relative flex h-full flex-col items-center justify-center gap-3 p-8">
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
            <div className="flex items-center gap-1.5 rounded-md border border-border bg-secondary/60 px-3 py-1.5">
              <Camera className="h-3 w-3 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground">{fileName}</span>
            </div>
            <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2 rounded-lg border border-border bg-card/90 px-3 py-2 backdrop-blur-sm">
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Analysing misconception…</span>
            </div>
          </div>
        )}

        {/* Phase 3: results — Math */}
        {phase === 3 && slide === 0 && (
          <div className="animate-fade-up flex h-full flex-col p-5">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-full border border-destructive/20 bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">
                Conceptual Gap
              </span>
              <span className="text-xs text-muted-foreground">Integration · Calculus</span>
            </div>
            <p className="mb-2 text-sm font-bold text-foreground">Math AA Mock Test 2 Review</p>

            <div className="mb-3 flex gap-2">
              <div className="shrink-0 rounded-lg border border-border bg-secondary/40 p-2">
                <svg viewBox="0 0 72 60" className="h-14 w-14" fill="none">
                  <line x1="6" y1="54" x2="68" y2="54" stroke="hsl(215 20% 45%)" strokeWidth="0.8" />
                  <line x1="36" y1="4" x2="36" y2="54" stroke="hsl(215 20% 45%)" strokeWidth="0.8" />
                  <path
                    d="M10,52 Q20,40 36,8 Q52,40 62,52"
                    stroke="hsl(225 75% 55%)"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <text x="60" y="52" fontSize="5.5" fill="hsl(215 20% 65%)">x</text>
                  <text x="38" y="9" fontSize="5.5" fill="hsl(215 20% 65%)">y</text>
                  <text x="12" y="44" fontSize="5" fill="hsl(225 75% 65%)">x²</text>
                </svg>
              </div>
              <div className="flex flex-col justify-center gap-1.5">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  You seem to have made a mistake. You applied u-substitution instead of integration by parts on ∫x·eˣdx.
                </p>
                <p className="text-[11px] leading-relaxed text-muted-foreground/70">
                  When two unrelated functions multiply (here x and eˣ), use IBP: ∫u dv = uv − ∫v du.
                </p>
              </div>
            </div>

            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Targeted practice</p>
            <div className="flex-1 space-y-2 overflow-y-auto pr-1">
              {PRACTICE_QS.map((q, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <span className="mt-0.5 shrink-0 text-xs font-bold text-primary">{i + 1}.</span>
                  <span className="flex-1 text-xs leading-relaxed text-foreground">{q}</span>
                  <button className="ml-1 mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground hover:text-primary">
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Phase 3: results — Physics */}
        {phase === 3 && slide === 1 && (
          <div className="animate-fade-up flex h-full flex-col p-5">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-full border border-destructive/20 bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">
                Careless Error
              </span>
              <span className="text-xs text-muted-foreground">Projectile Motion · AS Physics</span>
            </div>
            <p className="mb-2 text-sm font-bold text-foreground">Physics AS Forces Practice Review</p>


            <div className="mb-3 flex gap-2">
              {/* Projectile trajectory diagram */}
              <div className="shrink-0 rounded-lg border border-border bg-secondary/40 p-2">
                <svg viewBox="0 0 72 60" className="h-14 w-14" fill="none">
                  {/* ground */}
                  <line x1="6" y1="52" x2="66" y2="52" stroke="hsl(215 20% 45%)" strokeWidth="0.8" />
                  {/* parabola trajectory */}
                  <path d="M10,52 Q36,10 62,52" stroke="hsl(225 75% 55%)" strokeWidth="1.5" fill="none" />
                  {/* launch vector */}
                  <line x1="10" y1="52" x2="20" y2="36" stroke="hsl(215 20% 65%)" strokeWidth="1" />
                  {/* horizontal dashed component */}
                  <line x1="10" y1="52" x2="20" y2="52" stroke="hsl(215 20% 55%)" strokeWidth="0.8" strokeDasharray="2,1" />
                  {/* angle arc */}
                  <path d="M15,52 Q14,49 13,47" stroke="hsl(215 20% 55%)" strokeWidth="0.7" fill="none" />
                  {/* labels */}
                  <text x="21" y="43" fontSize="5" fill="hsl(225 75% 65%)">v₀</text>
                  <text x="14" y="56.5" fontSize="4.5" fill="hsl(215 20% 65%)">θ</text>
                  {/* launch and landing dots */}
                  <circle cx="10" cy="52" r="1.5" fill="hsl(225 75% 55%)" />
                  <circle cx="62" cy="52" r="1.5" fill="hsl(225 75% 55%)" />
                </svg>
              </div>
              <div className="flex flex-col justify-center gap-1.5">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  You swapped sin and cos. You used v·sinθ for the horizontal component instead of v·cosθ.
                </p>
                <p className="text-[11px] leading-relaxed text-muted-foreground/70">
                  Rule: vₓ = v cosθ (horizontal), vᵧ = v sinθ (vertical). The horizontal component always uses cos.
                </p>
              </div>
            </div>

            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Targeted practice</p>
            <div className="flex-1 space-y-2 overflow-y-auto pr-1">
              {PHYSICS_QS.map((q, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <span className="mt-0.5 shrink-0 text-xs font-bold text-primary">{i + 1}.</span>
                  <span className="flex-1 text-xs leading-relaxed text-foreground">{q}</span>
                  <button className="ml-1 mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground hover:text-primary">
                    <Camera className="h-3.5 w-3.5" />
                  </button>
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
