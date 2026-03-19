import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Layout } from "@/components/Layout";
import {
  addPatient,
  lookupByMobile,
  lookupByName,
  getComplaintCodes,
  findComplaintCode,
  type Patient,
} from "@/lib/store";
import { Loader2, User, Phone, MapPin, Activity, Save, RefreshCw, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

const patientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  age: z.coerce.number().min(0, "Invalid age"),
  address: z.string().min(1, "Address is required"),
  mobile: z.string().min(5, "Valid mobile required"),
  complaintCode: z.string().optional(),
  complaint: z.string().optional(),
  treatment: z.string().optional(),
  advice: z.string().optional(),
  reports: z.string().optional(),
  fees: z.coerce.number().min(0, "Fees required"),
});

type PatientFormValues = z.infer<typeof patientSchema>;

export default function Home() {
  const { toast } = useToast();
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [patientHistory, setPatientHistory] = useState<Patient[]>([]);

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      name: "", age: 0, address: "", mobile: "", complaintCode: "",
      complaint: "", treatment: "", advice: "", reports: "", fees: 0,
    },
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
      form.setValue("age", result.latestInfo.age);
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
      form.setValue("address", result.latestInfo.address);
      form.setValue("mobile", result.latestInfo.mobile);
      toast({ title: "Patient found", description: "Details auto-filled from history." });
    }
    setPatientHistory(result.history);
    setIsLookingUp(false);
  }, [form, toast]);

  const onSubmit = (data: PatientFormValues) => {
    addPatient({
      ...data,
      fees: Number(data.fees),
      visitDate: new Date().toISOString().split("T")[0],
    });
    toast({ title: "Success", description: "Patient registered successfully." });
    form.reset({ name: "", age: 0, address: "", mobile: "", complaintCode: "", complaint: "", treatment: "", advice: "", reports: "", fees: 0 });
    setPatientHistory([]);
  };

  return (
    <Layout>
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
                    className="w-full pl-4 pr-10 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-slate-800"
                    placeholder="Full Name"
                  />
                  {form.formState.errors.name && <p className="text-destructive text-xs">{form.formState.errors.name.message}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Age</label>
                  <input
                    type="number"
                    {...form.register("age")}
                    className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-slate-800"
                    placeholder="Age in years"
                  />
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

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Consultation Fees (₹)</label>
                    <input
                      type="number"
                      {...form.register("fees")}
                      className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-semibold text-slate-900"
                      placeholder="Amount"
                    />
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
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  className="px-8 py-3 rounded-xl font-semibold bg-gradient-to-r from-primary to-primary/90 text-white shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  Save Patient Record
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
                          <span className="text-xs font-bold px-2 py-1 bg-white rounded-md border border-slate-200 text-slate-600">
                            {format(new Date(visit.visitDate), "dd MMM, yyyy")}
                          </span>
                          <span className="text-xs font-bold text-primary bg-primary/5 px-2 py-1 rounded-md">
                            ₹{visit.fees}
                          </span>
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
