import { useState } from "react";
import { Sparkles, RefreshCw } from "lucide-react";

type Status = {
  label: string;
  tone: "emerald" | "warning" | "danger" | "neutral";
};

const CONTAINER_BY_TONE: Record<Status["tone"], string> = {
  emerald:
    "bg-emerald-50/90 border-emerald-200/80 dark:bg-emerald-950/20 dark:border-emerald-500/30",
  warning:
    "bg-amber-50/90 border-amber-200/80 dark:bg-amber-950/20 dark:border-amber-500/30",
  danger:
    "bg-amber-50/90 border-amber-200/80 dark:bg-amber-950/20 dark:border-amber-500/30",
  neutral:
    "bg-white/80 border-slate-200/80 dark:bg-white/5 dark:border-white/10",
};

const BADGE_BY_TONE: Record<Status["tone"], string> = {
  emerald:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400",
  warning:
    "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400",
  danger:
    "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400",
  neutral:
    "bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-slate-300",
};

const ICON_BY_TONE: Record<Status["tone"], string> = {
  emerald: "text-emerald-700 dark:text-emerald-400",
  warning: "text-amber-700 dark:text-amber-400",
  danger: "text-amber-700 dark:text-amber-400",
  neutral: "text-slate-700 dark:text-slate-300",
};

export function AIKpiHealthInsight({
  status,
  message,
  disabled,
}: {
  status: Status;
  message: string;
  disabled?: boolean;
}) {
  const [nonce, setNonce] = useState(0);
  const [spinning, setSpinning] = useState(false);

  const refresh = () => {
    setSpinning(true);
    setNonce((n) => n + 1);
    setTimeout(() => setSpinning(false), 700);
  };

  return (
    <div
      key={nonce}
      className={`mb-6 backdrop-blur-md border rounded-xl p-4 flex items-start gap-3 w-full ${CONTAINER_BY_TONE[status.tone]}`}
    >
      <div className={`shrink-0 ${ICON_BY_TONE[status.tone]}`}>
        <Sparkles className="h-5 w-5 animate-pulse" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-slate-900 dark:text-white font-semibold text-sm flex items-center gap-2">
          <span>AI Insight</span>
          <span
            className={`font-bold px-2 py-0.5 rounded text-xs ${BADGE_BY_TONE[status.tone]}`}
          >
            {status.label}
          </span>
        </div>
        <p className="mt-1.5 text-slate-700 dark:text-slate-300 text-xs font-medium leading-relaxed">
          {disabled
            ? "Hubungkan spreadsheet untuk mengaktifkan AI Insight otomatis."
            : message}
        </p>
      </div>

      <button
        onClick={refresh}
        className="group inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-all hover:bg-white dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${spinning ? "animate-spin" : "group-hover:rotate-90 transition-transform"}`} />
        Refresh
      </button>
    </div>
  );
}
