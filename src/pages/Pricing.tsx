import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Check, Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import PageTransition from "@/components/PageTransition";
import { supabase } from "@/integrations/supabase/client";
import { whaleToast } from "@/lib/whaleToast";

type PlanFeature = { text: string; included: boolean };

const plans = [
  {
    id: "shallow",
    name: "Shallow",
    price: "0",
    cadence: "/month",
    subtitle: "Try the core diagnostic loop.",
    features: [
      { text: "3 scans per day", included: true },
      { text: "Targeted questions", included: false },
      { text: "Recap quizzes", included: false },
      { text: "Quiz customization", included: false },
      { text: "Underlying concepts", included: false },
    ] as PlanFeature[],
    cta: "Start Free",
    ctaLink: "/signup",
    featured: false,
  },
  {
    id: "intermediate",
    name: "Intermediate",
    price: "9.99",
    cadence: "/month",
    subtitle: "For active students who want to get ahead.",
    features: [
      { text: "10 scans per day", included: true },
      { text: "3 targeted questions per scan", included: true },
      { text: "1 recap quiz a day", included: true },
      { text: "Quiz customization", included: true },
      { text: "Underlying concepts", included: true },
    ] as PlanFeature[],
    cta: "Upgrade to Intermediate",
    ctaLink: null,
    featured: false,
  },
  {
    id: "deep",
    name: "Deep",
    price: "14.99",
    cadence: "/month",
    subtitle: "For students with the desire to ace their next test.",
    features: [
      { text: "Unlimited scans", included: true },
      { text: "Unlimited targeted questions", included: true },
      { text: "Unlimited recap quizzes", included: true },
      { text: "Quiz customization", included: true },
      { text: "Underlying concepts", included: true },
    ] as PlanFeature[],
    cta: "Upgrade to Deep",
    ctaLink: null,
    featured: true,
  },
];

const Pricing = () => {
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
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

  const handleUpgrade = async (planId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/signup");
      return;
    }

    setLoadingPlan(planId);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { userId: user.id, email: user.email, planId },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data?.error ?? "No checkout URL returned");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      whaleToast.error(`Checkout failed: ${message}`);
      setLoadingPlan(null);
    }
  };

  const isPaid = userPlan === "intermediate" || userPlan === "deep";

  const handleManageBilling = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setLoadingPlan("manage");
    try {
      const { data, error } = await supabase.functions.invoke("billing-portal", {
        body: { userId: user.id },
      });
      const errMsg = data?.error ?? (error as any)?.message ?? String(error);
      if (!data?.url) throw new Error(errMsg);
      window.location.href = data.url;
    } catch (err) {
      whaleToast.error(err instanceof Error ? err.message : String(err));
      setLoadingPlan(null);
    }
  };

  return (
    <PageTransition>
      <Helmet>
        <title>Pricing — Start Free | Gogodeep AI Study Tool</title>
        <meta name="description" content="Start free with 3 AI scans a day. Upgrade for unlimited scans, targeted practice questions, and daily recap quizzes. AI analysis breakdowns for IB, AP, and A-Level STEM subjects." />
      </Helmet>
      <div className="relative z-10 min-h-screen pt-14">
        <div className="container py-20">
          {isPaid && (
            <div className="flex justify-end mb-4">
              <Button
                variant="outline"
                className="border-border text-muted-foreground"
                onClick={handleManageBilling}
                disabled={loadingPlan === "manage"}
              >
                {loadingPlan === "manage" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Manage subscription
              </Button>
            </div>
          )}
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Pricing</p>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
              Simple, transparent pricing
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Start free. Scale when you need deeper diagnostics.
            </p>
          </div>

          <div className="mx-auto mt-14 grid max-w-5xl gap-6 md:grid-cols-3">
            {plans.map((plan) => {
              const isActivePlan = userPlan === plan.id;
              const PLAN_RANK: Record<string, number> = { shallow: 0, intermediate: 1, deep: 2 };
              const userRank = PLAN_RANK[userPlan ?? "shallow"] ?? 0;
              const cardRank = PLAN_RANK[plan.id] ?? 0;
              const isLowerTierCard = userRank > cardRank;

              return (
                <Card
                  key={plan.id}
                  className={`flex flex-col border p-8 transition-all w-full hover:scale-[1.03] ${
                    isActivePlan && plan.id === "deep"
                      ? "border-yellow-400 bg-yellow-400/5 shadow-xl shadow-yellow-400/20"
                      : isActivePlan
                      ? "border-primary bg-primary/5 shadow-xl shadow-primary/20"
                      : plan.featured
                      ? "border-yellow-400/40 bg-yellow-400/5 shadow-lg shadow-yellow-400/10"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-foreground">{plan.name}</h2>
                    {isActivePlan ? (
                      <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${plan.id === "deep" ? "bg-yellow-400 text-black" : "bg-primary text-primary-foreground"}`}>
                        <Check className="h-3 w-3" />
                        Active
                      </span>
                    ) : plan.featured ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-400/20 px-3 py-1 text-xs font-semibold text-yellow-400">
                        <Sparkles className="h-3 w-3" />
                        Popular
                      </span>
                    ) : null}
                  </div>

                  <p className="min-h-[2.5rem] text-sm text-muted-foreground">{plan.subtitle}</p>
                  <div className="mt-6 h-14 flex items-end">
                    <span className="text-4xl font-extrabold text-foreground">${plan.price}</span>
                    <span className="ml-1 mb-1 text-sm text-muted-foreground">{plan.cadence}</span>
                  </div>

                  <ul className="mt-8 flex-1 space-y-3 text-sm">
                    {plan.features.map((feature) => (
                      <li key={feature.text} className="flex items-start gap-2">
                        {feature.included
                          ? <Check className={`mt-0.5 h-4 w-4 shrink-0 ${plan.featured ? "text-yellow-400" : "text-primary"}`} />
                          : <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/40" />}
                        <span className={feature.included ? "text-muted-foreground" : "text-muted-foreground/40"}>{feature.text}</span>
                      </li>
                    ))}
                  </ul>

                  {isLowerTierCard ? (
                    <div className="mt-8 flex justify-center">
                      <X className="h-6 w-6 text-muted-foreground" />
                    </div>
                  ) : plan.ctaLink ? (
                    <Link to={plan.ctaLink}>
                      <Button className="mt-8 w-full bg-secondary text-foreground hover:bg-accent">
                        {plan.cta}
                      </Button>
                    </Link>
                  ) : isActivePlan ? (
                    <Button disabled className={`mt-8 w-full cursor-default ${plan.id === "deep" ? "bg-yellow-400/20 text-yellow-400" : "bg-primary/20 text-primary"}`}>
                      <Check className="mr-2 h-4 w-4" />
                      Current plan
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={loadingPlan === plan.id}
                      className={`mt-8 w-full ${plan.featured ? "bg-yellow-400 hover:bg-yellow-400/90 text-black" : "bg-primary hover:bg-primary/90"}`}
                    >
                      {loadingPlan === plan.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {plan.cta}
                    </Button>
                  )}
                </Card>
              );
            })}
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            For schools and teams,{" "}
            <Link to="/contact" className="text-primary underline underline-offset-2 hover:text-primary/80">
              contact us
            </Link>
            .
          </p>
        </div>
      </div>
    </PageTransition>
  );
};

export default Pricing;
