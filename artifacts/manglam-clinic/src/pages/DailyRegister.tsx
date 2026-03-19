import { useState } from "react";
import { format } from "date-fns";
import { Layout } from "@/components/Layout";
import { 
  useGetDailyStats, 
  useUpdatePatient,
  useDeletePatient
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Calendar, Download, Edit2, Trash2, Users, IndianRupee, FileText } from "lucide-react";
import { exportToExcel } from "@/lib/export";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const editSchema = z.object({
  name: z.string().min(1),
  age: z.coerce.number(),
  address: z.string(),
  mobile: z.string(),
  complaintCode: z.string().optional(),
  complaint: z.string().optional(),
  treatment: z.string().optional(),
  fees: z.coerce.number(),
});

export default function DailyRegister() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const { data: stats, isLoading } = useGetDailyStats({ date: selectedDate });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editingPatient, setEditingPatient] = useState<any | null>(null);
  
  const updatePatient = useUpdatePatient();
  const deletePatient = useDeletePatient();

  const editForm = useForm({
    resolver: zodResolver(editSchema),
    values: editingPatient || {}
  });

  const handleExport = () => {
    if (!stats?.patients) return;
    const exportData = stats.patients.map((p, index) => ({
      "S.No": index + 1,
      "Name": p.name,
      "Age": p.age,
      "Address": p.address,
      "Mobile": p.mobile,
      "Complaint Code": p.complaintCode || "-",
      "Complaint": p.complaint || "-",
      "Treatment": p.treatment || "-",
      "Advice": p.advice || "-",
      "Fees": p.fees,
      "Date": format(new Date(p.visitDate), "dd-MMM-yyyy")
    }));
    exportToExcel(exportData, `Manglam_Clinic_${selectedDate}`);
    toast({ title: "Export Successful", description: "Excel file downloaded." });
  };

  const onEditSubmit = (data: any) => {
    if (!editingPatient) return;
    updatePatient.mutate({ id: editingPatient.id, data }, {
      onSuccess: () => {
        toast({ title: "Updated", description: "Patient record updated." });
        setEditingPatient(null);
        queryClient.invalidateQueries({ queryKey: ["/api/patients/stats/daily"] });
      }
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Are you sure you want to delete this record?")) return;
    deletePatient.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Deleted", description: "Patient record deleted." });
        queryClient.invalidateQueries({ queryKey: ["/api/patients/stats/daily"] });
      }
    });
  };

  return (
    <Layout>
      <div className="space-y-8">
        
        {/* Header Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-display text-slate-900">Daily Register</h2>
            <p className="text-slate-500 text-sm">View and manage today's patients</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Calendar className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 shadow-sm text-slate-700 font-medium"
              />
            </div>
            <button
              onClick={handleExport}
              className="px-4 py-2.5 rounded-xl font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm transition-all flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export Excel</span>
            </button>
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
              <p className="text-3xl font-display font-bold text-slate-900">
                {isLoading ? "-" : stats?.totalPatients || 0}
              </p>
            </div>
          </div>
          
          <div className="medical-card p-6 flex items-center gap-4 bg-gradient-to-br from-white to-emerald-50/50">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
              <IndianRupee className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Collection</p>
              <p className="text-3xl font-display font-bold text-slate-900">
                {isLoading ? "-" : formatCurrency(stats?.totalFees || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Main Table */}
        <div className="medical-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200/60">
                <tr>
                  <th className="px-6 py-4 font-semibold text-slate-600">#</th>
                  <th className="px-6 py-4 font-semibold text-slate-600">Patient Details</th>
                  <th className="px-6 py-4 font-semibold text-slate-600">Complaint</th>
                  <th className="px-6 py-4 font-semibold text-slate-600">Treatment</th>
                  <th className="px-6 py-4 font-semibold text-slate-600 text-right">Fees</th>
                  <th className="px-6 py-4 font-semibold text-slate-600 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      Loading...
                    </td>
                  </tr>
                ) : stats?.patients && stats.patients.length > 0 ? (
                  stats.patients.map((p, i) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-400">{i + 1}</td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">{p.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{p.age} yrs • {p.mobile}</p>
                      </td>
                      <td className="px-6 py-4 max-w-[200px] truncate text-slate-600">
                        {p.complaintCode && <span className="font-bold text-primary mr-1">[{p.complaintCode}]</span>}
                        {p.complaint || "-"}
                      </td>
                      <td className="px-6 py-4 max-w-[200px] truncate text-slate-600">
                        {p.treatment || "-"}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900">
                        ₹{p.fees}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setEditingPatient(p)}
                            className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-2 text-slate-400 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
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
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Name</label>
                <input {...editForm.register("name")} className="w-full px-3 py-2 rounded-xl border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Mobile</label>
                <input {...editForm.register("mobile")} className="w-full px-3 py-2 rounded-xl border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" />
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
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Fees</label>
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
