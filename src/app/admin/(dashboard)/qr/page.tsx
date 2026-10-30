import { getSurveyUrl } from "@/lib/site";
import { QrPanel } from "@/components/admin/QrPanel";

export const metadata = { title: "QR code — AI Audience Profiler" };

export default async function QrPage() {
  const url = await getSurveyUrl();
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">Survey QR code</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Put this on screen so participants can open the questionnaire on their phones.
      </p>
      <QrPanel url={url} />
    </div>
  );
}
