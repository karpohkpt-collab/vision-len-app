# Security

## Secret Handling
- `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` live in Vercel environment variables — server-side only, never referenced in client bundles
- Supabase `service_role` key used only in server API routes; `anon` key used client-side
- Image uploads go via a signed Supabase Storage URL generated server-side; client never holds a write key

## Permission Model (v1 → lock-down)
- **v1:** Permissive RLS — all tables readable and writable by anyone (demo mode, no real PII)
- **Lock-down sprint:** Replace every policy with `auth.uid() = user_id`; anonymous rows claimed on sign-in
- Stripe webhook endpoint validates `stripe-signature` header before processing any event
- No user can trigger a refund or deletion through the app UI — those are human-only dashboard actions

## Approved-Tools Rule
Every server action calls a named function from the approved tool list in AGENTIC_LAYER.md. No route accepts arbitrary code execution or dynamic tool names.

## Audit Principle
- Every meaningful state change (scene described, payment initiated, subscription changed, usage reset) writes an `audit_logs` row server-side before the action completes
- Audit rows are append-only — no delete or update policy on `audit_logs`
- If a critical action is attempted via the UI (delete, refund), the API returns 403 with a plain message: "This action must be completed by an administrator."

## Before Going Live with Real Users
- Replace v1 permissive RLS with owner-scoped policies (lock-down sprint)
- Confirm Stripe webhook signature verification is active
- Run Supabase security advisor and resolve all warnings
- Stop and get a human to review if any doubt about PII handling or payment flows
