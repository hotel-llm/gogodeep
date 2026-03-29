import { useEffect, useState } from "react";
import { Check, Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import PageTransition from "@/components/PageTransition";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const plans = [
  {
    id: "shallow",
    name: "Shallow",
    price: "0",
    cadence: "/mo",
    subtitle: "Try the core diagnostic loop",
    features: ["3 AI scans per day", "Full diagnostic report", "Practice questions"],
    cta: "Start Free",
    ctaLink: "/signup",
    featured: false,
  },
  {
    id: "intermediate",
    name: "Intermediate",
    price: "9.99",
    cadence: "/month",
    subtitle: "For active tutors and students who want to get ahead.",
    features: ["15 AI scans per day (5×)", "5× more practice questions", "Full scan history", "Learning dashboard"],
    cta: "Upgrade to Intermediate",
    ctaLink: null,
    featured: true,
  },
  {
    id: "deep",
    name: "Deep",
    price: "14.99",
    cadence: "/month",
    subtitle: "For power users who want no limits.",
    features: ["Everything in Intermediate", "Unlimited scans", "Unlimited practice questions"],
    cta: "Upgrade to Deep",
    ctaLink: null,
    featured: false,
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
      toast.error(`Checkout failed: ${message}`);
      setLoadingPlan(null);
    }
  };

  const isPaid = userPlan === "intermediate" || userPlan === "deep";

  return (
    <PageTransition>
      <div className="relative z-10 min-h-screen pt-14">
        <div className="container py-20">
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
              const isShallowOnPaidPlan = plan.id === "shallow" && isPaid;

              return (
                <Card
                  key={plan.id}
                  className={`flex flex-col border p-8 transition-all w-full ${
                    isActivePlan
                      ? "border-primary bg-primary/5 shadow-xl shadow-primary/20"
                      : plan.featured
                      ? "border-primary/40 bg-primary/5 shadow-lg shadow-primary/10"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-foreground">{plan.name}</h2>
                    {isActivePlan ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                        <Check className="h-3 w-3" />
                        Active
                      </span>
                    ) : plan.featured ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                        <Sparkles className="h-3 w-3" />
                        Popular
                      </span>
                    ) : null}
                  </div>

                  <p className="text-sm text-muted-foreground">{plan.subtitle}</p>
                  <div className="mt-6 h-14 flex items-end">
                    <span className="text-4xl font-extrabold text-foreground">${plan.price}</span>
                    <span className="ml-1 mb-1 text-sm text-muted-foreground">{plan.cadence}</span>
                  </div>

                  <ul className="mt-8 flex-1 space-y-3 text-sm text-muted-foreground">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {isShallowOnPaidPlan ? (
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
                    <Button disabled className="mt-8 w-full bg-primary/20 text-primary cursor-default">
                      <Check className="mr-2 h-4 w-4" />
                      Current plan
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={loadingPlan === plan.id}
                      className="mt-8 w-full bg-primary hover:bg-primary/90"
                    >
                      {loadingPlan === plan.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {plan.cta}
                    </Button>
                  )}
                </Card>
              );
            })}
          </div>

          <p className="mt-12 text-center text-sm text-muted-foreground">
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
