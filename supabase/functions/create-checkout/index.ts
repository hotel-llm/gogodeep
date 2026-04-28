Deno.serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, email, planId, billing = "monthly" } = await req.json();

    if (!userId || !email) {
      return new Response(JSON.stringify({ error: "Missing userId or email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const siteUrl = Deno.env.get("SITE_URL") ?? "https://gogodeep.com";

    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "STRIPE_SECRET_KEY not set" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const PRICE_IDS: Record<string, string | undefined> = {
      intermediate_monthly: Deno.env.get("STRIPE_INTERMEDIATE_PRICE_ID") ?? Deno.env.get("STRIPE_PRO_PRICE_ID"),
      intermediate_annual:  Deno.env.get("STRIPE_INTERMEDIATE_ANNUAL_PRICE_ID"),
      deep_monthly:         Deno.env.get("STRIPE_DEEP_PRICE_ID"),
      deep_annual:          Deno.env.get("STRIPE_DEEP_ANNUAL_PRICE_ID"),
    };

    const priceKey = `${planId}_${billing === "annual" ? "annual" : "monthly"}`;
    const priceId = PRICE_IDS[priceKey] ?? PRICE_IDS[`${planId}_monthly`];
    if (!priceId) {
      return new Response(JSON.stringify({ error: "No price ID configured for this plan" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const params = new URLSearchParams({
      "customer_email": email,
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      "mode": "subscription",
      "success_url": `${siteUrl}/?upgraded=1`,
      "cancel_url": `${siteUrl}/pricing`,
      "metadata[userId]": userId,
      "metadata[planId]": planId ?? "intermediate",
    });

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const session = await stripeRes.json();

    if (!stripeRes.ok) {
      return new Response(JSON.stringify({ error: session.error?.message ?? "Stripe error" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
