create table if not exists scene_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  image_url text,
  description text,
  description_source text default 'openai-gpt4o',
  description_confidence numeric,
  description_review_status text default 'unreviewed',
  hazards jsonb default '[]',
  hazards_source text default 'openai-gpt4o',
  hazards_confidence numeric,
  hazards_review_status text default 'unreviewed',
  language text not null default 'en',
  created_at timestamptz not null default now()
);
alter table scene_sessions enable row level security;
drop policy if exists "scene_sessions_v1_read" on scene_sessions;
create policy "scene_sessions_v1_read" on scene_sessions for select using (true);
drop policy if exists "scene_sessions_v1_write" on scene_sessions;
create policy "scene_sessions_v1_write" on scene_sessions for all using (true) with check (true);

create table if not exists qa_exchanges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  session_id uuid references scene_sessions(id) on delete cascade,
  question text not null,
  answer text,
  answer_source text default 'openai-gpt4o',
  answer_confidence numeric,
  answer_review_status text default 'unreviewed',
  language text not null default 'en',
  created_at timestamptz not null default now()
);
alter table qa_exchanges enable row level security;
drop policy if exists "qa_exchanges_v1_read" on qa_exchanges;
create policy "qa_exchanges_v1_read" on qa_exchanges for select using (true);
drop policy if exists "qa_exchanges_v1_write" on qa_exchanges;
create policy "qa_exchanges_v1_write" on qa_exchanges for all using (true) with check (true);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text not null default 'free',
  status text not null default 'active',
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);
alter table subscriptions enable row level security;
drop policy if exists "subscriptions_v1_read" on subscriptions;
create policy "subscriptions_v1_read" on subscriptions for select using (true);
drop policy if exists "subscriptions_v1_write" on subscriptions;
create policy "subscriptions_v1_write" on subscriptions for all using (true) with check (true);

create table if not exists usage_counters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  anonymous_key text,
  date date not null default current_date,
  scene_descriptions_count integer not null default 0,
  created_at timestamptz not null default now()
);
alter table usage_counters enable row level security;
drop policy if exists "usage_counters_v1_read" on usage_counters;
create policy "usage_counters_v1_read" on usage_counters for select using (true);
drop policy if exists "usage_counters_v1_write" on usage_counters;
create policy "usage_counters_v1_write" on usage_counters for all using (true) with check (true);

create table if not exists user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  anonymous_key text,
  language text not null default 'en',
  tts_speed numeric default 1.0,
  wake_word_enabled boolean default true,
  created_at timestamptz not null default now()
);
alter table user_preferences enable row level security;
drop policy if exists "user_preferences_v1_read" on user_preferences;
create policy "user_preferences_v1_read" on user_preferences for select using (true);
drop policy if exists "user_preferences_v1_write" on user_preferences;
create policy "user_preferences_v1_write" on user_preferences for all using (true) with check (true);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  name text,
  email text,
  use_case text,
  source text,
  created_at timestamptz not null default now()
);
alter table leads enable row level security;
drop policy if exists "leads_v1_read" on leads;
create policy "leads_v1_read" on leads for select using (true);
drop policy if exists "leads_v1_write" on leads;
create policy "leads_v1_write" on leads for all using (true) with check (true);

create table if not exists touchpoints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  anonymous_key text,
  event_type text not null,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);
alter table touchpoints enable row level security;
drop policy if exists "touchpoints_v1_read" on touchpoints;
create policy "touchpoints_v1_read" on touchpoints for select using (true);
drop policy if exists "touchpoints_v1_write" on touchpoints;
create policy "touchpoints_v1_write" on touchpoints for all using (true) with check (true);

create table if not exists change_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  title text not null,
  description text,
  type text default 'feature',
  status text default 'open',
  created_at timestamptz not null default now()
);
alter table change_requests enable row level security;
drop policy if exists "change_requests_v1_read" on change_requests;
create policy "change_requests_v1_read" on change_requests for select using (true);
drop policy if exists "change_requests_v1_write" on change_requests;
create policy "change_requests_v1_write" on change_requests for all using (true) with check (true);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  action text not null,
  table_name text,
  record_id uuid,
  payload jsonb default '{}',
  created_at timestamptz not null default now()
);
alter table audit_logs enable row level security;
drop policy if exists "audit_logs_v1_read" on audit_logs;
create policy "audit_logs_v1_read" on audit_logs for select using (true);
drop policy if exists "audit_logs_v1_write" on audit_logs;
create policy "audit_logs_v1_write" on audit_logs for all using (true) with check (true);

insert into scene_sessions (id, image_url, description, description_source, description_confidence, description_review_status, hazards, hazards_source, hazards_confidence, hazards_review_status, language) values
  ('a1b2c3d4-0001-0001-0001-000000000001', 'https://placehold.co/600x400?text=Crosswalk+Scene', 'You are standing at a pedestrian crosswalk. The signal ahead shows a red hand, indicating do not walk. There is a coffee shop to your left with an open door and the sound of music. The pavement is dry and level.', 'openai-gpt4o', 0.94, 'unreviewed', '[{"type":"traffic_signal","detail":"Red — do not cross","severity":"high"}]', 'openai-gpt4o', 0.91, 'unreviewed', 'en'),
  ('a1b2c3d4-0002-0002-0002-000000000002', 'https://placehold.co/600x400?text=Grocery+Aisle', 'You are in a grocery store aisle. Shelves on both sides stock canned goods and breakfast cereals. A yellow wet-floor sign is placed approximately 2 metres ahead on the right side. The aisle extends about 15 metres before a turn.', 'openai-gpt4o', 0.92, 'unreviewed', '[{"type":"wet_floor","detail":"Wet floor sign 2m ahead right","severity":"medium"}]', 'openai-gpt4o', 0.88, 'unreviewed', 'en'),
  ('a1b2c3d4-0003-0003-0003-000000000003', 'https://placehold.co/600x400?text=Park+Path', '你正站在一条公园小径上。前方是一条蜿蜒的铺砌道路，两侧种有高大的橡树。小径在约30米处向右转弯。路面平坦，没有障碍物。远处可以听到儿童玩耍的声音。', 'openai-gpt4o', 0.96, 'unreviewed', '[]', 'openai-gpt4o', 0.95, 'unreviewed', 'zh'),
  ('a1b2c3d4-0004-0004-0004-000000000004', 'https://placehold.co/600x400?text=Bus+Stop', 'You are at a bus stop. A bench is directly behind you. There is a bus approaching from the left, approximately 50 metres away. The bus number displayed is 42. Three other people are waiting nearby.', 'openai-gpt4o', 0.93, 'unreviewed', '[{"type":"approaching_vehicle","detail":"Bus 42 approaching 50m left","severity":"low"}]', 'openai-gpt4o', 0.89, 'unreviewed', 'en');

insert into qa_exchanges (session_id, question, answer, answer_source, answer_confidence, answer_review_status, language) values
  ('a1b2c3d4-0001-0001-0001-000000000001', 'Is it safe to cross now?', 'No, the pedestrian signal shows a red hand. Wait for the walking figure signal before crossing.', 'openai-gpt4o', 0.97, 'unreviewed', 'en'),
  ('a1b2c3d4-0002-0002-0002-000000000002', 'How far is the wet floor sign?', 'The wet floor sign is approximately 2 metres ahead on your right side. Walk slowly and stay to the left.', 'openai-gpt4o', 0.92, 'unreviewed', 'en');

insert into leads (name, email, use_case, source) values
  ('Maria Santos', 'maria.santos@example.com', 'Daily navigation to work and grocery shopping', 'landing-page'),
  ('James Okafor', 'james.okafor@example.com', 'Helping my visually impaired father stay independent', 'referral'),
  ('Lin Wei', 'lin.wei@example.com', '日常出行和识别周围环境', 'social-media');

insert into change_requests (title, description, type, status) values
  ('Add vibration haptic alert for hazards', 'When a hazard is detected, vibrate the phone in addition to the audio alert so users feel it immediately.', 'feature', 'open'),
  ('Support Spanish language output', 'Add Spanish as a third TTS and AI response language.', 'feature', 'open'),
  ('Voice description cuts off on slow connections', 'On 3G, the TTS sometimes starts before the full description loads, cutting the sentence short.', 'bug', 'open');