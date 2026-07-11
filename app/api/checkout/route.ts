import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCheckoutSession } from "@/lib/stripe";
import { logAudit } from "@/lib/db/actions";

export async function POST(request: Request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        {
          error:
            "Payments aren't configured yet — add STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET and a price ID to Vercel env to enable checkout.",
        },
        { status: 501 },
      );
    }

    const body = await request.json();
    const { anonId } = body as { anonId?: string };
    if (!anonId) {
      return NextResponse.json({ error: "anonId is required" }, { status: 400 });
    }

    const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY;
    if (!priceId) {
      return NextResponse.json(
        {
          error:
            "No Stripe price configured — set NEXT_PUBLIC_STRIPE_PRICE_MONTHLY in Vercel env.",
        },
        { status: 501 },
      );
    }

    const origin =
      request.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";

    const session = await createCheckoutSession({
      priceId,
      userId: anonId,
      successUrl: `${origin}/?checkout=success`,
      cancelUrl: `${origin}/?checkout=cancel`,
      mode: "subscription",
    });

    const supabase = await createClient();
    await logAudit(supabase, anonId, "initiate_checkout", "subscriptions", null, {
      priceId,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[api/checkout]", err);
    return NextResponse.json(
      { error: "Couldn't start checkout — try again" },
      { status: 500 },
    );
  }
}
