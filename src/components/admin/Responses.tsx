"use client";

import { useMemo, useState } from "react";
import { Download, Loader2, X } from "lucide-react";
import { useLiveSubmissions } from "@/hooks/useLiveSubmissions";
import { QUESTIONS, PROFICIENCY_SHORT, QUESTION_MAP } from "@/lib/questions";
import type { Submission } from "@/lib/types";
import { Button, Card, cx } from "@/components/ui";
import { LiveBadge } from "./LiveBadge";

function uniq(subs: Submission[], key: string): string[] {
  const s = new Set<string>();
  for (const x of subs) {
    const v = x.answers[key];
    if (typeof v === "string") s.add(v);
  }
  return Array.from(s).sort();
}

export function Responses() {
  const { submissions, loading, live, lastUpdate } = useLiveSubmissions();
  const [role, setRole] = useState("");
  const [industry, setIndustry] = useState("");
  const [proficiency, setProficiency] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Submission | null>(null);

  const completed = useMemo(() => submissions.filter((s) => s.status === "completed"), [submissions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return completed.filter((s) => {
      if (role && s.answers.role !== role) return false;
      if (industry && s.answers.industry !== industry) return false;
      if (proficiency && s.answers.proficiency !== proficiency) return false;
      if (q) {
        const hay = Object.values(s.answers)
          .map((v) => (Array.isArray(v) ? v.join(" ") : v))
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [completed, role, industry, proficiency, query]);

  const select =
    "h-9 rounded-md border border-line bg-sunken px-2.5 text-sm text-ink focus:border-accent";

  return (
    <div className="mx-auto max-w-6xl">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Responses</h1>
          <LiveBadge live={live} lastUpdate={lastUpdate} />
        </div>
        <a href="/api/admin/export">
          <Button variant="outline" size="sm">
            <Download size={14} />
            Export CSV
          </Button>
        </a>
      </header>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search all answers"
          className="h-9 min-w-[200px] flex-1 rounded-md border border-line bg-sunken px-3 text-sm text-ink placeholder:text-ink-mute focus:border-accent"
        />
        <select value={role} onChange={(e) => setRole(e.target.value)} className={select}>
          <option value="">All roles</option>
          {uniq(completed, "role").map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <select value={industry} onChange={(e) => setIndustry(e.target.value)} className={select}>
          <option value="">All industries</option>
          {uniq(completed, "industry").map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <select value={proficiency} onChange={(e) => setProficiency(e.target.value)} className={select}>
          <option value="">All proficiency</option>
          {(QUESTION_MAP.proficiency.options ?? []).map((r) => (
            <option key={r} value={r}>
              {PROFICIENCY_SHORT[r]}
            </option>
          ))}
        </select>
        <span className="text-sm text-ink-mute">
          {filtered.length} of {completed.length}
        </span>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center text-ink-mute">
          <Loader2 className="animate-spin" />
        </div>
      ) : (
        <Card className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs text-ink-mute">
              <tr>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Industry</th>
                <th className="px-4 py-3 font-medium">Proficiency</th>
                <th className="px-4 py-3 font-medium">Frequency</th>
                <th className="px-4 py-3 font-medium">Wants to master</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-ink-mute">
                    {completed.length ? "No responses match these filters" : "No responses yet"}
                  </td>
                </tr>
              )}
              {filtered.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => setOpen(s)}
                  className="cursor-pointer border-b border-line/60 transition-colors last:border-0 hover:bg-sunken"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-ink-soft">
                    {s.completed_at ? new Date(s.completed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                    {s.is_demo && <span className="ml-2 text-xs text-warm">demo</span>}
                  </td>
                  <td className="px-4 py-3">{s.answers.role as string}</td>
                  <td className="px-4 py-3">{s.answers.industry as string}</td>
                  <td className="px-4 py-3">{PROFICIENCY_SHORT[s.answers.proficiency as string] ?? "—"}</td>
                  <td className="px-4 py-3">{s.answers.frequency as string}</td>
                  <td className="px-4 py-3">{s.answers.capability as string}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {open && <Detail sub={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function Detail({ sub, onClose }: { sub: Submission; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60"
      onClick={onClose}
      role="dialog"
      aria-modal
    >
      <div
        className={cx("h-full w-full max-w-[520px] overflow-y-auto border-l border-line bg-bg p-6")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Submission</h2>
            <p className="text-xs text-ink-mute">
              {sub.completed_at && new Date(sub.completed_at).toLocaleString()}
              {sub.is_demo && <span className="ml-2 text-warm">demo data</span>}
            </p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-ink-mute hover:bg-raised hover:text-ink" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <dl className="mt-6 flex flex-col gap-5">
          {QUESTIONS.map((q) => {
            const v = sub.answers[q.key];
            return (
              <div key={q.key}>
                <dt className="text-xs text-ink-mute">{q.prompt}</dt>
                <dd className="mt-1 text-[15px] leading-relaxed text-ink">
                  {v === undefined ? "—" : Array.isArray(v) ? v.join(", ") : v}
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
    </div>
  );
}
