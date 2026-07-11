# Tasks & Sprints

## Sprint 1 — DB, demo data, scene description engine
**Goal:** Core engine works end-to-end: camera → AI → DB → spoken description. App renders with seed data, no login needed.

- [ ] Run migration SQL — all tables created, RLS v1 policies applied, demo rows seeded
- [ ] Verify 4 demo scene_sessions render in session list (loading → ready states)
- [ ] Build camera capture component (mobile, getUserMedia)
- [ ] POST `/api/describe` — upload frame to Storage, call GPT-4o, write scene_session row
- [ ] Render scene description card (loading / empty / error / ready)
- [ ] Web Speech API TTS — speak description on load
- [ ] Handle API error: show "Vision couldn't see clearly — try again" message
- [ ] Handle empty state: "Point your camera to begin"

**Definition of Done:** Open app on mobile, tap capture, hear spoken description within 6 s, see the row in Supabase table. Demo rows visible without login.

---

## Sprint 2 — Hazard flagging + follow-up Q&A
**Goal:** Hazards are announced urgently; users can ask follow-up questions.

- [ ] Parse hazards[] from GPT-4o response; store with confidence + review_status
- [ ] High-contrast hazard alert card — spoken before full description
- [ ] POST `/api/qa` — send question + session context, store qa_exchange
- [ ] Q&A thread UI below description (loading / empty / error / ready)
- [ ] Voice input for question (Web Speech API recognition)

**Definition of Done:** Point at a scene with a hazard → hear hazard alert first → ask "how far?" → hear specific answer → qa_exchange row exists in DB.

---

## Sprint 3 — Wake word + multilingual TTS
**Goal:** Hands-free loop works; language switching persists.

- [ ] Continuous wake word listener ("Hey Vision") via Web Speech API
- [ ] Wake word → capture → describe → speak (no touch required)
- [ ] Language selector UI (EN / 中文 toggle)
- [ ] Persist language to user_preferences row (anonymous_key)
- [ ] AI prompt and TTS language match user preference
- [ ] Test full hands-free loop on iOS Safari + Android Chrome

**Definition of Done:** Say "Hey Vision" → hear Chinese description if preference is zh. Preference survives page refresh.

---

## Sprint 4 — Stripe checkout + paid tier ✦ v1 functional milestone
**Goal:** App earns real money. Free tier limits enforced. Pro upgrade works end-to-end.

- [ ] Usage gate: free = 10 descriptions/day; check usage_counter before each describe
- [ ] Upgrade CTA screen shown at limit ("You've used your 10 free scans today")
- [ ] POST `/api/checkout` — server-side Stripe Checkout session (key never in client)
- [ ] Stripe webhook `/api/webhooks/stripe` — update subscriptions row on success
- [ ] "Vision Pro active" confirmation screen post-payment
- [ ] Validate stripe-signature on every webhook
- [ ] Test: Stripe test-mode card → payment succeeds → DB subscription row created → Pro access granted

**Definition of Done:** Complete Stripe test payment, see "Vision Pro active", run 11+ descriptions without being blocked. Payment row in subscriptions table. ← **v1 functional milestone**

---

## Sprint 5 — Lock it down (auth + per-user RLS)
**Goal:** Real users' data is private. Anonymous → authenticated migration.

- [ ] Supabase Auth: email + magic link sign-up and login pages
- [ ] On sign-in: claim anonymous_key rows → assign user_id
- [ ] Replace all permissive RLS policies with `auth.uid() = user_id`
- [ ] Free tier limit tied to auth user_id (not just anonymous_key)
- [ ] Test: user A cannot read user B's scene_sessions
- [ ] Test: unauthenticated user gets public demo rows only

**Definition of Done:** Two test accounts created; each sees only their own sessions. Supabase security advisor shows no critical warnings.

---

## Sprint 6 — Lead capture, touchpoints, change requests
**Goal:** Builder can track interested users and feedback.

- [ ] Lead capture form on landing page (name, email, use-case) → leads table
- [ ] Auto-log touchpoints for: first_describe, upgrade_click, payment_complete
- [ ] Change request form (title, description, type) → change_requests table
- [ ] Admin view: table of leads + change_requests (authenticated, admin role only)
- [ ] CSV export of leads

**Definition of Done:** Submit lead form → row in leads table. Submit change request → row in change_requests. Admin page shows both lists.

---

## Sprint 7 — Walking directions
**Goal:** Continuous navigation guidance fusing GPS + scene description.

- [ ] GPS permission request + location capture
- [ ] Destination input (voice or text)
- [ ] POST `/api/navigate` — fuse GPS + scene → step-by-step spoken directions
- [ ] Interval capture (every 5 s while navigating) → continuous description
- [ ] Store navigation_sessions table (destination, steps[], status)

**Definition of Done:** Enter destination → hear first direction → walk 5 m → hear updated direction automatically.

---

## Gantt (sprint → feature)
```
Week 1:  Sprint 1 (DB + describe engine)
Week 1:  Sprint 2 (hazards + Q&A)
Week 2:  Sprint 3 (wake word + language)
Week 2:  Sprint 4 (Stripe + paid tier) ← v1 functional
Week 3:  Sprint 5 (auth + lock down)
Week 3:  Sprint 6 (leads + touchpoints)
Week 4+: Sprint 7 (navigation)
```
