"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { useLiveSubmissions } from "@/hooks/useLiveSubmissions";
import { computeStats, proficiencyName, themeCounts, themedAnswers } from "@/lib/stats";
import { HBar, VBar } from "@/components/charts/Charts";
import { LiveBadge } from "@/components/admin/LiveBadge";

/**
 * Projector view. Dark, large type, no navigation. Keys:
 *   ← / →  switch panels      Q  toggle QR      D  hide demo data
 */
export function Presentation({ surveyUrl }: { surveyUrl: string }) {
  const { submissions, live, lastUpdate } = useLiveSubmissions(20_000);
  const [panel, setPanel] = useState(0);
  const [showQr, setShowQr] = useState(false);
  const [hideDemo, setHideDemo] = useState(false);
  const [qr, setQr] = useState("");

  useEffect(() => {
    QRCode.toString(surveyUrl, { type: "svg", margin: 1, color: { dark: "#0b1222", light: "#ffffff" } }).then(setQr);
  }, [surveyUrl]);

  const subs = useMemo(() => (hideDemo ? submissions.filter((s) => !s.is_demo) : submissions), [submissions, hideDemo]);
  const stats = useMemo(() => computeStats(subs), [subs]);
  const taskThemes = useMemo(() => themeCounts(themedAnswers(subs, "repetitive_task")), [subs]);

  const panels = useMemo(
    () => [
      { title: "AI proficiency in the room", node: <VBar data={stats.proficiency} height={420} big /> },
      { title: "How often they use AI", node: <VBar data={stats.frequency} height={420} color="#f0b35e" big /> },
      { title: "Tools they've used", node: <HBar data={stats.tools} big color="#8ab8ff" /> },
      { title: "What they most want to master", node: <HBar data={stats.capability} big color="#c9a4ff" /> },
      { title: "Biggest limitation", node: <HBar data={stats.limitation} big color="#ff9fb2" /> },
      { title: "Repetitive tasks they want handled", node: <HBar data={taskThemes} big color="#7fd1a8" /> },
      { title: "Industries represented", node: <HBar data={stats.industry} big color="#6fd3e0" /> },
      { title: "Have they built an app with AI?", node: <HBar data={stats.vibeCoding} big color="#f0b35e" /> },
    ],
    [stats, taskThemes],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") setPanel((p) => (p + 1) % panels.length);
      if (e.key === "ArrowLeft") setPanel((p) => (p - 1 + panels.length) % panels.length);
      if (e.key.toLowerCase() === "q") setShowQr((v) => !v);
      if (e.key.toLowerCase() === "d") setHideDemo((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panels.length]);

  const o = stats.overview;
  const current = panels[panel];

  return (
    <main className="flex h-dvh flex-col bg-[#05080f] px-12 py-10 text-ink">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-xl text-ink-mute">Live audience profile</p>
          <h1 className="mt-1 text-5xl font-bold tracking-tight">{current.title}</h1>
        </div>
        <div className="text-right">
          <p className="text-[5.5rem] font-bold leading-none tracking-tight tabular-nums">{o.completed}</p>
          <p className="mt-1 text-xl text-ink-soft">participants</p>
          <div className="mt-2 flex justify-end">
            <LiveBadge live={live} lastUpdate={lastUpdate} big />
          </div>
        </div>
      </header>

      <section className="mt-8 grid flex-1 grid-cols-[1fr_320px] gap-10">
        <div className="flex items-center">
          <div className="w-full">{current.node}</div>
        </div>
        <aside className="flex flex-col justify-center gap-8 border-l border-line pl-10">
          <Big
            label="Average proficiency"
            value={o.avgProficiency === null ? "—" : o.avgProficiency.toFixed(1)}
            sub={o.avgProficiency === null ? undefined : `${proficiencyName(o.avgProficiency)} on a 1–4 scale`}
          />
          <Big label="Use AI daily" value={o.dailyPct === null ? "—" : `${o.dailyPct}%`} />
          <Big label="Want automation" value={String(o.automationInterested)} />
          {o.demoCount > 0 && !hideDemo && (
            <p className="text-sm text-warm">Includes {o.demoCount} demo participant(s) · press D to hide</p>
          )}
        </aside>
      </section>

      <footer className="flex items-center justify-between text-sm text-ink-mute">
        <div className="flex gap-1.5">
          {panels.map((_, i) => (
            <button
              key={i}
              onClick={() => setPanel(i)}
              className={i === panel ? "h-1.5 w-8 rounded-full bg-accent" : "h-1.5 w-3 rounded-full bg-line-strong"}
              aria-label={`Panel ${i + 1}`}
            />
          ))}
        </div>
        <span>← → panels · Q show QR</span>
      </footer>

      {showQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#05080f]/95" onClick={() => setShowQr(false)}>
          <div className="flex flex-col items-center">
            <p className="mb-8 text-4xl font-bold tracking-tight">Scan to answer the questionnaire</p>
            <div
              className="aspect-square w-[min(60vh,70vw)] rounded-xl bg-white p-5 [&>svg]:h-full [&>svg]:w-full"
              dangerouslySetInnerHTML={{ __html: qr }}
            />
            <p className="mt-6 text-2xl text-ink-soft">{surveyUrl.replace(/^https?:\/\//, "")}</p>
          </div>
        </div>
      )}
    </main>
  );
}

function Big({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-lg text-ink-mute">{label}</p>
      <p className="text-5xl font-bold tracking-tight tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-base text-ink-soft">{sub}</p>}
    </div>
  );
}
