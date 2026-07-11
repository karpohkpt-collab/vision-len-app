# Test Plan

## Core Success Scenario (manual)
1. Open app on mobile browser — session list shows 4 demo scene descriptions. No login required.
2. Tap "Describe" — camera opens, frame captured, spinner shows "Vision is looking…"
3. Within 6 s: spoken description plays. Session card appears in list.
4. Tap the session card — description and hazard alert (if any) displayed.
5. Type or speak "Is it safe to continue?" — within 4 s hear spoken answer. `qa_exchange` row exists in Supabase.
6. Say "Hey Vision" — camera activates, new description spoken. No touch used.
7. Toggle language to 中文 — next description spoken in Chinese. Preference row updated in DB.
8. Hit daily free limit (10 descriptions) — see upgrade prompt.
9. Tap "Upgrade to Vision Pro" — Stripe Checkout opens.
10. Enter test card `4242 4242 4242 4242` — payment succeeds.
11. Return to app — see "Vision Pro active" banner. `subscriptions` row has `plan=pro, status=active`.
12. Describe 11th scene — no block. Succeeds.

## Empty States
- Fresh load (no sessions): "Point your camera to begin" with large camera icon.
- Q&A thread before first question: "Ask anything about what you see".
- No subscription row: treat as free tier.

## Error Cases
- OpenAI API timeout: show "Vision couldn't see clearly — tap to try again". No crash.
- Camera permission denied: show "Camera access needed — tap to open settings".
- Stripe Checkout cancelled: return to app, show "Upgrade cancelled — you're still on free tier".
- Webhook duplicate event: idempotent — check `stripe_subscription_id` before inserting.
- User at free limit, not upgraded: block describe, show upgrade screen, do not call OpenAI.

## DB Checks
- Every describe → `scene_sessions` row with `description`, `description_source`, `description_confidence`, `description_review_status` all populated.
- Every Q&A → `qa_exchanges` row with `session_id` FK pointing to correct session.
- Every payment → `subscriptions` row with `stripe_subscription_id`, `plan=pro`, `status=active`.
- Every meaningful action → `audit_logs` row written.

## Permission Check (post lock-down sprint)
- Log in as User A, create a session. Log out. Log in as User B. Confirm User B's session list does not include User A's sessions.
