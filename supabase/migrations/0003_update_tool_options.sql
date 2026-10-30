-- Updates the answer options for the "tools" question. Mirrors src/lib/questions.ts.
update public.questions
set options = '["ChatGPT","Claude","Gemini","Grok","Muse","Coding agents (Cursor, Claude Code, Copilot)","Video generation agents (Sora, Veo, Runway)","None yet"]'::jsonb
where key = 'tools';
