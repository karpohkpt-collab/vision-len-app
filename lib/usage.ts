import { createClient } from "@/lib/supabase/client";

export async function getTodayUsageCount(anonId: string): Promise<number> {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("usage_counters")
    .select("scene_descriptions_count")
    .eq("anonymous_key", anonId)
    .eq("date", today)
    .maybeSingle();
  return data?.scene_descriptions_count ?? 0;
}
