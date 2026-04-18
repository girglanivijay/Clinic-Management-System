import * as XLSX from 'xlsx';
import { parse as parseDate, format as formatDate, isValid } from 'date-fns';

export function exportToExcel(data: any[], filename: string) {
  if (!data || data.length === 0) return;
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

// Parse age string like "30 yrs 2 mo" or "30 yrs" or "2 mo" or "-"
function parseAge(ageStr: string): { age: number; ageMonths: number } {
  if (!ageStr || ageStr === "-") return { age: 0, ageMonths: 0 };
  const yrsMatch = String(ageStr).match(/(\d+)\s*yr/i);
  const moMatch = String(ageStr).match(/(\d+)\s*mo/i);
  return {
    age: yrsMatch ? parseInt(yrsMatch[1]) : 0,
    ageMonths: moMatch ? parseInt(moMatch[1]) : 0,
  };
}

// Parse date string "12-Apr-2026" → "2026-04-12"
function parseDateStr(dateStr: string): string {
  if (!dateStr || dateStr === "-") return new Date().toISOString().split("T")[0];
  // Try dd-MMM-yyyy
  const d1 = parseDate(String(dateStr), "dd-MMM-yyyy", new Date());
  if (isValid(d1)) return formatDate(d1, "yyyy-MM-dd");
  // Try dd/MM/yyyy
  const d2 = parseDate(String(dateStr), "dd/MM/yyyy", new Date());
  if (isValid(d2)) return formatDate(d2, "yyyy-MM-dd");
  // Try yyyy-MM-dd
  const d3 = parseDate(String(dateStr), "yyyy-MM-dd", new Date());
  if (isValid(d3)) return formatDate(d3, "yyyy-MM-dd");
  // XLSX serial number
  if (!isNaN(Number(dateStr))) {
    const jsDate = XLSX.SSF.parse_date_code(Number(dateStr));
    if (jsDate) {
      const y = jsDate.y;
      const m = String(jsDate.m).padStart(2, "0");
      const d = String(jsDate.d).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }
  return new Date().toISOString().split("T")[0];
}

function clean(val: any): string {
  const s = String(val ?? "").trim();
  return s === "-" ? "" : s;
}

export interface ExcelImportRow {
  patientNo: string;
  name: string;
  age: number;
  ageMonths: number;
  weight: string;
  address: string;
  mobile: string;
  registerType?: "general" | "ayurvedic";
  complaintCode: string;
  complaint: string;
  treatment: string;
  advice: string;
  reports: string;
  fees: number;
  visitDate: string;
}

export function importFromExcel(file: File): Promise<{ rows: ExcelImportRow[]; error?: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const raw: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        const rows: ExcelImportRow[] = raw
          .filter((r) => r["Name"] && String(r["Name"]).trim() !== "")
          .map((r) => {
            const { age, ageMonths } = parseAge(r["Age"]);
            const registerStr = clean(r["Register"]).toLowerCase();
            const registerType = registerStr === "ayurvedic" ? "ayurvedic" : "general";

            let visitDate = new Date().toISOString().split("T")[0];
            const rawDate = r["Date"];
            if (rawDate instanceof Date) {
              visitDate = formatDate(rawDate, "yyyy-MM-dd");
            } else if (rawDate) {
              visitDate = parseDateStr(String(rawDate));
            }

            return {
              patientNo: clean(r["Patient No"]),
              name: clean(r["Name"]),
              age,
              ageMonths,
              weight: clean(r["Weight"]),
              address: clean(r["Address"]),
              mobile: clean(r["Mobile"]),
              registerType,
              complaintCode: clean(r["Complaint Code"]),
              complaint: clean(r["Complaint"]),
              treatment: clean(r["Treatment"]),
              advice: clean(r["Advice"]),
              reports: clean(r["Reports"]),
              fees: Number(r["Fees"]) || 0,
              visitDate,
            };
          });

        resolve({ rows });
      } catch (err) {
        resolve({ rows: [], error: String(err) });
      }
    };
    reader.onerror = () => resolve({ rows: [], error: "Failed to read file" });
    reader.readAsArrayBuffer(file);
  });
}
