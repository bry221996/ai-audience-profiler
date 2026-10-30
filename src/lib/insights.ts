import { computeStats, themeCounts, themedAnswers, type Stats } from "@/lib/stats";
import type { Submission } from "@/lib/types";

export interface InsightsResult {
  generatedAt: string;
  sampleSize: number;
  demoIncluded: boolean;
  /** Observed, computed locally — never produced by the model. */
  observed: {
    overview: Stats["overview"];
    topCapabilities: Array<{ label: string; value: number }>;
    topLimitations: Array<{ label: string; value: number }>;
    topTools: Array<{ label: string; value: number }>;
    taskThemes: Array<{ label: string; value: number }>;
    goalThemes: Array<{ label: string; value: number }>;
  };
  /** Qualitative interpretation produced by the model. */
  interpretation: {
    audienceSummary: string;
    commonChallenges: string[];
    requestedCapabilities: string[];
    demoOpportunities: string[];
    topicsToEmphasize: string[];
    handsOnActivity: { title: string; description: string; durationMinutes: number };
    caveats: string[];
  };
}

export const INSIGHTS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "audienceSummary",
    "commonChallenges",
    "requestedCapabilities",
    "demoOpportunities",
    "topicsToEmphasize",
    "handsOnActivity",
    "caveats",
  ],
  properties: {
    audienceSummary: { type: "string", description: "2–3 sentences describing who is in the room, citing counts." },
    commonChallenges: { type: "array", items: { type: "string" }, maxItems: 5 },
    requestedCapabilities: { type: "array", items: { type: "string" }, maxItems: 5 },
    demoOpportunities: { type: "array", items: { type: "string" }, maxItems: 5, description: "Concrete live demos tied to actual answers." },
    topicsToEmphasize: { type: "array", items: { type: "string" }, maxItems: 5 },
    handsOnActivity: {
      type: "object",
      additionalProperties: false,
      required: ["title", "description", "durationMinutes"],
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        durationMinutes: { type: "integer" },
      },
    },
    caveats: { type: "array", items: { type: "string" }, maxItems: 3, description: "Limits of this analysis (sample size, skew, demo data)." },
  },
} as const;

/** Build the grounded context the model sees. Only real data goes in. */
export function buildInsightsContext(subs: Submission[]) {
  const completed = subs.filter((s) => s.status === "completed");
  const stats = computeStats(completed);
  const tasks = themedAnswers(completed, "repetitive_task");
  const goals = themedAnswers(completed, "six_month_goal");

  const observed: InsightsResult["observed"] = {
    overview: stats.overview,
    topCapabilities: stats.capability.filter((c) => c.value > 0).slice(0, 5),
    topLimitations: stats.limitation.filter((c) => c.value > 0).slice(0, 5),
    topTools: stats.tools.filter((c) => c.value > 0).slice(0, 6),
    taskThemes: themeCounts(tasks).slice(0, 6),
    goalThemes: themeCounts(goals).slice(0, 6),
  };

  // Cap verbatim text to keep the prompt bounded for large rooms.
  const MAX_TEXT = 150;
  const prompt = `You are helping a presenter tailor a live AI seminar. Below are the ONLY data you may rely on: aggregated statistics computed from ${completed.length} completed audience responses, plus their verbatim open-ended answers. Do not invent facts, counts, or quotes. When you make a claim, tie it to a number or an actual answer. Keep every item short and actionable (one sentence each). Write in plain English.

## Observed statistics (computed, authoritative)
${JSON.stringify(
  {
    completed: completed.length,
    averageProficiency_1to4: stats.overview.avgProficiency,
    dailyUsersPercent: stats.overview.dailyPct,
    interestedInAutomation: stats.overview.automationInterested,
    proficiency: stats.proficiency,
    frequency: stats.frequency,
    roles: stats.role,
    industries: stats.industry,
    tools: stats.tools,
    currentUsage: stats.usage,
    integratedIntoWork: stats.integrated,
    limitations: stats.limitation,
    wantedCapabilities: stats.capability,
    vibeCoding: stats.vibeCoding,
    taskThemes: observed.taskThemes,
    goalThemes: observed.goalThemes,
  },
  null,
  0,
)}

## Verbatim: repetitive tasks they want AI to handle (${tasks.length})
${tasks.slice(0, MAX_TEXT).map((t) => `- [${t.role ?? "?"} / ${t.proficiency ?? "?"}] ${t.text}`).join("\n")}

## Verbatim: six-month goals (${goals.length})
${goals.slice(0, MAX_TEXT).map((t) => `- [${t.role ?? "?"} / ${t.proficiency ?? "?"}] ${t.text}`).join("\n")}

Produce: a short audience summary; common challenges; the most requested capabilities; practical live-demo opportunities that match real answers; topics that deserve more attention; one hands-on activity suited to this proficiency mix with a realistic duration; and caveats about the analysis.`;

  return { observed, prompt, sampleSize: completed.length, demoIncluded: completed.some((s) => s.is_demo) };
}
