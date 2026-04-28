import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { whaleToast } from "@/lib/whaleToast";
import { cn } from "@/lib/utils";

type Billing = "monthly" | "annual";

const FEATURES: { bold: string; desc: string }[] = [
  { bold: "Unlimited scans", desc: "Analyse any question, no daily cap" },
  { bold: "Unlimited practice", desc: "Questions built from your exact gaps" },
  { bold: "Whal-E AI tutor 24/7", desc: "Like a tutor that never sleeps" },
  { bold: "Underlying concepts", desc: "Know not just the answer, but the why" },
  { bold: "Unlimited recap quizzes", desc: "Test yourself on anything, anytime" },
  { bold: "Early feature access", desc: "Be first to try everything new" },
];

const Pricing = () => {
  const navigate = useNavigate();
  const [billing, setBilling] = useState<Billing>("annual");
  const [loading, setLoading] = useState(false);
  const [managingBilling, setManagingBilling] = useState(false);
  const [userPlan, setUserPlan] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await (supabase as any)
        .from("profiles")
        .select("plan")
        .eq("id", user.id)
        .single();
      setUserPlan(data?.plan ?? "free");
    });
  }, []);

  function handleClose() { navigate(-1); }

  async function handleUpgrade() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/signup"); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { userId: user.id, email: user.email, planId: "deep", billing },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
      else throw new Error(data?.error ?? "No checkout URL returned");
    } catch (err) {
      whaleToast.error(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }

  async function handleManageBilling() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setManagingBilling(true);
    try {
      const { data, error } = await supabase.functions.invoke("billing-portal", {
        body: { userId: user.id },
      });
      let errMsg = data?.error ?? (error as any)?.message ?? String(error);
      try {
        const ctx = (error as any)?.context;
        if (ctx) { const j = await ctx.json(); errMsg = j?.error ?? errMsg; }
      } catch {}
      if (!data?.url) throw new Error(errMsg);
      window.location.href = data.url;
    } catch (err) {
      whaleToast.error(err instanceof Error ? err.message : String(err));
      setManagingBilling(false);
    }
  }

  const isDeep = userPlan === "deep";

  return (
    <>
      <Helmet><title>Go Deep</title></Helmet>

      {/* Full-screen overlay — background is the page below, just blurred */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-sm bg-background/40">

        <div className="relative w-full max-w-[520px] mx-4">
          {/* Card */}
          <div className="relative rounded-2xl border border-border bg-card px-8 py-6 shadow-2xl overflow-hidden">

            {/* Close */}
            <button
              onClick={handleClose}
              className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-4 mb-5">
              <img src="/whale-e.png" alt="" className="whale-img h-10 w-10 object-contain shrink-0" />
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Go Deep</h2>
                <p className="text-sm text-muted-foreground">Everything you need to close every gap.</p>
              </div>
            </div>

            {/* Features */}
            <ul className="space-y-1.5">
              {FEATURES.map((f) => (
                <li key={f.bold} className="flex items-start gap-2.5 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>
                    <span className="font-semibold text-foreground">{f.bold}</span>
                    <span className="text-muted-foreground"> — {f.desc}</span>
                  </span>
                </li>
              ))}
            </ul>

            {/* Billing boxes */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              {/* Annual */}
              <button
                onClick={() => setBilling("annual")}
                className={cn(
                  "relative flex flex-col items-center rounded-xl border-2 px-4 py-4 text-center transition-all",
                  billing === "annual"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-secondary/40 text-foreground hover:border-primary/40"
                )}
              >
                <span className={cn(
                  "absolute -top-2.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold",
                  billing === "annual" ? "bg-white text-primary" : "bg-primary text-primary-foreground"
                )}>
                  Save 25%
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Annual</span>
                <div className="mt-1.5 flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold">$6</span>
                  <span className="text-sm opacity-70">/ mo</span>
                </div>
                <span className="text-[11px] opacity-60">$0.20 / day</span>
              </button>

              {/* Monthly */}
              <button
                onClick={() => setBilling("monthly")}
                className={cn(
                  "flex flex-col items-center rounded-xl border-2 px-4 py-4 text-center transition-all",
                  billing === "monthly"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-secondary/40 text-foreground hover:border-primary/40"
                )}
              >
                <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Monthly</span>
                <div className="mt-1.5 flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold">$8</span>
                  <span className="text-sm opacity-70">/ mo</span>
                </div>
                <span className="text-[11px] opacity-60">$0.27 / day</span>
              </button>
            </div>

            {/* CTA */}
            <Button
              onClick={handleUpgrade}
              disabled={loading || isDeep}
              className="mt-4 w-full bg-primary hover:bg-primary/90 text-base font-semibold h-11"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isDeep ? "You're already on Deep" : "Go Deep"}
            </Button>

            {/* Manage subscription */}
            {isDeep && (
              <Button
                variant="outline"
                onClick={handleManageBilling}
                disabled={managingBilling}
                className="mt-2 w-full border-border text-muted-foreground"
              >
                {managingBilling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Manage subscription
              </Button>
            )}

            <p className="mt-4 text-center text-xs text-muted-foreground/60">
              For schools and teams,{" "}
              <a href="/contact" className="text-primary underline underline-offset-2 hover:text-primary/80">
                contact us
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Pricing;
