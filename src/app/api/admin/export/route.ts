import { NextResponse } from "next/server";
import { createClient, getAdminUser } from "@/lib/supabase/server";
import { buildSubmissions } from "@/lib/stats";
import { QUESTIONS } from "@/lib/questions";
import type { ResponseRow, SessionRow } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvCell(v: unknown): string {
  const s = Array.isArray(v) ? v.join("; ") : v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV of every completed submission, one row per participant. */
export async function GET(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const [s, r] = await Promise.all([
    supabase.from("survey_sessions").select("*").order("completed_at", { ascending: true }),
    supabase.from("responses").select("*"),
  ]);
  if (s.error || r.error) {
    return NextResponse.json({ error: s.error?.message ?? r.error?.message }, { status: 500 });
  }

  const url = new URL(req.url);
  const includeDemo = url.searchParams.get("demo") === "1";

  const subs = buildSubmissions(s.data as SessionRow[], r.data as ResponseRow[]).filter(
    (x) => x.status === "completed" && (includeDemo || !x.is_demo),
  );

  const header = ["participant_id", "completed_at", "is_demo", ...QUESTIONS.map((q) => q.key)];
  const lines = [header.join(",")];
  for (const sub of subs) {
    lines.push(
      [
        sub.id,
        sub.completed_at ?? "",
        sub.is_demo ? "true" : "false",
        ...QUESTIONS.map((q) => csvCell(sub.answers[q.key])),
      ].join(","),
    );
  }

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return new NextResponse("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audience-responses-${stamp}.csv"`,
    },
  });
}
