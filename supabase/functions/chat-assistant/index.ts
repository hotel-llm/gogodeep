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
    const { messages, stepContext } = await req.json();

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
        max_tokens: 250,
        system: `You are Whal-E, a study assistant inside Gogodeep. Rules you must follow:
- Plain text only. No markdown — no **, no __, no ##, no bullet hyphens, no $$ or $ for math. Write math inline as plain text (e.g. "v = sqrt(2gh)").
- Maximum 3 sentences. If a step-by-step is needed, maximum 4 numbered steps, one line each.
- No preamble, no summary, no filler phrases like "Great question!".

Gogodeep: Diagnostic Lab (upload question, choose Guide me or Find my error), Report page (Step by Step, Concept, Practice tabs), scan history sidebar, dashboard with daily credits and login streak. Plans: Free 3 scans/day, Intermediate 10/day, Deep unlimited.

Answer academic questions (maths, physics, chemistry, biology, etc.), help with Gogodeep navigation, redirect off-topic messages back to studying.${stepContext ? `\n\nThe student is asking about a specific step from their scan. Use this as your primary context for the conversation:\n${stepContext}` : ""}`,
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
