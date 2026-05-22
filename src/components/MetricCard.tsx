import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "default" | "emerald" | "electric" | "danger" | "warning" | "muted";

const toneText: Record<Tone, string> = {
  default: "text-foreground",
  emerald: "text-[var(--emerald)] drop-shadow-[0_0_18px_color-mix(in_oklch,var(--emerald)_60%,transparent)]",
  electric: "text-[var(--electric)] drop-shadow-[0_0_18px_color-mix(in_oklch,var(--electric)_60%,transparent)]",
  danger: "text-[var(--ruby)] drop-shadow-[0_0_18px_color-mix(in_oklch,var(--ruby)_60%,transparent)]",
  warning: "text-[var(--warning)] drop-shadow-[0_0_16px_color-mix(in_oklch,var(--warning)_60%,transparent)]",
  muted: "text-muted-foreground",
};

const iconHalo: Record<Tone, string> = {
  default: "bg-white/10 text-foreground ring-white/15",
  emerald: "bg-[color-mix(in_oklch,var(--emerald)_25%,transparent)] text-[var(--emerald)] ring-[color-mix(in_oklch,var(--emerald)_45%,transparent)] shadow-[0_0_24px_-4px_color-mix(in_oklch,var(--emerald)_70%,transparent)]",
  electric: "bg-[color-mix(in_oklch,var(--electric)_22%,transparent)] text-[var(--electric)] ring-[color-mix(in_oklch,var(--electric)_45%,transparent)] shadow-[0_0_24px_-4px_color-mix(in_oklch,var(--electric)_70%,transparent)]",
  danger: "bg-[color-mix(in_oklch,var(--ruby)_22%,transparent)] text-[var(--ruby)] ring-[color-mix(in_oklch,var(--ruby)_45%,transparent)] shadow-[0_0_24px_-4px_color-mix(in_oklch,var(--ruby)_70%,transparent)]",
  warning: "bg-[color-mix(in_oklch,var(--warning)_22%,transparent)] text-[var(--warning)] ring-[color-mix(in_oklch,var(--warning)_45%,transparent)] shadow-[0_0_24px_-4px_color-mix(in_oklch,var(--warning)_70%,transparent)]",
  muted: "bg-white/5 text-muted-foreground ring-white/10",
};

export function MetricCard({
  label,
  value,
  sub,
  tone = "default",
  icon,
  badge,
  highlight,
  className,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
  badge?: ReactNode;
  highlight?: "danger";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "glass glass-sheen group relative rounded-2xl p-5",
        highlight === "danger" && "ring-1 ring-[var(--ruby)]/50 animate-pulse",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="metric-label">{label}</p>
        {icon ? (
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-full ring-1 backdrop-blur-sm", iconHalo[tone])}>
            {icon}
          </div>
        ) : null}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className={cn("text-2xl sm:text-3xl xl:text-4xl font-bold tabular-nums tracking-tighter leading-none transition-transform group-hover:scale-[1.02]", toneText[tone])}>
          {value}
        </span>
        {badge}
      </div>
      {sub ? <p className="mt-2 text-xs font-medium text-muted-foreground">{sub}</p> : null}
    </div>
  );
}
