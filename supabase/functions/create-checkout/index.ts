import "@supabase/functions-js/edge-runtime.d.ts";
// @ts-ignore
import Stripe from "https://esm.sh/stripe@14?target=deno&no-check";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// @ts-ignore
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

// @ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, email } = await req.json();

    if (!userId || !email) {
      return new Response(JSON.stringify({ error: "Missing userId or email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // @ts-ignore
    const priceId = Deno.env.get("STRIPE_PRO_PRICE_ID");
    // @ts-ignore
    const siteUrl = Deno.env.get("SITE_URL") ?? "https://gogodeep.com";

    if (!priceId) {
      return new Response(JSON.stringify({ error: "STRIPE_PRO_PRICE_ID not set" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${siteUrl}/?upgraded=1`,
      cancel_url: `${siteUrl}/pricing`,
      metadata: { userId },
    });

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
