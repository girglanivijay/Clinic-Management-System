// Local storage-based data store — fully offline, no server needed

export interface Patient {
  id: number;
  name: string;
  age: number;
  ageMonths?: number;
  weight?: string;
  address: string;
  mobile: string;
  complaintCode?: string;
  complaint?: string;
  treatment?: string;
  advice?: string;
  reports?: string;
  fees: number;
  paymentMode?: "cash" | "upi"; // kept for backward compat, no longer used in UI
  attachments?: string[]; // base64 data URLs
  registerType?: "general" | "ayurvedic";
  visitDate: string;
  createdAt: string;
}

export interface ComplaintCode {
  id: number;
  code: string;
  complaint: string;
  treatment: string;
  createdAt: string;
}

const PATIENTS_KEY = "mc_patients";
const CODES_KEY = "mc_complaint_codes";
const COUNTER_KEY = "mc_id_counter";

function nextId(): number {
  const val = parseInt(localStorage.getItem(COUNTER_KEY) || "0") + 1;
  localStorage.setItem(COUNTER_KEY, String(val));
  return val;
}

// ─── Patients ───────────────────────────────────────────────────────────────

export function getPatients(): Patient[] {
  try {
    return JSON.parse(localStorage.getItem(PATIENTS_KEY) || "[]");
  } catch {
    return [];
  }
}

function savePatients(patients: Patient[]) {
  localStorage.setItem(PATIENTS_KEY, JSON.stringify(patients));
}

export function addPatient(data: Omit<Patient, "id" | "createdAt">): Patient {
  const patients = getPatients();
  const patient: Patient = {
    ...data,
    id: nextId(),
    createdAt: new Date().toISOString(),
  };
  patients.push(patient);
  savePatients(patients);
  return patient;
}

export function updatePatient(id: number, data: Partial<Patient>): Patient | null {
  const patients = getPatients();
  const idx = patients.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  patients[idx] = { ...patients[idx], ...data };
  savePatients(patients);
  return patients[idx];
}

export function deletePatient(id: number): boolean {
  const patients = getPatients();
  const filtered = patients.filter((p) => p.id !== id);
  savePatients(filtered);
  return filtered.length !== patients.length;
}

// Daily register shows ALL patients (general + ayurvedic) for the date
export function getPatientsByDate(date: string): Patient[] {
  return getPatients()
    .filter((p) => p.visitDate === date)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

// Ayurvedic register only shows ayurvedic patients
export function getAyurvedicPatientsByDate(date: string): Patient[] {
  return getPatients()
    .filter((p) => p.visitDate === date && p.registerType === "ayurvedic")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function lookupByMobile(mobile: string): { latestInfo?: Patient; history: Patient[] } {
  if (!mobile || mobile.length < 5) return { history: [] };
  const all = getPatients().filter((p) =>
    p.mobile.toLowerCase().includes(mobile.toLowerCase())
  );
  const sorted = all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { latestInfo: sorted[0], history: sorted };
}

export function lookupByName(name: string): { latestInfo?: Patient; history: Patient[] } {
  if (!name || name.length < 2) return { history: [] };
  const all = getPatients().filter((p) =>
    p.name.toLowerCase().includes(name.toLowerCase())
  );
  const sorted = all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { latestInfo: sorted[0], history: sorted };
}

export interface DailyStats {
  date: string;
  totalPatients: number;
  totalFees: number;
  patients: Patient[];
}

// Daily stats counts ALL patients
export function getDailyStats(date: string): DailyStats {
  const patients = getPatientsByDate(date);
  const totalFees = patients.reduce((sum, p) => sum + (p.fees || 0), 0);
  return { date, totalPatients: patients.length, totalFees, patients };
}

export function getAyurvedicDailyStats(date: string): DailyStats {
  const patients = getAyurvedicPatientsByDate(date);
  const totalFees = patients.reduce((sum, p) => sum + (p.fees || 0), 0);
  return { date, totalPatients: patients.length, totalFees, patients };
}

// All dates counts ALL patients
export function getAllDates(): { date: string; count: number; totalFees: number }[] {
  const patients = getPatients();
  const map: Record<string, { count: number; totalFees: number }> = {};
  for (const p of patients) {
    if (!map[p.visitDate]) map[p.visitDate] = { count: 0, totalFees: 0 };
    map[p.visitDate].count += 1;
    map[p.visitDate].totalFees += p.fees || 0;
  }
  return Object.entries(map)
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getAllAyurvedicDates(): { date: string; count: number; totalFees: number }[] {
  const patients = getPatients().filter((p) => p.registerType === "ayurvedic");
  const map: Record<string, { count: number; totalFees: number }> = {};
  for (const p of patients) {
    if (!map[p.visitDate]) map[p.visitDate] = { count: 0, totalFees: 0 };
    map[p.visitDate].count += 1;
    map[p.visitDate].totalFees += p.fees || 0;
  }
  return Object.entries(map)
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

// ─── Complaint Codes ────────────────────────────────────────────────────────

export function getComplaintCodes(): ComplaintCode[] {
  try {
    return JSON.parse(localStorage.getItem(CODES_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveCodes(codes: ComplaintCode[]) {
  localStorage.setItem(CODES_KEY, JSON.stringify(codes));
}

export function addComplaintCode(data: Omit<ComplaintCode, "id" | "createdAt">): ComplaintCode {
  const codes = getComplaintCodes();
  const code: ComplaintCode = {
    ...data,
    code: data.code.toUpperCase(),
    id: nextId(),
    createdAt: new Date().toISOString(),
  };
  codes.push(code);
  saveCodes(codes);
  return code;
}

export function updateComplaintCode(id: number, data: Partial<ComplaintCode>): ComplaintCode | null {
  const codes = getComplaintCodes();
  const idx = codes.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  codes[idx] = { ...codes[idx], ...data, code: (data.code || codes[idx].code).toUpperCase() };
  saveCodes(codes);
  return codes[idx];
}

export function deleteComplaintCode(id: number): boolean {
  const codes = getComplaintCodes();
  const filtered = codes.filter((c) => c.id !== id);
  saveCodes(filtered);
  return filtered.length !== codes.length;
}

export function findComplaintCode(code: string): ComplaintCode | undefined {
  return getComplaintCodes().find((c) => c.code === code.toUpperCase());
}
