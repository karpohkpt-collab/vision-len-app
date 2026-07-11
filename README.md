# Vision Len

Vision Len is a mobile-first AI visual assistant for visually impaired users that describes scenes, flags hazards, answers questions about surroundings, and gives spoken walking directions — hands-free with voice wake word and multilingual output.

See `/docs` for the full plan (PRD, architecture, data model, sprints). This is the working v1 app — no login wall, demo data seeded, every action persists to Supabase.

## What's built (Sprints 1-4 — v1 functional milestone)

- **Scene description engine** — camera capture → `/api/describe` (GPT-4o Vision) → `scene_sessions` row → spoken description
- **Hazard flagging** — hazards sorted high→low, spoken before the description
- **Follow-up Q&A** — `/api/qa` stores `qa_exchanges`, text or voice input
- **Wake word** — "Hey Vision" hands-free capture, EN/中文 toggle persisted to `user_preferences`
- **Stripe paid tier** — free tier capped at 10 scans/day (`usage_counters`), `/api/checkout` + `/api/webhooks/stripe` activate `subscriptions.plan = pro`

If `OPENAI_API_KEY` or Stripe keys are missing from Vercel env, the app degrades gracefully per `docs/ARCHITECTURE.md`'s "Core Without AI" rule instead of breaking — add real keys to make those calls live.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, React 19, Server Actions) |
| Language | TypeScript strict |
| Styles | Tailwind CSS v4 (CSS-first, no config file) |
| Auth + DB | Supabase (`@supabase/ssr`) |
| Package manager | npm |
| Deploy | Vercel |

## Quick start

```bash
npm install
vercel env pull .env.local   # pulls Supabase keys from the linked Vercel project
npm run dev
```

Open http://localhost:3000.

## Deploying

Deploy by git — push to `main` and Vercel auto-deploys. Don't run `vercel deploy`/`vercel --prod` with local files, it desyncs git.
