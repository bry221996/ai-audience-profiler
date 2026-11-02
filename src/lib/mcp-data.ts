import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildSubmissions } from "@/lib/stats";
import type { ResponseRow, SessionRow, Submission } from "@/lib/types";

/** Loads every completed submission (service role; only called behind MCP auth). */
export async function loadSubmissions(includeDemo: boolean): Promise<Submission[]> {
  const supabase = createAdminClient();
  const [s, r] = await Promise.all([
    supabase.from("survey_sessions").select("*").limit(5000),
    supabase.from("responses").select("*").limit(60000),
  ]);
  if (s.error) throw new Error(s.error.message);
  if (r.error) throw new Error(r.error.message);
  return buildSubmissions(s.data as SessionRow[], r.data as ResponseRow[]).filter(
    (x) => x.status === "completed" && (includeDemo || !x.is_demo),
  );
}
