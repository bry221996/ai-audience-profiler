import { headers } from "next/headers";

/** Public URL of the questionnaire, for QR codes and share links. */
export async function getSurveyUrl() {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (env) return `${env}/survey`;
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}/survey`;
}
