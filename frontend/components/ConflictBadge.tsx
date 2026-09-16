import { Severity } from "@/lib/types";

const STYLES: Record<Severity, string> = {
  low: "bg-land/10 text-land border-land/40",
  medium: "bg-ochre/15 text-ochre-dark border-ochre/50",
  high: "bg-brick/10 text-brick border-brick/50",
};

const LABELS: Record<Severity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export default function ConflictBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${STYLES[severity]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {LABELS[severity]} severity
    </span>
  );
}
