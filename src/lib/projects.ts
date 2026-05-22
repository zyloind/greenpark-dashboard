import { useMemo } from "react";
import { useSpreadsheet, type SheetMatrix } from "@/lib/spreadsheet";

export const ALL_PROJECTS = "Semua Proyek";

const norm = (s: string) => s.trim().toUpperCase().replace(/\s+/g, " ");

type Scope = "sales" | "teknik";

// Scan a sheet for the header row containing the named column, then collect uniques.
function extractByHeader(matrix: SheetMatrix, headerCandidates: string[]): string[] {
  if (!matrix.length) return [];
  const wanted = headerCandidates.map(norm);
  for (let r = 0; r < Math.min(matrix.length, 20); r++) {
    const row = matrix[r] ?? [];
    const idx = row.findIndex((c) => wanted.includes(norm(String(c ?? ""))));
    if (idx < 0) continue;
    const set = new Set<string>();
    for (let rr = r + 1; rr < matrix.length; rr++) {
      const v = String(matrix[rr]?.[idx] ?? "").trim();
      if (!v) continue;
      if (/^(total|grand total|sub total)$/i.test(v)) continue;
      set.add(v);
    }
    if (set.size) return Array.from(set).sort((a, b) => a.localeCompare(b));
  }
  return [];
}

export function useProjectOptions(scope: Scope) {
  const { salesFile, teknikFile, getSheet } = useSpreadsheet();
  const connected = scope === "teknik" ? !!teknikFile : !!salesFile;

  const projects = useMemo(() => {
    if (!connected) return [];
    if (scope === "teknik") {
      const dm = getSheet("teknik", ["DATAMASTER"]);
      return extractByHeader(dm, ["PROYEK", "PROJECT", "NAMA PROYEK"]);
    }
    const ads = getSheet("salesMarketing", ["MARKETING ADS", "MARKETING_ADS"]);
    let list = extractByHeader(ads, ["PROJECT", "PROYEK", "NAMA PROYEK"]);
    if (!list.length) {
      const pen = getSheet("salesMarketing", ["DATA PENJUALAN"]);
      list = extractByHeader(pen, ["PROJECT", "PROYEK", "NAMA PROYEK"]);
    }
    return list;
  }, [scope, connected, getSheet]);

  return { projects, options: [ALL_PROJECTS, ...projects], loading: false, connected };
}
