import Anthropic from "@anthropic-ai/sdk";
import type { Hazard } from "./vision";

// Default per current Anthropic guidance; override with CLAUDE_MODEL env var
// (e.g. claude-haiku-4-5 for lower cost/latency).
const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? "claude-opus-4-8";

export function isClaudeConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function claudeSource(): string {
  return CLAUDE_MODEL;
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

const IMAGE_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;
type ImageMediaType = (typeof IMAGE_MEDIA_TYPES)[number];

function parseDataUrl(
  dataUrl: string,
): { mediaType: ImageMediaType; data: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const mediaType = match[1] as ImageMediaType;
  if (!IMAGE_MEDIA_TYPES.includes(mediaType)) return null;
  return { mediaType, data: match[2] };
}

const SCENE_SCHEMA = {
  type: "object",
  properties: {
    description: {
      type: "string",
      description: "Plain spoken description of the scene, 2-4 sentences",
    },
    hazards: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string" },
          detail: { type: "string" },
          severity: { type: "string", enum: ["high", "medium", "low"] },
        },
        required: ["type", "detail", "severity"],
        additionalProperties: false,
      },
    },
    scene_tags: { type: "array", items: { type: "string" } },
    confidence: { type: "number" },
  },
  required: ["description", "hazards", "scene_tags", "confidence"],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `You are Vision Len, an AI assistant describing a camera scene to a visually impaired person.
Rules:
- Flag anything that could cause a trip, collision, or safety risk as a hazard (traffic signals, steps, wet floors, obstacles, approaching vehicles).
- Use "high" severity for immediate danger (red lights, oncoming traffic, drops/steps), "medium" for caution items, "low" for informational.
- Write the description in the requested language.
- Be concrete about distances/directions when visible (e.g. "2 metres ahead on your right").`;

export async function describeSceneClaude(
  imageDataUrl: string,
  language: "en" | "zh",
): Promise<{
  description: string;
  hazards: Hazard[];
  scene_tags: string[];
  confidence: number;
}> {
  const image = parseDataUrl(imageDataUrl);
  if (!image) throw new Error("Unsupported image data URL");

  const langLabel = language === "zh" ? "Mandarin Chinese" : "English";
  const response = await getClient().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    // Scene extraction is a simple vision task and the PRD targets a <6s
    // spoken response — low effort keeps latency down.
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: SCENE_SCHEMA },
    },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: image.mediaType,
              data: image.data,
            },
          },
          {
            type: "text",
            text: `Describe this scene in ${langLabel}. Respond in ${langLabel} for the "description" field.`,
          },
        ],
      },
    ],
  });

  const text = response.content.find((b) => b.type === "text")?.text;
  if (!text) throw new Error("Empty Claude response");

  const parsed = JSON.parse(text);
  return {
    description: String(parsed.description ?? "").trim(),
    hazards: Array.isArray(parsed.hazards) ? parsed.hazards : [],
    scene_tags: Array.isArray(parsed.scene_tags) ? parsed.scene_tags : [],
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
  };
}

export async function answerQuestionClaude(
  question: string,
  sceneDescription: string,
  language: "en" | "zh",
): Promise<string> {
  const langLabel = language === "zh" ? "Mandarin Chinese" : "English";
  const response = await getClient().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 512,
    system: `You are Vision Len, helping a visually impaired user with follow-up questions about a scene you just described. Answer concisely in ${langLabel}, 1-3 sentences, concrete and actionable.`,
    output_config: { effort: "low" },
    messages: [
      {
        role: "user",
        content: `Scene description: "${sceneDescription}"\n\nQuestion: ${question}`,
      },
    ],
  });

  const text = response.content.find((b) => b.type === "text")?.text?.trim();
  if (!text) throw new Error("Empty Claude response");
  return text;
}
