import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Camera, Microscope, Route, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import PageTransition from "@/components/PageTransition";
import gogodeepLogo from "@/assets/gogodeep-logo.png";

const steps = [
  { icon: Camera, step: "01", title: "Capture", desc: "Snap a photo of notebook, worksheet, or board work." },
  { icon: Microscope, step: "02", title: "Diagnose", desc: "Gogodeep finds the issue and reveals the underlying concept." },
  { icon: Route, step: "03", title: "Repair", desc: "Students complete targeted practice to repair their gap." },
];

const Home = () => {
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
        <section className="container py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div
              ref={logoRef}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className="relative mx-auto mb-8 inline-block"
              style={{ width: 120, height: 120 }}
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
                className="relative z-10 h-full w-full object-contain transition-transform duration-700"
                style={{
                  animation: "float 4s ease-in-out infinite",
                  transform: `translate(${eyeOffset.x * 0.3}px, ${eyeOffset.y * 0.3}px)`,
                }}
              />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Diagnostic Teaching</p>
            <h1 className="mt-6 text-5xl font-extrabold tracking-tight text-foreground md:text-6xl lg:text-7xl">
              Fix the thinking,<br />not just the answer.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Turn handwritten work into instant insight so you can fix the root misconceptions faster.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link to="/signup">
                <Button className="h-12 px-8 text-base font-semibold bg-primary hover:bg-primary/90">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/pricing">
                <Button variant="outline" className="h-12 border-border px-8 text-base font-medium text-foreground hover:bg-accent">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </section>

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

export default Home;
