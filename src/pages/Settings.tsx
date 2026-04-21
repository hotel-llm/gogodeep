import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Check } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageTransition from "@/components/PageTransition";
import { supabase } from "@/integrations/supabase/client";
import { applyColorMode, getStoredColorMode, type ColorMode } from "@/lib/theme";
import { whaleToast } from "@/lib/whaleToast";

export default function Settings() {
  const [user, setUser] = useState<User | null>(null);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [colorMode, setColorMode] = useState<ColorMode>(getStoredColorMode);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        setNewName(data.user.user_metadata?.username ?? data.user.email?.split("@")[0] ?? "");
      }
    });
  }, []);

  async function saveName() {
    if (!user || !newName.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.auth.updateUser({ data: { username: newName.trim() } });
    if (!error) {
      await (supabase as any).from("profiles").update({ username: newName.trim() }).eq("id", user.id);
      setUser(data.user);
      whaleToast.success("Name updated.");
    } else {
      whaleToast.error(error.message);
    }
    setSaving(false);
  }

  function applyTheme(mode: ColorMode) {
    applyColorMode(mode);
    setColorMode(mode);
  }

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "—";

  return (
    <PageTransition>
      <Helmet>
        <title>Settings · Gogodeep</title>
      </Helmet>
      <div className="relative z-10 min-h-screen pt-8">
        <div className="container max-w-2xl py-8">
          <h1 className="mb-8 text-2xl font-bold tracking-tight text-foreground">Settings</h1>

          {/* Profile */}
          <section className="mb-10">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Profile</h2>
            <div className="rounded-xl border border-border bg-card p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Display name</label>
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveName(); }}
                    className="border-border bg-secondary"
                    maxLength={40}
                  />
                  <Button
                    className="bg-primary hover:bg-primary/90 shrink-0"
                    onClick={saveName}
                    disabled={saving || !newName.trim()}
                  >
                    Save
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Email</p>
                <p className="text-sm text-foreground">{user?.email ?? "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Member since</p>
                <p className="text-sm text-foreground">{memberSince}</p>
              </div>
            </div>
          </section>

          {/* Theme */}
          <section>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Theme</h2>
            <div className="grid grid-cols-3 gap-4">
              <ThemeCard label="Light" active={colorMode === "white"} onClick={() => applyTheme("white")}>
                <div className="h-full w-full rounded-lg bg-[#efefef] p-2.5">
                  <div className="h-full rounded-md bg-white p-2 flex items-center justify-center shadow-sm">
                    <span className="text-[1.6rem] font-bold text-black leading-none">Aa</span>
                  </div>
                </div>
              </ThemeCard>

              <ThemeCard label="Dark" active={colorMode === "dark"} onClick={() => applyTheme("dark")}>
                <div className="h-full w-full rounded-lg bg-[#111113] p-2.5">
                  <div className="h-full rounded-md bg-[#1c1c1f] p-2 flex items-center justify-center">
                    <span className="text-[1.6rem] font-bold text-white leading-none">Aa</span>
                  </div>
                </div>
              </ThemeCard>

              <ThemeCard label="System" active={colorMode === "auto"} onClick={() => applyTheme("auto")}>
                <div className="h-full w-full overflow-hidden rounded-lg flex">
                  <div className="flex-1 bg-white flex items-center justify-center">
                    <span className="text-[1.1rem] font-bold text-black leading-none">Aa</span>
                  </div>
                  <div className="flex-1 bg-[#1c1c1f] flex items-center justify-center">
                    <span className="text-[1.1rem] font-bold text-white leading-none">Aa</span>
                  </div>
                </div>
              </ThemeCard>
            </div>
          </section>
        </div>
      </div>
    </PageTransition>
  );
}

function ThemeCard({
  label, active, onClick, children,
}: {
  label: string; active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col gap-2 rounded-xl border-2 p-1.5 text-left transition-all ${
        active ? "border-primary" : "border-border hover:border-muted-foreground/50"
      }`}
    >
      <div className="h-24 w-full overflow-hidden rounded-lg">
        {children}
      </div>
      <div className="flex items-center justify-between px-1 pb-0.5">
        <span className="text-sm text-muted-foreground">{label}</span>
        {active && (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
            <Check className="h-3 w-3 text-primary-foreground" />
          </div>
        )}
      </div>
    </button>
  );
}
