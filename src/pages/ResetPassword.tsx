import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Lock } from "lucide-react";
import gogodeepLogo from "@/assets/gogodeep-logo.png";
import { whaleToast } from "@/lib/whaleToast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import PageTransition from "@/components/PageTransition";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase processes the hash before the component mounts — check it directly first
    if (window.location.hash.includes("type=recovery")) {
      setReady(true);
      return;
    }
    // Fallback: catch the event if the component mounted before Supabase processed the hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { whaleToast.error("Password must be at least 8 characters."); return; }
    if (password !== confirm) { whaleToast.error("Passwords do not match."); return; }
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);
    if (error) { whaleToast.error(error.message); return; }
    setDone(true);
    setTimeout(() => navigate("/login", { replace: true }), 2500);
  };

  return (
    <PageTransition>
      <div className="relative z-10 min-h-screen pt-20">
        <div className="container flex min-h-[calc(100vh-3.5rem)] items-center justify-center py-12">
          <Card className="w-full max-w-md border border-border bg-card p-8 text-center">
            <img src={gogodeepLogo} alt="Gogodeep" className="mx-auto h-12 w-12 object-contain" />

            {done ? (
              <>
                <h1 className="mt-4 text-2xl font-bold text-foreground">Password updated</h1>
                <p className="mt-2 text-sm text-muted-foreground">Redirecting you to log in…</p>
              </>
            ) : !ready ? (
              <>
                <h1 className="mt-4 text-2xl font-bold text-foreground">Checking link…</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  If this takes too long, your reset link may have expired.{" "}
                  <button onClick={() => navigate("/login")} className="text-primary hover:underline">Go back</button>.
                </p>
              </>
            ) : (
              <>
                <h1 className="mt-4 text-2xl font-bold text-foreground">Set a new password</h1>
                <p className="mt-2 mb-6 text-sm text-muted-foreground">Choose a strong password for your account.</p>
                <form onSubmit={onSubmit} className="space-y-4 text-left">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">New password</label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="border-border bg-secondary pl-9" placeholder="Min 8 characters" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Confirm password</label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="border-border bg-secondary pl-9" placeholder="Re-enter password" required />
                    </div>
                    {confirm.length > 0 && confirm !== password && (
                      <p className="text-xs text-destructive">Passwords do not match.</p>
                    )}
                  </div>
                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Update password
                  </Button>
                </form>
              </>
            )}
          </Card>
        </div>
      </div>
    </PageTransition>
  );
};

export default ResetPassword;
