"use client";

import { useMemo, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { useLiveSubmissions } from "@/hooks/useLiveSubmissions";
import { computeStats, proficiencyName, themeCounts, themedAnswers } from "@/lib/stats";
import { Button, Card, SectionTitle } from "@/components/ui";
import { HBar, VBar } from "@/components/charts/Charts";
import { Metric } from "./Metric";
import { LiveBadge } from "./LiveBadge";
import { OpenEnded } from "./OpenEnded";
import { Insights } from "./Insights";

export function Overview() {
  const { submissions, loading, error, live, lastUpdate, refetch } = useLiveSubmissions();
  const [removing, setRemoving] = useState(false);
  const [includeDemo, setIncludeDemo] = useState(true);

  const visible = useMemo(
    () => (includeDemo ? submissions : submissions.filter((s) => !s.is_demo)),
    [submissions, includeDemo],
  );
  const stats = useMemo(() => computeStats(visible), [visible]);
  const demoCount = submissions.filter((s) => s.is_demo).length;

  const tasks = useMemo(() => themedAnswers(visible, "repetitive_task"), [visible]);
  const goals = useMemo(() => themedAnswers(visible, "six_month_goal"), [visible]);

  async function removeDemo() {
    if (!confirm(`Delete ${demoCount} demo participant(s)? Real responses are not affected.`)) return;
    setRemoving(true);
    await fetch("/api/admin/demo", { method: "DELETE" });
    await refetch();
    setRemoving(false);
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-ink-mute">
        <Loader2 className="animate-spin" />
      </div>
    );
  }
  if (error) {
    return (
      <Card className="p-5 text-sm text-danger">
        Couldn&apos;t load responses: {error}. Check that this account is in{" "}
        <code>admin_users</code>.
      </Card>
    );
  }

  const o = stats.overview;

  return (
    <div className="mx-auto max-w-6xl">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audience overview</h1>
          <LiveBadge live={live} lastUpdate={lastUpdate} />
        </div>
        {demoCount > 0 && (
          <div className="flex items-center gap-2 rounded-md border border-warm/40 bg-warm/10 px-3 py-2 text-sm text-warm">
            <span>
              {demoCount} demo participant{demoCount === 1 ? "" : "s"} in view
            </span>
            <label className="ml-2 flex items-center gap-1.5 text-xs text-ink-soft">
              <input
                type="checkbox"
                checked={includeDemo}
                onChange={(e) => setIncludeDemo(e.target.checked)}
              />
              include
            </label>
            <Button variant="danger" size="sm" onClick={removeDemo} disabled={removing}>
              <Trash2 size={14} />
              Remove demo data
            </Button>
          </div>
        )}
      </header>

      <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Metric label="Participants" value={o.total} hint="sessions started" />
        <Metric label="Completed" value={o.completed} hint={o.total ? `${Math.round((o.completed / o.total) * 100)}% completion` : undefined} />
        <Metric
          label="Average proficiency"
          value={o.avgProficiency === null ? "—" : o.avgProficiency.toFixed(1)}
          hint={o.avgProficiency === null ? "scale 1–4" : `${proficiencyName(o.avgProficiency)} · scale 1–4`}
        />
        <Metric label="Daily AI users" value={o.dailyPct === null ? "—" : `${o.dailyPct}%`} hint="use AI every day" />
        <Metric label="Interested in automation" value={o.automationInterested} hint="want to master or already automate" />
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle>AI proficiency</SectionTitle>
          <VBar data={stats.proficiency} />
        </Card>
        <Card className="p-5">
          <SectionTitle>Frequency of AI use</SectionTitle>
          <VBar data={stats.frequency} color="#f0b35e" />
        </Card>
        <Card className="p-5">
          <SectionTitle>AI tools used</SectionTitle>
          <HBar data={stats.tools} />
        </Card>
        <Card className="p-5">
          <SectionTitle>Industry</SectionTitle>
          <HBar data={stats.industry} color="#7fd1a8" />
        </Card>
        <Card className="p-5">
          <SectionTitle>Most requested capability</SectionTitle>
          <HBar data={stats.capability} color="#c9a4ff" />
        </Card>
        <Card className="p-5">
          <SectionTitle>Vibe coding experience</SectionTitle>
          <HBar data={stats.vibeCoding} color="#6fd3e0" />
        </Card>
        <Card className="p-5">
          <SectionTitle>Biggest limitation</SectionTitle>
          <HBar data={stats.limitation} color="#ff9fb2" />
        </Card>
        <Card className="p-5">
          <SectionTitle>Current use of AI</SectionTitle>
          <HBar data={stats.usage} />
        </Card>
      </section>

      <section className="mt-8">
        <Insights hasData={o.completed > 0} />
      </section>

      <section className="mt-8 grid gap-4 xl:grid-cols-2">
        <OpenEnded
          title="Repetitive tasks they want handled"
          items={tasks}
          themes={themeCounts(tasks)}
        />
        <OpenEnded
          title="Six-month goals"
          items={goals}
          themes={themeCounts(goals)}
        />
      </section>
    </div>
  );
}
