// Data hook for the Teknik dashboard. Reads from uploaded XLSX (no network fetch).
// Sheets: EXECUTIVE_DASHBOARD, KURVA_S_OVERALL, (optional) API_DASHBOARD, DATAMASTER.
import { useMemo } from "react";
import { useSpreadsheet, type SheetMatrix } from "@/lib/spreadsheet";

export type TeknikKPI = {
  unitActive: number;
  unitComplete: number;
  avgProgress: number;
  avgDeviasi: number;
  totalDenda: number;
};

export type KurvaPoint = { label: string; target: number; realisasi: number };

export type ContractorRow = {
  name: string;
  jmlProyek: number;
  totalUnit: number;
  unitBast: number;
  kuning150: number;
  merah240: number;
  avgDeviasi: number;
  totalDenda: number;
  rating: string;
};

export type GpRadarRow = { region: string; metrics: Record<string, string> };

export type VendorRow = { name: string; units: number; deviasi: number };

export type TeknikData = {
  kpi: TeknikKPI;
  kurva: KurvaPoint[];
  contractors: ContractorRow[];
  gpRadar: { metrics: string[]; rows: GpRadarRow[] };
  vendors: VendorRow[];
  loading: boolean;
  error: string | null;
};

const EMPTY_KPI: TeknikKPI = { unitActive: 0, unitComplete: 0, avgProgress: 0, avgDeviasi: 0, totalDenda: 0 };
const EMPTY: TeknikData = {
  kpi: EMPTY_KPI, kurva: [], contractors: [],
  gpRadar: { metrics: [], rows: [] }, vendors: [],
  loading: false, error: null,
};

const norm = (s: string) => String(s ?? "").trim().toUpperCase().replace(/\s+/g, " ");
const parseNum = (v: unknown): number => {
  if (v == null || v === "") return 0;
  const m = String(v).trim().match(/-?[\d.,]+/);
  if (!m) return 0;
  const n = parseFloat(m[0].replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const parsePercent = (v: unknown): number => {
  const s = String(v ?? "").trim();
  if (!s) return 0;
  const n = parseNum(s);
  if (s.includes("%")) return n;
  if (Math.abs(n) > 0 && Math.abs(n) <= 1.5) return n * 100;
  return n;
};
const parseIDR = (v: unknown): number => {
  const s = String(v ?? "").replace(/[^0-9.-]/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

const SKIP_NAME_RE = /(TOTAL|RATING|AUDIT\s*VENDOR|AUTO[-\s]?ROLLING|★|⭐)/i;
const isSkipName = (s: string): boolean => {
  const t = String(s ?? "").trim();
  if (!t) return true;
  return SKIP_NAME_RE.test(t);
};

function findCellPos(matrix: SheetMatrix, labels: string[]): { r: number; c: number } | null {
  const targets = labels.map(norm);
  for (let r = 0; r < matrix.length; r++) {
    const row = matrix[r] ?? [];
    for (let c = 0; c < row.length; c++) {
      const cell = norm(row[c] ?? "");
      if (!cell) continue;
      if (targets.some((t) => cell === t || cell.includes(t))) return { r, c };
    }
  }
  return null;
}

// Value sits exactly one row below the label cell: matrix[r+1][c].
function readKpiValue(matrix: SheetMatrix, labels: string[]): string {
  const pos = findCellPos(matrix, labels);
  if (!pos) return "";
  const below = matrix[pos.r + 1];
  if (!below) return "";
  const direct = below[pos.c];
  if (direct != null && String(direct).trim() !== "") return String(direct);
  for (let i = pos.c + 1; i < below.length; i++) {
    if (below[i] != null && String(below[i]).trim() !== "") return String(below[i]);
  }
  return "";
}

function parseExecutiveKPI(matrix: SheetMatrix): TeknikKPI {
  if (!matrix.length) return EMPTY_KPI;
  const get = (labels: string[]) => readKpiValue(matrix, labels);
  return {
    unitActive: parseNum(get(["UNIT ACTIVE", "TOTAL UNIT ACTIVE", "UNIT STOCK"])),
    unitComplete: parseNum(get(["UNIT COMPLETE", "UNIT BAST", "COMPLETE (BAST)"])),
    avgProgress: parsePercent(get(["AVG PROGRESS FISIK", "AVG. PROGRESS FISIK", "PROGRESS FISIK"])),
    avgDeviasi: parsePercent(get(["AVG DEVIASI", "AVG. DEVIASI", "DEVIASI"])),
    totalDenda: parseIDR(get(["TOTAL DENDA KONTRAKTOR", "TOTAL DENDA", "DENDA KONTRAKTOR"])),
  };
}

// Optional 2-column key/value sheet.
function parseApiDashboardKPI(matrix: SheetMatrix): TeknikKPI {
  if (!matrix.length) return EMPTY_KPI;
  const lookup = (needles: string[]): string => {
    const N = needles.map(norm);
    for (let r = 0; r < matrix.length; r++) {
      const row = matrix[r] ?? [];
      const name = norm(row[0] ?? "");
      if (!name) continue;
      if (N.some((t) => name.includes(t))) {
        const v = row[1];
        if (v != null && String(v).trim() !== "") return String(v);
      }
    }
    return "";
  };
  return {
    unitActive: parseNum(lookup(["UNIT ACTIVE"])),
    unitComplete: parseNum(lookup(["UNIT COMPLETE", "UNIT BAST"])),
    avgProgress: parsePercent(lookup(["AVG PROGRESS", "PROGRESS FISIK"])),
    avgDeviasi: parsePercent(lookup(["AVG DEVIASI", "DEVIASI"])),
    totalDenda: parseIDR(lookup(["TOTAL DENDA", "DENDA"])),
  };
}

function findVendorHeader(matrix: SheetMatrix): { headerRow: number; nameCol: number } | null {
  for (let r = 0; r < matrix.length; r++) {
    const row = matrix[r] ?? [];
    for (let c = 0; c < row.length; c++) {
      const v = norm(row[c]);
      if (v === "NAMA VENDOR" || v === "NAMA KONTRAKTOR" || v === "NAMA_KONTRAKTOR") {
        return { headerRow: r, nameCol: c };
      }
    }
  }
  return null;
}

function findCurrentCol(matrix: SheetMatrix, headerRow: number, groupLabels: string[]): number {
  const top = (matrix[headerRow] ?? []).map((c) => norm(c));
  const sub = (matrix[headerRow + 1] ?? []).map((c) => norm(c));
  const targets = groupLabels.map(norm);
  const groupForCol: string[] = [];
  let lastTop = "";
  for (let i = 0; i < top.length; i++) {
    if (top[i]) lastTop = top[i];
    groupForCol[i] = lastTop;
  }
  for (let i = 0; i < groupForCol.length; i++) {
    const g = groupForCol[i];
    if (!g) continue;
    if (!targets.some((t) => g.includes(t))) continue;
    if (sub[i] === "CURRENT") return i;
  }
  for (let i = 0; i < groupForCol.length; i++) {
    const g = groupForCol[i];
    if (!g) continue;
    if (targets.some((t) => g.includes(t))) return i;
  }
  for (let i = 0; i < top.length; i++) {
    if (targets.some((t) => top[i].includes(t))) return i;
  }
  return -1;
}

function parseContractorTable(matrix: SheetMatrix): ContractorRow[] {
  const hit = findVendorHeader(matrix);
  if (!hit) return [];
  const { headerRow, nameCol } = hit;
  const colJml = findCurrentCol(matrix, headerRow, ["JML PROYEK", "JUMLAH PROYEK", "PROYEK"]);
  const colUnit = findCurrentCol(matrix, headerRow, ["TOTAL UNIT", "UNIT"]);
  const colBast = findCurrentCol(matrix, headerRow, ["UNIT BAST", "BAST"]);
  const colKuning = findCurrentCol(matrix, headerRow, ["KUNING", ">150", "150H"]);
  const colMerah = findCurrentCol(matrix, headerRow, ["MERAH", ">240", "240H"]);
  const colDev = findCurrentCol(matrix, headerRow, ["AVG DEVIASI", "DEVIASI"]);
  const colDenda = findCurrentCol(matrix, headerRow, ["TOTAL DENDA", "DENDA"]);
  const colRating = findCurrentCol(matrix, headerRow, ["RATING"]);

  const startRow = headerRow + 2;
  const out: ContractorRow[] = [];
  for (let r = startRow; r < matrix.length; r++) {
    const row = matrix[r] ?? [];
    const name = String(row[nameCol] ?? "").trim();
    if (!name) {
      if (row.every((c) => !c || !String(c).trim())) break;
      continue;
    }
    if (isSkipName(name)) continue;
    out.push({
      name,
      jmlProyek: colJml >= 0 ? parseNum(row[colJml]) : 0,
      totalUnit: colUnit >= 0 ? parseNum(row[colUnit]) : 0,
      unitBast: colBast >= 0 ? parseNum(row[colBast]) : 0,
      kuning150: colKuning >= 0 ? parseNum(row[colKuning]) : 0,
      merah240: colMerah >= 0 ? parseNum(row[colMerah]) : 0,
      avgDeviasi: colDev >= 0 ? parsePercent(row[colDev]) : 0,
      totalDenda: colDenda >= 0 ? parseIDR(row[colDenda]) : 0,
      rating: colRating >= 0 ? String(row[colRating] ?? "").trim() : "",
    });
  }
  return out;
}

function parseGpRadar(matrix: SheetMatrix): { metrics: string[]; rows: GpRadarRow[] } {
  let sectionRow = -1;
  for (let r = 0; r < matrix.length; r++) {
    const joined = (matrix[r] ?? []).map((c) => norm(c)).join(" | ");
    if (joined.includes("GP PERFORMANCE RADAR")) { sectionRow = r; break; }
  }
  if (sectionRow < 0) return { metrics: [], rows: [] };
  let headerRow = -1;
  let regionCol = -1;
  for (let r = sectionRow + 1; r < Math.min(matrix.length, sectionRow + 10); r++) {
    const row = matrix[r] ?? [];
    for (let c = 0; c < row.length; c++) {
      const v = norm(row[c]);
      if (!v) continue;
      if (v === "REGION" || v === "BRANCH" || v === "GP" || /^GP\s*\d/.test(v)) {
        headerRow = r; regionCol = c; break;
      }
      break;
    }
    if (headerRow >= 0) break;
  }
  if (headerRow < 0) return { metrics: [], rows: [] };
  const anchor = norm(matrix[headerRow]?.[regionCol] ?? "");
  let metricRow = headerRow;
  let firstDataRow = headerRow + 1;
  if (/^GP\s*\d/.test(anchor)) {
    metricRow = headerRow - 1;
    firstDataRow = headerRow;
  }
  const metricCells = matrix[metricRow] ?? [];
  const metrics: { col: number; label: string }[] = [];
  for (let c = regionCol + 1; c < metricCells.length; c++) {
    const label = String(metricCells[c] ?? "").trim();
    if (label) metrics.push({ col: c, label });
  }
  const rows: GpRadarRow[] = [];
  for (let r = firstDataRow; r < matrix.length; r++) {
    const row = matrix[r] ?? [];
    const region = String(row[regionCol] ?? "").trim();
    if (!region) {
      if (row.every((c) => !c || !String(c).trim())) break;
      continue;
    }
    if (!/^GP\s*\d/i.test(region)) break;
    const m: Record<string, string> = {};
    for (const { col, label } of metrics) {
      const v = row[col];
      m[label] = v == null ? "" : String(v).trim();
    }
    rows.push({ region, metrics: m });
    if (rows.length >= 4) break;
  }
  return { metrics: metrics.map((m) => m.label), rows };
}

function parseKurvaS(matrix: SheetMatrix): KurvaPoint[] {
  if (matrix.length < 2) return [];
  let headerRow = -1;
  for (let r = 0; r < matrix.length; r++) {
    const first = norm(matrix[r]?.[0] ?? "");
    if (first === "WEEK" || first === "MINGGU") { headerRow = r; break; }
  }
  if (headerRow < 0) {
    for (let r = 0; r < Math.min(matrix.length, 30); r++) {
      const cells = (matrix[r] ?? []).map((c) => norm(c));
      if (cells.some((c) => c === "WEEK" || c === "MINGGU") && cells.some((c) => c.includes("KUMULATIF"))) {
        headerRow = r; break;
      }
    }
  }
  if (headerRow < 0) return [];
  const headers = (matrix[headerRow] ?? []).map((h) => norm(h));
  const findCol = (cands: string[]) => {
    const T = cands.map(norm);
    for (let i = 0; i < headers.length; i++) {
      if (T.some((t) => headers[i].includes(t))) return i;
    }
    return -1;
  };
  const xIdx = findCol(["WEEK", "MINGGU"]);
  const targetIdx = findCol(["TARGET KUMULATIF"]);
  const realIdx = findCol(["AVG REALISASI KUMULATIF", "REALISASI KUMULATIF"]);
  if (xIdx < 0 || (targetIdx < 0 && realIdx < 0)) return [];
  const out: KurvaPoint[] = [];
  for (let r = headerRow + 1; r < matrix.length; r++) {
    const row = matrix[r] ?? [];
    const label = String(row[xIdx] ?? "").trim();
    if (!label) break;
    if (/^TOTAL\b/i.test(label) || isSkipName(label)) break;
    out.push({
      label,
      target: targetIdx >= 0 ? parsePercent(row[targetIdx]) : 0,
      realisasi: realIdx >= 0 ? parsePercent(row[realIdx]) : 0,
    });
  }
  return out;
}

export function useTeknikData(): TeknikData {
  const { teknikFile, getSheet } = useSpreadsheet();

  return useMemo<TeknikData>(() => {
    if (!teknikFile) return EMPTY;
    try {
      const execMatrix = getSheet("teknik", ["EXECUTIVE_DASHBOARD"]);
      const kurvaMatrix = getSheet("teknik", ["KURVA_S_OVERALL"]);
      const apiMatrix = getSheet("teknik", ["API_DASHBOARD"]);

      const apiKpi = parseApiDashboardKPI(apiMatrix);
      const execKpi = parseExecutiveKPI(execMatrix);
      const kpi: TeknikKPI = {
        unitActive: apiKpi.unitActive || execKpi.unitActive,
        unitComplete: apiKpi.unitComplete || execKpi.unitComplete,
        avgProgress: apiKpi.avgProgress || execKpi.avgProgress,
        avgDeviasi: apiKpi.avgDeviasi || execKpi.avgDeviasi,
        totalDenda: apiKpi.totalDenda || execKpi.totalDenda,
      };
      const contractors = parseContractorTable(execMatrix);
      const gpRadar = parseGpRadar(execMatrix);
      const kurva = parseKurvaS(kurvaMatrix);
      const vendors: VendorRow[] = contractors.map((c) => ({
        name: c.name, units: c.totalUnit, deviasi: c.avgDeviasi,
      }));
      return { kpi, kurva, contractors, gpRadar, vendors, loading: false, error: null };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ...EMPTY, error: msg };
    }
  }, [teknikFile, getSheet]);
}
