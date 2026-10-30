import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/supabase/server";
import { getSurveyUrl } from "@/lib/site";
import { Presentation } from "@/components/present/Presentation";

export const metadata = { title: "Live audience — AI Audience Profiler" };
export const dynamic = "force-dynamic";

export default async function PresentPage() {
  const admin = await getAdminUser();
  if (!admin) redirect("/admin/login?next=/present");
  const surveyUrl = await getSurveyUrl();
  return <Presentation surveyUrl={surveyUrl} />;
}
