import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Loader2, Mail, Lock } from "lucide-react";
import gogodeepLogo from "@/assets/gogodeep-logo.png";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import PageTransition from "@/components/PageTransition";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const locationState = location.state as { from?: string; pendingReport?: { imageUrl: string; diagnosis: unknown } } | null;
  const redirectTo = locationState?.from ?? "/lab";
  const pendingReport = locationState?.pendingReport;

  const onLogin = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setIsLoading(false);

      if (error) {
        console.error("Login error:", error);
        toast.error(error.message);
        return;
      }

      if (pendingReport) {
        navigate("/report", { replace: true, state: pendingReport });
      } else {
        navigate(redirectTo, { replace: true });
      }
    } catch (err) {
      setIsLoading(false);
      console.error("Login exception:", err);
      toast.error("An unexpected error occurred. Please try again.");
    }
  };

  return (
    <PageTransition>
      <div className="relative z-10 min-h-screen pt-14">
        <div className="container flex min-h-[calc(100vh-3.5rem)] items-center justify-center py-12">
          <Card className="w-full max-w-md border border-border bg-card p-8">
            <div className="mb-6 flex flex-col items-center text-center">
              <img src={gogodeepLogo} alt="Gogodeep — AI exam mistake helper for IB, AP, and A-Level STEM students" className="h-12 w-12 object-contain" />
              <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">Sign in to Gogodeep</h1>
              <p className="mt-2 text-sm text-muted-foreground">Enter your credentials to continue.</p>
            </div>

            <form onSubmit={onLogin} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="login-email" className="text-xs font-medium text-muted-foreground">Email</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="login-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="border-border bg-secondary pl-9" placeholder="name@example.com" required />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="login-password" className="text-xs font-medium text-muted-foreground">Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="border-border bg-secondary pl-9" placeholder="••••••••" required />
                </div>
              </div>

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Sign in
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/signup" className="font-medium text-primary hover:underline">Sign up</Link>
            </p>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
};

export default Login;
