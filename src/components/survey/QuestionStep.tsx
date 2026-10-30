"use client";

import { Check } from "lucide-react";
import { OTHER_PREFIX, type Question } from "@/lib/questions";
import type { AnswerValue } from "@/lib/types";
import { cx } from "@/components/ui";

interface Props {
  question: Question;
  value: AnswerValue | undefined;
  onChange: (v: AnswerValue) => void;
  onEnter: () => void;
}

export function QuestionStep({ question, value, onChange, onEnter }: Props) {
  return (
    <fieldset className="border-0 p-0">
      <legend className="text-[1.5rem] font-bold leading-snug tracking-tight text-ink">
        {question.prompt}
      </legend>
      {question.help && (
        <p className="mt-2 text-sm text-ink-mute">{question.help}</p>
      )}

      <div className="mt-6">
        {question.type === "text" ? (
          <TextInput
            question={question}
            value={typeof value === "string" ? value : ""}
            onChange={onChange}
            onEnter={onEnter}
          />
        ) : question.type === "single" ? (
          <SingleChoice
            question={question}
            value={typeof value === "string" ? value : undefined}
            onChange={onChange}
          />
        ) : (
          <MultiChoice
            question={question}
            value={Array.isArray(value) ? value : []}
            onChange={onChange}
          />
        )}
      </div>
    </fieldset>
  );
}

function OptionRow({
  label,
  selected,
  kind,
  onClick,
}: {
  label: string;
  selected: boolean;
  kind: "radio" | "checkbox";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role={kind}
      aria-checked={selected}
      onClick={onClick}
      className={cx(
        "flex w-full items-center gap-3 rounded-md border px-4 py-3 text-left text-[15px] leading-snug transition-colors",
        selected
          ? "border-accent bg-accent/10 text-ink"
          : "border-line bg-raised text-ink-soft hover:border-line-strong hover:text-ink",
      )}
    >
      <span
        className={cx(
          "flex h-5 w-5 shrink-0 items-center justify-center border",
          kind === "radio" ? "rounded-full" : "rounded-[5px]",
          selected ? "border-accent bg-accent text-accent-ink" : "border-line-strong",
        )}
      >
        {selected && <Check size={13} strokeWidth={3} />}
      </span>
      <span>{label}</span>
    </button>
  );
}

function OtherInput({
  text,
  onChange,
  onFocusSelect,
}: {
  text: string;
  onChange: (t: string) => void;
  onFocusSelect: () => void;
}) {
  return (
    <input
      type="text"
      value={text}
      onFocus={onFocusSelect}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Type your answer"
      maxLength={80}
      className="mt-2 h-11 w-full rounded-md border border-line bg-sunken px-4 text-[15px] text-ink placeholder:text-ink-mute focus:border-accent"
    />
  );
}

function SingleChoice({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: string | undefined;
  onChange: (v: AnswerValue) => void;
}) {
  const isOther = value?.startsWith(OTHER_PREFIX) ?? false;
  return (
    <div className="flex flex-col gap-2" role="radiogroup">
      {question.options!.map((opt) => (
        <OptionRow
          key={opt}
          label={opt}
          kind="radio"
          selected={value === opt}
          onClick={() => onChange(opt)}
        />
      ))}
      {question.allowOther && (
        <div>
          <OptionRow
            label="Other"
            kind="radio"
            selected={isOther}
            onClick={() => onChange(OTHER_PREFIX)}
          />
          {isOther && (
            <OtherInput
              text={value!.slice(OTHER_PREFIX.length)}
              onChange={(t) => onChange(OTHER_PREFIX + t)}
              onFocusSelect={() => {}}
            />
          )}
        </div>
      )}
    </div>
  );
}

function MultiChoice({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: string[];
  onChange: (v: AnswerValue) => void;
}) {
  const other = value.find((v) => v.startsWith(OTHER_PREFIX));
  const exclusive = question.options!.filter((o) =>
    /^(none|i don't|never)/i.test(o),
  );

  function toggle(opt: string) {
    if (value.includes(opt)) {
      onChange(value.filter((v) => v !== opt));
      return;
    }
    // "None" style options clear everything else, and vice versa.
    if (exclusive.includes(opt)) {
      onChange([opt]);
      return;
    }
    onChange([...value.filter((v) => !exclusive.includes(v)), opt]);
  }

  return (
    <div className="flex flex-col gap-2" role="group">
      {question.options!.map((opt) => (
        <OptionRow
          key={opt}
          label={opt}
          kind="checkbox"
          selected={value.includes(opt)}
          onClick={() => toggle(opt)}
        />
      ))}
      {question.allowOther && (
        <div>
          <OptionRow
            label="Other"
            kind="checkbox"
            selected={other !== undefined}
            onClick={() =>
              other !== undefined
                ? onChange(value.filter((v) => v !== other))
                : onChange([...value.filter((v) => !exclusive.includes(v)), OTHER_PREFIX])
            }
          />
          {other !== undefined && (
            <OtherInput
              text={other.slice(OTHER_PREFIX.length)}
              onChange={(t) =>
                onChange(
                  value.map((v) => (v === other ? OTHER_PREFIX + t : v)),
                )
              }
              onFocusSelect={() => {}}
            />
          )}
        </div>
      )}
    </div>
  );
}

function TextInput({
  question,
  value,
  onChange,
  onEnter,
}: {
  question: Question;
  value: string;
  onChange: (v: AnswerValue) => void;
  onEnter: () => void;
}) {
  const max = question.maxLength ?? 500;
  if (question.singleLine) {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onEnter();
        }}
        maxLength={max}
        autoFocus
        autoComplete="name"
        placeholder="Type your answer"
        className="h-12 w-full rounded-md border border-line bg-raised px-4 text-[15px] text-ink placeholder:text-ink-mute focus:border-accent"
      />
    );
  }
  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onEnter();
        }}
        maxLength={max}
        rows={4}
        autoFocus
        placeholder="Type your answer"
        className="w-full resize-none rounded-md border border-line bg-raised px-4 py-3 text-[15px] leading-relaxed text-ink placeholder:text-ink-mute focus:border-accent"
      />
      <div className="mt-1 text-right text-xs text-ink-mute">
        {value.length}/{max}
      </div>
    </div>
  );
}
