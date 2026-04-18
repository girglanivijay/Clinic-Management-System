import { useState, useEffect, useCallback, useRef } from "react";
import { format } from "date-fns";
import { Layout } from "@/components/Layout";
import {
  getDailyStats,
  updatePatient,
  deletePatient,
  getAllDates,
  addPatient,
  exportAllData,
  importAllData,
  type Patient,
  type DailyStats,
} from "@/lib/store";
import {
  Calendar, Download, Edit2, Trash2, Users, IndianRupee, FileText,
  ChevronDown, ChevronUp, Printer, Upload, HardDrive, RotateCcw,
} from "lucide-react";
import { exportToExcel, importFromExcel } from "@/lib/export";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PrintPrescription, printPatientPrescription } from "@/components/PrintPrescription";
import * as z from "zod";

const editSchema = z.object({
  patientNo: z.string().optional(),
  name: z.string().min(1),
  age: z.coerce.number().optional(),
  ageMonths: z.coerce.number().optional(),
  weight: z.string().optional(),
  address: z.string().optional(),
  mobile: z.string(),
  complaintCode: z.string().optional(),
  complaint: z.string().optional(),
  treatment: z.string().optional(),
  advice: z.string().optional(),
  reports: z.string().optional(),
  fees: z.coerce.number().optional(),
});

export default function DailyRegister() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [allDates, setAllDates] = useState<{ date: string; count: number; totalFees: number }[]>([]);
  const [printPatient, setPrintPatient] = useState<Patient | null>(null);
  const [importing, setImporting] = useState(false);
  const { toast } = useToast();

  const importExcelRef = useRef<HTMLInputElement>(null);
  const importBackupRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => {
    setStats(getDailyStats(selectedDate));
    setAllDates(getAllDates());
  }, [selectedDate]);

  useEffect(() => { refresh(); }, [refresh]);

  const editForm = useForm({ resolver: zodResolver(editSchema), values: editingPatient || {} });

  // ── Export Excel ──────────────────────────────────────────────────────────
  const handleExport = () => {
    if (!stats?.patients || stats.patients.length === 0) {
      toast({ variant: "destructive", title: "No Data", description: "No patients to export for this date." });
      return;
    }
    const exportData = stats.patients.map((p, index) => ({
      "S.No": index + 1,
      "Patient No": p.patientNo || "-",
      "Name": p.name,
      "Age": `${p.age || 0} yrs${p.ageMonths ? ` ${p.ageMonths} mo` : ""}`,
      "Weight": p.weight || "-",
      "Address": p.address || "-",
      "Mobile": p.mobile,
      "Register": p.registerType === "ayurvedic" ? "Ayurvedic" : "General",
      "Complaint Code": p.complaintCode || "-",
      "Complaint": p.complaint || "-",
      "Treatment": p.treatment || "-",
      "Advice": p.advice || "-",
      "Reports": p.reports || "-",
      "Fees": p.fees || 0,
      "Date": format(new Date(p.visitDate), "dd-MMM-yyyy"),
    }));
    exportToExcel(exportData, `Manglam_Clinic_${selectedDate}`);
    toast({ title: "Export Successful", description: "Excel file downloaded." });
  };

  // ── Import Excel ──────────────────────────────────────────────────────────
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (importExcelRef.current) importExcelRef.current.value = "";
    setImporting(true);
    const { rows, error } = await importFromExcel(file);
    if (error) {
      toast({ variant: "destructive", title: "Import Failed", description: error });
      setImporting(false);
      return;
    }
    if (rows.length === 0) {
      toast({ variant: "destructive", title: "No Data Found", description: "No valid patient rows found in the file." });
      setImporting(false);
      return;
    }
    rows.forEach((row) => {
      addPatient({
        patientNo: row.patientNo,
        name: row.name,
        mobile: row.mobile,
        age: row.age,
        ageMonths: row.ageMonths,
        weight: row.weight,
        address: row.address,
        complaintCode: row.complaintCode,
        complaint: row.complaint,
        treatment: row.treatment,
        advice: row.advice,
        reports: row.reports,
        fees: row.fees,
        registerType: row.registerType,
        visitDate: row.visitDate,
      });
    });
    setImporting(false);
    refresh();
    toast({ title: "Import Successful", description: `${rows.length} patient records imported.` });
  };

  // ── Backup: export all data as JSON ──────────────────────────────────────
  const handleBackupExport = () => {
    const json = exportAllData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `manglam_backup_${format(new Date(), "yyyy-MM-dd")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Backup Saved", description: "All data exported as a backup file." });
  };

  // ── Restore: import all data from JSON ───────────────────────────────────
  const handleBackupImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (importBackupRef.current) importBackupRef.current.value = "";
    if (!confirm("This will REPLACE all existing data with the backup. Are you sure?")) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = ev.target?.result as string;
        const result = importAllData(json);
        refresh();
        toast({ title: "Restore Successful", description: `${result.patients} patients and ${result.codes} complaint codes restored.` });
      } catch {
        toast({ variant: "destructive", title: "Restore Failed", description: "Invalid backup file." });
      }
    };
    reader.readAsText(file);
  };

  const onEditSubmit = (data: any) => {
    if (!editingPatient) return;
    updatePatient(editingPatient.id, { ...data, fees: Number(data.fees || 0) });
    toast({ title: "Updated", description: "Patient record updated." });
    setEditingPatient(null);
    refresh();
  };

  const handleDelete = (id: number) => {
    if (!confirm("Are you sure you want to delete this record?")) return;
    deletePatient(id);
    toast({ title: "Deleted", description: "Patient record deleted." });
    refresh();
  };

  return (
    <Layout>
      {printPatient && <PrintPrescription patient={printPatient} />}

      <div className="space-y-8">
        {/* Header Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-display text-slate-900">Daily Register</h2>
            <p className="text-slate-500 text-sm">All patients (General + Ayurvedic) for selected date</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Calendar className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 shadow-sm text-slate-700 font-medium"
              />
            </div>

            {/* Export Excel */}
            <button
              onClick={handleExport}
              className="px-3 py-2.5 rounded-xl font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm transition-all flex items-center gap-2"
              title="Export to Excel"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>

            {/* Import Excel */}
            <button
              onClick={() => importExcelRef.current?.click()}
              disabled={importing}
              className="px-3 py-2.5 rounded-xl font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm transition-all flex items-center gap-2"
              title="Import from Excel"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">{importing ? "Importing…" : "Import Excel"}</span>
            </button>
            <input ref={importExcelRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportExcel} />

            {/* Backup */}
            <button
              onClick={handleBackupExport}
              className="px-3 py-2.5 rounded-xl font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 shadow-sm transition-all flex items-center gap-2"
              title="Backup all data"
            >
              <HardDrive className="w-4 h-4" />
              <span className="hidden sm:inline">Backup</span>
            </button>

            {/* Restore */}
            <button
              onClick={() => importBackupRef.current?.click()}
              className="px-3 py-2.5 rounded-xl font-semibold bg-orange-50 border border-orange-200 text-orange-700 hover:bg-orange-100 shadow-sm transition-all flex items-center gap-2"
              title="Restore from backup"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Restore</span>
            </button>
            <input ref={importBackupRef} type="file" accept=".json" className="hidden" onChange={handleBackupImport} />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="medical-card p-6 flex items-center gap-4 bg-gradient-to-br from-white to-blue-50/50">
            <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center text-primary">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Patients</p>
              <p className="text-3xl font-display font-bold text-slate-900">{stats?.totalPatients || 0}</p>
            </div>
          </div>
          <div className="medical-card p-6 flex items-center gap-4 bg-gradient-to-br from-white to-emerald-50/50">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
              <IndianRupee className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Collection</p>
              <p className="text-3xl font-display font-bold text-slate-900">{formatCurrency(stats?.totalFees || 0)}</p>
            </div>
          </div>
        </div>

        {/* Patient Table */}
        <div className="medical-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200/60">
                <tr>
                  <th className="px-4 py-4 font-semibold text-slate-600">#</th>
                  <th className="px-4 py-4 font-semibold text-slate-600">Pt.No</th>
                  <th className="px-4 py-4 font-semibold text-slate-600">Patient</th>
                  <th className="px-4 py-4 font-semibold text-slate-600">Weight</th>
                  <th className="px-4 py-4 font-semibold text-slate-600">Complaint</th>
                  <th className="px-4 py-4 font-semibold text-slate-600">Treatment</th>
                  <th className="px-4 py-4 font-semibold text-slate-600">Type</th>
                  <th className="px-4 py-4 font-semibold text-slate-600 text-right">Fees</th>
                  <th className="px-4 py-4 font-semibold text-slate-600 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats?.patients && stats.patients.length > 0 ? (
                  stats.patients.map((p, i) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-4 font-medium text-slate-400">{i + 1}</td>
                      <td className="px-4 py-4">
                        {p.patientNo ? (
                          <span className="font-bold text-primary text-sm">#{p.patientNo}</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-bold text-slate-900">{p.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {p.age ? `${p.age} yrs${p.ageMonths ? ` ${p.ageMonths} mo` : ""}` : ""}{p.age && p.mobile ? " • " : ""}{p.mobile}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{p.weight || "-"}</td>
                      <td className="px-4 py-4 max-w-[160px] truncate text-slate-600">
                        {p.complaintCode && <span className="font-bold text-primary mr-1">[{p.complaintCode}]</span>}
                        {p.complaint || "-"}
                      </td>
                      <td className="px-4 py-4 max-w-[160px] truncate text-slate-600">{p.treatment || "-"}</td>
                      <td className="px-4 py-4">
                        {p.registerType === "ayurvedic" ? (
                          <span className="text-xs font-bold px-2 py-1 rounded-md bg-emerald-100 text-emerald-700">Ayurvedic</span>
                        ) : (
                          <span className="text-xs font-bold px-2 py-1 rounded-md bg-blue-100 text-blue-700">General</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right font-bold text-slate-900">{p.fees ? `₹${p.fees}` : "-"}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => { setPrintPatient(p); setTimeout(() => printPatientPrescription(p), 50); }}
                            className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingPatient(p)} className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(p.id)} className="p-2 text-slate-400 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <FileText className="w-12 h-12 mb-3 text-slate-300" />
                        <p className="text-base font-medium">No patients found for this date</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Day-wise Collection Summary */}
        <div className="medical-card overflow-hidden">
          <button
            onClick={() => setShowSummary((v) => !v)}
            className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-emerald-600" />
              <span className="font-semibold text-slate-800">Day-wise Collection Summary</span>
              <span className="text-xs text-slate-500 ml-1">({allDates.length} days)</span>
            </div>
            {showSummary ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </button>
          {showSummary && (
            <div className="border-t border-slate-100">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-slate-500">Date</th>
                    <th className="px-6 py-3 font-semibold text-slate-500">Patients</th>
                    <th className="px-6 py-3 font-semibold text-slate-500 text-right">Collection</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allDates.length === 0 ? (
                    <tr><td colSpan={3} className="px-6 py-6 text-center text-slate-400">No data yet</td></tr>
                  ) : (
                    allDates.map((d) => (
                      <tr key={d.date} onClick={() => setSelectedDate(d.date)} className="hover:bg-slate-50/80 transition-colors cursor-pointer">
                        <td className="px-6 py-3 font-medium text-slate-700">
                          {format(new Date(d.date), "dd MMM yyyy")}
                          {d.date === format(new Date(), "yyyy-MM-dd") && (
                            <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded font-bold">Today</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-slate-600">{d.count} patients</td>
                        <td className="px-6 py-3 text-right font-semibold text-emerald-700">{formatCurrency(d.totalFees)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingPatient} onOpenChange={(open) => !open && setEditingPatient(null)}>
        <DialogContent className="max-w-md bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Edit Patient Visit</DialogTitle>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Patient No.</label>
                <input {...editForm.register("patientNo")} className="w-full px-3 py-2 rounded-xl border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" placeholder="e.g. 42" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Name</label>
                <input {...editForm.register("name")} className="w-full px-3 py-2 rounded-xl border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Age (yrs / mo)</label>
                <div className="flex gap-1">
                  <input type="number" {...editForm.register("age")} className="w-full px-2 py-2 rounded-xl border focus:border-primary outline-none" placeholder="yrs" />
                  <input type="number" {...editForm.register("ageMonths")} className="w-16 px-2 py-2 rounded-xl border focus:border-primary outline-none" placeholder="mo" min={0} max={11} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Mobile</label>
                <input {...editForm.register("mobile")} className="w-full px-3 py-2 rounded-xl border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Weight</label>
                <input {...editForm.register("weight")} className="w-full px-3 py-2 rounded-xl border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" placeholder="e.g. 65 kg" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Address</label>
                <input {...editForm.register("address")} className="w-full px-3 py-2 rounded-xl border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Complaint Code</label>
              <input {...editForm.register("complaintCode")} className="w-full px-3 py-2 rounded-xl border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none uppercase" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Complaint</label>
              <input {...editForm.register("complaint")} className="w-full px-3 py-2 rounded-xl border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Treatment</label>
              <input {...editForm.register("treatment")} className="w-full px-3 py-2 rounded-xl border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Advice</label>
              <input {...editForm.register("advice")} className="w-full px-3 py-2 rounded-xl border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Reports</label>
              <input {...editForm.register("reports")} className="w-full px-3 py-2 rounded-xl border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Fees (₹)</label>
              <input type="number" {...editForm.register("fees")} className="w-full px-3 py-2 rounded-xl border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={() => setEditingPatient(null)} className="px-4 py-2 rounded-xl font-medium bg-slate-100 hover:bg-slate-200 text-slate-700">Cancel</button>
              <button type="submit" className="px-4 py-2 rounded-xl font-medium bg-primary text-white shadow-md shadow-primary/20 hover:bg-primary/90">Save Changes</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
