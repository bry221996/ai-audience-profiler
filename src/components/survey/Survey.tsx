"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { QUESTIONS, OTHER_PREFIX } from "@/lib/questions";
import type { Answers, AnswerValue } from "@/lib/types";
import { Button, cx } from "@/components/ui";
import { QuestionStep } from "./QuestionStep";

const STORAGE_KEY = "aap:session";
const SUBMITTED_KEY = "aap:submitted";
const DRAFT_KEY = "aap:draft";

type Status = "intro" | "answering" | "submitting" | "done" | "already";

function getOrCreateSessionId(): string {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function isEmpty(v: AnswerValue | undefined) {
  if (v === undefined) return true;
  if (Array.isArray(v)) return v.length === 0;
  return v.trim().length === 0;
}

export function Survey() {
  const [status, setStatus] = useState<Status>("intro");
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"fwd" | "back">("fwd");
  const [answers, setAnswers] = useState<Answers>({});
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>("");

  // Session + draft restore. localStorage is only readable after mount, so
  // this must run client-side after hydration (a lazy initializer would
  // mismatch the server render).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSessionId(getOrCreateSessionId());
    try {
      if (localStorage.getItem(SUBMITTED_KEY) === "1") {
        setStatus("already");
        return;
      }
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) setAnswers(JSON.parse(draft));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (status !== "answering") return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(answers));
    } catch {
      /* ignore */
    }
  }, [answers, status]);

  const question = QUESTIONS[step];
  const total = QUESTIONS.length;
  const value = answers[question.key];

  const validation = useMemo(() => {
    if (!question.required) return null;
    if (isEmpty(value)) {
      return question.type === "text"
        ? "Please write a short answer to continue."
        : question.type === "multi"
          ? "Select at least one option."
          : "Choose an option to continue.";
    }
    if (typeof value === "string" && value.startsWith(OTHER_PREFIX)) {
      if (value.slice(OTHER_PREFIX.length).trim().length === 0) {
        return "Tell us what “Other” means for you.";
      }
    }
    if (Array.isArray(value)) {
      const other = value.find((v) => v.startsWith(OTHER_PREFIX));
      if (other && other.slice(OTHER_PREFIX.length).trim().length === 0) {
        return "Tell us what “Other” means for you.";
      }
    }
    return null;
  }, [question, value]);

  const setValue = useCallback(
    (v: AnswerValue) => {
      setError(null);
      setAnswers((prev) => ({ ...prev, [question.key]: v }));
    },
    [question.key],
  );

  function next() {
    if (validation) {
      setError(validation);
      return;
    }
    setError(null);
    if (step < total - 1) {
      setDirection("fwd");
      setStep((s) => s + 1);
    } else {
      void submit();
    }
  }

  function back() {
    setError(null);
    if (step === 0) {
      setStatus("intro");
      return;
    }
    setDirection("back");
    setStep((s) => s - 1);
  }

  async function submit() {
    setStatus("submitting");
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, answers }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 409) {
        localStorage.setItem(SUBMITTED_KEY, "1");
        setStatus("already");
        return;
      }
      if (!res.ok) {
        throw new Error(body.error ?? "Could not save your answers.");
      }
      try {
        localStorage.setItem(SUBMITTED_KEY, "1");
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
      setStatus("done");
    } catch (e) {
      setStatus("answering");
      setError(e instanceof Error ? e.message : "Could not save your answers.");
    }
  }

  if (status === "intro") {
    return (
      <div className="flex flex-1 flex-col">
        <header className="pt-10">
          <p className="text-sm font-medium text-ink-mute">AI Audience Profiler</p>
          <h1 className="mt-4 text-[2rem] font-bold leading-[1.1] tracking-tight text-ink">
            Tell us where you are with AI today.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-ink-soft">
            Thirteen quick questions, about three minutes. Your answers shape
            what the session focuses on. Only your name is asked, and it stays
            with the presenter.
          </p>
        </header>
        <div className="mt-auto pt-12">
          <Button
            size="lg"
            className="w-full"
            onClick={() => {
              setStatus("answering");
              setStep(0);
            }}
          >
            Start
            <ArrowRight size={18} />
          </Button>
        </div>
      </div>
    );
  }

  if (status === "done" || status === "already") {
    return (
      <div className="flex flex-1 flex-col items-start justify-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ok/15 text-ok">
          <Check size={24} />
        </div>
        <h1 className="mt-6 text-[1.75rem] font-bold leading-tight tracking-tight">
          {status === "done" ? "Thanks — you're in." : "You've already answered."}
        </h1>
        {status === "already" && (
          <p className="mt-3 text-base leading-relaxed text-ink-soft">
            This device already submitted a response. Each participant counts
            once, so there&apos;s nothing more to do.
          </p>
        )}
      </div>
    );
  }

  const progress = ((step + 1) / total) * 100;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between text-sm text-ink-mute">
        <span>
          Question {step + 1} of {total}
        </span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div
        className="mt-2 h-1 w-full overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-valuenow={step + 1}
        aria-valuemin={1}
        aria-valuemax={total}
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div
        key={question.key}
        className={cx(
          "mt-8 flex-1",
          direction === "fwd" ? "step-enter" : "step-enter-back",
        )}
      >
        <QuestionStep
          question={question}
          value={value}
          onChange={setValue}
          onEnter={next}
        />
      </div>

      {error && (
        <p className="mt-4 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="mt-6 flex items-center gap-3">
        <Button
          variant="ghost"
          size="lg"
          onClick={back}
          disabled={status === "submitting"}
          aria-label="Back"
        >
          <ArrowLeft size={18} />
          Back
        </Button>
        <Button
          size="lg"
          className="flex-1"
          onClick={next}
          disabled={status === "submitting"}
        >
          {status === "submitting" ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Saving
            </>
          ) : step === total - 1 ? (
            "Submit answers"
          ) : (
            <>
              Next
              <ArrowRight size={18} />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
