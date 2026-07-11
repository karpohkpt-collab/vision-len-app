# Agentic Layer

## Risk Levels & Actions

### Low — Auto-execute (no approval)
- `describe_scene` — capture frame → call GPT-4o → store scene_session → speak result
- `extract_hazards` — parse AI response → populate hazards[] → trigger alert if high severity
- `answer_question` — send Q + context → store qa_exchange → speak answer
- `increment_usage` — update usage_counter on each description
- `log_touchpoint` — record key user events to touchpoints table

### Medium — Light approval (confirm before executing)
- `change_language` — switch TTS + AI response language (confirm: "Switch to Chinese?")
- `reset_daily_usage` — admin action to clear a user's usage counter

### High — Explicit user approval required
- `initiate_checkout` — create Stripe Checkout session and redirect (user taps "Confirm upgrade")
- `send_support_email` — draft shown to user before sending

### Critical — Human-only, never automated
- `issue_refund` — must be done by a human in Stripe dashboard
- `delete_account` — irreversible; requires human confirmation + audit
- `bulk_data_export` — PII export requires human review

## Named Tools (approved list)
- `vision_describe(image_url, language)` → GPT-4o Vision
- `tts_speak(text, language, speed)` → Web Speech API
- `stripe_create_checkout(plan, user_id)` → Stripe API (server-side only)
- `supabase_insert(table, row)` → Supabase client
- `supabase_update(table, id, patch)` → Supabase client

Raw `run_any` or `send_any` are never permitted.

## Audit Log Fields
`action | table_name | record_id | payload (JSON) | user_id | created_at`

Every Low-and-above action writes an audit_log row before execution.

## v1 vs Later
| v1 | Later |
|---|---|
| Auto-describe on wake word | Continuous navigation loop |
| Rule-based hazard alert | AI agent re-routes around hazard |
| Stripe checkout link | Auto-retry failed payments (high risk — approval gate) |
