import { constructWebhookEvent } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { logAudit, logTouchpoint } from "@/lib/db/actions";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * POST /api/webhooks/stripe
 * Register in Stripe dashboard → Webhooks → add endpoint → /api/webhooks/stripe
 * Required events: checkout.session.completed, customer.subscription.updated,
 * customer.subscription.created, customer.subscription.deleted
 */
export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(payload, signature);
  } catch (err) {
    console.error("[webhooks/stripe] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = await createClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        if (!userId || session.mode !== "subscription") break;

        await upsertSubscription(supabase, {
          stripeSubscriptionId: session.subscription as string,
          userId,
          stripeCustomerId: session.customer as string,
          plan: "pro",
          status: "active",
        });

        await logTouchpoint(supabase, userId, "payment_completed", {
          sessionId: session.id,
        });
        await logAudit(
          supabase,
          userId,
          "payment_completed",
          "subscriptions",
          null,
          { sessionId: session.id },
        );
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        if (!userId) break;

        await upsertSubscription(supabase, {
          stripeSubscriptionId: sub.id,
          userId,
          stripeCustomerId: sub.customer as string,
          plan: sub.status === "active" || sub.status === "trialing" ? "pro" : "free",
          status: sub.status,
          currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await supabase
          .from("subscriptions")
          .update({ status: "cancelled", plan: "free" })
          .eq("stripe_subscription_id", sub.id);
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error(`[webhooks/stripe] error handling ${event.type}:`, err);
    // Return 200 anyway — Stripe retries on 5xx, not on handler errors.
  }

  return NextResponse.json({ received: true });
}

async function upsertSubscription(
  supabase: SupabaseClient,
  params: {
    stripeSubscriptionId: string;
    userId: string;
    stripeCustomerId: string;
    plan: string;
    status: string;
    currentPeriodEnd?: string;
  },
) {
  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("stripe_subscription_id", params.stripeSubscriptionId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("subscriptions")
      .update({
        plan: params.plan,
        status: params.status,
        stripe_customer_id: params.stripeCustomerId,
        ...(params.currentPeriodEnd
          ? { current_period_end: params.currentPeriodEnd }
          : {}),
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("subscriptions").insert({
      user_id: params.userId,
      stripe_customer_id: params.stripeCustomerId,
      stripe_subscription_id: params.stripeSubscriptionId,
      plan: params.plan,
      status: params.status,
      current_period_end: params.currentPeriodEnd ?? null,
    });
  }
}
