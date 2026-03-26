import { type Patient } from "@/lib/store";
import { format } from "date-fns";

interface Props {
  patient: Patient;
}

export function PrintPrescription({ patient }: Props) {
  return (
    <div id="print-prescription" className="hidden print:block p-8 font-sans text-black max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center border-b-2 border-black pb-4 mb-6">
        <h1 className="text-2xl font-bold">Manglam Clinic</h1>
        <p className="text-base font-semibold">Dr. Vijay Girglani</p>
        <p className="text-sm mt-1">Date: {format(new Date(patient.visitDate), "dd/MM/yyyy")}</p>
      </div>

      {/* Patient Info */}
      <div className="grid grid-cols-2 gap-2 mb-6 text-sm">
        <div><span className="font-semibold">Name:</span> {patient.name}</div>
        <div>
          <span className="font-semibold">Age:</span>{" "}
          {patient.age} yrs{patient.ageMonths ? ` ${patient.ageMonths} mo` : ""}
        </div>
        <div><span className="font-semibold">Mobile:</span> {patient.mobile}</div>
        <div><span className="font-semibold">Address:</span> {patient.address}</div>
        {patient.complaintCode && (
          <div><span className="font-semibold">Code:</span> {patient.complaintCode}</div>
        )}
        <div>
          <span className="font-semibold">Fees:</span> ₹{patient.fees}
          {patient.paymentMode && ` (${patient.paymentMode.toUpperCase()})`}
        </div>
      </div>

      {/* Medical Details */}
      {patient.complaint && (
        <div className="mb-4">
          <p className="font-bold text-sm uppercase border-b border-gray-300 pb-1 mb-2">Complaints</p>
          <p className="text-sm">{patient.complaint}</p>
        </div>
      )}

      {patient.treatment && (
        <div className="mb-4">
          <p className="font-bold text-sm uppercase border-b border-gray-300 pb-1 mb-2">℞ Treatment / Prescription</p>
          <p className="text-sm whitespace-pre-line">{patient.treatment}</p>
        </div>
      )}

      {patient.advice && (
        <div className="mb-4">
          <p className="font-bold text-sm uppercase border-b border-gray-300 pb-1 mb-2">Advice</p>
          <p className="text-sm">{patient.advice}</p>
        </div>
      )}

      {patient.reports && (
        <div className="mb-4">
          <p className="font-bold text-sm uppercase border-b border-gray-300 pb-1 mb-2">Reports Required</p>
          <p className="text-sm">{patient.reports}</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-12 pt-4 border-t border-gray-300 flex justify-between text-sm">
        <p>Next Visit: _______________</p>
        <p className="font-semibold">Dr. Vijay Girglani</p>
      </div>
    </div>
  );
}

export function printPatientPrescription(patient: Patient) {
  const el = document.getElementById("print-prescription");
  if (!el) return;
  el.classList.remove("hidden");
  window.print();
  el.classList.add("hidden");
}
