"use client";

import { cx } from "@/components/ui";

export function LiveBadge({
  live,
  lastUpdate,
  big = false,
}: {
  live: boolean;
  lastUpdate: Date | null;
  big?: boolean;
}) {
  return (
    <div className={cx("flex items-center gap-2", big ? "text-base" : "text-xs", "text-ink-mute")}>
      <span
        className={cx(
          "inline-block rounded-full",
          big ? "h-3 w-3" : "h-2 w-2",
          live ? "bg-ok live-dot" : "bg-ink-mute",
        )}
        aria-hidden
      />
      <span>
        {live ? "Live" : "Reconnecting"}
        {lastUpdate && !big && (
          <span className="ml-1">· updated {lastUpdate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
        )}
      </span>
    </div>
  );
}
