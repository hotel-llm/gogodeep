import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Loader2, Mail, Lock, User } from "lucide-react";
import gogodeepLogo from "@/assets/gogodeep-logo.png";
import { whaleToast } from "@/lib/whaleToast";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import PageTransition from "@/components/PageTransition";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";

const Signup = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const pendingReport = (location.state as { pendingReport?: { imageUrl: string; diagnosis: unknown } } | null)?.pendingReport;

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const onSignup = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      whaleToast.error("Please enter a username.");
      return;
    }
    if (!isValidEmail(email)) {
      whaleToast.error("Please enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      whaleToast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      whaleToast.error("Passwords do not match.");
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username: username.trim() },
        },
      });
      setIsLoading(false);

      if (error) {
        if (error.message.toLowerCase().includes("already registered") || error.message.toLowerCase().includes("already exists")) {
          whaleToast.error("An account with that email already exists. Try logging in instead.");
        } else {
          whaleToast.error(error.message);
        }
        return;
      }

      if (pendingReport) {
        navigate("/report", { replace: true, state: pendingReport });
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setIsLoading(false);
      whaleToast.error("An unexpected error occurred. Please try again.");
    }
  };

  if (success) {
    return (
      <PageTransition>
        <div className="relative z-10 min-h-screen pt-20">
          <div className="container flex min-h-[calc(100vh-3.5rem)] items-center justify-center py-12">
            <Card className="w-full max-w-md border border-border bg-card p-10 text-center">
              <img src={gogodeepLogo} alt="Gogodeep — AI exam mistake helper for IB, AP, and A-Level STEM students" className="mx-auto h-14 w-14 object-contain" />
              <h1 className="mt-6 text-2xl font-bold tracking-tight text-foreground">Check your email</h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                We sent a confirmation link to <span className="font-medium text-foreground">{email}</span>. Click the link to activate your account.
              </p>
              <Link to="/login" className="mt-8 inline-block">
                <Button variant="outline" className="border-border">Back to Login</Button>
              </Link>
            </Card>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="relative z-10 min-h-screen pt-20">
        <div className="container flex min-h-[calc(100vh-3.5rem)] items-center justify-center py-12">
          <Card className="w-full max-w-md border border-border bg-card p-8">
            <div className="mb-6 flex flex-col items-center text-center">
              <img src={gogodeepLogo} alt="Gogodeep — AI exam mistake helper for IB, AP, and A-Level STEM students" className="h-12 w-12 object-contain" />
              <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">Create your account</h1>
              <p className="mt-2 text-sm text-muted-foreground">Start diagnosing misconceptions in minutes.</p>
            </div>

            <GoogleAuthButton label="Sign up with Google" />

            <div className="my-5 flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <form onSubmit={onSignup} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="signup-username" className="text-xs font-medium text-muted-foreground">Username</label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="signup-username" type="text" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} className="border-border bg-secondary pl-9" placeholder="Your name" required />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="signup-email" className="text-xs font-medium text-muted-foreground">Email</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="signup-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="border-border bg-secondary pl-9" placeholder="name@example.com" required />
                </div>
                {email.length > 0 && !isValidEmail(email) && (
                  <p className="text-xs text-destructive">Please enter a valid email address.</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="signup-password" className="text-xs font-medium text-muted-foreground">Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="signup-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="border-border bg-secondary pl-9" placeholder="Min 8 characters" required />
                </div>
                {password.length > 0 && password.length < 8 && (
                  <p className="text-xs text-destructive">Password must be at least 8 characters.</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="signup-confirm-password" className="text-xs font-medium text-muted-foreground">Confirm Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="signup-confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="border-border bg-secondary pl-9" placeholder="Re-enter password" required />
                </div>
                {confirmPassword.length > 0 && confirmPassword !== password && (
                  <p className="text-xs text-destructive">Passwords do not match.</p>
                )}
              </div>

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create Account
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
            </p>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
};

export default Signup;