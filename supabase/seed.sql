-- DEVELOPMENT ONLY. Inserts 12 clearly labeled demo participants (names are fictional) (is_demo = true).
-- The admin dashboard shows a "Demo data" badge while any of these exist and
-- offers a "Remove demo data" button. You can also run:
--   delete from public.survey_sessions where is_demo;
--
-- Never run this against the seminar database on the day of the event.

with demo(n, name, role, industry, frequency, proficiency, tools, usage, integrated, limitation, capability, repetitive_task, vibe_coding, six_month_goal) as (
  values
  (1,'Ana Reyes','Business owner / founder','E-commerce / retail','Daily','Intermediate — I use it for everyday tasks','["ChatGPT", "Muse"]','["Writing and editing", "Content and social media"]','Partially — I use it ad hoc','Hard to connect it to my existing tools','Workflow automation and agents','Replying to the same customer questions on Messenger every day','No, but I want to','Automate order confirmations and follow-ups for COD orders'),
  (2,'Mark Santos','Operations','Manufacturing / logistics','A few times a week','Beginner — I''m just getting started','["ChatGPT"]','["Research and summarizing"]','No','Not sure how to write good prompts','Prompting and getting reliable outputs','Encoding delivery reports into spreadsheets','No, and it''s not for me','Cut the time spent on weekly reporting in half'),
  (3,'Jolo Dela Cruz','Software developer / IT','Technology / software','Daily','Expert — I build products or systems with it','["Claude", "Coding agents (Cursor, Claude Code, Copilot)"]','["Coding or scripting", "Automating workflows"]','Yes, it''s part of a regular workflow','Nothing — it works well for me','Building apps with AI (vibe coding)','Writing boilerplate CRUD code and tests','Yes, and I shipped something','Ship an internal tool that replaces three manual Excel processes'),
  (4,'Bea Villanueva','Sales / marketing','Marketing / agency','Daily','Intermediate — I use it for everyday tasks','["ChatGPT", "Gemini", "Muse"]','["Content and social media", "Brainstorming ideas"]','Partially — I use it ad hoc','Don''t trust the accuracy','Content generation at scale','Drafting ad copy variations for every product launch','Yes, as an experiment','Build a content pipeline that produces a week of posts in an hour'),
  (5,'Carlo Mendoza','Finance / accounting','Finance / banking','A few times a month','Beginner — I''m just getting started','["Grok"]','["Data analysis and spreadsheets"]','Not yet, but planning to','Data privacy and security concerns','Data analysis and reporting','Reconciling bank transactions against invoices','No, but I want to','Automate monthly P&L preparation from raw exports'),
  (6,'Rina Lim','Executive / manager','BPO / outsourcing','A few times a week','Intermediate — I use it for everyday tasks','["ChatGPT", "Grok"]','["Writing and editing", "Research and summarizing"]','Partially — I use it ad hoc','No time to learn','Customer-facing chatbots','Summarizing long email threads and meeting notes','No, but I want to','Deploy a support chatbot for tier-1 tickets'),
  (7,'Paolo Garcia','HR / admin','Education','Rarely','Beginner — I''m just getting started','["ChatGPT"]','["Writing and editing"]','No','Don''t know which tool to use','Document processing and extraction','Screening resumes and scheduling interviews','No, and it''s not for me','Use AI to shortlist applicants fairly and faster'),
  (8,'Mia Tan','Designer / creative','Marketing / agency','Daily','Advanced — I build workflows with it','["Video generation agents (Sora, Veo, Runway)", "Muse", "ChatGPT"]','["Content and social media", "Brainstorming ideas"]','Yes, it''s part of a regular workflow','Cost','Content generation at scale','Resizing and adapting creatives for every platform','Yes, as an experiment','Build a brand-consistent image pipeline'),
  (9,'Ken Bautista','Student','Education','Daily','Intermediate — I use it for everyday tasks','["ChatGPT", "Gemini"]','["Learning new topics", "Writing and editing"]','Partially — I use it ad hoc','Don''t trust the accuracy','Building apps with AI (vibe coding)','Taking notes from lecture recordings','No, but I want to','Build and launch my first app with AI'),
  (10,'Liza Ramos','Business owner / founder','Real estate','A few times a month','Beginner — I''m just getting started','["ChatGPT"]','["Writing and editing"]','No','Not sure how to write good prompts','Workflow automation and agents','Following up with leads who went quiet','No, but I want to','Have an assistant that qualifies leads before I call them'),
  (11,'Dino Cruz','Operations','E-commerce / retail','A few times a week','Advanced — I build workflows with it','["ChatGPT", "Coding agents (Cursor, Claude Code, Copilot)"]','["Automating workflows", "Data analysis and spreadsheets"]','Yes, it''s part of a regular workflow','Hard to connect it to my existing tools','Workflow automation and agents','Updating inventory counts across two systems','Yes, as an experiment','Connect our ERP to the store so stock syncs automatically'),
  (12,'Grace Flores','Educator / trainer','Education','Never','Beginner — I''m just getting started','["None yet"]','["I don''t use AI yet"]','No','No time to learn','Prompting and getting reliable outputs','Grading short-answer quizzes','No, and it''s not for me','Understand what AI can safely do in a classroom')
),
sessions as (
  insert into public.survey_sessions (client_session_id, status, is_demo, user_agent, started_at, completed_at)
  select 'demo-' || n, 'completed', true, 'demo-seed', now() - (n || ' minutes')::interval, now() - (n || ' minutes')::interval + interval '3 minutes'
  from demo
  on conflict (client_session_id) do nothing
  returning id, client_session_id
)
insert into public.responses (session_id, question_key, answer)
select s.id, q.key, q.answer
from sessions s
join demo d on d.n = replace(s.client_session_id, 'demo-', '')::int
cross join lateral (
  values
    ('name', to_jsonb(d.name)),
    ('role', to_jsonb(d.role)),
    ('industry', to_jsonb(d.industry)),
    ('frequency', to_jsonb(d.frequency)),
    ('proficiency', to_jsonb(d.proficiency)),
    ('tools', d.tools::jsonb),
    ('usage', d.usage::jsonb),
    ('integrated', to_jsonb(d.integrated)),
    ('limitation', to_jsonb(d.limitation)),
    ('capability', to_jsonb(d.capability)),
    ('repetitive_task', to_jsonb(d.repetitive_task)),
    ('vibe_coding', to_jsonb(d.vibe_coding)),
    ('six_month_goal', to_jsonb(d.six_month_goal))
) as q(key, answer)
on conflict (session_id, question_key) do nothing;
