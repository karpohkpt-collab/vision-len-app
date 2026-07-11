import { createClient } from "@/lib/supabase/client";

export type Preference = {
  id: string;
  language: "en" | "zh";
  wake_word_enabled: boolean;
};

export async function loadPreference(anonId: string): Promise<Preference | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("user_preferences")
    .select("id, language, wake_word_enabled")
    .eq("anonymous_key", anonId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Preference) ?? null;
}

export async function savePreference(
  anonId: string,
  patch: Partial<Pick<Preference, "language" | "wake_word_enabled">>,
): Promise<void> {
  const supabase = createClient();
  const existing = await loadPreference(anonId);
  if (existing) {
    await supabase.from("user_preferences").update(patch).eq("id", existing.id);
  } else {
    await supabase.from("user_preferences").insert({
      user_id: anonId,
      anonymous_key: anonId,
      language: "en",
      tts_speed: 1.0,
      wake_word_enabled: true,
      ...patch,
    });
  }
}
