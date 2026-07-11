# Architecture

## Stack
- **Frontend:** Next.js 14 (App Router) — mobile-first, PWA manifest
- **Backend:** Next.js API routes (server-side only for AI + Stripe calls)
- **Database:** Supabase (Postgres + RLS + Storage for images)
- **AI:** OpenAI GPT-4o Vision API (scene description, hazard extraction, Q&A)
- **TTS:** Web Speech API (client-side, zero latency, no cost)
- **Wake word:** Web Speech API continuous recognition
- **Payments:** Stripe Checkout + Webhooks
- **Hosting:** Vercel

## What to Build Now vs Later
| Now (v1) | Later |
|---|---|
| Camera → describe → speak | GPS walking directions |
| Hazard flagging | On-device offline model |
| Follow-up Q&A | Wearable support |
| Voice wake word | More languages |
| Stripe Pro checkout | Team/caregiver sharing |
| Demo data, no login needed | Per-user auth + RLS isolation |

## Key User Action — Step-by-Step
1. User says "Hey Vision" (or taps button)
2. Browser captures camera frame → uploads to Supabase Storage
3. API route sends image URL + language pref to GPT-4o Vision
4. GPT-4o returns description + hazard JSON
5. API writes `scene_session` row to Postgres
6. Client receives response → Web Speech API speaks description
7. If hazards detected → urgent alert spoken first
8. User asks follow-up → API sends question + image context → stores `qa_exchange` → speaks answer

## Layer Plan
1. **Data first** — tables, RLS, seed rows; app renders real data from day one
2. **App logic** — camera capture, API routes, TTS, usage gating, Stripe checkout
3. **Smart features** — AI description, hazard extraction, Q&A; all stored with source + confidence

## Core Without AI
If the OpenAI API is unavailable, the app shows the last known scene description from the database and displays a "Vision is unavailable — using last saved description" message. Session history, preferences, and payments all continue to work.
