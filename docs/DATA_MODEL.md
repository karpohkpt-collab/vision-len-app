# Data Model

## scene_sessions
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid nullable | owner (set at lock-down) |
| image_url | text | Supabase Storage URL |
| description | text | **AI field** |
| description_source | text | e.g. `openai-gpt4o` |
| description_confidence | numeric | 0–1 |
| description_review_status | text | `unreviewed` / `approved` / `flagged` |
| hazards | jsonb | array of `{type, detail, severity}` — **AI field** |
| hazards_source | text | |
| hazards_confidence | numeric | |
| hazards_review_status | text | |
| language | text | `en` or `zh` |
| created_at | timestamptz | |

## qa_exchanges
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid nullable | |
| session_id | uuid FK → scene_sessions | cascade delete |
| question | text | |
| answer | text | **AI field** |
| answer_source | text | |
| answer_confidence | numeric | |
| answer_review_status | text | |
| language | text | |
| created_at | timestamptz | |

## subscriptions
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid nullable | |
| stripe_customer_id | text | |
| stripe_subscription_id | text | |
| plan | text | `free` / `pro` |
| status | text | `active` / `cancelled` / `past_due` |
| current_period_end | timestamptz | |
| created_at | timestamptz | |

## usage_counters
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid nullable | |
| anonymous_key | text | device fingerprint pre-auth |
| date | date | one row per day per user |
| scene_descriptions_count | integer | incremented each capture |
| created_at | timestamptz | |

## user_preferences
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid nullable | |
| anonymous_key | text | |
| language | text | `en` / `zh` |
| tts_speed | numeric | 0.5–2.0 |
| wake_word_enabled | boolean | |
| created_at | timestamptz | |

## leads / touchpoints / change_requests / audit_logs
See migration SQL for full field lists. All have `id`, `user_id`, `created_at`.

## RLS
- v1: permissive read + write on all tables (demo-first)
- Lock-down sprint: replace with `auth.uid() = user_id` owner policies
