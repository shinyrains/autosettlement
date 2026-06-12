import type { LucideIcon } from "lucide-react";
import { Filter } from "lucide-react";
import { statusLabels } from "./uiShellConfig";
import type { PlatformUploadCard } from "../data/mockSettlement";

export function HeaderMetric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warn";
}) {
  return (
    <div className="min-w-[128px] rounded-md border border-line bg-ink-800 px-4 py-3">
      <p className="text-xs font-semibold text-slate-400">{label}</p>
      <p className={tone === "warn" ? "mt-1 font-mono text-lg text-amber" : "mt-1 font-mono text-lg text-signal"}>{value}</p>
    </div>
  );
}

export function StatusBadge({ status }: { status: PlatformUploadCard["status"] }) {
  const className =
    status === "parsed" || status === "passed"
      ? "bg-mint/15 text-mint"
      : status === "error"
        ? "bg-coral/15 text-coral"
        : status === "warning"
          ? "bg-amber/15 text-amber"
          : "bg-slate-500/15 text-slate-300";
  return <span className={`rounded px-2 py-1 text-xs font-semibold ${className}`}>{statusLabels[status]}</span>;
}

export function MiniMetric({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="rounded border border-line bg-ink-950 px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={emphasis ? "font-mono text-sm text-mint" : "font-mono text-sm text-slate-200"}>{value}</p>
    </div>
  );
}

export function KpiCard({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "warn" }) {
  return (
    <div className="rounded-md border border-line bg-ink-800 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className={tone === "warn" ? "mt-2 font-mono text-2xl text-amber" : "mt-2 font-mono text-2xl text-white"}>{value}</p>
    </div>
  );
}

export function MockFilter({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <button className="inline-flex items-center gap-2 rounded-md border border-line bg-ink-800 px-3 py-2 text-slate-300" type="button">
      <Icon className="h-4 w-4 text-signal" />
      {label}
    </button>
  );
}

export function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line pb-2">
      <span className="text-slate-500">{label}</span>
      <span className="text-right text-slate-200">{value}</span>
    </div>
  );
}

export { Filter };
