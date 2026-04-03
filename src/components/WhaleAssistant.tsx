import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { X, Send, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// Drop the Whal-E image at public/whale-e.png — no build step needed
const WHALE_IMG = "/whale-e.png";

function WhaleAvatar({ className }: { className?: string }) {
  const [err, setErr] = useState(false);
  return err ? (
    <span className={cn("flex items-center justify-center rounded-full bg-primary/10 text-lg", className)}>🐋</span>
  ) : (
    <img src={WHALE_IMG} alt="Whal-E" onError={() => setErr(true)} className={cn("rounded-full object-cover", className)} />
  );
}

type Message = { role: "user" | "assistant"; content: string };

const SYSTEM_PROMPT = `You are Whal-E, the friendly assistant inside Gogodeep — a study tool that helps students diagnose errors in their work and master the underlying concepts.

How Gogodeep works:
- Diagnostic Lab (/lab): Students upload a photo of a question they're stuck on, or their working for a tough problem. They choose between "Guide me" (step-by-step solution) or "Find my error" (pinpoints what went wrong).
- Report page (/report): After a scan, results appear in three tabs — "Step by Step" (guided solution), "Concept" (the underlying concept explained), and "Practice" (tailored practice questions with reveal-answer buttons). Practice questions also have a "Scan this question" button to run a new scan on them.
- Sidebar: Scan history is saved here. Scans can be organised into colour-coded folders. Clicking a past scan reopens its report.
- Dashboard (/): Shows total scans, daily credits remaining with a countdown to reset, login streak with a 7-day bonus progress bar, a Recap Quiz (Intermediate/Deep only — 2 questions from each of your last 5 scans), and a quote of the day.
- Pricing (/pricing): Free (3 scans/day, 10 bonus credits on 7-day streak), Intermediate (10 scans/day, Whal-E chat, 20 bonus credits on 7-day streak), Deep (unlimited scans, Whal-E chat, streak display).

Your role:
- Answer questions about academic concepts (maths, physics, chemistry, biology, etc.) clearly and step by step
- Help users navigate and understand Gogodeep's features
- Keep responses concise and student-friendly
- Encourage students when they're stuck
- If asked something off-topic, gently redirect to studying or Gogodeep`;

const GREETING = "Hey! I'm Whal-E 👋 Ask me anything about a concept you're studying, or how to use Gogodeep.";

export default function WhaleAssistant() {
  const navigate = useNavigate();
  const [plan, setPlan] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setPlan("free"); return; }
      const { data } = await (supabase as any)
        .from("profiles")
        .select("plan")
        .eq("id", user.id)
        .single();
      setPlan(data?.plan ?? "free");
    });
  }, []);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  function handleOpen() {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (messages.length === 0) {
      setMessages([{ role: "assistant", content: GREETING }]);
    }
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next: Message[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("chat-assistant", {
        body: { messages: next.map((m) => ({ role: m.role, content: m.content })) },
      });
      if (error || (data as any)?.error) throw new Error((error as any)?.message ?? (data as any)?.error);
      setMessages((prev) => [...prev, { role: "assistant", content: (data as any).reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Something went wrong. Try again in a moment." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={handleOpen}
        title={open ? "Close" : "Ask Whal-E"}
        className="group fixed bottom-6 right-6 z-50 flex h-14 items-center overflow-hidden rounded-full border border-border bg-card shadow-xl transition-all duration-300 ease-out hover:pr-5"
      >
        <div className="relative h-14 w-14 shrink-0">
          <WhaleAvatar className="h-14 w-14 p-1" />
          {open && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40">
                <X className="h-4 w-4 text-white/70" />
              </div>
            </div>
          )}
        </div>
        {!open && (
          <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold text-foreground transition-all duration-300 ease-out group-hover:max-w-[100px] group-hover:pl-1">
            Ask Whal-E
          </span>
        )}
      </button>

      {/* Upgrade dialog for free users */}
      <Dialog open={showUpgrade} onOpenChange={setShowUpgrade}>
        <DialogContent className="border border-border bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-foreground">
              <WhaleAvatar className="h-9 w-9 shrink-0" />
              Meet Whal-E
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Whal-E is your personal study assistant — ask him anything about a concept, a question you're stuck on, or how to navigate Gogodeep. Available on Intermediate and Deep plans.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" className="border-border" onClick={() => setShowUpgrade(false)}>Not now</Button>
            <Button className="bg-primary hover:bg-primary/90" onClick={() => navigate("/pricing")}>
              View plans
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chat panel */}
      {open && (
        <div className="animate-in fade-in slide-in-from-bottom-3 duration-200 fixed bottom-24 right-6 z-50 flex w-[340px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-secondary/50 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <WhaleAvatar className="h-8 w-8 shrink-0" />
              <p className="text-sm font-semibold text-foreground">Whal-E</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex h-80 flex-col gap-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex animate-in fade-in duration-150", m.role === "user" ? "justify-end" : "justify-start")}>
                {m.role === "assistant" && (
                  <WhaleAvatar className="mr-2 mt-1 h-6 w-6 shrink-0 self-start" />
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-secondary/60 text-foreground"
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2">
                <WhaleAvatar className="h-6 w-6 shrink-0" />
                <div className="flex items-center gap-1.5 rounded-2xl border border-border bg-secondary/60 px-3 py-2">
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Thinking…</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border p-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Ask anything…"
                className="flex-1 resize-none rounded-xl border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                style={{ maxHeight: 96 }}
              />
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity disabled:opacity-40 hover:bg-primary/90"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
