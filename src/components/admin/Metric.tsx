import { Card } from "@/components/ui";

export function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card className="px-4 py-4">
      <p className="text-sm text-ink-soft">{label}</p>
      <p className="mt-1 text-[1.75rem] font-bold leading-none tracking-tight text-ink">
        {value}
      </p>
      {hint && <p className="mt-2 text-xs text-ink-mute">{hint}</p>}
    </Card>
  );
}
