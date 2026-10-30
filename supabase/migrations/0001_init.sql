-- AI Audience Profiler — initial schema
-- Run via Supabase SQL editor, `supabase db push`, or the Supabase MCP connector.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Administrators. A user becomes an admin when their auth.users id is here.
-- ---------------------------------------------------------------------------
create table if not exists public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- Questions (mirrors src/lib/questions.ts; kept for reporting/joins)
-- ---------------------------------------------------------------------------
create type public.question_type as enum ('single', 'multi', 'text');

create table if not exists public.questions (
  id         serial primary key,
  key        text not null unique,
  prompt     text not null,
  type       public.question_type not null,
  options    jsonb,
  position   int  not null,
  required   boolean not null default true,
  created_at timestamptz not null default now(),
  constraint questions_options_shape check (
    (type = 'text' and options is null)
    or (type <> 'text' and jsonb_typeof(options) = 'array')
  )
);

create index if not exists questions_position_idx on public.questions (position);

-- ---------------------------------------------------------------------------
-- Survey sessions: one per participant device
-- ---------------------------------------------------------------------------
create type public.session_status as enum ('pending', 'completed');

create table if not exists public.survey_sessions (
  id                uuid primary key default gen_random_uuid(),
  client_session_id text not null unique,
  status            public.session_status not null default 'pending',
  is_demo           boolean not null default false,
  user_agent        text,
  started_at        timestamptz not null default now(),
  completed_at      timestamptz,
  constraint survey_sessions_completed_consistent check (
    (status = 'completed' and completed_at is not null)
    or (status = 'pending' and completed_at is null)
  )
);

create index if not exists survey_sessions_status_idx on public.survey_sessions (status, completed_at desc);
create index if not exists survey_sessions_demo_idx on public.survey_sessions (is_demo) where is_demo;

-- ---------------------------------------------------------------------------
-- Responses: one row per (session, question)
-- ---------------------------------------------------------------------------
create table if not exists public.responses (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.survey_sessions (id) on delete cascade,
  question_key text not null references public.questions (key) on delete restrict,
  answer       jsonb not null,
  created_at   timestamptz not null default now(),
  constraint responses_unique_per_question unique (session_id, question_key),
  constraint responses_answer_shape check (jsonb_typeof(answer) in ('string', 'array'))
);

create index if not exists responses_session_idx on public.responses (session_id);
create index if not exists responses_question_idx on public.responses (question_key);

-- ---------------------------------------------------------------------------
-- Row Level Security
--   * anon can insert a session and its responses (public submission)
--   * anon can never read sessions/responses
--   * admins (admin_users) can read everything and delete demo data
--   * questions are readable by everyone (no PII)
-- ---------------------------------------------------------------------------
alter table public.admin_users      enable row level security;
alter table public.questions        enable row level security;
alter table public.survey_sessions  enable row level security;
alter table public.responses        enable row level security;

-- admin_users: a user may see their own row (lets the app check membership)
create policy "admin_users: self read"
  on public.admin_users for select
  to authenticated
  using (user_id = auth.uid());

-- questions
create policy "questions: public read"
  on public.questions for select
  to anon, authenticated
  using (true);

create policy "questions: admin write"
  on public.questions for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- survey_sessions
create policy "sessions: public insert"
  on public.survey_sessions for insert
  to anon, authenticated
  with check (status = 'pending' and is_demo = false);

create policy "sessions: admin read"
  on public.survey_sessions for select
  to authenticated
  using (public.is_admin());

create policy "sessions: admin delete"
  on public.survey_sessions for delete
  to authenticated
  using (public.is_admin());

-- responses
create policy "responses: public insert"
  on public.responses for insert
  to anon, authenticated
  with check (true);

create policy "responses: admin read"
  on public.responses for select
  to authenticated
  using (public.is_admin());

create policy "responses: admin delete"
  on public.responses for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Realtime: broadcast session changes to admin dashboards (RLS still applies)
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'survey_sessions'
  ) then
    alter publication supabase_realtime add table public.survey_sessions;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Seed questions (keep in sync with src/lib/questions.ts)
-- ---------------------------------------------------------------------------
insert into public.questions (key, prompt, type, options, position, required) values
  ('role', 'What is your current role?', 'single',
   '["Business owner / founder","Executive / manager","Operations","Sales / marketing","Finance / accounting","Software developer / IT","Designer / creative","HR / admin","Educator / trainer","Student"]', 1, true),
  ('industry', 'What industry do you work in?', 'single',
   '["E-commerce / retail","Technology / software","Finance / banking","Marketing / agency","Education","Healthcare","Manufacturing / logistics","Real estate","Government / NGO","BPO / outsourcing"]', 2, true),
  ('frequency', 'How frequently do you use AI?', 'single',
   '["Daily","A few times a week","A few times a month","Rarely","Never"]', 3, true),
  ('proficiency', 'How would you describe your AI proficiency?', 'single',
   '["Beginner — I''m just getting started","Intermediate — I use it for everyday tasks","Advanced — I build workflows with it","Expert — I build products or systems with it"]', 4, true),
  ('tools', 'Which AI tools have you used?', 'multi',
   '["ChatGPT","Claude","Gemini","Microsoft Copilot","GitHub Copilot / Cursor","Midjourney / image generators","Canva AI","Notion AI","n8n / Make / Zapier AI","None yet"]', 5, true),
  ('usage', 'How do you currently use AI?', 'multi',
   '["Writing and editing","Research and summarizing","Brainstorming ideas","Data analysis and spreadsheets","Coding or scripting","Customer support replies","Content and social media","Automating workflows","Learning new topics","I don''t use AI yet"]', 6, true),
  ('integrated', 'Have you integrated AI into your actual work processes?', 'single',
   '["Yes, it''s part of a regular workflow","Partially — I use it ad hoc","Not yet, but planning to","No"]', 7, true),
  ('limitation', 'What is your biggest limitation when using AI?', 'single',
   '["Not sure how to write good prompts","Don''t trust the accuracy","Don''t know which tool to use","Hard to connect it to my existing tools","Data privacy and security concerns","Cost","No time to learn","Nothing — it works well for me"]', 8, true),
  ('capability', 'Which AI capability do you most want to master?', 'single',
   '["Prompting and getting reliable outputs","Workflow automation and agents","Data analysis and reporting","Building apps with AI (vibe coding)","Content generation at scale","Customer-facing chatbots","Document processing and extraction"]', 9, true),
  ('repetitive_task', 'What repetitive task would you like AI to handle?', 'text', null, 10, true),
  ('vibe_coding', 'Have you tried building an application using AI?', 'single',
   '["Yes, and I shipped something","Yes, as an experiment","No, but I want to","No, and it''s not for me"]', 11, true),
  ('six_month_goal', 'What would you like to accomplish using AI in the next six months?', 'text', null, 12, true)
on conflict (key) do update
  set prompt = excluded.prompt,
      type = excluded.type,
      options = excluded.options,
      position = excluded.position,
      required = excluded.required;
