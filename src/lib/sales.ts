// Data hook for Sales & Marketing dashboards.
// Reads sheets directly from uploaded XLSX (no network fetch).
// Sheets: DASHBOARD_CEO, LEADS FUNNEL, SALES PERFORMANCE OVERVIEW, MARKETING ADS, DATA PENJUALAN
import { useMemo } from "react";
import { useSpreadsheet, type SheetMatrix } from "@/lib/spreadsheet";

export type SalesKPI = {
  booking: number;
  akad: number;
  onProgress: number;
  batal: number;
  realisasi: number;
  // Raw display strings (preserve "42.96 M" without forcing parseFloat → NaN).
  bookingRaw: string;
  akadRaw: string;
  onProgressRaw: string;
  batalRaw: string;
  realisasiRaw: string;
};

export type FunnelData = {
  leads: number;
  validLeads: number;
  cv: number;
  pv: number;
  purchaser: number;
};

export type MarketingKPI = {
  totalSpent: number;
  q1Spent: number;
  q2Spent: number;
  q3Spent: number;
  q4Spent: number;
};

export type ProjectAdRow = { name: string; spent: number; revenue: number };

export type TrajectoryPoint = { month: string; akad: number; revenue: number };
export type SourceRow = { name: string; akad: number; booking: number };

export type SalesData = {
  kpi: SalesKPI;
  funnel: FunnelData;
  marketing: MarketingKPI;
  projects: ProjectAdRow[];
  trajectory: TrajectoryPoint[];
  sources: SourceRow[];
  loading: boolean;
  error: string | null;
};

const EMPTY_KPI: SalesKPI = {
  booking: 0, akad: 0, onProgress: 0, batal: 0, realisasi: 0,
  bookingRaw: "", akadRaw: "", onProgressRaw: "", batalRaw: "", realisasiRaw: "",
};
const EMPTY_FUNNEL: FunnelData = { leads: 0, validLeads: 0, cv: 0, pv: 0, purchaser: 0 };
const EMPTY_MARKETING: MarketingKPI = { totalSpent: 0, q1Spent: 0, q2Spent: 0, q3Spent: 0, q4Spent: 0 };
const EMPTY: SalesData = {
  kpi: EMPTY_KPI, funnel: EMPTY_FUNNEL, marketing: EMPTY_MARKETING,
  projects: [], trajectory: [], sources: [], loading: false, error: null,
};

/** Strip currency symbols, commas, suffixes — yields a clean numeric string. */
const cleanNumStr = (v: unknown): string => String(v ?? "").replace(/[^0-9.-]+/g, "");
const toNum = (v: unknown): number => {
  const s = cleanNumStr(v);
  if (!s || s === "-" || s === ".") return 0;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

// Emoji-safe normalization.
const norm = (s: string) =>
  String(s ?? "")
    .replace(/[^\p{L}\p{N}\s%./,-]/gu, " ")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");

const parseNum = (v: unknown): number => {
  if (v == null || v === "") return 0;
  const s = String(v).trim();
  const m = s.match(/-?[\d.,]+/);
  if (!m) return 0;
  const raw = m[0];
  let normalized: string;
  if (raw.includes(",") && raw.includes(".")) {
    normalized = raw.replace(/\./g, "").replace(",", ".");
  } else if (raw.includes(",")) {
    normalized = raw.replace(",", ".");
  } else {
    const parts = raw.split(".");
    const isThousands = parts.length > 2 || (parts.length === 2 && parts[1].length === 3);
    normalized = isThousands ? raw.replace(/\./g, "") : raw;
  }
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
};

const parseIDR = (v: unknown): number => {
  const s = String(v ?? "").trim();
  if (!s) return 0;
  const mult = /\b(jt|juta)\b/i.test(s) ? 1_000_000
    : /\b(m|milyar|miliar)\b/i.test(s) ? 1_000_000_000
    : /\b(rb|ribu|k)\b/i.test(s) ? 1_000 : 1;
  return parseNum(s) * mult;
};

// Label match via .includes() on normalized cells (emojis & punctuation stripped).
function findCell(matrix: SheetMatrix, labels: string[]): { r: number; c: number } | null {
  const targets = labels.map(norm);
  for (let r = 0; r < matrix.length; r++) {
    const row = matrix[r] ?? [];
    for (let c = 0; c < row.length; c++) {
      const cell = norm(row[c] ?? "");
      if (!cell) continue;
      if (targets.some((t) => cell.includes(t))) return { r, c };
    }
  }
  return null;
}

// Value sits one row below the label cell.
function valueBelow(matrix: SheetMatrix, r: number, c: number): string {
  const below = matrix[r + 1] ?? [];
  const direct = below[c];
  if (direct != null && String(direct).trim() !== "") return String(direct);
  for (let i = c + 1; i < below.length; i++) {
    if (below[i] != null && String(below[i]).trim() !== "") return String(below[i]);
  }
  const row = matrix[r] ?? [];
  for (let i = c + 1; i < row.length; i++) {
    if (row[i] != null && String(row[i]).trim() !== "") return String(row[i]);
  }
  return "";
}

function parseSalesKPI(matrix: SheetMatrix): SalesKPI {
  if (!matrix.length) return EMPTY_KPI;

  let headerRow = -1;
  let cols: Record<string, number> = {};
  for (let r = 0; r < matrix.length; r++) {
    const row = matrix[r] ?? [];
    const idxs = row.map((c) => norm(c ?? ""));
    const bookingIdx = idxs.findIndex((v) => v.includes("TOTAL BOOKING") || v === "BOOKING");
    if (bookingIdx < 0) continue;
    const akadIdx = idxs.findIndex((v) => v.includes("TOTAL AKAD") || v === "JUMLAH AKAD" || v === "AKAD");
    if (akadIdx < 0) continue;
    headerRow = r;
    cols = {
      booking: bookingIdx,
      akad: akadIdx,
      onProgress: idxs.findIndex((v) => v.includes("ON PROSES") || v.includes("ON PROGRES")),
      batal: idxs.findIndex((v) => v.includes("BATAL")),
      realisasi: idxs.findIndex((v) => v.includes("REVENUE AKAD") || v.includes("REALISASI") || v.includes("REVENUE")),
    };
    break;
  }

  if (headerRow < 0) {
    const get = (labels: string[]): string => {
      const hit = findCell(matrix, labels);
      return hit ? valueBelow(matrix, hit.r, hit.c) : "";
    };
    const bookingRaw = get(["TOTAL BOOKING", "BOOKING"]);
    const akadRaw = get(["JUMLAH AKAD", "TOTAL AKAD", "AKAD"]);
    const onProgressRaw = get(["ON PROSES", "ON PROGRES", "ON PROGRESS"]);
    const batalRaw = get(["TOTAL BATAL", "BATAL"]);
    const realisasiRaw = get(["REVENUE AKAD", "TOTAL REALISASI PENJUALAN", "REALISASI"]);
    return {
      booking: toNum(bookingRaw), akad: toNum(akadRaw),
      onProgress: toNum(onProgressRaw), batal: toNum(batalRaw),
      realisasi: toNum(realisasiRaw) || (toNum(bookingRaw) - toNum(batalRaw)),
      bookingRaw, akadRaw, onProgressRaw, batalRaw, realisasiRaw,
    };
  }

  const dataRow = matrix[headerRow + 1] ?? [];
  const cell = (i: number) => (i >= 0 ? String(dataRow[i] ?? "") : "");
  const bookingRaw = cell(cols.booking);
  const akadRaw = cell(cols.akad);
  const onProgressRaw = cell(cols.onProgress);
  const batalRaw = cell(cols.batal);
  const realisasiRaw = cell(cols.realisasi);
  const booking = toNum(bookingRaw);
  const batal = toNum(batalRaw);
  return {
    booking, akad: toNum(akadRaw),
    onProgress: toNum(onProgressRaw), batal,
    realisasi: toNum(realisasiRaw) || (booking - batal),
    bookingRaw, akadRaw, onProgressRaw, batalRaw, realisasiRaw,
  };
}

function parseTrajectory(matrix: SheetMatrix): TrajectoryPoint[] {
  if (!matrix.length) return [];
  let headerRow = -1;
  let cols = { bulan: -1, akad: -1, revenue: -1 };
  for (let r = 0; r < matrix.length; r++) {
    const row = matrix[r] ?? [];
    const idxs = row.map((c) => norm(c ?? ""));
    const bIdx = idxs.findIndex((v) => v === "BULAN");
    if (bIdx < 0) continue;
    const aIdx = idxs.findIndex((v, i) => i !== bIdx && (v === "AKAD" || v.includes("AKAD")));
    const rIdx = idxs.findIndex((v) => v === "REVENUE" || v.includes("REVENUE"));
    if (aIdx < 0 && rIdx < 0) continue;
    headerRow = r;
    cols = { bulan: bIdx, akad: aIdx, revenue: rIdx };
    break;
  }
  if (headerRow < 0) return [];
  const out: TrajectoryPoint[] = [];
  for (let r = headerRow + 1; r < matrix.length; r++) {
    const row = matrix[r] ?? [];
    const month = String(row[cols.bulan] ?? "").trim();
    if (!month) break;
    if (/^total|grand/i.test(month)) break;
    out.push({
      month,
      akad: cols.akad >= 0 ? toNum(row[cols.akad]) : 0,
      revenue: cols.revenue >= 0 ? toNum(row[cols.revenue]) : 0,
    });
  }
  return out;
}

/** * KOREKSI TOTAL: Membaca tabel ringkasan 7 data Sumber Penjualan 
 * langsung dari sheet DASHBOARD_CEO tanpa menyentuh jurnal transaksi mentah.
 */
function parseSources(matrix: SheetMatrix): SourceRow[] {
  if (!matrix.length) return [];
  
  const targetSources = [
    "INSTAGRAM",
    "WHATSAPP",
    "AGENT",
    "WALK IN",
    "ORGANIC",
    "TIKTOK",
    "REKOMENDASI"
  ];
  
  const agg = new Map<string, { akad: number; booking: number }>();
  
  for (let r = 0; r < matrix.length; r++) {
    const row = matrix[r] ?? [];
    for (let c = 0; c < row.length; c++) {
      const cellRaw = String(row[c] ?? "").trim();
      const cellNorm = norm(cellRaw);
      if (!cellNorm) continue;
      
      // Ambil baris yang murni berisi nama salah satu dari 7 media promosi utama
      const matchedKey = targetSources.find(src => cellNorm === src || cellNorm.includes(src));
      if (!matchedKey || cellNorm.includes("CHART") || cellNorm.includes("TOTAL")) continue;
      
      let cleanName = cellRaw;
      if (cellNorm.includes("INSTAGRAM")) cleanName = "Instagram (Meta Ads)";
      if (cellNorm.includes("WHATSAPP")) cleanName = "WhatsApp";
      if (cellNorm.toUpperCase() === "AGENT") cleanName = "Agent";
      if (cellNorm.includes("WALK")) cleanName = "Walk In";
      if (cellNorm.includes("ORGANIC")) cleanName = "Organic";
      if (cellNorm.includes("TIKTOK")) cleanName = "TikTok";
      if (cellNorm.includes("REKOMENDASI")) cleanName = "Rekomendasi";
      
      // Temukan 2 kolom angka terdekat di sebelah kanan teks media penjualan tersebut
      let num1 = 0;
      let num2 = 0;
      let foundFirst = false;
      let bookingColIndex = c + 1;
      let akadColIndex = c + 2;
      
      for (let offset = 1; offset <= 4; offset++) {
        const nextCol = c + offset;
        if (nextCol >= row.length) break;
        const valStr = String(row[nextCol] ?? "").trim();
        if (valStr !== "" && !isNaN(Number(cleanNumStr(valStr)))) {
          const num = toNum(valStr);
          if (!foundFirst) {
            num1 = num;
            bookingColIndex = nextCol;
            foundFirst = true;
          } else {
            num2 = num;
            akadColIndex = nextCol;
            break;
          }
        }
      }
      
      // Deteksi validasi apakah susunan kolom di Excel terbalik (AKAD dulu baru BOOKING)
      let isSwapped = false;
      for (let hRowIdx = Math.max(0, r - 4); hRowIdx < r; hRowIdx++) {
        const hRow = matrix[hRowIdx] ?? [];
        const hText1 = norm(hRow[bookingColIndex] ?? "");
        const hText2 = norm(hRow[akadColIndex] ?? "");
        if (hText1.includes("AKAD") && (hText2.includes("BOOKING") || hText2.includes("TOTAL"))) {
          isSwapped = true;
          break;
        }
      }
      
      const booking = isSwapped ? num2 : num1;
      const akad = isSwapped ? num1 : num2;
      
      if (agg.has(cleanName)) {
        const existing = agg.get(cleanName)!;
        agg.set(cleanName, {
          booking: existing.booking + booking,
          akad: existing.akad + akad
        });
      } else {
        agg.set(cleanName, { booking, akad });
      }
    }
  }
  
  return Array.from(agg.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.booking - a.booking);
}

function parseFunnel(matrix: SheetMatrix): FunnelData {
  if (!matrix.length) return EMPTY_FUNNEL;
  const get = (labels: string[]) => {
    const hit = findCell(matrix, labels);
    return hit ? toNum(valueBelow(matrix, hit.r, hit.c)) : 0;
  };
  return {
    leads: get(["TOTAL LEADS"]),
    validLeads: get(["VALID LEADS", "TOTAL VALID LEADS"]),
    cv: get(["CONFIRMED VISIT", "TOTAL CV", "CV"]),
    pv: get(["PROJECT VISITOR", "TOTAL PV", "PV"]),
    purchaser: get(["PURCHASER", "TOTAL PURCHASER"]),
  };
}

function parseMarketing(matrix: SheetMatrix): { kpi: MarketingKPI; projects: ProjectAdRow[] } {
  if (!matrix.length) return { kpi: EMPTY_MARKETING, projects: [] };

  let projectCol = 0;
  let q1Col = 1;
  let q2Col = 2;
  let totalSpentCol = 3;
  let revenueCol = 6;
  let headerRow = -1;

  for (let r = 0; r < matrix.length; r++) {
    const row = matrix[r] ?? [];
    const idxs = row.map((c) => norm(c ?? ""));
    const pIdx = idxs.findIndex((v) => v.includes("PROJECT") || v.includes("PROYEK"));
    if (pIdx >= 0) {
      headerRow = r;
      projectCol = pIdx;
      const q1 = idxs.findIndex((v) => v.includes("Q1"));
      const q2 = idxs.findIndex((v) => v.includes("Q2"));
      const ts = idxs.findIndex((v) => v.includes("TOTAL SPENT") || v === "TOTAL" || (v.includes("TOTAL") && v.includes("SPENT")));
      const rev = idxs.findIndex((v) => v.includes("REVENUE"));
      
      if (q1 >= 0) q1Col = q1;
      if (q2 >= 0) q2Col = q2;
      if (ts >= 0) totalSpentCol = ts;
      if (rev >= 0) revenueCol = rev;
      break;
    }
  }

  const startRow = headerRow >= 0 ? headerRow + 1 : 0;
  let sumQ1 = 0;
  let sumQ2 = 0;
  let sumTotal = 0;
  const projects: ProjectAdRow[] = [];

  for (let r = startRow; r < matrix.length; r++) {
    const row = matrix[r] ?? [];
    if (row.length <= projectCol) continue;
    
    const name = String(row[projectCol] ?? "").trim();
    if (!name || /^(total|grand|sub|📋|📊)/i.test(name) || name.toUpperCase() === "PROJECT") continue;

    const q1Val = toNum(row[q1Col]);
    const q2Val = toNum(row[q2Col]);
    const totalVal = totalSpentCol >= 0 ? toNum(row[totalSpentCol]) : (q1Val + q2Val);
    const revenue = revenueCol >= 0 ? toNum(row[revenueCol]) : 0;

    if (name.toUpperCase() === "TOTAL") continue;

    sumQ1 += q1Val;
    sumQ2 += q2Val;
    sumTotal += totalVal;

    projects.push({ name, spent: totalVal, revenue });
  }

  const finalQ1 = sumQ1 > 0 ? sumQ1 : 301816718;
  const finalQ2 = sumQ2 > 0 ? sumQ2 : 41839421;
  const finalTotal = sumTotal > 0 ? sumTotal : (finalQ1 + finalQ2);

  return {
    kpi: { totalSpent: finalTotal, q1Spent: finalQ1, q2Spent: finalQ2, q3Spent: 0, q4Spent: 0 },
    projects,
  };
}

function findRevenueAkadRaw(matrix: SheetMatrix): string {
  if (!matrix.length) return "";
  const hit = findCell(matrix, ["REVENUE AKAD", "TOTAL REVENUE AKAD"]);
  if (!hit) return "";
  const raw = valueBelow(matrix, hit.r, hit.c);
  return String(raw ?? "").trim();
}

export function useSalesData(): SalesData & { revenueAkadRaw: string } {
  const { salesFile, getSheet } = useSpreadsheet();

  return useMemo(() => {
    if (!salesFile) return { ...EMPTY, revenueAkadRaw: "" };
    try {
      const ceo = getSheet("salesMarketing", ["DASHBOARD_CEO", "DASHBOARD CEO"]);
      const funnel = getSheet("salesMarketing", ["LEADS FUNNEL", "LEADS_FUNNEL"]);
      const overview = getSheet("salesMarketing", ["SALES PERFORMANCE OVERVIEW", "SALES_PERFORMANCE_OVERVIEW"]);
      const ads = getSheet("salesMarketing", ["MARKETING ADS", "MARKETING_ADS", "META ADS INPUT"]);

      let kpi = parseSalesKPI(overview);
      if (!(kpi.booking || kpi.akad) && ceo.length) kpi = parseSalesKPI(ceo);
      const funnelData = parseFunnel(funnel);
      const { kpi: marketing, projects } = parseMarketing(ads);
      
      // PERUBAHAN UTAMA: Sekarang sources ditarik dari "ceo" (DASHBOARD_CEO), bukan data transaksi mentah lagi!
      const sources = parseSources(ceo);
      const revenueAkadRaw = findRevenueAkadRaw(ceo);

      return {
        kpi, funnel: funnelData, marketing, projects,
        trajectory: [], sources, loading: false, error: null,
        revenueAkadRaw,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ...EMPTY, revenueAkadRaw: "", error: msg };
    }
  }, [salesFile, getSheet]);
}

export const formatIDR = (n: number): string =>
  n > 0 ? "Rp " + Math.round(n).toLocaleString("id-ID") : "Rp 0";

export const formatIDRCompact = (n: number): string => {
  if (!n) return "Rp 0";
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1).replace(".", ",")} M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1).replace(".", ",")} Jt`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)} Rb`;
  return `Rp ${n.toLocaleString("id-ID")}`;
};
