import { useState, useRef } from "react";
import { Layout } from "@/components/Layout";
import { diseases, type DiseaseData } from "@/lib/pathyaData";
import { Search, Printer, User, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

type Lang = "gu" | "hi";

const CLINIC_NAME_GU = "મંગલમ્ સ્કીન કેર ક્લીનીક";
const CLINIC_NAME_EN = "Manglam Skin Care Clinic";
const DOCTOR_GU = "ડૉ. વિજય ગિરગલાણી";
const DOCTOR_QUALS = "B.A.M.S., C.S.D. (Skin)";
const DOCTOR_REG = "Reg. No. GBI 17318";

export default function PathyaApathya() {
  const [selectedId, setSelectedId] = useState(diseases[0].id);
  const [lang, setLang] = useState<Lang>("gu");
  const [patientName, setPatientName] = useState("");
  const [search, setSearch] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  const disease = diseases.find((d) => d.id === selectedId) ?? diseases[0];
  const filtered = search
    ? diseases.filter(
        (d) =>
          d.names.gu.includes(search) ||
          d.names.hi.includes(search) ||
          d.names.en.toLowerCase().includes(search.toLowerCase()) ||
          d.altName.toLowerCase().includes(search.toLowerCase())
      )
    : diseases;

  const t = (item: { gu: string; hi: string }) => item[lang];

  const handlePrint = () => {
    window.print();
  };

  const today = format(new Date(), "dd/MM/yyyy");

  const langLabel = lang === "gu" ? "ગુ" : "हि";

  return (
    <Layout>
      {/* Print styles injected inline */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #pathya-print-area, #pathya-print-area * { visibility: visible; }
          #pathya-print-area {
            position: fixed; left: 0; top: 0; width: 100%; z-index: 9999;
          }
          @page { size: A4; margin: 8mm; }
        }
      `}</style>

      <div className="flex gap-4 h-[calc(100vh-80px)]">

        {/* ── LEFT PANEL ──────────────────────────── */}
        <div className="w-72 shrink-0 flex flex-col gap-3 overflow-y-auto pr-1 print:hidden">
          {/* Language toggle */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3 flex gap-2">
            <button
              onClick={() => setLang("gu")}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                lang === "gu"
                  ? "bg-teal-700 text-white shadow"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              ગુ — Gujarati
            </button>
            <button
              onClick={() => setLang("hi")}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                lang === "hi"
                  ? "bg-teal-700 text-white shadow"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              हि — Hindi
            </button>
          </div>

          {/* Patient name */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">
              <User className="w-3 h-3 inline mr-1" />
              Patient Name (optional)
            </label>
            <input
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="e.g. Rajesh Shah"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none"
            />
          </div>

          {/* Disease search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search disease..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none"
            />
          </div>

          {/* Disease list */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex-1">
            <div className="p-2 text-xs font-semibold text-slate-400 uppercase tracking-wide px-3 pt-3">
              {filtered.length} Diseases
            </div>
            <div className="overflow-y-auto max-h-[500px]">
              {filtered.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelectedId(d.id)}
                  className={`w-full text-left px-3 py-2.5 flex flex-col gap-0.5 border-b border-slate-100 last:border-0 transition-colors ${
                    selectedId === d.id
                      ? "bg-teal-50 border-l-2 border-l-teal-600"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <span className="font-semibold text-sm text-slate-800">
                    {lang === "gu" ? d.names.gu : d.names.hi}
                  </span>
                  <span className="text-xs text-slate-400">{d.altName}</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-slate-400 text-sm text-center py-6">No results</p>
              )}
            </div>
          </div>

          {/* Print button */}
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-teal-700 text-white font-bold hover:bg-teal-800 transition-all shadow-lg shadow-teal-200"
          >
            <Printer className="w-5 h-5" />
            Print Sheet
          </button>
        </div>

        {/* ── RIGHT PANEL — PRINT PREVIEW ─────────── */}
        <div className="flex-1 overflow-y-auto">
          <div
            id="pathya-print-area"
            ref={printRef}
            className="bg-white shadow-xl rounded-2xl overflow-hidden text-sm print:rounded-none print:shadow-none"
            style={{ maxWidth: 700, margin: "0 auto" }}
          >
            {/* HEADER */}
            <div
              className="px-5 py-4 flex justify-between items-center"
              style={{ background: "#1A2E2B" }}
            >
              <div>
                <div className="text-white font-bold text-base" style={{ fontFamily: "serif" }}>
                  {CLINIC_NAME_GU}
                </div>
                <div className="text-teal-300 text-xs mt-0.5">{CLINIC_NAME_EN}</div>
              </div>
              <div className="text-right">
                <div className="text-white font-semibold text-sm">{DOCTOR_GU}</div>
                <div className="text-teal-300 text-xs">{DOCTOR_QUALS}</div>
                <div className="text-teal-400 text-xs">{DOCTOR_REG}</div>
              </div>
            </div>

            {/* DISEASE BAR */}
            <div
              className="px-5 py-3 flex justify-between items-center"
              style={{ background: "#00897B" }}
            >
              <div>
                <div className="text-white font-bold text-xl">
                  {t(disease.names)}
                </div>
                <div className="text-teal-100 text-xs mt-0.5">{disease.altName}</div>
              </div>
              <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">
                {langLabel}
              </span>
            </div>

            {/* PATIENT + DATE BAR */}
            <div
              className="px-5 py-2.5 flex justify-between items-center"
              style={{ background: "#E0F2F1" }}
            >
              <span className="text-slate-700 text-sm">
                {lang === "gu" ? "દ.નું ના." : "दर्दी का नाम"}:{" "}
                <strong>{patientName || "________________________"}</strong>
              </span>
              <span className="text-slate-600 text-sm">
                {lang === "gu" ? "તા." : "दिनांक"}: <strong>{today}</strong>
              </span>
            </div>

            {/* NIDANA */}
            <div className="px-5 py-3" style={{ background: "#F0FDFB", borderBottom: "1px solid #B2DFDB" }}>
              <div className="text-xs font-bold text-teal-800 mb-2 uppercase tracking-wide">
                {lang === "gu" ? "કારણો (Nidana)" : "कारण (Nidana)"}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {disease.nidana.map((n, i) => (
                  <span
                    key={i}
                    className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{ background: "#B2DFDB", color: "#004D40" }}
                  >
                    {t(n)}
                  </span>
                ))}
              </div>
            </div>

            {/* TWO-COLUMN BODY */}
            <div className="flex" style={{ minHeight: 360 }}>
              {/* PATHYA */}
              <div className="flex-1 border-r border-slate-200">
                <div
                  className="px-4 py-2.5 flex items-center gap-2"
                  style={{ background: "#E8F5E9" }}
                >
                  <CheckCircle className="w-4 h-4 text-green-700" />
                  <div>
                    <div className="font-bold text-green-800 text-sm">
                      {lang === "gu" ? "પથ્ય — શું ખાવું" : "पथ्य — क्या खाएं"}
                    </div>
                    <div className="text-green-600 text-xs">What to eat & follow</div>
                  </div>
                </div>
                <div className="px-4 py-3 space-y-3">
                  {disease.pathya.map((sec, si) => (
                    <div key={si}>
                      <div className="text-xs font-bold text-green-700 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-600 inline-block" />
                        {t(sec.label)}
                      </div>
                      <ul className="space-y-1">
                        {sec.items.map((item, ii) => (
                          <li key={ii} className="flex items-start gap-2 text-xs text-slate-700">
                            <span className="text-green-500 mt-0.5 shrink-0">●</span>
                            <span>{t(item)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* APATHYA */}
              <div className="flex-1">
                <div
                  className="px-4 py-2.5 flex items-center gap-2"
                  style={{ background: "#FFEBEE" }}
                >
                  <XCircle className="w-4 h-4 text-red-700" />
                  <div>
                    <div className="font-bold text-red-800 text-sm">
                      {lang === "gu" ? "અપથ્ય — શું ન ખાવું" : "अपथ्य — क्या न खाएं"}
                    </div>
                    <div className="text-red-500 text-xs">What to avoid</div>
                  </div>
                </div>
                <div className="px-4 py-3 space-y-3">
                  {disease.apathya.map((sec, si) => (
                    <div key={si}>
                      <div className="text-xs font-bold text-red-700 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                        {t(sec.label)}
                      </div>
                      <ul className="space-y-1">
                        {sec.items.map((item, ii) => (
                          <li key={ii} className="flex items-start gap-2 text-xs text-slate-700">
                            <span className="text-red-400 mt-0.5 shrink-0">●</span>
                            <span>{t(item)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div
              className="px-5 py-2.5 flex justify-between items-center"
              style={{ background: "#F5F5F5", borderTop: "1px solid #e0e0e0" }}
            >
              <span className="text-xs text-slate-500">{disease.reference}</span>
              <span className="text-xs text-red-600 font-medium">
                Not valid for Medico-Legal Purpose
              </span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
