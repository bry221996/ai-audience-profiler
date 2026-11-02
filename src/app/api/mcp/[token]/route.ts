import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";
import { timingSafeEqual } from "node:crypto";
import { QUESTIONS, PROFICIENCY_SHORT } from "@/lib/questions";
import { computeStats, themeCounts, themedAnswers } from "@/lib/stats";
import { buildInsightsContext } from "@/lib/insights";
import { loadSubmissions } from "@/lib/mcp-data";
import type { Submission } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Remote MCP server exposing the audience data to AI clients
 * (Claude.ai / Claude Desktop / Claude Code / ChatGPT / Cursor).
 *
 * URL:   https://<host>/api/mcp/<MCP_SECRET>
 * Auth:  the secret in the path, OR `Authorization: Bearer <MCP_SECRET>`.
 * Both are accepted so clients that only support "no auth" connectors
 * (Claude.ai, ChatGPT) can still connect with the secret URL.
 */

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

function text(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function brief(s: Submission) {
  return {
    id: s.id,
    name: s.answers.name ?? null,
    role: s.answers.role ?? null,
    industry: s.answers.industry ?? null,
    proficiency: PROFICIENCY_SHORT[s.answers.proficiency as string] ?? s.answers.proficiency ?? null,
    frequency: s.answers.frequency ?? null,
    wants_to_master: s.answers.capability ?? null,
    is_demo: s.is_demo,
    completed_at: s.completed_at,
  };
}

const includeDemo = z
  .boolean()
  .default(false)
  .describe("Include clearly-labeled demo participants. Default false.");

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "get_audience_overview",
      {
        title: "Audience overview",
        description:
          "Headline metrics and every distribution (proficiency, frequency, tools, industry, role, usage, limitations, wanted capabilities, vibe coding) computed from completed survey responses. Start here.",
        inputSchema: z.object({ include_demo: includeDemo }),
      },
      async ({ include_demo }) => {
        const subs = await loadSubmissions(include_demo);
        const stats = computeStats(subs);
        return text({
          sample_size: subs.length,
          ...stats,
          task_themes: themeCounts(themedAnswers(subs, "repetitive_task")),
          goal_themes: themeCounts(themedAnswers(subs, "six_month_goal")),
        });
      },
    );

    server.registerTool(
      "list_participants",
      {
        title: "List participants",
        description:
          "Completed submissions, one row per participant, with optional filters. Returns a compact summary per person; use get_participant for full answers.",
        inputSchema: z.object({
          role: z.string().optional().describe("Exact role label to filter by."),
          industry: z.string().optional().describe("Exact industry label to filter by."),
          proficiency: z
            .enum(["Beginner", "Intermediate", "Advanced", "Expert"])
            .optional(),
          search: z.string().optional().describe("Case-insensitive text match across all answers and name."),
          limit: z.number().int().min(1).max(500).default(100),
          include_demo: includeDemo,
        }),
      },
      async ({ role, industry, proficiency, search, limit, include_demo }) => {
        const subs = await loadSubmissions(include_demo);
        const q = search?.trim().toLowerCase();
        const rows = subs.filter((s) => {
          if (role && s.answers.role !== role) return false;
          if (industry && s.answers.industry !== industry) return false;
          if (proficiency && PROFICIENCY_SHORT[s.answers.proficiency as string] !== proficiency) return false;
          if (q) {
            const hay = Object.values(s.answers)
              .map((v) => (Array.isArray(v) ? v.join(" ") : v))
              .join(" ")
              .toLowerCase();
            if (!hay.includes(q)) return false;
          }
          return true;
        });
        return text({ total: rows.length, participants: rows.slice(0, limit).map(brief) });
      },
    );

    server.registerTool(
      "get_participant",
      {
        title: "Get participant",
        description: "Full answer sheet for one participant, by id or (case-insensitive) name.",
        inputSchema: z.object({
          id: z.string().optional(),
          name: z.string().optional(),
          include_demo: includeDemo,
        }),
      },
      async ({ id, name, include_demo }) => {
        if (!id && !name) return text({ error: "Provide id or name." });
        const subs = await loadSubmissions(include_demo);
        const n = name?.trim().toLowerCase();
        const match = subs.filter(
          (s) => (id && s.id === id) || (n && String(s.answers.name ?? "").toLowerCase() === n),
        );
        if (!match.length) return text({ error: "No participant matched." });
        return text(
          match.map((s) => ({
            ...brief(s),
            answers: QUESTIONS.map((q) => ({ question: q.prompt, key: q.key, answer: s.answers[q.key] ?? null })),
          })),
        );
      },
    );

    server.registerTool(
      "get_open_ended_answers",
      {
        title: "Open-ended answers",
        description:
          "Verbatim free-text answers with the keyword theme assigned to each. Questions: repetitive_task (what they want AI to handle) and six_month_goal.",
        inputSchema: z.object({
          question: z.enum(["repetitive_task", "six_month_goal"]),
          theme: z.string().optional().describe("Filter to one theme label as returned in theme_counts."),
          include_demo: includeDemo,
        }),
      },
      async ({ question, theme, include_demo }) => {
        const subs = await loadSubmissions(include_demo);
        const items = themedAnswers(subs, question).filter((i) => !theme || i.theme === theme);
        return text({
          question: QUESTIONS.find((q) => q.key === question)?.prompt,
          theme_counts: themeCounts(themedAnswers(subs, question)),
          answers: items.map((i) => ({ name: i.name ?? null, role: i.role ?? null, proficiency: i.proficiency ?? null, theme: i.theme, text: i.text })),
        });
      },
    );

    server.registerTool(
      "get_analysis_brief",
      {
        title: "Analysis brief",
        description:
          "A ready-to-reason-over briefing: all computed statistics plus every verbatim open-ended answer, in the same form the in-app AI insights use. Use this to produce seminar recommendations grounded in the data.",
        inputSchema: z.object({ include_demo: includeDemo }),
      },
      async ({ include_demo }) => {
        const subs = await loadSubmissions(include_demo);
        const ctx = buildInsightsContext(subs);
        return { content: [{ type: "text" as const, text: ctx.prompt }] };
      },
    );

    server.registerTool(
      "get_questions",
      {
        title: "Survey questions",
        description: "The questionnaire definition: keys, prompts, types and answer options.",
        inputSchema: z.object({}),
      },
      async () => text(QUESTIONS),
    );
  },
  {
    serverInfo: { name: "ai-audience-profiler", version: "1.0.0" },
  },
);

/** Accepts the secret from the path segment or a bearer token. */
function verify(req: Request, bearer?: string) {
  const secret = process.env.MCP_SECRET;
  if (!secret || secret.length < 16) return undefined;
  const fromPath = decodeURIComponent(new URL(req.url).pathname.split("/").pop() ?? "");
  const candidate = bearer ?? fromPath;
  if (!candidate || !safeEqual(candidate, secret)) return undefined;
  return { token: candidate, clientId: "presenter", scopes: ["read"] };
}

const authed = withMcpAuth(handler, verify, { required: true });

export { authed as GET, authed as POST, authed as DELETE };
