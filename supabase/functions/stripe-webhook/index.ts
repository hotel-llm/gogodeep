import "@supabase/functions-js/edge-runtime.d.ts";
// @ts-ignore — Deno/esm.sh module, not resolved by tsc
import Stripe from "https://esm.sh/stripe@14?target=deno";
// @ts-ignore — Deno/esm.sh module, not resolved by tsc
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// @ts-ignore
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

// @ts-ignore
Deno.serve(async (req: Request) => {
  const sig = req.headers.get("stripe-signature");
  // @ts-ignore
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

  if (!sig || !webhookSecret) {
    return new Response("Missing signature", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(`Webhook error: ${message}`, { status: 400 });
  }

  // @ts-ignore
  const supabase = createClient(
    // @ts-ignore
    Deno.env.get("SUPABASE_URL")!,
    // @ts-ignore
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const customerId = session.customer as string;

    if (userId) {
      await supabase
        .from("profiles")
        .update({ plan: "pro", stripe_customer_id: customerId })
        .eq("id", userId);
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const customerId = sub.customer as string;

    // Downgrade user when subscription is cancelled
    await supabase
      .from("profiles")
      .update({ plan: "free" })
      .eq("stripe_customer_id", customerId);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
