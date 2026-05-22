import { AlertTriangle } from "lucide-react";

export function EmptyDataBanner({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-[var(--warning)]/40 bg-[var(--warning)]/10 p-4">
      <div className="mt-0.5 rounded-lg bg-[var(--warning)]/20 p-1.5">
        <AlertTriangle className="h-4 w-4 text-[var(--warning)]" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-foreground">Sumber Data Belum Terhubung</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          Silakan hubungkan Link / ID Spreadsheet pada menu Pengaturan terlebih dahulu untuk
          mensinkronisasi dan menampilkan data perusahaan secara realtime.
        </p>
      </div>
    </div>
  );
}
