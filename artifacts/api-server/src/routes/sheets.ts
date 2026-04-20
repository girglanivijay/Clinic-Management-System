import { Router } from "express";

const router = Router();

function normalizeHeader(h: string): string {
  return String(h).toLowerCase().replace(/[\s().]/g, "");
}

function getField(obj: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    const val = obj[normalizeHeader(k)];
    if (val !== undefined) return val;
  }
  return "";
}

router.get("/", async (req, res) => {
  const sheetId = req.query.sheetId as string;

  if (!sheetId || typeof sheetId !== "string") {
    res.status(400).json({ error: "sheetId query param is required" });
    return;
  }

  const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/gviz/tq?tqx=out:json`;

  let raw: string;
  try {
    const response = await fetch(url, {
      headers: { "Accept": "text/javascript, application/json" },
    });
    if (!response.ok) {
      res.status(502).json({ error: `Google returned HTTP ${response.status}. Check the Sheet ID and make sure it is shared publicly.` });
      return;
    }
    raw = await response.text();
  } catch (err: any) {
    res.status(502).json({ error: `Could not reach Google Sheets: ${err.message}` });
    return;
  }

  // Strip the JSONP wrapper: google.visualization.Query.setResponse({...});
  const match = raw.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?\s*$/);
  if (!match) {
    res.status(502).json({ error: "Unexpected response from Google Sheets. Make sure the sheet is shared as 'Anyone with the link can view'." });
    return;
  }

  let parsed: any;
  try {
    parsed = JSON.parse(match[1]);
  } catch {
    res.status(502).json({ error: "Could not parse Google Sheets response." });
    return;
  }

  if (parsed.status === "error") {
    const msg = parsed.errors?.[0]?.detailed_message || parsed.errors?.[0]?.message || "Unknown error from Google Sheets.";
    res.status(400).json({ error: msg });
    return;
  }

  const table = parsed.table;
  if (!table || !table.rows || table.rows.length === 0) {
    res.json({ patients: [] });
    return;
  }

  const cols: string[] = (table.cols || []).map((c: any) =>
    normalizeHeader(c.label || c.id || "")
  );

  const patients = (table.rows as any[])
    .map((row) => {
      const obj: Record<string, string> = {};
      (row.c || []).forEach((cell: any, i: number) => {
        obj[cols[i]] = cell ? String(cell.v ?? "").trim() : "";
      });
      return {
        name:      getField(obj, "name", "patient name", "patientname"),
        mobile:    getField(obj, "mobile", "mobile number", "mobilenumber", "phone", "contact"),
        age:       getField(obj, "age", "ageyrs", "age(yrs)", "ageyears"),
        ageMonths: getField(obj, "agemo", "age(mo)", "agemonths", "months"),
        weight:    getField(obj, "weight"),
        address:   getField(obj, "address", "city", "area"),
      };
    })
    .filter((p) => p.name || p.mobile);

  res.json({ patients });
});

export default router;
