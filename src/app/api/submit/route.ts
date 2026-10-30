import { NextResponse } from "next/server";
import { QUESTIONS, OTHER_PREFIX } from "@/lib/questions";
import type { Answers, AnswerValue } from "@/lib/types";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function clean(s: string, max: number) {
  return s.replace(/\s+/g, " ").trim().slice(0, max);
}

/** Validate against the question config. Returns normalized answers or an error. */
function validate(raw: unknown): { answers: Answers } | { error: string } {
  if (!raw || typeof raw !== "object") return { error: "Missing answers." };
  const input = raw as Record<string, unknown>;
  const answers: Answers = {};

  for (const q of QUESTIONS) {
    const v = input[q.key];

    if (q.type === "text") {
      const text = typeof v === "string" ? clean(v, q.maxLength ?? 500) : "";
      if (q.required && !text) return { error: `"${q.prompt}" is required.` };
      if (text) answers[q.key] = text;
      continue;
    }

    const allowed = new Set(q.options ?? []);
    const normalizeOne = (s: unknown): string | null => {
      if (typeof s !== "string") return null;
      if (allowed.has(s)) return s;
      if (q.allowOther && s.startsWith(OTHER_PREFIX)) {
        const t = clean(s.slice(OTHER_PREFIX.length), 80);
        return t ? OTHER_PREFIX + t : null;
      }
      return null;
    };

    if (q.type === "single") {
      const one = normalizeOne(v);
      if (!one) {
        if (q.required) return { error: `"${q.prompt}" is required.` };
        continue;
      }
      answers[q.key] = one;
    } else {
      const list = Array.isArray(v)
        ? (v.map(normalizeOne).filter(Boolean) as string[])
        : [];
      const unique = Array.from(new Set(list)).slice(0, 20);
      if (q.required && unique.length === 0) {
        return { error: `"${q.prompt}" needs at least one selection.` };
      }
      if (unique.length) answers[q.key] = unique;
    }
  }
  return { answers };
}

export async function POST(req: Request) {
  let body: { sessionId?: unknown; answers?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
  if (!UUID_RE.test(sessionId)) {
    return NextResponse.json({ error: "Invalid session." }, { status: 400 });
  }

  const result = validate(body.answers);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  const supabase = createAdminClient();
  const userAgent = req.headers.get("user-agent")?.slice(0, 300) ?? null;

  // One submission per client session. If it already completed, say so.
  const { data: existing } = await supabase
    .from("survey_sessions")
    .select("id, status")
    .eq("client_session_id", sessionId)
    .maybeSingle();

  if (existing?.status === "completed") {
    return NextResponse.json({ error: "Already submitted." }, { status: 409 });
  }

  let dbSessionId = existing?.id as string | undefined;
  if (!dbSessionId) {
    const { data, error } = await supabase
      .from("survey_sessions")
      .insert({ client_session_id: sessionId, user_agent: userAgent })
      .select("id")
      .single();
    if (error || !data) {
      return NextResponse.json(
        { error: "Could not start a session." },
        { status: 500 },
      );
    }
    dbSessionId = data.id;
  }

  const rows = Object.entries(result.answers).map(
    ([question_key, answer]: [string, AnswerValue]) => ({
      session_id: dbSessionId,
      question_key,
      answer,
    }),
  );

  const { error: insertError } = await supabase
    .from("responses")
    .upsert(rows, { onConflict: "session_id,question_key" });
  if (insertError) {
    return NextResponse.json(
      { error: "Could not save answers." },
      { status: 500 },
    );
  }

  const { error: completeError } = await supabase
    .from("survey_sessions")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", dbSessionId);
  if (completeError) {
    return NextResponse.json(
      { error: "Could not finalize submission." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
