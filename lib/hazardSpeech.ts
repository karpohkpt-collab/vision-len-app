import type { SceneSession } from "@/components/SceneCard";

/** Hazards spoken first (sorted high→low by the server), then the description. */
export function buildSpokenSequence(session: SceneSession): string[] {
  const lang = session.language === "zh" ? "zh" : "en";
  const hazards = session.hazards ?? [];
  const texts: string[] = [];

  if (hazards.length > 3) {
    texts.push(
      lang === "zh"
        ? `注意，检测到 ${hazards.length} 个危险。`
        : `Caution — ${hazards.length} hazards detected.`,
    );
  }
  for (const h of hazards) texts.push(h.detail);

  let description = session.description;
  const confidence = session.description_confidence;
  if (typeof confidence === "number" && confidence > 0 && confidence < 0.7) {
    description +=
      lang === "zh"
        ? " 我不完全确定——请核实。"
        : " I'm not fully certain — please verify.";
  }
  texts.push(description);

  return texts;
}
