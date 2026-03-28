import "@supabase/functions-js/edge-runtime.d.ts";
// @ts-ignore
import Stripe from "https://esm.sh/stripe@14?target=deno&no-check";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// @ts-ignore
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

// @ts-ignore
Deno.serve(async (req: Request) => {
  const sig = req.headers.get("stripe-signature");
  // @ts-ignore
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

  if (!sig || !webhookSecret) {
    return new Response("Missing signature or secret", { status: 400 });
  }

  let event: any;
  try {
    const body = await req.text();
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(`Webhook signature error: ${message}`, { status: 400 });
  }

  // @ts-ignore
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    const customerId = session.customer;
    if (userId) {
      await supabase.from("profiles").update({ plan: "pro", stripe_customer_id: customerId }).eq("id", userId);
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object;
    await supabase.from("profiles").update({ plan: "free" }).eq("stripe_customer_id", sub.customer);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
