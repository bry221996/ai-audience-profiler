"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { Count, ThemedAnswer } from "@/lib/stats";
import { Card, SectionTitle, cx } from "@/components/ui";

export function OpenEnded({
  title,
  items,
  themes,
}: {
  title: string;
  items: ThemedAnswer[];
  themes: Count[];
}) {
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (i) =>
        (!theme || i.theme === theme) &&
        (!q || i.text.toLowerCase().includes(q) || (i.role ?? "").toLowerCase().includes(q)),
    );
  }, [items, query, theme]);

  return (
    <Card className="flex flex-col p-5">
      <SectionTitle>
        {title}{" "}
        <span className="ml-1 text-sm font-normal text-ink-mute">{items.length}</span>
      </SectionTitle>

      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search answers"
          className="h-9 w-full rounded-md border border-line bg-sunken pl-9 pr-3 text-sm text-ink placeholder:text-ink-mute focus:border-accent"
        />
      </div>

      {themes.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Chip active={theme === null} onClick={() => setTheme(null)}>
            All
          </Chip>
          {themes.map((t) => (
            <Chip key={t.label} active={theme === t.label} onClick={() => setTheme(theme === t.label ? null : t.label)}>
              {t.label} <span className="opacity-60">{t.value}</span>
            </Chip>
          ))}
        </div>
      )}

      <ul className="mt-4 flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
        {filtered.length === 0 && (
          <li className="py-8 text-center text-sm text-ink-mute">
            {items.length === 0 ? "No answers yet" : "Nothing matches that search"}
          </li>
        )}
        {filtered.map((i) => (
          <li key={i.id} className="rounded-md border border-line bg-sunken px-3 py-2.5">
            <p className="text-[15px] leading-relaxed text-ink">{i.text}</p>
            <p className="mt-1.5 flex flex-wrap gap-x-2 text-xs text-ink-mute">
              <span className="text-ink-soft">{i.theme}</span>
              {i.role && <span>{i.role}</span>}
              {i.proficiency && <span>{i.proficiency}</span>}
              {i.is_demo && <span className="text-warm">demo</span>}
            </p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "rounded-full border px-2.5 py-1 text-xs transition-colors",
        active
          ? "border-accent bg-accent/15 text-ink"
          : "border-line text-ink-soft hover:border-line-strong hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
