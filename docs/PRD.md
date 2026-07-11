# Vision Len — Product Requirements Document

## Problem
Visually impaired users cannot safely and independently navigate unfamiliar environments using a smartphone. Existing tools are fragmented: separate apps for navigation, hazard detection, and Q&A, none hands-free.

## Target User
Primary: visually impaired adults using a smartphone as their primary digital tool. Secondary: caregivers who set the app up for a family member.

## Core Objects
- **scene_session** — one camera capture event: image, AI description, hazard flags, language
- **qa_exchange** — a follow-up question + AI answer tied to a scene_session
- **subscription** — free or Pro plan, Stripe-backed
- **usage_counter** — daily description count per user/device
- **user_preference** — language, TTS speed, wake-word on/off
- **lead** — email captured before sign-up
- **touchpoint** — logged user interaction event
- **change_request** — user-submitted feature or bug report

## MVP Must-Haves (v1)
- [ ] Point camera → AI describes scene in plain spoken English or Chinese
- [ ] Hazards extracted and announced urgently (e.g. "Wet floor 2 m ahead")
- [ ] Follow-up voice/text question answered in context of current scene
- [ ] "Hey Vision" wake word triggers capture + describe hands-free
- [ ] TTS output in English (en-US) and Mandarin (zh-CN)
- [ ] Session history list showing past descriptions
- [ ] Free tier: 10 descriptions/day; Pro tier: unlimited
- [ ] Stripe Checkout completes a real payment and activates Pro
- [ ] App renders with demo data — no login required to see it working

## Non-Goals (v1)
- GPS walking directions (Sprint 7)
- User accounts and login (Sprint 5 — locked-down sprint)
- Additional languages beyond English and Chinese
- Wearable / AR glasses support
- Offline / on-device model

## Definition of Done
A first-time visitor on a mobile browser opens the app, points their camera, hears a scene description in under 6 seconds, asks "Is it safe to cross?" and hears a spoken answer — then taps Upgrade, completes a Stripe test-mode payment, and sees "Vision Pro active" in the app. Every step persists to the database and survives a page refresh.
