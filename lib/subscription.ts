import { createClient } from "@/lib/supabase/client";

export type SubscriptionStatus = {
  isPro: boolean;
  plan: string;
  status: string;
};

export async function getSubscriptionStatus(
  anonId: string,
): Promise<SubscriptionStatus> {
  const supabase = createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", anonId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    isPro: data?.plan === "pro" && data?.status === "active",
    plan: data?.plan ?? "free",
    status: data?.status ?? "active",
  };
}
