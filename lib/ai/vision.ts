import {
  answerQuestionClaude,
  claudeSource,
  describeSceneClaude,
  isClaudeConfigured,
} from "./claude";

export type Hazard = {
  type: string;
  detail: string;
  severity: "high" | "medium" | "low";
};

export type SceneResult = {
  description: string;
  hazards: Hazard[];
  scene_tags: string[];
  confidence: number;
  source: string;
};

const SEVERITY_RANK: Record<Hazard["severity"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function sortHazards(hazards: Hazard[]): Hazard[] {
  return [...hazards].sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity],
  );
}

/**
 * Provider config — any OpenAI-compatible chat-completions endpoint works:
 *   OpenAI:  OPENAI_API_KEY=sk-...                          (default base URL, model gpt-4o)
 *   Ollama:  OPENAI_BASE_URL=http://localhost:11434/v1  VISION_MODEL=qwen2.5vl:3b  (no key needed)
 */
const DEFAULT_BASE_URL = "https://api.openai.com/v1";

function providerConfig() {
  const baseUrl = (process.env.OPENAI_BASE_URL ?? DEFAULT_BASE_URL).replace(
    /\/+$/,
    "",
  );
  const apiKey = process.env.OPENAI_API_KEY;
  const isCustom = baseUrl !== DEFAULT_BASE_URL;
  return {
    baseUrl,
    apiKey,
    model: process.env.VISION_MODEL ?? "gpt-4o",
    // A custom endpoint (e.g. local Ollama) doesn't need an API key.
    configured: Boolean(apiKey) || isCustom,
    // Local models are slower than hosted APIs — give them room.
    timeoutMs: isCustom ? 120000 : 15000,
    source: isCustom ? `local-${process.env.VISION_MODEL ?? "unknown"}` : "openai-gpt4o",
  };
}

async function chatCompletion(
  body: Record<string, unknown>,
): Promise<string> {
  const { baseUrl, apiKey, timeoutMs } = providerConfig();
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    throw new Error(`Vision API error: ${res.status}`);
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty vision API response");
  return content;
}

const SYSTEM_PROMPT = `You are Vision Len, an AI assistant describing a camera scene to a visually impaired person.
Respond ONLY with strict JSON matching this shape:
{
  "description": "plain spoken description of the scene, 2-4 sentences",
  "hazards": [{"type": "string", "detail": "string", "severity": "high"|"medium"|"low"}],
  "scene_tags": ["string"],
  "confidence": 0.0-1.0
}
Rules:
- Flag anything that could cause a trip, collision, or safety risk as a hazard (traffic signals, steps, wet floors, obstacles, approaching vehicles).
- Use "high" severity for immediate danger (red lights, oncoming traffic, drops/steps), "medium" for caution items, "low" for informational.
- Write the description in the requested language.
- Be concrete about distances/directions when visible (e.g. "2 metres ahead on your right").`;

export async function describeScene(
  imageDataUrl: string,
  language: "en" | "zh",
): Promise<SceneResult> {
  // Claude (Anthropic API) is the preferred provider when configured —
  // used in production on Vercel. OpenAI-compatible (incl. local Ollama)
  // is the fallback provider for local dev.
  if (isClaudeConfigured()) {
    try {
      const result = await describeSceneClaude(imageDataUrl, language);
      return { ...result, source: claudeSource() };
    } catch (err) {
      console.error("[vision] describeSceneClaude failed:", err);
      return fallbackScene(language, "fallback-error");
    }
  }

  const provider = providerConfig();

  if (!provider.configured) {
    return fallbackScene(language, "openai-not-configured");
  }

  try {
    const langLabel = language === "zh" ? "Mandarin Chinese" : "English";
    const content = await chatCompletion({
      model: provider.model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Describe this scene in ${langLabel}. Respond in ${langLabel} for the "description" field.`,
            },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ],
        },
      ],
      max_tokens: 500,
    });

    const parsed = JSON.parse(content);
    return {
      description: String(parsed.description ?? "").trim(),
      hazards: Array.isArray(parsed.hazards) ? parsed.hazards : [],
      scene_tags: Array.isArray(parsed.scene_tags) ? parsed.scene_tags : [],
      confidence:
        typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
      source: provider.source,
    };
  } catch (err) {
    console.error("[vision] describeScene failed:", err);
    return fallbackScene(language, "fallback-error");
  }
}

export async function answerQuestion(
  question: string,
  sceneDescription: string,
  language: "en" | "zh",
): Promise<{ answer: string; confidence: number; source: string }> {
  if (isClaudeConfigured()) {
    try {
      const answer = await answerQuestionClaude(
        question,
        sceneDescription,
        language,
      );
      return { answer, confidence: 0.9, source: claudeSource() };
    } catch (err) {
      console.error("[vision] answerQuestionClaude failed:", err);
      return fallbackAnswer(language, "fallback-error");
    }
  }

  const provider = providerConfig();

  if (!provider.configured) {
    return fallbackAnswer(language, "openai-not-configured");
  }

  try {
    const langLabel = language === "zh" ? "Mandarin Chinese" : "English";
    const answer = (
      await chatCompletion({
        model: provider.model,
        messages: [
          {
            role: "system",
            content: `You are Vision Len, helping a visually impaired user with follow-up questions about a scene you just described. Answer concisely in ${langLabel}, 1-3 sentences, concrete and actionable.`,
          },
          {
            role: "user",
            content: `Scene description: "${sceneDescription}"\n\nQuestion: ${question}`,
          },
        ],
        max_tokens: 200,
      })
    ).trim();

    return { answer, confidence: 0.85, source: provider.source };
  } catch (err) {
    console.error("[vision] answerQuestion failed:", err);
    return fallbackAnswer(language, "fallback-error");
  }
}

function fallbackScene(language: "en" | "zh", source: string): SceneResult {
  const description =
    language === "zh"
      ? "视觉助手暂时不可用 — 正在显示上一次保存的描述。请稍后再试。"
      : "Vision is unavailable — using last saved description. Please try again shortly.";
  return { description, hazards: [], scene_tags: [], confidence: 0, source };
}

function fallbackAnswer(language: "en" | "zh", source: string) {
  const answer =
    language === "zh"
      ? "视觉问答暂时不可用，请稍后再试。"
      : "Vision Q&A is unavailable right now — please try again shortly.";
  return { answer, confidence: 0, source };
}
