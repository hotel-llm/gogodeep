import "@supabase/functions-js/edge-runtime.d.ts";
// @ts-ignore — Deno/esm.sh module, not resolved by tsc
import Stripe from "https://esm.sh/stripe@14?target=deno";
// @ts-ignore — Deno/esm.sh module, not resolved by tsc
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// @ts-ignore
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// @ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // @ts-ignore
    const supabase = createClient(
      // @ts-ignore
      Deno.env.get("SUPABASE_URL")!,
      // @ts-ignore
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      line_items: [
        {
          // @ts-ignore
          price: Deno.env.get("STRIPE_PRO_PRICE_ID")!,
          quantity: 1,
        },
      ],
      mode: "subscription",
      // @ts-ignore
      success_url: `${Deno.env.get("SITE_URL") ?? "https://gogodeep.com"}/dashboard?upgraded=1`,
      // @ts-ignore
      cancel_url: `${Deno.env.get("SITE_URL") ?? "https://gogodeep.com"}/pricing`,
      metadata: { userId: user.id },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
