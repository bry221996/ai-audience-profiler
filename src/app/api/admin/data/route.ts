import { NextResponse } from "next/server";
import { createClient, getAdminUser } from "@/lib/supabase/server";
import { buildSubmissions } from "@/lib/stats";
import type { ResponseRow, SessionRow } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** All sessions + responses for the signed-in admin (RLS enforced). */
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const supabase = await createClient();

  const [sessionsRes, responsesRes] = await Promise.all([
    supabase.from("survey_sessions").select("*").order("started_at", { ascending: false }).limit(5000),
    supabase.from("responses").select("*").limit(60000),
  ]);

  if (sessionsRes.error || responsesRes.error) {
    return NextResponse.json(
      { error: sessionsRes.error?.message ?? responsesRes.error?.message },
      { status: 500 },
    );
  }

  const submissions = buildSubmissions(
    sessionsRes.data as SessionRow[],
    responsesRes.data as ResponseRow[],
  );

  return NextResponse.json({ submissions, fetchedAt: new Date().toISOString() });
}
