-- Adds the participant name question (position 0, before role).
-- Mirrors src/lib/questions.ts.

insert into public.questions (key, prompt, type, options, position, required)
values ('name', 'What''s your name?', 'text', null, 0, true)
on conflict (key) do update
  set prompt = excluded.prompt,
      type = excluded.type,
      options = excluded.options,
      position = excluded.position,
      required = excluded.required;
