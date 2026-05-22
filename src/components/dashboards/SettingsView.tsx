import { useRef, useState, type DragEvent, type ChangeEvent } from "react";
import { useSpreadsheet, type ParsedFile } from "@/lib/spreadsheet";
import { FileSpreadsheet, Database, UploadCloud, Trash2, Loader2, CheckCircle2 } from "lucide-react";

type Slot = "salesMarketing" | "teknik";

export function SettingsView() {
  const { salesFile, teknikFile } = useSpreadsheet();

  return (
    <div className="w-full min-h-full px-6 py-8 flex flex-col">
      <div className="w-full max-w-4xl mx-auto space-y-6">
        <div className="mb-2">
          <h1 className="text-2xl font-bold tracking-tight">Pengaturan Sumber Data</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload file Excel (.xlsx) atau CSV untuk mengaktifkan dashboard. Data diproses lokal di browser — tidak diunggah ke server.
          </p>
        </div>

        <Dropzone
          slot="salesMarketing"
          title="Upload File Dashboard Sales (.xlsx / .csv)"
          subtitle="Membaca sheet: DASHBOARD_CEO, LEADS FUNNEL, SALES PERFORMANCE OVERVIEW, MARKETING ADS"
          icon={<FileSpreadsheet className="h-5 w-5" />}
          file={salesFile}
        />
        <Dropzone
          slot="teknik"
          title="Upload File Dashboard Teknik (.xlsx / .csv)"
          subtitle="Membaca sheet: EXECUTIVE_DASHBOARD, KURVA_S_OVERALL, DATAMASTER"
          icon={<Database className="h-5 w-5" />}
          file={teknikFile}
        />
      </div>
    </div>
  );
}

function Dropzone({
  slot, title, subtitle, icon, file,
}: {
  slot: Slot;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  file: ParsedFile | null;
}) {
  const { setFile, clearFile } = useSpreadsheet();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);

  const accept = ".xlsx,.xls,.csv";

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setBusy(true);
    try { await setFile(slot, files[0]); }
    catch {} finally { setBusy(false); }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };
  const onSelect = (e: ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    e.target.value = "";
  };

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="glass rounded-xl border border-white/10 p-5 backdrop-blur-md">
      <div className="mb-4 flex items-start gap-3">
        <div className="rounded-lg bg-[var(--emerald)]/15 p-2 text-[var(--emerald)]">{icon}</div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        </div>
        {file ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--emerald)]/15 px-2.5 py-1 text-[11px] font-semibold text-[var(--emerald)]">
            <CheckCircle2 className="h-3 w-3" /> Aktif
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/15 px-2.5 py-1 text-[11px] font-semibold text-destructive">
            <span className="h-1.5 w-1.5 rounded-full bg-destructive" /> Kosong
          </span>
        )}
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-all ${
          dragOver
            ? "border-[var(--electric)] bg-[var(--electric)]/10"
            : "border-white/15 bg-muted/10 hover:border-[var(--electric)]/60 hover:bg-[var(--electric)]/5"
        }`}
      >
        <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={onSelect} />
        {busy ? (
          <Loader2 className="h-7 w-7 animate-spin text-[var(--electric)]" />
        ) : (
          <UploadCloud className="h-7 w-7 text-[var(--electric)]" />
        )}
        <p className="text-sm font-semibold">
          {busy ? "Memproses file…" : "Tarik file ke sini atau klik untuk memilih"}
        </p>
        <p className="text-[11px] text-muted-foreground">Mendukung .xlsx, .xls, .csv</p>
      </div>

      {file && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card/60 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{file.name}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {Object.keys(file.sheets).length} sheet · diunggah {fmtTime(file.uploadedAt)}
            </p>
          </div>
          <button
            onClick={() => clearFile(slot)}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" /> Hapus
          </button>
        </div>
      )}
    </div>
  );
}
