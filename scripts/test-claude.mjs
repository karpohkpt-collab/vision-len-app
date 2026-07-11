// One-off verification of the Claude vision provider (run: node scripts/test-claude.mjs)
import Anthropic from "@anthropic-ai/sdk";

// 1x1 red pixel JPEG won't exercise vision meaningfully — draw a simple scene instead:
// a 64x64 PNG with a red circle is hard to generate dependency-free, so use a tiny
// base64 JPEG of solid red and just verify the pipeline + JSON contract.
const RED_JPEG_BASE64 =
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAQABADASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCYgAH/2Q==";

const client = new Anthropic();

const SCENE_SCHEMA = {
  type: "object",
  properties: {
    description: { type: "string" },
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
};

const t0 = Date.now();
const response = await client.messages.create({
  model: process.env.CLAUDE_MODEL ?? "claude-opus-4-8",
  max_tokens: 1024,
  system: "You are Vision Len, describing a camera scene to a visually impaired person.",
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
          source: { type: "base64", media_type: "image/jpeg", data: RED_JPEG_BASE64 },
        },
        { type: "text", text: "Describe this scene in English." },
      ],
    },
  ],
});

const text = response.content.find((b) => b.type === "text")?.text;
console.log("model:", response.model);
console.log("stop_reason:", response.stop_reason);
console.log("latency_s:", ((Date.now() - t0) / 1000).toFixed(1));
console.log("parsed:", JSON.parse(text));
