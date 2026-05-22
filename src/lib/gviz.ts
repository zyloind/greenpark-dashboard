// Google Sheets gviz/tq fetch utility with strict error handling + safe fallbacks.
// Uses the public "Anyone with link" share mode (no OAuth).

export type GvizCell = { v: unknown; f?: string } | null;
export type GvizRow = { c: GvizCell[] };
export type GvizTable = {
  cols: { id?: string; label?: string; type?: string }[];
  rows: GvizRow[];
};
export type GvizResponse = {
  version?: string;
  reqId?: string;
  status: "ok" | "error";
  table?: GvizTable;
  errors?: { reason?: string; message?: string; detailed_message?: string }[];
};

export type GvizParsedRow = Record<string, string | number | null>;

export type GvizResult = {
  sheetTitle: string;
  headers: string[];
  rows: GvizParsedRow[];
  raw: GvizResponse;
};

/**
 * Extract a Google Sheets spreadsheet ID from either a raw ID or a full URL.
 */
export function extractSheetId(input: string): string {
  const trimmed = (input || "").trim();
  if (!trimmed) return "";
  const m = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return (m ? m[1] : trimmed).trim();
}

/**
 * Build case/spacing/underscore-insensitive candidates for a tab name.
 * Google's gviz endpoint matches the `sheet` param exactly, so we try a few
 * canonical spellings ordered from most-likely to least-likely.
 */
function tabCandidates(tabName?: string): (string | undefined)[] {
  if (!tabName) return [undefined];
  const raw = tabName.trim();
  if (!raw) return [undefined];
  const upper = raw.toUpperCase();
  const lower = raw.toLowerCase();
  const variants = new Set<string>([
    raw,
    upper,
    lower,
    upper.replace(/\s+/g, "_"),
    upper.replace(/_/g, " "),
    lower.replace(/\s+/g, "_"),
    lower.replace(/_/g, " "),
  ]);
  return Array.from(variants);
}

/**
 * Normalised key used to compare two tab names ignoring case, spaces,
 * underscores, and dashes — per the project sheet-matching rule:
 *   sheetName.toLowerCase().replace(/[\s_-]/g, "")
 */
export const normSheetKey = (s: string): string =>
  (s ?? "").toLowerCase().replace(/[\s_-]/g, "");

/**
 * Fetch a single sheet/tab via the public gviz/tq endpoint.
 * Throws human-readable Indonesian errors for common failure modes.
 * If a `tabName` is provided, multiple case/spacing variants are tried so
 * that "executive_dashboard" maps to "EXECUTIVE_DASHBOARD" automatically.
 */
export async function fetchSheetTab(
  spreadsheetIdOrUrl: string,
  tabName?: string,
): Promise<GvizResult> {
  const sheetId = extractSheetId(spreadsheetIdOrUrl);
  if (!sheetId || sheetId.length < 20) {
    throw new Error("Format ID Spreadsheet salah atau kosong.");
  }

  const candidates = tabCandidates(tabName);
  let lastError: Error | null = null;
  for (const candidate of candidates) {
    try {
      return await fetchSheetTabOnce(sheetId, candidate);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      // Only retry on "tab not found" style errors; bubble up auth/network.
      if (!/tab tidak ditemukan|not\s+found|format id/i.test(lastError.message)) {
        throw lastError;
      }
    }
  }
  throw lastError ?? new Error("Tab tidak ditemukan.");
}

async function fetchSheetTabOnce(
  sheetId: string,
  tabName?: string,
): Promise<GvizResult> {
  // Build URL manually so the `sheet` parameter is ALWAYS explicitly appended
  // (gviz defaults to the first tab — usually DATAMASTER — when omitted).
  let url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;
  if (tabName) url += `&sheet=${encodeURIComponent(tabName)}`;
  console.log("[gviz] GET", url);

  let response: Response;
  try {
    response = await fetch(url, { method: "GET", credentials: "omit" });
  } catch (networkErr) {
    console.error("[gviz] network error", networkErr);
    throw new Error("Jaringan bermasalah — gagal menghubungi Google Sheets.");
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error(
      "Akses Google Sheet ditolak (Pastikan set 'Anyone with link · Viewer').",
    );
  }
  if (response.status === 404) {
    throw new Error("Spreadsheet tidak ditemukan — periksa kembali ID atau URL.");
  }
  if (!response.ok) {
    throw new Error(`Permintaan gagal dengan kode HTTP ${response.status}.`);
  }

  const rawText = await response.text();
  // gviz wraps JSON in: google.visualization.Query.setResponse({...});
  const jsonMatch = rawText.match(/google\.visualization\.Query\.setResponse\(([\s\S]*?)\);/);
  if (!jsonMatch) {
    console.error("[gviz] unexpected payload", rawText.slice(0, 200));
    throw new Error("Format Google Response Tidak Valid");
  }
  const match = jsonMatch;

  let parsed: GvizResponse;
  try {
    parsed = JSON.parse(match[1]);
  } catch (e) {
    console.error("[gviz] JSON parse error", e, match[1].slice(0, 200));
    throw new Error("Respons Google Sheets rusak (JSON tidak valid).");
  }

  console.log("RAW GVIZ DATA:", parsed);

  if (parsed.status !== "ok" || !parsed.table) {
    const err = parsed.errors?.[0];
    const reason = err?.reason ?? "unknown";
    const message = err?.detailed_message || err?.message || "Tab tidak ditemukan atau ID salah.";
    if (reason === "invalid_query" || /not\s+found/i.test(message)) {
      throw new Error(`Tab tidak ditemukan atau format ID salah. (${message})`);
    }
    throw new Error(`Gagal membaca sheet: ${message}`);
  }

  const table = parsed.table;
  const headers = table.cols.map((c, i) => (c.label || c.id || `col_${i}`).trim());

  const rows: GvizParsedRow[] = table.rows.map((row) => {
    const obj: GvizParsedRow = {};
    headers.forEach((key, i) => {
      // Safe fallback: never crash on missing cell
      const cell = row?.c?.[i];
      const v = cell?.v;
      obj[key] = v === undefined || v === null ? null : (v as string | number);
    });
    return obj;
  });

  return {
    sheetTitle: tabName ?? "Sheet1",
    headers,
    rows,
    raw: parsed,
  };
}

/**
 * Fetch a sheet as a raw matrix of cell strings (header row included).
 * Useful for sheets with section labels / merged cells where a header-keyed
 * object map doesn't fit. Falls back to "" for empty cells.
 */
export async function fetchSheetMatrix(
  spreadsheetIdOrUrl: string,
  tabName?: string,
): Promise<string[][]> {
  const result = await fetchSheetTab(spreadsheetIdOrUrl, tabName);
  const table = result.raw.table;
  if (!table) return [];
  const width = table.cols.length;
  const headerRow = table.cols.map((c, i) => (c.label || c.id || `col_${i}`).trim());
  const body = table.rows.map((row) => {
    const arr: string[] = [];
    for (let i = 0; i < width; i++) {
      const cell = row?.c?.[i];
      const v = cell?.f ?? cell?.v;
      arr.push(v == null ? "" : String(v));
    }
    return arr;
  });
  return [headerRow, ...body];
}

/**
 * Dynamic spreadsheet data fetcher — always rebuilds the gviz endpoint with
 * the explicit `&sheet=<name>` parameter so we never accidentally read the
 * default first tab (DATAMASTER).
 */
export async function fetchSpreadsheetData(
  spreadsheetIdOrUrl: string,
  sheetName: string,
): Promise<string[][]> {
  if (!sheetName) throw new Error("fetchSpreadsheetData: sheetName wajib diisi.");
  return fetchSheetMatrix(spreadsheetIdOrUrl, sheetName);
}

