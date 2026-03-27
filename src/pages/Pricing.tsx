import { Check, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import PageTransition from "@/components/PageTransition";

const plans = [
  {
    name: "Free",
    price: "0",
    cadence: "/mo",
    subtitle: "Try the core diagnostic loop",
    features: ["3 AI scans per day", "Full diagnostic report", "Practice questions"],
    cta: "Start Free",
    ctaLink: "/signup",
    featured: false,
  },
  {
    name: "Pro",
    price: "9.99",
    cadence: "/month",
    subtitle: "For active tutors and daily use",
    features: ["Everything in Free", "Unlimited scans", "Save scan history", "Learning dashboard"],
    cta: "Upgrade to Pro",
    ctaLink: "/signup",
    featured: true,
  },
  {
    name: "School / Team",
    price: "Custom",
    cadence: "",
    subtitle: "For schools and multi-student teams",
    features: ["Bulk student licenses", "Teacher dashboard", "Analytics for learning gaps", "SSO integration"],
    cta: "Contact Us",
    ctaLink: "mailto:hello@gogodeep.ai",
    featured: false,
  },
];

const Pricing = () => {
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
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`flex flex-col border p-8 transition-all ${
                  plan.featured
                    ? "border-primary/40 bg-primary/5 shadow-lg shadow-primary/10"
                    : "border-border bg-card"
                }`}
              >
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-foreground">{plan.name}</h2>
                  {plan.featured && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                      <Sparkles className="h-3 w-3" />
                      Popular
                    </span>
                  )}
                </div>

                <p className="text-sm text-muted-foreground">{plan.subtitle}</p>
                <div className="mt-6">
                  {plan.price === "Custom" ? (
                    <span className="text-4xl font-extrabold text-foreground">Custom</span>
                  ) : (
                    <>
                      <span className="text-4xl font-extrabold text-foreground">${plan.price}</span>
                      <span className="ml-1 text-sm text-muted-foreground">{plan.cadence}</span>
                    </>
                  )}
                </div>

                <ul className="mt-8 flex-1 space-y-3 text-sm text-muted-foreground">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {plan.ctaLink.startsWith("mailto") ? (
                  <a href={plan.ctaLink}>
                    <Button variant="outline" className="mt-8 w-full border-border">
                      <Users className="mr-2 h-4 w-4" />
                      {plan.cta}
                    </Button>
                  </a>
                ) : (
                  <Link to={plan.ctaLink}>
                    <Button
                      className={`mt-8 w-full ${
                        plan.featured ? "bg-primary hover:bg-primary/90" : "bg-secondary text-foreground hover:bg-accent"
                      }`}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                )}
              </Card>
            ))}
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Pricing;
