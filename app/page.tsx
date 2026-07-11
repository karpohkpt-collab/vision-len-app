import { createClient } from "@/lib/supabase/server";
import VisionApp from "@/components/VisionApp";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("scene_sessions")
    .select("id, image_url, description, hazards, language, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  return <VisionApp initialSessions={data ?? []} />;
}
