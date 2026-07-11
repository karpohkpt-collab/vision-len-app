# Intelligence Layer

## Messy Input
A raw camera frame (JPEG) + user language preference + optional prior scene context.

## Auto-Structure Schema (GPT-4o response parsed to)
```json
{
  "description": "You are standing at a pedestrian crosswalk...",
  "hazards": [
    {
      "type": "traffic_signal",
      "detail": "Red signal — do not cross",
      "severity": "high"
    }
  ],
  "scene_tags": ["outdoor", "crosswalk", "urban"],
  "confidence": 0.94
}
```
All fields stored with `_source`, `_confidence`, `_review_status`.

## Events to Track
- `scene_described` — image sent, description returned
- `hazard_detected` — at least one hazard in response
- `qa_asked` — follow-up question submitted
- `tts_played` — spoken output delivered
- `wake_word_triggered` — hands-free activation
- `upgrade_clicked` — user tapped Pro CTA
- `payment_completed` — Stripe webhook confirmed

## Scoring Rules (rule-based v1)
- Hazard severity: `critical` keywords ("step", "traffic", "fire") → severity=high, spoken first
- Confidence < 0.7 → append "I'm not fully certain — please verify"
- > 3 hazards in scene → trigger summary alert before full description

## What Gets Ranked
- Session history sorted by `created_at DESC`
- Hazards sorted by `severity` (high → medium → low) before being spoken

## v1 vs Later
| v1 | Later |
|---|---|
| Rule-based hazard severity | Fine-tuned hazard classifier |
| Confidence threshold warning | Active learning from user corrections |
| Language from preference | Auto-detect spoken language |
| GPT-4o prompt engineering | On-device vision model (offline) |
