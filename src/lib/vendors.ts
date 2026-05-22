import { useEffect, useState } from "react";

export type VendorRow = { name: string; units: number; deviasi: number };

const GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";

// Candidate sheet/column pairs to probe — keeps vendor source schema-agnostic.
const SOURCES: { sheet: string; nameCol: string; range: string }[] = [
  { sheet: "EXECUTIVE_DASHBOARD", nameCol: "NAMA VENDOR", range: "EXECUTIVE_DASHBOARD!A1:Z2000" },
  { sheet: "DATAMASTER", nameCol: "NAMA_KONTRAKTOR", range: "DATAMASTER!A1:Z5000" },
];

const STATUS_COL_CANDIDATES = ["STATUS", "STATUS UNIT", "STATUS_UNIT", "STATUS PROGRESS"];
const DEVIASI_COL_CANDIDATES = ["DEVIASI", "AVG DEVIASI", "DEVIASI (%)", "DEVIATION"];

const findIdx = (headers: string[], candidates: string[]) => {
  const norm = (s: string) => s.trim().toUpperCase().replace(/\s+/g, " ");
  const H = headers.map(norm);
  for (const c of candidates) {
    const i = H.indexOf(norm(c));
    if (i >= 0) return i;
  }
  return -1;
};

const isActive = (v: unknown) => {
  if (v == null) return true;
  const s = String(v).toLowerCase();
  if (!s) return true;
  return !/(bast|complete|selesai|done|close)/.test(s);
};

const parseNum = (v: unknown) => {
  if (v == null || v === "") return 0;
  const n = parseFloat(String(v).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

async function fetchRange(spreadsheetId: string, range: string): Promise<string[][] | null> {
  try {
    const res = await fetch(`${GATEWAY}/spreadsheets/${spreadsheetId}/values/${range}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { values?: string[][] };
    return data.values ?? null;
  } catch {
    return null;
  }
}

function aggregate(values: string[][], nameCol: string): VendorRow[] {
  if (!values || values.length < 2) return [];
  const [headers, ...rows] = values;
  const nameIdx = findIdx(headers, [nameCol]);
  if (nameIdx < 0) return [];
  const statusIdx = findIdx(headers, STATUS_COL_CANDIDATES);
  const devIdx = findIdx(headers, DEVIASI_COL_CANDIDATES);

  const SKIP_NAME_RE = /(TOTAL|RATING|AUDIT\s*VENDOR|AUTO[-\s]?ROLLING|★|⭐)/i;

  const acc = new Map<string, { units: number; devSum: number; devCount: number }>();
  for (const r of rows) {
    const raw = (r[nameIdx] ?? "").toString().trim();
    if (!raw) continue;
    if (SKIP_NAME_RE.test(raw)) continue;
    const key = raw.toUpperCase();
    const active = statusIdx >= 0 ? isActive(r[statusIdx]) : true;
    const cur = acc.get(key) ?? { units: 0, devSum: 0, devCount: 0 };
    if (active) cur.units += 1;
    if (devIdx >= 0) {
      const n = parseNum(r[devIdx]);
      if (n !== 0 || r[devIdx] === "0") {
        cur.devSum += n;
        cur.devCount += 1;
      }
    }
    acc.set(key, cur);
  }

  return Array.from(acc.entries())
    .map(([name, v]) => ({
      name,
      units: v.units,
      deviasi: v.devCount ? Math.round((v.devSum / v.devCount) * 10) / 10 : 0,
    }))
    .sort((a, b) => b.units - a.units);
}

export function useVendorLeaderboard(spreadsheetId: string): {
  vendors: VendorRow[];
  loading: boolean;
  error: string | null;
} {
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!spreadsheetId) {
      setVendors([]);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      let result: VendorRow[] = [];
      for (const src of SOURCES) {
        const values = await fetchRange(spreadsheetId, src.range);
        if (!values) continue;
        const agg = aggregate(values, src.nameCol);
        if (agg.length) {
          result = agg;
          break;
        }
      }
      if (cancelled) return;
      setVendors(result);
      setLoading(false);
      if (!result.length) setError("no_vendor_rows");
    })();

    return () => {
      cancelled = true;
    };
  }, [spreadsheetId]);

  return { vendors, loading, error };
}
