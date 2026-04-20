import { Router } from "express";

const router = Router();

// ── CSV Parser ────────────────────────────────────────────────────────────────
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;
    const cols: string[] = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
        else { inQuote = !inQuote; }
      } else if (ch === "," && !inQuote) {
        cols.push(cur.trim()); cur = "";
      } else {
        cur += ch;
      }
    }
    cols.push(cur.trim());
    rows.push(cols);
  }
  return rows;
}

function normalizeHeader(h: string): string {
  return String(h).toLowerCase().replace(/[\s().#_-]/g, "");
}

function getField(obj: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    const val = obj[normalizeHeader(k)];
    if (val !== undefined) return val;
  }
  return "";
}

function buildPatient(obj: Record<string, string>) {
  return {
    name:      getField(obj, "name", "patientname", "nam"),
    mobile:    getField(obj, "mobile", "mobilenumber", "mobileno", "phone", "contact", "mob"),
    age:       getField(obj, "age", "ageyrs", "ageyears"),
    ageMonths: getField(obj, "agemo", "agemonths", "months"),
    weight:    getField(obj, "weight", "wt"),
    address:   getField(obj, "address", "city", "area", "addr"),
  };
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function tryFetchCsv(sheetId: string): Promise<string | null> {
  // "Publish to web" CSV URL – works even for Google Workspace accounts
  const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/pub?output=csv&gid=0`;
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (res.ok) {
      const text = await res.text();
      if (text.includes(",") || text.includes("\n")) return text;
    }
  } catch { /* ignore */ }
  return null;
}

async function tryFetchGviz(sheetId: string): Promise<any | null> {
  const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/gviz/tq?tqx=out:json`;
  try {
    const res = await fetch(url, { headers: { Accept: "text/javascript" } });
    if (!res.ok) return null;
    const raw = await res.text();
    const match = raw.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?\s*$/);
    if (!match) return null;
    const parsed = JSON.parse(match[1]);
    if (parsed.status === "error") return null;
    return parsed.table || null;
  } catch { return null; }
}

// ── Parse CSV rows → patients ─────────────────────────────────────────────────
function csvToPatients(csvText: string) {
  const rows = parseCsv(csvText);
  if (rows.length < 2) return [];

  // Find header row – might not be the very first if there's a table title row
  let headerIdx = 0;
  for (let i = 0; i < Math.min(rows.length, 4); i++) {
    const normalized = rows[i].map(normalizeHeader);
    const hits = normalized.filter((v) =>
      ["name", "mobile", "age", "weight", "address", "phone"].some((k) => v.includes(k))
    ).length;
    if (hits >= 2) { headerIdx = i; break; }
  }

  const headers = rows[headerIdx].map(normalizeHeader);
  const dataRows = rows.slice(headerIdx + 1);

  return dataRows
    .map((row) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = row[i] ?? ""; });
      return buildPatient(obj);
    })
    .filter((p) => p.name || p.mobile);
}

// ── Parse gviz table → patients ───────────────────────────────────────────────
function gvizToPatients(table: any) {
  if (!table?.rows?.length) return [];

  let rawCols: string[] = (table.cols || []).map((c: any) =>
    normalizeHeader(c.label || c.id || "")
  );
  let dataRows: any[] = table.rows;

  const cellVal = (cell: any) => (!cell ? "" : String(cell.v ?? cell.f ?? "").trim());

  // If columns look auto-generated, use first data row as header
  const autoPattern = /^(column\d+|col\d+|[a-e]|[a-e]\d+)$/i;
  const autoCount = rawCols.filter((c) => autoPattern.test(c)).length;
  if (autoCount >= Math.ceil(rawCols.length / 2) && dataRows.length > 0) {
    const firstVals = (dataRows[0].c || []).map((cell: any) => normalizeHeader(cellVal(cell)));
    const hits = firstVals.filter((v: string) =>
      ["name", "mobile", "age", "weight", "address"].some((k) => v.includes(k))
    ).length;
    if (hits >= 2) { rawCols = firstVals; dataRows = dataRows.slice(1); }
  }

  return dataRows
    .map((row) => {
      const obj: Record<string, string> = {};
      (row.c || []).forEach((cell: any, i: number) => {
        obj[rawCols[i] ?? `col${i}`] = cellVal(cell);
      });
      return buildPatient(obj);
    })
    .filter((p) => p.name || p.mobile);
}

// ── Route ─────────────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  const sheetId = (req.query.sheetId as string)?.trim();
  if (!sheetId) {
    res.status(400).json({ error: "sheetId query param is required" });
    return;
  }

  // Try CSV (Publish to web) first, then gviz
  const csv = await tryFetchCsv(sheetId);
  if (csv) {
    res.json({ patients: csvToPatients(csv), source: "csv" });
    return;
  }

  const table = await tryFetchGviz(sheetId);
  if (table) {
    res.json({ patients: gvizToPatients(table), source: "gviz" });
    return;
  }

  res.status(400).json({
    error:
      "Cannot access the Google Sheet. Please go to File → Share → Publish to web → choose 'Sheet1' and 'Comma-separated values (.csv)' → click Publish. Then paste the sheet ID or URL in the app settings.",
  });
});

export default router;
