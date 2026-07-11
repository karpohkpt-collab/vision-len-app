import type { SupabaseClient } from "@supabase/supabase-js";

const FREE_DAILY_LIMIT = 10;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function logTouchpoint(
  supabase: SupabaseClient,
  anonId: string,
  eventType: string,
  metadata: Record<string, unknown> = {},
) {
  await supabase.from("touchpoints").insert({
    user_id: anonId,
    anonymous_key: anonId,
    event_type: eventType,
    metadata,
  });
}

export async function logAudit(
  supabase: SupabaseClient,
  anonId: string | null,
  action: string,
  tableName: string,
  recordId: string | null,
  payload: Record<string, unknown> = {},
) {
  await supabase.from("audit_logs").insert({
    user_id: anonId,
    action,
    table_name: tableName,
    record_id: recordId,
    payload,
  });
}

export async function isProUser(
  supabase: SupabaseClient,
  anonId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", anonId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.plan === "pro" && data?.status === "active";
}

export async function getTodayUsageCount(
  supabase: SupabaseClient,
  anonId: string,
): Promise<number> {
  const { data } = await supabase
    .from("usage_counters")
    .select("scene_descriptions_count")
    .eq("anonymous_key", anonId)
    .eq("date", today())
    .maybeSingle();

  return data?.scene_descriptions_count ?? 0;
}

export async function incrementUsageCount(
  supabase: SupabaseClient,
  anonId: string,
): Promise<number> {
  const date = today();
  const { data: existing } = await supabase
    .from("usage_counters")
    .select("id, scene_descriptions_count")
    .eq("anonymous_key", anonId)
    .eq("date", date)
    .maybeSingle();

  if (existing) {
    const next = existing.scene_descriptions_count + 1;
    await supabase
      .from("usage_counters")
      .update({ scene_descriptions_count: next })
      .eq("id", existing.id);
    return next;
  }

  await supabase.from("usage_counters").insert({
    user_id: anonId,
    anonymous_key: anonId,
    date,
    scene_descriptions_count: 1,
  });
  return 1;
}

export { FREE_DAILY_LIMIT };
