const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WHALE_CREDIT_LIMIT = 100;

// Variable cost: 8–15 credits based on message length, giving uneven %
function messageCost(text: string): number {
  return 8 + Math.min(Math.floor(text.length / 60), 7);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

  try {
    const { messages, stepContext } = await req.json();

    // ── Auth & credit check ──────────────────────────────────────────────────
    const authHeader = req.headers.get("authorization");
    const jwt = authHeader?.replace("Bearer ", "");

    let userId: string | null = null;
    let plan = "free";
    let currentCredits = 0;
    const today = new Date().toISOString().split("T")[0];

    if (jwt) {
      // Identify user from JWT
      const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { "Authorization": `Bearer ${jwt}`, "apikey": SERVICE_KEY },
      });
      const userData = await userRes.json();
      userId = userData?.id ?? null;

      if (userId) {
        // Fetch profile
        const profileRes = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=plan,whale_chat_credits,whale_chat_date`,
          { headers: { "Authorization": `Bearer ${SERVICE_KEY}`, "apikey": SERVICE_KEY } }
        );
        const profiles = await profileRes.json();
        const profile = Array.isArray(profiles) ? profiles[0] : null;

        if (profile) {
          plan = profile.plan ?? "free";
          const isNewDay = profile.whale_chat_date !== today;
          currentCredits = isNewDay ? 0 : (profile.whale_chat_credits ?? 0);
        }
      }
    }

    // Enforce limit for non-deep users
    const lastMessage = messages[messages.length - 1]?.content ?? "";
    const cost = messageCost(lastMessage);

    if (plan !== "deep" && userId && currentCredits >= WHALE_CREDIT_LIMIT) {
      return new Response(
        JSON.stringify({
          error: "daily_limit_reached",
          creditsUsed: currentCredits,
          creditsLimit: WHALE_CREDIT_LIMIT,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── AI call ──────────────────────────────────────────────────────────────
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
        max_tokens: 420,
        system: `You are Whal-E, a study assistant inside Gogodeep. Format every response clearly:

FORMATTING RULES:
- Use # for a short section header when helpful (e.g. # Key Idea)
- Use - for bullet lists
- Use **word** to highlight key terms (they render bold and colored)
- Use $...$ for inline LaTeX math, $$...$$ for display math
- No em dashes. Use a comma or colon instead.
- No preamble, no filler like "Great question!" or "Sure!".
- Maximum 180 words. Short sentences.

Answer academic questions (maths, physics, chemistry, biology, etc.) using the scan context provided. Redirect off-topic messages back to studying.${stepContext ? `\n\nScan context:\n${stepContext}` : ""}`,
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

    // ── Increment credits after successful response ───────────────────────────
    const newCredits = currentCredits + cost;
    if (userId && plan !== "deep") {
      await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${SERVICE_KEY}`,
          "apikey": SERVICE_KEY,
          "Content-Type": "application/json",
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({ whale_chat_credits: newCredits, whale_chat_date: today }),
      });
    }

    return new Response(
      JSON.stringify({
        reply,
        creditsUsed: plan === "deep" ? 0 : newCredits,
        creditsLimit: WHALE_CREDIT_LIMIT,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
