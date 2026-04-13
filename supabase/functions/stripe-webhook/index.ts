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
    const planId = session.metadata?.planId ?? "intermediate";
    if (userId) {
      await supabase.from("profiles").update({ plan: planId, stripe_customer_id: customerId }).eq("id", userId);
    }
  }

  // Subscription updated mid-cycle (plan switch, cancellation scheduled, reactivation)
  if (event.type === "customer.subscription.updated") {
    const sub = event.data.object;
    // If cancel_at_period_end was just set, the user is still paid until period ends — do nothing.
    // Only act if the subscription is actively active or has a known plan item.
    if (sub.status === "active" && !sub.cancel_at_period_end) {
      // Determine plan from the price ID on the subscription
      const priceId = sub.items?.data?.[0]?.price?.id;
      // @ts-ignore
      const intermediatePriceId = Deno.env.get("STRIPE_INTERMEDIATE_PRICE_ID") ?? Deno.env.get("STRIPE_PRO_PRICE_ID");
      // @ts-ignore
      const deepPriceId = Deno.env.get("STRIPE_DEEP_PRICE_ID");
      const planId = priceId === deepPriceId ? "deep" : priceId === intermediatePriceId ? "intermediate" : null;
      if (planId) {
        await supabase.from("profiles").update({ plan: planId }).eq("stripe_customer_id", sub.customer);
      }
    }
  }

  // Subscription fully ended (period expired after cancellation, or immediate termination)
  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object;
    await supabase.from("profiles").update({ plan: "free" }).eq("stripe_customer_id", sub.customer);
  }

  // Renewal payment failed — downgrade immediately so the user can't keep a paid plan unpaid
  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object;
    // Only act on subscription invoices (not one-off)
    if (invoice.subscription && invoice.billing_reason === "subscription_cycle") {
      await supabase.from("profiles").update({ plan: "free" }).eq("stripe_customer_id", invoice.customer);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
