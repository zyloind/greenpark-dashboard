import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export type SheetMatrix = string[][];
export type ParsedFile = {
  name: string;
  uploadedAt: string;
  sheets: Record<string, SheetMatrix>;
};

type Slot = "salesMarketing" | "teknik";

type Ctx = {
  salesFile: ParsedFile | null;
  teknikFile: ParsedFile | null;
  isSalesConnected: boolean;
  isTeknikConnected: boolean;
  setFile: (slot: Slot, file: File) => Promise<void>;
  clearFile: (slot: Slot) => void;
  filters: { project: string; period: string };
  setFilter: (key: "project" | "period", value: string) => void;
  selectedYear: number;
  matchesSelectedYear: (row: Record<string, unknown>, dateKeys?: string[]) => boolean;
  /** Lookup a sheet by name (case- and separator-insensitive). */
  getSheet: (slot: Slot, candidates: string[]) => SheetMatrix;
};

const SpreadsheetCtx = createContext<Ctx>({} as Ctx);
const STORAGE_KEY = "gp_uploaded_sheets_v2";

const normName = (s: string) => s.toLowerCase().replace(/[\s_\-]+/g, "");

function loadFromStorage(): { sales: ParsedFile | null; teknik: ParsedFile | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { sales: null, teknik: null };
}

function persist(sales: ParsedFile | null, teknik: ParsedFile | null) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sales, teknik }));
  } catch (e) {
    console.warn("[spreadsheet] persist failed (likely localStorage quota):", e);
  }
}

async function parseFile(file: File): Promise<ParsedFile> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: false });
  const sheets: Record<string, SheetMatrix> = {};
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    // header:1 → 2D array preserving row/col indices exactly as in Excel.
    // raw:false → keep formatted strings ("42.96 M", "Rp 1,864,763,050").
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
      defval: "",
      blankrows: true,
      raw: false,
    });
    sheets[name] = rows.map((r) => (r as unknown[]).map((c) => (c == null ? "" : String(c))));
  }
  return { name: file.name, uploadedAt: new Date().toISOString(), sheets };
}

export function SpreadsheetProvider({ children }: { children: ReactNode }) {
  const [salesFile, setSales] = useState<ParsedFile | null>(null);
  const [teknikFile, setTeknik] = useState<ParsedFile | null>(null);
  const [filters, setFilters] = useState({ project: "Semua Proyek", period: "Tahun 2026" });

  useEffect(() => {
    const { sales, teknik } = loadFromStorage();
    if (sales) setSales(sales);
    if (teknik) setTeknik(teknik);
  }, []);

  useEffect(() => { persist(salesFile, teknikFile); }, [salesFile, teknikFile]);

  const setFile: Ctx["setFile"] = async (slot, file) => {
    try {
      const parsed = await parseFile(file);
      if (slot === "salesMarketing") setSales(parsed); else setTeknik(parsed);
      toast.success(`✅ ${file.name} berhasil dimuat`, {
        description: `${Object.keys(parsed.sheets).length} sheet terbaca: ${Object.keys(parsed.sheets).slice(0, 4).join(", ")}${Object.keys(parsed.sheets).length > 4 ? "…" : ""}`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("❌ Gagal membaca file", { description: msg });
      throw e;
    }
  };

  const clearFile: Ctx["clearFile"] = (slot) => {
    if (slot === "salesMarketing") setSales(null); else setTeknik(null);
  };

  const selectedYear = useMemo(() => {
    const m = filters.period.match(/(\d{4})/);
    return m ? parseInt(m[1], 10) : new Date().getFullYear();
  }, [filters.period]);

  const DEFAULT_DATE_KEYS = ["TANGGAL", "DATE", "TGL", "BULAN", "PERIODE", "Tanggal", "Date"];
  const matchesSelectedYear: Ctx["matchesSelectedYear"] = useCallback((row, dateKeys = DEFAULT_DATE_KEYS) => {
    if (!row) return false;
    for (const key of dateKeys) {
      const raw = row[key];
      if (raw == null) continue;
      if (typeof raw === "string") {
        const dMatch = raw.match(/Date\((\d{4})/);
        if (dMatch) return parseInt(dMatch[1], 10) === selectedYear;
        const yMatch = raw.match(/(\d{4})/);
        if (yMatch) return parseInt(yMatch[1], 10) === selectedYear;
      }
      if (raw instanceof Date) return raw.getFullYear() === selectedYear;
      if (typeof raw === "number" && raw > 1900 && raw < 3000) return raw === selectedYear;
    }
    return false;
  }, [selectedYear]);

  const getSheet: Ctx["getSheet"] = useCallback((slot, candidates) => {
    const file = slot === "salesMarketing" ? salesFile : teknikFile;
    if (!file) return [];
    const wanted = candidates.map(normName);
    for (const k of Object.keys(file.sheets)) {
      if (wanted.includes(normName(k))) return file.sheets[k];
    }
    return [];
  }, [salesFile, teknikFile]);

  return (
    <SpreadsheetCtx.Provider
      value={{
        salesFile, teknikFile,
        isSalesConnected: !!salesFile,
        isTeknikConnected: !!teknikFile,
        setFile, clearFile,
        filters,
        setFilter: (k, v) => setFilters((f) => ({ ...f, [k]: v })),
        selectedYear, matchesSelectedYear,
        getSheet,
      }}
    >
      {children}
    </SpreadsheetCtx.Provider>
  );
}
export const useSpreadsheet = () => useContext(SpreadsheetCtx);
