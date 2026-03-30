const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: `You are Whal-E, the friendly assistant inside Gogodeep — a study tool that helps students diagnose errors in their work and master the underlying concepts.

How Gogodeep works:
- Diagnostic Lab: Students upload a photo of a question they're stuck on or their working. They choose "Guide me" (step-by-step solution) or "Find my error" (pinpoints what went wrong).
- Report page: Results appear in three tabs — Step by Step, Concept (underlying concept explained), and Practice (tailored questions with reveal-answer buttons). Practice questions have a "Scan this question" button.
- Sidebar: Scan history is saved here, organised into colour-coded folders.
- Dashboard: Shows total scans, daily credits, login streak (7-day bonus progress), Recap Quiz (Intermediate/Deep only), and a quote of the day.
- Plans: Free (3 scans/day), Intermediate (10 scans/day, Whal-E chat, 20 bonus credits on 7-day streak), Deep (unlimited scans, Whal-E chat).

Your role:
- Answer academic questions clearly and concisely (maths, physics, chemistry, biology, etc.)
- Help students understand and navigate Gogodeep's features
- Use step-by-step explanations when solving problems
- Keep responses student-friendly — no unnecessary jargon
- Encourage students when they're stuck
- If asked something off-topic, gently redirect to studying or Gogodeep`,
        messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: data.error?.message ?? "AI request failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const reply = data.content?.[0]?.text ?? "";
    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
