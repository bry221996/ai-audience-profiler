import type { Metadata } from "next";
import { Survey } from "@/components/survey/Survey";

export const metadata: Metadata = {
  title: "Audience assessment — AI Audience Profiler",
};

export default function SurveyPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col px-5 pb-10 pt-6">
      <Survey />
    </main>
  );
}
