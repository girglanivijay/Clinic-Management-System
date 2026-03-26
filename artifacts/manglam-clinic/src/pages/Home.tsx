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
  FileText, Printer, Paperclip, X, Leaf,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

const patientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  age: z.coerce.number().min(0, "Invalid age"),
  ageMonths: z.coerce.number().min(0).max(11).optional(),
  address: z.string().min(1, "Address is required"),
  mobile: z.string().min(5, "Valid mobile required"),
  complaintCode: z.string().optional(),
  complaint: z.string().optional(),
  treatment: z.string().optional(),
  advice: z.string().optional(),
  reports: z.string().optional(),
  fees: z.coerce.number().min(0, "Fees required"),
  paymentMode: z.enum(["cash", "upi"]).default("cash"),
});

type PatientFormValues = z.infer<typeof patientSchema>;

const emptyDefaults: PatientFormValues = {
  name: "", age: 0, ageMonths: 0, address: "", mobile: "",
  complaintCode: "", complaint: "", treatment: "",
  advice: "", reports: "", fees: 0, paymentMode: "cash",
};

export default function Home() {
  const { toast } = useToast();
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [patientHistory, setPatientHistory] = useState<Patient[]>([]);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [lastSaved, setLastSaved] = useState<Patient | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: emptyDefaults,
  });

  const paymentMode = form.watch("paymentMode");
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
      form.setValue("age", result.latestInfo.age);
      form.setValue("ageMonths", result.latestInfo.ageMonths || 0);
      form.setValue("address", result.latestInfo.address);
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
      form.setValue("age", result.latestInfo.age);
      form.setValue("ageMonths", result.latestInfo.ageMonths || 0);
      form.setValue("address", result.latestInfo.address);
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
      ...data,
      ageMonths: data.ageMonths || 0,
      fees: Number(data.fees),
      attachments,
      registerType,
      visitDate: new Date().toISOString().split("T")[0],
    });
    setLastSaved(saved);
    toast({
      title: "Saved!",
      description: `Patient saved to ${registerType === "ayurvedic" ? "Ayurvedic" : "General"} Register.`,
    });
    form.reset(emptyDefaults);
    setAttachments([]);
    setPatientHistory([]);
  };

  const onSubmit = (data: PatientFormValues) => savePatient(data, "general");
  const onSaveAyurvedic = () => {
    form.handleSubmit((data) => savePatient(data, "ayurvedic"))();
  };

  return (
    <Layout>
      {/* Hidden print component — only visible on print */}
      {lastSaved && <PrintPrescription patient={lastSaved} />}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Form */}
        <div className="lg:col-span-8 space-y-6">
          <div className="medical-card p-6 md:p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-2xl font-display text-slate-900">Patient Registration</h2>
                <p className="text-slate-500 text-sm">Register a new visit and view medical history.</p>
              </div>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Demographics */}
              <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400" /> Mobile Number
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

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" /> Patient Name
                  </label>
                  <input
                    {...form.register("name")}
                    onBlur={handleNameLookup}
                    className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-slate-800"
                    placeholder="Full Name"
                  />
                  {form.formState.errors.name && <p className="text-destructive text-xs">{form.formState.errors.name.message}</p>}
                </div>

                {/* Age — years + months */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Age</label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        {...form.register("age")}
                        className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-slate-800"
                        placeholder="Years"
                        min={0}
                      />
                      <span className="absolute right-3 top-3.5 text-xs text-slate-400">yrs</span>
                    </div>
                    <div className="w-28 relative">
                      <input
                        type="number"
                        {...form.register("ageMonths")}
                        className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-slate-800"
                        placeholder="0"
                        min={0}
                        max={11}
                      />
                      <span className="absolute right-3 top-3.5 text-xs text-slate-400">mo</span>
                    </div>
                  </div>
                  {form.formState.errors.age && <p className="text-destructive text-xs">{form.formState.errors.age.message}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" /> Address
                  </label>
                  <input
                    {...form.register("address")}
                    className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-slate-800"
                    placeholder="City / Area"
                  />
                  {form.formState.errors.address && <p className="text-destructive text-xs">{form.formState.errors.address.message}</p>}
                </div>
              </div>

              {/* Medical Details */}
              <div className="bg-blue-50/30 p-6 rounded-2xl border border-blue-100 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                  {/* Fees + Payment Mode */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Consultation Fees (₹)</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        {...form.register("fees")}
                        className="flex-1 px-4 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-semibold text-slate-900"
                        placeholder="Amount"
                      />
                      <div className="flex rounded-xl overflow-hidden border border-slate-200 bg-white">
                        <button
                          type="button"
                          onClick={() => form.setValue("paymentMode", "cash")}
                          className={`px-3 py-2 text-sm font-semibold transition-colors ${paymentMode === "cash" ? "bg-emerald-500 text-white" : "text-slate-500 hover:bg-slate-50"}`}
                        >
                          Cash
                        </button>
                        <button
                          type="button"
                          onClick={() => form.setValue("paymentMode", "upi")}
                          className={`px-3 py-2 text-sm font-semibold transition-colors ${paymentMode === "upi" ? "bg-violet-500 text-white" : "text-slate-500 hover:bg-slate-50"}`}
                        >
                          UPI
                        </button>
                      </div>
                    </div>
                    {form.formState.errors.fees && <p className="text-destructive text-xs">{form.formState.errors.fees.message}</p>}
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <div className="flex flex-wrap justify-end gap-3 pt-4">
                {lastSaved && (
                  <button
                    type="button"
                    onClick={() => printPatientPrescription(lastSaved)}
                    className="px-6 py-3 rounded-xl font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm transition-all flex items-center gap-2"
                  >
                    <Printer className="w-5 h-5" />
                    Print Last Prescription
                  </button>
                )}
                <button
                  type="button"
                  onClick={onSaveAyurvedic}
                  className="px-6 py-3 rounded-xl font-semibold bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2"
                >
                  <Leaf className="w-5 h-5" />
                  Save to Ayurvedic
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 rounded-xl font-semibold bg-gradient-to-r from-primary to-primary/90 text-white shadow-lg shadow-primary/30 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2"
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
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold px-2 py-1 bg-white rounded-md border border-slate-200 text-slate-600">
                              {format(new Date(visit.visitDate), "dd MMM, yyyy")}
                            </span>
                            {visit.registerType === "ayurvedic" && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded">AYU</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-primary bg-primary/5 px-2 py-1 rounded-md">
                              ₹{visit.fees}
                            </span>
                            {visit.paymentMode && (
                              <span className={`text-[10px] font-bold px-1.5 py-1 rounded-md ${visit.paymentMode === "upi" ? "bg-violet-100 text-violet-700" : "bg-emerald-100 text-emerald-700"}`}>
                                {visit.paymentMode.toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2 mt-3">
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
