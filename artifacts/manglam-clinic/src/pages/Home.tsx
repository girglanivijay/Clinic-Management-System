import { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Layout } from "@/components/Layout";
import {
  addPatient,
  lookupByMobile,
  lookupByName,
  findComplaintCode,
  type Patient,
} from "@/lib/store";
import { PrintPrescription, printPatientPrescription } from "@/components/PrintPrescription";
import {
  Loader2, User, Phone, MapPin, Activity, Save, RefreshCw,
  FileText, Printer, Paperclip, X, Leaf, Weight, Calendar, Hash,
  Sheet, Settings2, RefreshCcw, CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const SHEET_ID_KEY = "mc_gsheet_id";

const patientSchema = z.object({
  patientNo: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  mobile: z.string().min(5, "Valid mobile required"),
  age: z.coerce.number().min(0).optional(),
  ageMonths: z.coerce.number().min(0).max(11).optional(),
  weight: z.string().optional(),
  address: z.string().optional(),
  complaintCode: z.string().optional(),
  complaint: z.string().optional(),
  treatment: z.string().optional(),
  advice: z.string().optional(),
  reports: z.string().optional(),
  fees: z.coerce.number().min(0).optional(),
});

type PatientFormValues = z.infer<typeof patientSchema>;

const emptyDefaults: PatientFormValues = {
  patientNo: "", name: "", mobile: "", age: 0, ageMonths: 0, weight: "",
  address: "", complaintCode: "", complaint: "", treatment: "",
  advice: "", reports: "", fees: 0,
};

// ─── Google Sheet JSONP Fetch ─────────────────────────────────────────────────
interface SheetRow {
  name: string;
  mobile: string;
  age: string;
  ageMonths: string;
  weight: string;
  address: string;
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[\s().]/g, "");
}

function fetchSheetData(sheetId: string): Promise<SheetRow[]> {
  return new Promise((resolve, reject) => {
    const cbName = `_gviz_${Date.now()}`;
    const script = document.createElement("script");

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Sync timed out. Make sure the Sheet ID is correct and the sheet is shared."));
    }, 12000);

    function cleanup() {
      clearTimeout(timer);
      delete (window as any)[cbName];
      if (script.parentNode) script.remove();
    }

    (window as any)[cbName] = (response: any) => {
      cleanup();
      try {
        const table = response?.table;
        if (!table || !table.rows) { resolve([]); return; }

        const cols: string[] = table.cols.map((c: any) =>
          normalizeHeader(c.label || c.id || "")
        );

        const rows: SheetRow[] = table.rows
          .map((row: any) => {
            const obj: Record<string, string> = {};
            (row.c || []).forEach((cell: any, i: number) => {
              obj[cols[i]] = cell ? String(cell.v ?? "").trim() : "";
            });
            // Map known header variants → standard keys
            const get = (...keys: string[]) => {
              for (const k of keys) {
                const normalized = normalizeHeader(k);
                if (obj[normalized] !== undefined) return obj[normalized];
              }
              return "";
            };
            return {
              name:      get("name", "patient name", "patientname"),
              mobile:    get("mobile", "mobile number", "mobilenumber", "phone", "contact"),
              age:       get("age", "ageyrs", "age(yrs)", "ageyears"),
              ageMonths: get("agemo", "age(mo)", "agemonths", "months"),
              weight:    get("weight"),
              address:   get("address", "city", "area"),
            } as SheetRow;
          })
          .filter((r: SheetRow) => r.name || r.mobile);

        resolve(rows);
      } catch (err) {
        reject(new Error("Could not parse sheet data."));
      }
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("Failed to reach Google Sheets. Check your Sheet ID."));
    };

    script.src = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/gviz/tq?tqx=out:json&callback=${cbName}`;
    document.body.appendChild(script);
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Home() {
  const { toast } = useToast();
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [patientHistory, setPatientHistory] = useState<Patient[]>([]);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [lastSaved, setLastSaved] = useState<Patient | null>(null);
  const [visitDate, setVisitDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Google Sheet state
  const [sheetId, setSheetId] = useState(() => localStorage.getItem(SHEET_ID_KEY) || "");
  const [sheetSettingsOpen, setSheetSettingsOpen] = useState(false);
  const [sheetIdInput, setSheetIdInput] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<SheetRow[]>([]);
  const [syncModalOpen, setSyncModalOpen] = useState(false);

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: emptyDefaults,
  });

  const complaintCodeValue = form.watch("complaintCode");

  useEffect(() => {
    if (complaintCodeValue && complaintCodeValue.length >= 2) {
      const codeRecord = findComplaintCode(complaintCodeValue);
      if (codeRecord) {
        form.setValue("complaint", codeRecord.complaint);
        form.setValue("treatment", codeRecord.treatment);
      }
    }
  }, [complaintCodeValue, form]);

  const handleMobileLookup = useCallback(() => {
    const mobile = form.getValues("mobile");
    if (!mobile || mobile.length < 5) return;
    setIsLookingUp(true);
    const result = lookupByMobile(mobile);
    if (result.latestInfo) {
      form.setValue("name", result.latestInfo.name);
      form.setValue("age", result.latestInfo.age || 0);
      form.setValue("ageMonths", result.latestInfo.ageMonths || 0);
      form.setValue("weight", result.latestInfo.weight || "");
      form.setValue("address", result.latestInfo.address || "");
      toast({ title: "Patient found", description: "Details auto-filled from history." });
    }
    setPatientHistory(result.history);
    setIsLookingUp(false);
  }, [form, toast]);

  const handleNameLookup = useCallback(() => {
    const name = form.getValues("name");
    if (!name || name.length < 3) return;
    setIsLookingUp(true);
    const result = lookupByName(name);
    if (result.latestInfo) {
      form.setValue("age", result.latestInfo.age || 0);
      form.setValue("ageMonths", result.latestInfo.ageMonths || 0);
      form.setValue("weight", result.latestInfo.weight || "");
      form.setValue("address", result.latestInfo.address || "");
      form.setValue("mobile", result.latestInfo.mobile);
      toast({ title: "Patient found", description: "Details auto-filled from history." });
    }
    setPatientHistory(result.history);
    setIsLookingUp(false);
  }, [form, toast]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        setAttachments((prev) => [...prev, result]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const savePatient = (data: PatientFormValues, registerType: "general" | "ayurvedic") => {
    const saved = addPatient({
      patientNo: data.patientNo || "",
      name: data.name,
      mobile: data.mobile,
      age: data.age || 0,
      ageMonths: data.ageMonths || 0,
      weight: data.weight || "",
      address: data.address || "",
      complaintCode: data.complaintCode || "",
      complaint: data.complaint || "",
      treatment: data.treatment || "",
      advice: data.advice || "",
      reports: data.reports || "",
      fees: Number(data.fees || 0),
      attachments,
      registerType,
      visitDate,
    });
    setLastSaved(saved);
    toast({
      title: "Saved!",
      description: registerType === "ayurvedic"
        ? `Patient saved to Ayurvedic Register for ${format(new Date(visitDate), "dd MMM yyyy")}.`
        : `Patient saved to Daily Register for ${format(new Date(visitDate), "dd MMM yyyy")}.`,
    });
    form.reset(emptyDefaults);
    setAttachments([]);
    setPatientHistory([]);
  };

  const onSubmit = (data: PatientFormValues) => savePatient(data, "general");
  const onSaveAyurvedic = () => {
    form.handleSubmit((data) => savePatient(data, "ayurvedic"))();
  };

  // ── Sheet Settings ─────────────────────────────────────────────────────────
  const openSheetSettings = () => {
    setSheetIdInput(sheetId);
    setSheetSettingsOpen(true);
  };

  const saveSheetSettings = () => {
    const trimmed = sheetIdInput.trim();
    // Accept either full URL or just the ID
    const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    const id = match ? match[1] : trimmed;
    localStorage.setItem(SHEET_ID_KEY, id);
    setSheetId(id);
    setSheetSettingsOpen(false);
    if (id) toast({ title: "Sheet Connected", description: "You can now sync patients from Google Sheets." });
  };

  // ── Sheet Sync ─────────────────────────────────────────────────────────────
  const handleSync = async () => {
    if (!sheetId) { openSheetSettings(); return; }
    setSyncing(true);
    try {
      const rows = await fetchSheetData(sheetId);
      setSyncResults(rows);
      setSyncModalOpen(true);
      if (rows.length === 0) {
        toast({ title: "Sheet is empty", description: "No patient rows found in the sheet." });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Sync Failed", description: err.message });
    } finally {
      setSyncing(false);
    }
  };

  // ── Fill form from sheet row ───────────────────────────────────────────────
  const fillFromRow = (row: SheetRow) => {
    const ageNum = parseInt(row.age) || 0;
    const ageMonthsNum = parseInt(row.ageMonths) || 0;
    form.setValue("name", row.name);
    form.setValue("mobile", row.mobile);
    form.setValue("age", ageNum);
    form.setValue("ageMonths", ageMonthsNum);
    form.setValue("weight", row.weight);
    form.setValue("address", row.address);

    // Trigger history lookup if mobile is present
    if (row.mobile && row.mobile.length >= 5) {
      const result = lookupByMobile(row.mobile);
      if (result.latestInfo) {
        if (!row.age) form.setValue("age", result.latestInfo.age || 0);
        if (!row.ageMonths) form.setValue("ageMonths", result.latestInfo.ageMonths || 0);
        if (!row.weight) form.setValue("weight", result.latestInfo.weight || "");
        if (!row.address) form.setValue("address", result.latestInfo.address || "");
        toast({ title: "History loaded", description: "Past records found for this patient." });
      }
      setPatientHistory(result.history);
    }
    setSyncModalOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast({ title: "Form filled", description: `${row.name}'s details loaded. Add clinical notes and save.` });
  };

  return (
    <Layout>
      {lastSaved && <PrintPrescription patient={lastSaved} />}

      {/* Sheet Settings Dialog */}
      <Dialog open={sheetSettingsOpen} onOpenChange={setSheetSettingsOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <Sheet className="w-5 h-5 text-emerald-600" /> Connect Google Sheet
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800 space-y-2">
              <p className="font-bold">One-time setup:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Open your Google Sheet where staff enters patients</li>
                <li>Click <strong>Share</strong> → set to <strong>"Anyone with the link can View"</strong></li>
                <li>Copy the link or just the Sheet ID from the URL</li>
                <li>Paste it below</li>
              </ol>
              <p className="text-xs text-emerald-700 mt-1">
                Sheet columns your staff should fill: <strong>Name, Mobile, Age, Weight, Address</strong>
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Google Sheet URL or ID</label>
              <input
                value={sheetIdInput}
                onChange={(e) => setSheetIdInput(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none text-sm"
                placeholder="Paste the full Google Sheet URL or just the Sheet ID"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setSheetSettingsOpen(false)}
                className="px-4 py-2 rounded-xl font-medium bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={saveSheetSettings}
                disabled={!sheetIdInput.trim()}
                className="px-5 py-2 rounded-xl font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40"
              >
                Save & Connect
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sync Results Modal */}
      <Dialog open={syncModalOpen} onOpenChange={setSyncModalOpen}>
        <DialogContent className="max-w-lg bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Patients from Google Sheet
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500 -mt-2">Click a patient to fill the registration form.</p>
          <div className="max-h-96 overflow-y-auto space-y-2 mt-2 pr-1">
            {syncResults.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p>No patient rows found in the sheet.</p>
              </div>
            ) : (
              syncResults.map((row, i) => (
                <button
                  key={i}
                  onClick={() => fillFromRow(row)}
                  className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900 group-hover:text-emerald-800">{row.name || "—"}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                        {row.mobile && <span className="text-xs text-slate-500">{row.mobile}</span>}
                        {row.age && <span className="text-xs text-slate-500">Age: {row.age}{row.ageMonths ? ` yr ${row.ageMonths} mo` : " yr"}</span>}
                        {row.weight && <span className="text-xs text-slate-500">Wt: {row.weight}</span>}
                        {row.address && <span className="text-xs text-slate-500">{row.address}</span>}
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      Fill →
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Form */}
        <div className="lg:col-span-8 space-y-6">
          <div className="medical-card p-6 md:p-8">
            <div className="flex items-center justify-between gap-3 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-display text-slate-900">Patient Registration</h2>
                  <p className="text-slate-500 text-sm">Register a new visit and view medical history.</p>
                </div>
              </div>

              {/* Google Sheet Sync Controls */}
              <div className="flex items-center gap-2 shrink-0">
                {sheetId && (
                  <button
                    type="button"
                    onClick={handleSync}
                    disabled={syncing}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 shadow-sm transition-all text-sm"
                    title="Load patients from Google Sheet"
                  >
                    {syncing
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <RefreshCcw className="w-4 h-4" />}
                    <span className="hidden sm:inline">{syncing ? "Syncing…" : "Sync from Sheet"}</span>
                  </button>
                )}
                {!sheetId && (
                  <button
                    type="button"
                    onClick={openSheetSettings}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 shadow-sm transition-all text-sm"
                    title="Connect Google Sheet"
                  >
                    <Sheet className="w-4 h-4" />
                    <span className="hidden sm:inline">Connect Google Sheet</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={openSheetSettings}
                  className="p-2.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  title="Google Sheet settings"
                >
                  <Settings2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sheet Connected Banner */}
            {sheetId && (
              <div className="mb-6 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-sm">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-800 font-medium">Google Sheet connected.</span>
                <span className="text-emerald-600">Press "Sync from Sheet" to load today's patients.</span>
              </div>
            )}

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Demographics */}
              <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 space-y-4">

                {/* Visit Date + Patient No row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" /> Visit Date
                    </label>
                    <input
                      type="date"
                      value={visitDate}
                      onChange={(e) => setVisitDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-slate-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Hash className="w-4 h-4 text-slate-400" /> Patient No. <span className="text-slate-400 text-xs">(optional)</span>
                    </label>
                    <input
                      {...form.register("patientNo")}
                      className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-slate-800"
                      placeholder="e.g. 42"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Mobile */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-400" /> Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        {...form.register("mobile")}
                        onBlur={handleMobileLookup}
                        className="w-full pl-4 pr-10 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-slate-800"
                        placeholder="e.g. 9876543210"
                      />
                      {isLookingUp && <Loader2 className="w-4 h-4 absolute right-3 top-3.5 animate-spin text-slate-400" />}
                    </div>
                    {form.formState.errors.mobile && <p className="text-destructive text-xs">{form.formState.errors.mobile.message}</p>}
                  </div>

                  {/* Name */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" /> Patient Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...form.register("name")}
                      onBlur={handleNameLookup}
                      className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-slate-800"
                      placeholder="Full Name"
                    />
                    {form.formState.errors.name && <p className="text-destructive text-xs">{form.formState.errors.name.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Age */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Age <span className="text-slate-400 text-xs">(optional)</span></label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <input
                          type="number"
                          {...form.register("age")}
                          className="w-full px-3 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-slate-800"
                          placeholder="0"
                          min={0}
                        />
                        <span className="absolute right-2 top-3.5 text-xs text-slate-400">yrs</span>
                      </div>
                      <div className="w-20 relative">
                        <input
                          type="number"
                          {...form.register("ageMonths")}
                          className="w-full px-2 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-slate-800"
                          placeholder="0"
                          min={0}
                          max={11}
                        />
                        <span className="absolute right-2 top-3.5 text-xs text-slate-400">mo</span>
                      </div>
                    </div>
                  </div>

                  {/* Weight */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Weight className="w-4 h-4 text-slate-400" /> Weight <span className="text-slate-400 text-xs">(optional)</span>
                    </label>
                    <input
                      {...form.register("weight")}
                      className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-slate-800"
                      placeholder="e.g. 65 kg"
                    />
                  </div>

                  {/* Address */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400" /> Address <span className="text-slate-400 text-xs">(optional)</span>
                    </label>
                    <input
                      {...form.register("address")}
                      className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-slate-800"
                      placeholder="City / Area"
                    />
                  </div>
                </div>
              </div>

              {/* Medical Details */}
              <div className="bg-blue-50/30 p-6 rounded-2xl border border-blue-100 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-slate-400" /> Complaint Code
                    </label>
                    <input
                      {...form.register("complaintCode")}
                      className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 uppercase transition-all text-slate-800"
                      placeholder="e.g. CCF"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Consultation Fees (₹)</label>
                    <input
                      type="number"
                      {...form.register("fees")}
                      className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-semibold text-slate-900"
                      placeholder="Amount"
                      min={0}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Presenting Complaints</label>
                  <textarea
                    {...form.register("complaint")}
                    rows={2}
                    className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all resize-none text-slate-800"
                    placeholder="Describe the symptoms..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Treatment Plan</label>
                  <textarea
                    {...form.register("treatment")}
                    rows={2}
                    className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all resize-none text-slate-800"
                    placeholder="Prescribed medicines..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Advice / Notes</label>
                    <textarea
                      {...form.register("advice")}
                      rows={2}
                      className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all resize-none text-slate-800"
                      placeholder="Rest, diet..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Reports Required</label>
                    <textarea
                      {...form.register("reports")}
                      rows={2}
                      className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all resize-none text-slate-800"
                      placeholder="Blood test, X-ray..."
                    />
                  </div>
                </div>

                {/* Attach Image Reports */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-slate-400" /> Attach Report Images
                  </label>
                  <div
                    className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="w-6 h-6 text-slate-300" />
                    <p className="text-sm text-slate-400">Click to upload image reports (JPG, PNG)</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-3 mt-2">
                      {attachments.map((src, i) => (
                        <div key={i} className="relative group">
                          <img src={src} className="w-20 h-20 object-cover rounded-xl border border-slate-200" alt={`Report ${i + 1}`} />
                          <button
                            type="button"
                            onClick={() => removeAttachment(i)}
                            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap justify-end gap-3 pt-2">
                {lastSaved && (
                  <button
                    type="button"
                    onClick={() => printPatientPrescription(lastSaved)}
                    className="px-5 py-3 rounded-xl font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm transition-all flex items-center gap-2"
                  >
                    <Printer className="w-5 h-5" />
                    Print Last Prescription
                  </button>
                )}
                <button
                  type="button"
                  onClick={onSaveAyurvedic}
                  className="px-5 py-3 rounded-xl font-semibold bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2"
                >
                  <Leaf className="w-5 h-5" />
                  Save to Ayurvedic
                </button>
                <button
                  type="submit"
                  className="px-7 py-3 rounded-xl font-semibold bg-gradient-to-r from-primary to-primary/90 text-white shadow-lg shadow-primary/30 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  Save to General
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar / History */}
        <div className="lg:col-span-4">
          <div className="sticky top-24 space-y-6">
            <AnimatePresence>
              {patientHistory.length > 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="medical-card p-6 overflow-hidden flex flex-col h-[calc(100vh-120px)]"
                >
                  <div className="flex items-center gap-3 mb-6 shrink-0">
                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                      <RefreshCw className="w-4 h-4" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 font-display">Visit History</h3>
                  </div>
                  <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                    {patientHistory.map((visit, i) => (
                      <div key={i} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {visit.patientNo && (
                              <span className="text-xs font-bold px-2 py-1 bg-primary/10 text-primary rounded-md border border-primary/20">
                                #{visit.patientNo}
                              </span>
                            )}
                            <span className="text-sm font-bold text-slate-800">{visit.name}</span>
                          </div>
                          {visit.fees > 0 && (
                            <span className="text-xs font-bold text-primary bg-primary/5 px-2 py-1 rounded-md">
                              ₹{visit.fees}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 mb-3">
                          <span className="text-xs font-medium px-2 py-0.5 bg-white rounded border border-slate-200 text-slate-500">
                            {format(new Date(visit.visitDate), "dd MMM, yyyy")}
                          </span>
                          {visit.registerType === "ayurvedic" && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded">AYU</span>
                          )}
                        </div>

                        <div className="space-y-2">
                          {visit.weight && (
                            <div>
                              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Weight</p>
                              <p className="text-sm text-slate-600">{visit.weight}</p>
                            </div>
                          )}
                          {visit.complaint && (
                            <div>
                              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Complaint</p>
                              <p className="text-sm font-medium text-slate-800">{visit.complaint}</p>
                            </div>
                          )}
                          {visit.treatment && (
                            <div>
                              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Treatment</p>
                              <p className="text-sm text-slate-600">{visit.treatment}</p>
                            </div>
                          )}
                          {visit.advice && (
                            <div>
                              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Advice</p>
                              <p className="text-sm text-slate-600">{visit.advice}</p>
                            </div>
                          )}
                          {visit.reports && (
                            <div>
                              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Reports Required</p>
                              <p className="text-sm text-slate-600">{visit.reports}</p>
                            </div>
                          )}
                          {visit.attachments && visit.attachments.length > 0 && (
                            <div>
                              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Report Images</p>
                              <div className="flex flex-wrap gap-2">
                                {visit.attachments.map((src, j) => (
                                  <a key={j} href={src} target="_blank" rel="noopener noreferrer">
                                    <img src={src} className="w-14 h-14 object-cover rounded-lg border border-slate-200 hover:opacity-80 transition-opacity" alt={`Report ${j + 1}`} />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end">
                          <button
                            type="button"
                            onClick={() => printPatientPrescription(visit)}
                            className="flex items-center gap-1 text-xs text-slate-400 hover:text-primary transition-colors"
                          >
                            <Printer className="w-3 h-3" /> Print
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="medical-card p-8 flex flex-col items-center justify-center text-center text-slate-400 h-64 border-dashed"
                >
                  <FileText className="w-12 h-12 mb-4 text-slate-300" />
                  <p className="font-medium">No history available</p>
                  <p className="text-sm mt-1">Enter a mobile number or name to fetch patient records.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </Layout>
  );
}

