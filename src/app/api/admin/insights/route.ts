import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient, getAdminUser } from "@/lib/supabase/server";
import { buildSubmissions } from "@/lib/stats";
import { buildInsightsContext, INSIGHTS_SCHEMA, type InsightsResult } from "@/lib/insights";
import type { ResponseRow, SessionRow } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const DEFAULT_MODEL = "claude-sonnet-5-5";

/** Tells the dashboard whether AI analysis is available (key never leaves the server). */
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ configured: Boolean(process.env.ANTHROPIC_API_KEY) });
}

export async function POST(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI analysis isn't configured. Set ANTHROPIC_API_KEY on the server." },
      { status: 503 },
    );
  }

  const { includeDemo = false } = (await req.json().catch(() => ({}))) as {
    includeDemo?: boolean;
  };

  const supabase = await createClient();
  const [s, r] = await Promise.all([
    supabase.from("survey_sessions").select("*"),
    supabase.from("responses").select("*"),
  ]);
  if (s.error || r.error) {
    return NextResponse.json({ error: s.error?.message ?? r.error?.message }, { status: 500 });
  }

  const subs = buildSubmissions(s.data as SessionRow[], r.data as ResponseRow[]).filter(
    (x) => includeDemo || !x.is_demo,
  );
  const ctx = buildInsightsContext(subs);
  if (ctx.sampleSize === 0) {
    return NextResponse.json({ error: "No completed responses to analyze yet." }, { status: 422 });
  }

  const client = new Anthropic({ apiKey });
  try {
    const message = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
      max_tokens: 2000,
      system:
        "You are an analyst preparing a presenter for a live AI seminar. You only state what the provided data supports. Return JSON matching the schema.",
      messages: [{ role: "user", content: ctx.prompt }],
      output_config: { format: { type: "json_schema", schema: INSIGHTS_SCHEMA } },
    });

    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    const interpretation = JSON.parse(text) as InsightsResult["interpretation"];

    const result: InsightsResult = {
      generatedAt: new Date().toISOString(),
      sampleSize: ctx.sampleSize,
      demoIncluded: ctx.demoIncluded,
      observed: ctx.observed,
      interpretation,
    };
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Analysis failed.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
