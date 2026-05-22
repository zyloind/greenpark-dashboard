import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ChartContainer({
  title,
  description,
  action,
  empty,
  emptyText = "Belum ada data. Hubungkan spreadsheet untuk menampilkan grafik.",
  children,
  className,
  height = 320,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  empty?: boolean;
  emptyText?: string;
  children: ReactNode;
  className?: string;
  height?: number;
}) {
  return (
    <div className={cn("glass glass-sheen rounded-2xl p-5", className)}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </div>
      <div style={{ height }} className="relative w-full">
        {empty ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 text-center">
            <div className="text-3xl opacity-30">∅</div>
            <p className="max-w-xs text-xs text-muted-foreground">{emptyText}</p>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
