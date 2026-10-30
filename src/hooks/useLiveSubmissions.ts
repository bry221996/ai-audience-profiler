"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Submission } from "@/lib/types";

interface State {
  submissions: Submission[];
  loading: boolean;
  error: string | null;
  live: boolean;
  lastUpdate: Date | null;
}

/**
 * Loads all submissions for the admin and keeps them fresh:
 *  - Supabase Realtime on `survey_sessions` triggers a refetch (debounced)
 *  - a slow polling fallback covers dropped sockets
 */
export function useLiveSubmissions(pollMs = 30_000) {
  const [state, setState] = useState<State>({
    submissions: [],
    loading: true,
    error: null,
    live: false,
    lastUpdate: null,
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/data", { cache: "no-store" });
      if (!res.ok) throw new Error((await res.json()).error ?? res.statusText);
      const body = (await res.json()) as { submissions: Submission[] };
      setState((s) => ({
        ...s,
        submissions: body.submissions,
        loading: false,
        error: null,
        lastUpdate: new Date(),
      }));
    } catch (e) {
      setState((s) => ({
        ...s,
        loading: false,
        error: e instanceof Error ? e.message : "Failed to load",
      }));
    }
  }, []);

  const scheduleRefetch = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void refetch(), 400);
  }, [refetch]);

  useEffect(() => {
    void refetch();
    const supabase = createClient();
    const channel = supabase
      .channel("sessions-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "survey_sessions" },
        scheduleRefetch,
      )
      .subscribe((status) => {
        setState((s) => ({ ...s, live: status === "SUBSCRIBED" }));
      });

    const poll = setInterval(() => void refetch(), pollMs);
    return () => {
      clearInterval(poll);
      if (timer.current) clearTimeout(timer.current);
      void supabase.removeChannel(channel);
    };
  }, [refetch, scheduleRefetch, pollMs]);

  return { ...state, refetch };
}
