import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Camera, Microscope, Route, ArrowRight, ScanLine, BookOpen, Upload, Loader2, Flame, ChevronRight, BrainCircuit, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import PageTransition from "@/components/PageTransition";
import gogodeepLogo from "@/assets/gogodeep-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { SCAN_LIMITS, SCAN_CACHE_KEY } from "@/lib/supabase";
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
  answer: string;
};

type QuizState = {
  questions: QuizQuestion[];
  current: number;
  revealed: boolean;
};

const Dashboard = ({ user }: { user: User }) => {
  const username = user.user_metadata?.username ?? user.email?.split("@")[0] ?? "there";
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<QuizState | null>(null);
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
        if (plan !== "deep" && loginStreak % 7 === 0) {
          const bonus = plan === "intermediate" ? 20 : 5;
          bonusScans += bonus;
          streakUpdates.bonus_scans = bonusScans;
          toast.success(`7-day streak! You've earned ${bonus} bonus credits.`);
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

  const startQuiz = () => {
    if (!data) return;
    if (data.plan === "free") return; // handled in UI
    const scans = data.recentScans.slice(0, 5);
    if (scans.length < 5) return; // handled in UI
    const questions: QuizQuestion[] = [];
    for (const scan of scans) {
      const raw = localStorage.getItem(SCAN_CACHE_KEY(scan.id));
      if (!raw) continue;
      try {
        const stored = JSON.parse(raw);
        const problems: { question: string; answer: string }[] = stored.diagnosis?.practice_problems ?? [];
        for (const p of problems.slice(0, 2)) {
          questions.push({ topic: scan.label, question: p.question, answer: p.answer });
        }
      } catch {}
    }
    if (!questions.length) { toast.error("Couldn't load practice questions from your scans."); return; }
    setQuiz({ questions, current: 0, revealed: false });
  };

  const navigate = useNavigate();

  function handleScanClick(scanId: string) {
    const raw = localStorage.getItem(SCAN_CACHE_KEY(scanId));
    if (raw) {
      try {
        navigate("/report", { state: JSON.parse(raw) });
        return;
      } catch {}
    }
    navigate("/lab");
  }

  return (
    <PageTransition>
      <div className="relative z-10 min-h-screen pt-14">
        <div className="container max-w-5xl py-12">

          {/* Header */}
          <div className="mb-10 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Dashboard</p>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-foreground">
                {[
                  "Today is your day",
                  "Make yourself proud today",
                  "Let's get to work",
                  "One step closer",
                  "Show up. Show out",
                  "Your future self is watching",
                  "Make today count",
                  "Time to level up",
                  "No excuses today",
                  "Outwork yesterday",
                ][new Date().getUTCDay() * 3 % 10]}, {username}
              </h1>
            </div>
            <Link to="/lab">
              <Button className="mt-4 h-10 gap-2 bg-primary px-6 text-sm font-semibold hover:bg-primary/90 sm:mt-0">
                <ScanLine className="h-4 w-4" />
                New Scan
              </Button>
            </Link>
          </div>

          {/* Stat row */}
          <div className="mb-6 grid gap-4 sm:grid-cols-3">

            {/* Total scans */}
            <Card className="border-border bg-card p-6">
              <div className="flex items-center gap-2">
                <Microscope className="h-4 w-4 text-primary" />
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Total Scans</p>
              </div>
              <p className="mt-4 text-5xl font-extrabold tracking-tight text-foreground">
                {loading ? "—" : data?.totalScans ?? 0}
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">All-time diagnoses</p>
            </Card>

            {/* Credits left */}
            <Card className="border-border bg-card p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ScanLine className="h-4 w-4 text-primary" />
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Credits Left</p>
                </div>
                {!loading && data?.plan !== "deep" ? (
                  <Link to="/pricing" className="shrink-0 text-[10px] font-semibold text-primary hover:underline">Upgrade →</Link>
                ) : !loading ? (
                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary capitalize">{data?.plan}</span>
                ) : null}
              </div>
              <p className="mt-4 text-5xl font-extrabold tracking-tight text-foreground">
                {loading ? "—" : data?.creditsLeft === null ? "∞" : data?.creditsLeft}
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {data?.creditsLeft === null
                  ? "Unlimited scans"
                  : `of ${SCAN_LIMITS[data?.plan ?? "free"] ?? SCAN_LIMITS.free} daily · resets in ${resetCountdown}`}
              </p>
              {data && data.creditsLeft !== null && SCAN_LIMITS[data.plan] != null && (
                <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-700"
                    style={{ width: `${Math.min(Math.round(((SCAN_LIMITS[data.plan] ?? SCAN_LIMITS.free ?? 0) - data.creditsLeft + data.bonusScans) / (SCAN_LIMITS[data.plan] ?? SCAN_LIMITS.free ?? 1) * 100), 100)}%` }}
                  />
                </div>
              )}
            </Card>

            {/* Login streak */}
            <Card className="border-border bg-card p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-primary" />
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Login Streak</p>
                </div>
                {!loading && data?.plan !== "deep" && (data?.bonusScans ?? 0) > 0 && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    +{data?.bonusScans} bonus
                  </span>
                )}
              </div>
              {data?.plan === "deep" ? (
                <>
                  <p className="mt-4 text-5xl font-extrabold tracking-tight text-foreground">
                    {loading ? "—" : data.loginStreak}
                    <span className="ml-2 text-lg font-medium text-muted-foreground">days</span>
                  </p>
                  <p className="mt-1.5 text-xs text-muted-foreground">Keep the habit going</p>
                </>
              ) : (
                <>
                  <p className="mt-4 text-5xl font-extrabold tracking-tight text-foreground">
                    {loading ? "—" : data?.loginStreak ?? 0}
                    <span className="ml-2 text-lg font-medium text-muted-foreground">days</span>
                  </p>
                  {(() => {
                    const streak = data?.loginStreak ?? 0;
                    const cyclePos = streak % 7;
                    const daysLeft = cyclePos === 0 && streak > 0 ? 0 : 7 - cyclePos;
                    return (
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {loading ? "\u00a0" : daysLeft === 0
                          ? `Streak complete — ${data?.plan === "intermediate" ? 20 : 5} bonus credits awarded!`
                          : `${daysLeft} more day${daysLeft === 1 ? "" : "s"} to earn ${data?.plan === "intermediate" ? 20 : 5} bonus credits`}
                      </p>
                    );
                  })()}
                  <div className="mt-4 flex gap-1.5">
                    {Array.from({ length: 7 }).map((_, i) => {
                      const cyclePos = (data?.loginStreak ?? 0) % 7;
                      const filled = (data?.loginStreak ?? 0) % 7 === 0 && (data?.loginStreak ?? 0) > 0
                        ? 7
                        : cyclePos;
                      return (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full transition-colors ${
                            i === 6
                              ? i < filled ? "bg-yellow-400" : "bg-yellow-400/20"
                              : i < filled ? "bg-primary" : "bg-secondary"
                          }`}
                        />
                      );
                    })}
                  </div>
                </>
              )}
            </Card>
          </div>

          {/* Main content */}
          <div className="grid gap-6 lg:grid-cols-5">

            {/* Previous scans — wider */}
            <Card className="border-border bg-card p-6 lg:col-span-3">
              <div className="mb-5 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Previous Scans</p>
              </div>
              {loading ? (
                <div className="space-y-2.5">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-11 w-full rounded-lg bg-secondary animate-pulse" />
                  ))}
                </div>
              ) : !data?.recentScans.length ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <BookOpen className="h-8 w-8 text-muted-foreground/30" />
                  <p className="mt-3 text-sm text-muted-foreground">Your scans will appear here after your first diagnosis.</p>
                  <Link to="/lab" className="mt-4 inline-block">
                    <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90">
                      <ScanLine className="h-3.5 w-3.5" />
                      Run first scan
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.recentScans.map((scan) => (
                    <button
                      key={scan.id}
                      onClick={() => handleScanClick(scan.id)}
                      className="flex w-full items-center justify-between rounded-lg border border-border bg-secondary/60 px-4 py-3 text-left transition-all duration-150 hover:bg-secondary hover:border-primary/30 hover:translate-x-0.5"
                    >
                      <span className="truncate text-sm font-medium text-foreground">{scan.label}</span>
                      <ChevronRight className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </Card>

            {/* Recap quiz */}
            <Card className="border-border bg-card p-6 lg:col-span-2">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="h-4 w-4 text-primary" />
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Recap Quiz</p>
                </div>
                {quiz && (
                  <span className="text-xs text-muted-foreground">{quiz.current + 1} / {quiz.questions.length}</span>
                )}
              </div>

              {!quiz ? (
                <div className="flex flex-col items-center gap-4 py-8 text-center">
                  <BrainCircuit className="h-8 w-8 text-muted-foreground/30" />
                  {data?.plan === "free" ? (
                    <>
                      <p className="text-sm text-muted-foreground">Recap quizzes are available on Intermediate and Deep plans.</p>
                      <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90" onClick={() => navigate("/pricing")}>
                        <Lock className="h-3.5 w-3.5" />
                        Upgrade to unlock
                      </Button>
                    </>
                  ) : (data?.recentScans.length ?? 0) < 5 ? (
                    <>
                      <p className="text-sm text-muted-foreground">You need at least 5 scans to generate a recap quiz.</p>
                      <p className="text-xs text-muted-foreground/60">{data?.recentScans.length ?? 0} / 5 scans so far</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">Test yourself on your previous concepts.</p>
                      <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={startQuiz} disabled={loading}>
                        Start Quiz
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-primary mb-2">{quiz.questions[quiz.current].topic}</p>
                    <p className="text-sm font-medium text-foreground">{quiz.questions[quiz.current].question}</p>
                  </div>
                  {quiz.revealed ? (
                    <div className="space-y-3">
                      <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
                        {quiz.questions[quiz.current].answer}
                      </div>
                      <div className="flex justify-end">
                        {quiz.current < quiz.questions.length - 1 ? (
                          <Button size="sm" className="bg-primary hover:bg-primary/90"
                            onClick={() => setQuiz((q) => q && ({ ...q, current: q.current + 1, revealed: false }))}>
                            Next
                            <ArrowRight className="ml-2 h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" className="border-border" onClick={() => setQuiz(null)}>
                            Done
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" className="w-full border-border"
                      onClick={() => setQuiz((q) => q && ({ ...q, revealed: true }))}>
                      Reveal answer
                    </Button>
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* Quote of the day */}
          {(() => {
            const quotes = [
              { text: "You don't lose marks for not knowing. You lose them for not finding out.", author: "" },
              { text: "The exam doesn't care how hard you tried. Diagnose your gaps before it does.", author: "" },
              { text: "Every wrong answer is a map to what needs fixing. Start there.", author: "" },
              { text: "You already know how to work hard. The trick is working on the right things.", author: "" },
              { text: "The student who reviews their mistakes every day outperforms the one who only studies new material.", author: "" },
              { text: "A scan a day keeps the failing grade away.", author: "" },
              { text: "Confidence in an exam comes from knowing exactly what you don't know — and fixing it.", author: "" },
              { text: "The top students aren't smarter. They just catch their errors faster.", author: "" },
              { text: "Don't memorise harder. Understand deeper.", author: "" },
              { text: "One hour of deliberate error correction beats five hours of passive re-reading.", author: "" },
              { text: "The test is coming. The gap is there. The question is whether you find it first.", author: "" },
              { text: "Comfort and high grades don't live at the same address.", author: "" },
              { text: "Every concept you master today is one less thing that can surprise you on exam day.", author: "" },
              { text: "Knowing your error category is half the battle won.", author: "" },
              { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
              { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
              { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
              { text: "I find that the harder I work, the more luck I seem to have.", author: "Thomas Jefferson" },
              { text: "The difference between ordinary and extraordinary is that little extra.", author: "Jimmy Johnson" },
              { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
              { text: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke" },
              { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
              { text: "Fall seven times, stand up eight.", author: "Japanese proverb" },
              { text: "Do something today that your future self will thank you for.", author: "Sean Patrick Flanery" },
              { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
              { text: "Genius is 1% inspiration and 99% perspiration.", author: "Thomas Edison" },
              { text: "The pain of studying is temporary. The pride of results is permanent.", author: "Unknown" },
              { text: "Work while they sleep. Learn while they party. Save while they spend.", author: "Unknown" },
              { text: "Your future self is watching you right now through memories. Make it proud.", author: "Unknown" },
            ];
            const day = new Date().getUTCFullYear() * 1000 + Math.floor((Date.now() - new Date(new Date().getUTCFullYear(), 0, 0).getTime()) / 86400000);
            const q = quotes[day % quotes.length];
            return (
              <div className="mt-6 rounded-xl border border-border bg-card px-6 py-5 text-center">
                <p className="text-sm italic text-muted-foreground">"{q.text}"</p>
                {q.author && <p className="mt-2 text-xs font-semibold text-muted-foreground/60">— {q.author}</p>}
              </div>
            );
          })()}

        </div>
      </div>
    </PageTransition>
  );
};

// ─── Landing page ─────────────────────────────────────────────────────────────

const DEMO_STEPS = [
  "Recognise two functions multiplied together: x and eˣ. This calls for integration by parts.",
  "Set u = x and dv = eˣ dx, so du = dx and v = eˣ.",
  "Apply the IBP formula: ∫x·eˣ dx = x·eˣ − ∫eˣ dx.",
  "Integrate the remaining term: ∫eˣ dx = eˣ.",
  "Write the final answer: ∫x·eˣ dx = eˣ(x − 1) + C.",
];

const DEMO_CONCEPT = "Integration by parts is used when integrating a product of two different function types. The rule is ∫u dv = uv − ∫v du. When you see a polynomial multiplied by an exponential or trig function, use LIATE to choose u: Logarithmic → Inverse trig → Algebraic → Trig → Exponential. The first type in the list becomes u.";

const DEMO_PRACTICE = [
  {
    q: "Find ∫x·cos(x) dx using integration by parts.",
    steps: [
      "By LIATE, x is Algebraic and cos(x) is Trig — so set u = x.",
      "Then dv = cos(x) dx, giving du = dx and v = sin(x).",
      "Apply the formula: ∫x·cos(x) dx = x·sin(x) − ∫sin(x) dx.",
      "Evaluate the remaining integral: −∫sin(x) dx = cos(x).",
      "Final answer: x·sin(x) + cos(x) + C.",
    ],
  },
  {
    q: "Evaluate ∫x²·eˣ dx. You may need to apply IBP twice.",
    steps: [
      "First pass — u = x², dv = eˣ dx → du = 2x dx, v = eˣ.",
      "After first IBP: x²·eˣ − 2∫x·eˣ dx.",
      "Second pass on ∫x·eˣ dx — u = x, dv = eˣ dx → x·eˣ − eˣ.",
      "Substitute back: x²·eˣ − 2(x·eˣ − eˣ).",
      "Final answer: eˣ(x² − 2x + 2) + C.",
    ],
  },
  {
    q: "Calculate ∫ln(x) dx. Let u = ln(x) and dv = dx.",
    steps: [
      "Set u = ln(x) and dv = dx, so du = (1/x) dx and v = x.",
      "Apply IBP: ∫ln(x) dx = x·ln(x) − ∫x·(1/x) dx.",
      "Simplify the integral: ∫1 dx = x.",
      "Final answer: x·ln(x) − x + C.",
    ],
  },
];

type DemoTab = "steps" | "concept" | "practice";

const DemoPanel = () => {
  const [phase, setPhase] = useState(0);
  const [tab, setTab] = useState<DemoTab>("steps");
  const [revealedSteps, setRevealedSteps] = useState(1);
  const [revealedAnswers, setRevealedAnswers] = useState<Set<number>>(new Set());

  useEffect(() => {
    const durations = [2000, 2200, 1800, 16000];
    const t = setTimeout(() => {
      const next = (phase + 1) % 4;
      setPhase(next);
      if (next === 0) {
        setTab("steps");
        setRevealedSteps(1);
        setRevealedAnswers(new Set());
      }
    }, durations[phase]);
    return () => clearTimeout(t);
  }, [phase]);

  return (
    <div className="relative h-[500px] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
      {/* Window chrome */}
      <div className="flex items-center gap-1.5 border-b border-border bg-secondary/50 px-4 py-3">
        <div className="h-2.5 w-2.5 rounded-full bg-destructive/50" />
        <div className="h-2.5 w-2.5 rounded-full" style={{ background: "hsl(var(--signal-yellow) / 0.5)" }} />
        <div className="h-2.5 w-2.5 rounded-full" style={{ background: "hsl(var(--signal-green) / 0.5)" }} />
        <span className="ml-3 text-xs text-muted-foreground">Gogodeep · Live Demo</span>
      </div>

      <div className="relative h-[calc(100%-41px)]">

        {/* Phase 0: idle drop zone */}
        {phase === 0 && (
          <div className="flex h-full items-center justify-center p-8">
            <div className="flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border/50 py-16 text-center">
              <Upload className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">Drop your question or working here</p>
              <p className="text-xs text-muted-foreground/50">PNG or JPG · any subject</p>
            </div>
          </div>
        )}

        {/* Phase 1: image slides in */}
        {phase === 1 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-8">
            <div className="animate-slide-in-paper w-64 rounded-xl bg-amber-50 p-5 shadow-xl">
              <p className="mb-2 text-[10px] font-bold text-gray-500 uppercase tracking-wide">Question 3</p>
              <div className="mb-2 h-2.5 w-4/5 rounded bg-gray-600" />
              <div className="space-y-2">
                <div className="h-2 w-full rounded bg-gray-300" />
                <div className="h-2 w-5/6 rounded bg-gray-300" />
                <div className="mt-3 flex items-center justify-center rounded bg-gray-100 py-2">
                  <span className="font-mono text-sm text-gray-700">∫ x · eˣ dx</span>
                </div>
                <div className="h-2 w-3/4 rounded bg-gray-300" />
                <div className="h-2 w-full rounded bg-gray-200" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 rounded-md border border-border bg-secondary/60 px-3 py-1.5">
              <Camera className="h-3 w-3 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground">Mock Test 2.jpg</span>
            </div>
          </div>
        )}

        {/* Phase 2: scanning */}
        {phase === 2 && (
          <div className="relative flex h-full flex-col items-center justify-center gap-3 p-8">
            <div className="w-64 rounded-xl bg-amber-50 p-5 opacity-50 shadow-xl">
              <p className="mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide">Question 3</p>
              <div className="mb-2 h-2.5 w-4/5 rounded bg-gray-300" />
              <div className="space-y-2">
                <div className="h-2 w-full rounded bg-gray-200" />
                <div className="h-2 w-5/6 rounded bg-gray-200" />
                <div className="mt-3 flex items-center justify-center rounded bg-gray-100 py-2">
                  <span className="font-mono text-sm text-gray-400">∫ x · eˣ dx</span>
                </div>
                <div className="h-2 w-3/4 rounded bg-gray-200" />
              </div>
            </div>
            <div className="animate-scan-sweep absolute inset-x-6 h-px" style={{ background: "hsl(var(--primary))", boxShadow: "0 0 10px 2px hsl(var(--primary) / 0.5)" }} />
            <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2 rounded-lg border border-border bg-card/90 px-3 py-2 backdrop-blur-sm">
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Mapping the solution path…</span>
            </div>
          </div>
        )}

        {/* Phase 3: tabbed results */}
        {phase === 3 && (
          <div className="animate-fade-up flex h-full flex-col p-4">
            {/* Tab bar */}
            <div className="mb-3 flex gap-1 rounded-lg border border-border bg-secondary p-1">
              {(["steps", "concept", "practice"] as DemoTab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 rounded-md py-1.5 text-[11px] font-semibold transition-colors ${
                    tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t === "steps" ? "Step by Step" : t === "concept" ? "Concept" : "Practice"}
                </button>
              ))}
            </div>

            {tab === "steps" && (
              <div className="flex-1 space-y-2 overflow-y-auto pr-0.5">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-primary">Evaluate ∫x·eˣ dx</p>
                {DEMO_STEPS.slice(0, revealedSteps).map((step, i) => (
                  <div key={i} className="flex items-start gap-2.5 rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{i + 1}</span>
                    <p className="text-xs leading-relaxed text-foreground">{step}</p>
                  </div>
                ))}
                {revealedSteps < DEMO_STEPS.length && (
                  <button
                    onClick={() => setRevealedSteps((v) => v + 1)}
                    className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                  >
                    Next step <ChevronRight className="h-3 w-3" />
                  </button>
                )}
                {revealedSteps >= DEMO_STEPS.length && (
                  <p className="pt-1 text-center text-[10px] text-muted-foreground/50">All steps revealed.</p>
                )}
              </div>
            )}

            {tab === "concept" && (
              <div className="flex-1 overflow-y-auto">
                <div className="rounded-lg border border-border bg-secondary/40 p-4">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-primary">Integration by Parts</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">{DEMO_CONCEPT}</p>
                </div>
              </div>
            )}

            {tab === "practice" && (
              <div className="flex-1 space-y-2 overflow-y-auto">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-primary">Practice Questions</p>
                {DEMO_PRACTICE.map((item, i) => (
                  <div key={i} className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 shrink-0 text-xs font-bold text-primary">{i + 1}.</span>
                        <span className="text-xs leading-relaxed text-foreground">{item.q}</span>
                      </div>
                      <button
                        onClick={() => setRevealedAnswers((prev) => {
                          const next = new Set(prev);
                          next.has(i) ? next.delete(i) : next.add(i);
                          return next;
                        })}
                        className="shrink-0 text-[10px] font-semibold text-primary underline underline-offset-2 hover:text-primary/80"
                      >
                        {revealedAnswers.has(i) ? "Hide" : "Answer"}
                      </button>
                    </div>
                    {revealedAnswers.has(i) && (
                      <div className="mt-2 space-y-1">
                        {item.steps.map((step, si) => (
                          <div key={si} className="flex items-start gap-2 rounded border border-primary/20 bg-card px-2.5 py-1.5">
                            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">{si + 1}</span>
                            <span className="text-[11px] leading-relaxed text-foreground">{step}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
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
