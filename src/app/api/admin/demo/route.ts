import { NextResponse } from "next/server";
import { createClient, getAdminUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Removes all demo participants (is_demo = true). Responses cascade. */
export async function DELETE() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("survey_sessions")
    .delete({ count: "exact" })
    .eq("is_demo", true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ removed: count ?? 0 });
}
