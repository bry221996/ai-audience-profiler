import {
  AUTOMATION_CAPABILITY,
  AUTOMATION_USAGE,
  OTHER_PREFIX,
  PROFICIENCY_SCORE,
  PROFICIENCY_SHORT,
  QUESTION_MAP,
} from "@/lib/questions";
import type { ResponseRow, SessionRow, Submission } from "@/lib/types";

export interface Count {
  label: string;
  value: number;
}

export interface Overview {
  total: number;
  completed: number;
  avgProficiency: number | null;
  avgProficiencyLabel: string;
  dailyPct: number | null;
  automationInterested: number;
  demoCount: number;
}

export interface Stats {
  overview: Overview;
  proficiency: Count[];
  tools: Count[];
  frequency: Count[];
  industry: Count[];
  capability: Count[];
  vibeCoding: Count[];
  limitation: Count[];
  role: Count[];
  integrated: Count[];
  usage: Count[];
}

/** Join sessions + responses into one Submission per participant. */
export function buildSubmissions(
  sessions: SessionRow[],
  responses: ResponseRow[],
): Submission[] {
  const byId = new Map<string, Submission>();
  for (const s of sessions) {
    byId.set(s.id, {
      id: s.id,
      status: s.status,
      is_demo: s.is_demo,
      started_at: s.started_at,
      completed_at: s.completed_at,
      answers: {},
    });
  }
  for (const r of responses) {
    const sub = byId.get(r.session_id);
    if (sub) sub.answers[r.question_key] = r.answer;
  }
  return Array.from(byId.values()).sort((a, b) =>
    (b.completed_at ?? b.started_at).localeCompare(a.completed_at ?? a.started_at),
  );
}

function shortOther(label: string) {
  return label.startsWith(OTHER_PREFIX) ? "Other" : label;
}

/** Count answers for a question, ordered by option order (single/multi). */
export function countAnswers(
  subs: Submission[],
  key: string,
  opts: { orderByValue?: boolean; shorten?: Record<string, string> } = {},
): Count[] {
  const counts = new Map<string, number>();
  const q = QUESTION_MAP[key];
  for (const opt of q?.options ?? []) counts.set(opt, 0);

  for (const s of subs) {
    const a = s.answers[key];
    if (a === undefined) continue;
    const list = Array.isArray(a) ? a : [a];
    for (const raw of list) {
      const label = shortOther(raw);
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }

  let out = Array.from(counts.entries()).map(([label, value]) => ({
    label: opts.shorten?.[label] ?? label,
    value,
  }));
  if (opts.orderByValue) out = out.sort((a, b) => b.value - a.value);
  return out;
}

export function computeStats(all: Submission[]): Stats {
  const completed = all.filter((s) => s.status === "completed");
  const n = completed.length;

  const scores = completed
    .map((s) => PROFICIENCY_SCORE[s.answers.proficiency as string])
    .filter((v): v is number => typeof v === "number");
  const avg = scores.length
    ? scores.reduce((a, b) => a + b, 0) / scores.length
    : null;

  const daily = completed.filter((s) => s.answers.frequency === "Daily").length;

  const automation = completed.filter((s) => {
    const cap = s.answers.capability === AUTOMATION_CAPABILITY;
    const usage = Array.isArray(s.answers.usage)
      ? s.answers.usage.includes(AUTOMATION_USAGE)
      : false;
    return cap || usage;
  }).length;

  return {
    overview: {
      total: all.length,
      completed: n,
      avgProficiency: avg,
      avgProficiencyLabel: avg === null ? "—" : proficiencyLabel(avg),
      dailyPct: n ? Math.round((daily / n) * 100) : null,
      automationInterested: automation,
      demoCount: all.filter((s) => s.is_demo).length,
    },
    proficiency: countAnswers(completed, "proficiency", { shorten: PROFICIENCY_SHORT }),
    tools: countAnswers(completed, "tools", { orderByValue: true }),
    frequency: countAnswers(completed, "frequency", { shorten: FREQUENCY_SHORT }),
    industry: countAnswers(completed, "industry", { orderByValue: true }),
    capability: countAnswers(completed, "capability", { orderByValue: true }),
    vibeCoding: countAnswers(completed, "vibe_coding"),
    limitation: countAnswers(completed, "limitation", { orderByValue: true }),
    role: countAnswers(completed, "role", { orderByValue: true }),
    integrated: countAnswers(completed, "integrated"),
    usage: countAnswers(completed, "usage", { orderByValue: true }),
  };
}

export function proficiencyName(avg: number) {
  const names = ["Beginner", "Intermediate", "Advanced", "Expert"];
  const idx = Math.min(3, Math.max(0, Math.round(avg) - 1));
  return names[idx];
}

function proficiencyLabel(avg: number) {
  return `${avg.toFixed(1)} ${proficiencyName(avg)}`;
}

const FREQUENCY_SHORT: Record<string, string> = {
  "A few times a week": "Weekly",
  "A few times a month": "Monthly",
};

// ---------------------------------------------------------------------------
// Themes for open-ended answers (simple keyword grouping; transparent and
// deterministic so the presenter can trust what they see).
// ---------------------------------------------------------------------------
const THEMES: Array<{ name: string; patterns: RegExp[] }> = [
  { name: "Reports & spreadsheets", patterns: [/report/i, /spreadsheet/i, /excel/i, /sheet/i, /encod/i, /data entry/i, /p&l/i, /reconcil/i] },
  { name: "Email & messaging", patterns: [/email/i, /inbox/i, /messag/i, /messenger/i, /reply/i, /repl(y|ies)/i, /follow[- ]?up/i, /chat/i] },
  { name: "Customer support", patterns: [/customer/i, /support/i, /ticket/i, /inquir/i, /faq/i, /chatbot/i] },
  { name: "Content & marketing", patterns: [/content/i, /post/i, /social/i, /caption/i, /ad copy/i, /marketing/i, /creative/i, /design/i, /image/i] },
  { name: "Scheduling & admin", patterns: [/schedul/i, /calendar/i, /meeting/i, /appointment/i, /admin/i, /paperwork/i, /form/i] },
  { name: "Coding & automation", patterns: [/code/i, /coding/i, /app\b/i, /automat/i, /workflow/i, /integrat/i, /api/i, /sync/i, /n8n/i, /zapier/i, /erp/i, /tool/i, /system/i] },
  { name: "Documents & summaries", patterns: [/document/i, /summar/i, /notes?/i, /transcri/i, /minutes/i, /pdf/i, /extract/i] },
  { name: "Sales & leads", patterns: [/lead/i, /sales/i, /prospect/i, /crm/i, /quot/i, /proposal/i, /invoice/i, /order/i] },
  { name: "Learning & research", patterns: [/learn/i, /research/i, /study/i, /understand/i, /teach/i, /class/i, /grad/i, /quiz/i] },
  { name: "HR & recruiting", patterns: [/resume/i, /hiring/i, /recruit/i, /applicant/i, /onboard/i, /employee/i] },
];

export function themeFor(text: string): string {
  for (const t of THEMES) {
    if (t.patterns.some((p) => p.test(text))) return t.name;
  }
  return "Other";
}

export interface ThemedAnswer {
  id: string;
  text: string;
  theme: string;
  is_demo: boolean;
  name?: string;
  role?: string;
  industry?: string;
  proficiency?: string;
  completed_at: string | null;
}

export function themedAnswers(subs: Submission[], key: string): ThemedAnswer[] {
  return subs
    .filter((s) => s.status === "completed" && typeof s.answers[key] === "string")
    .map((s) => {
      const text = s.answers[key] as string;
      return {
        id: s.id,
        text,
        theme: themeFor(text),
        is_demo: s.is_demo,
        name: s.answers.name as string | undefined,
        role: s.answers.role as string | undefined,
        industry: s.answers.industry as string | undefined,
        proficiency: PROFICIENCY_SHORT[s.answers.proficiency as string],
        completed_at: s.completed_at,
      };
    });
}

export function themeCounts(items: ThemedAnswer[]): Count[] {
  const m = new Map<string, number>();
  for (const i of items) m.set(i.theme, (m.get(i.theme) ?? 0) + 1);
  return Array.from(m.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}
