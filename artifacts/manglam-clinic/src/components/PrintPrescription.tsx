import { type Patient } from "@/lib/store";
import { format } from "date-fns";

interface Props {
  patient: Patient;
}

function DottedLine({ width = "100%" }: { width?: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        width,
        borderBottom: "1px dashed #555",
        marginLeft: "6px",
        verticalAlign: "middle",
      }}
    />
  );
}

export function PrintPrescription({ patient }: Props) {
  const age = patient.age
    ? `${patient.age} yr${patient.ageMonths ? ` ${patient.ageMonths} mo` : ""}`
    : patient.ageMonths
    ? `${patient.ageMonths} mo`
    : "";

  return (
    <div
      id="print-prescription"
      style={{
        display: "none",
        fontFamily: "Arial, sans-serif",
        color: "#000",
        padding: "0",
        maxWidth: "720px",
        margin: "0 auto",
        fontSize: "14px",
      }}
    >
      {/* ── LETTERHEAD HEADER ── */}
      <table
        style={{
          width: "100%",
          borderBottom: "3px double #b00",
          paddingBottom: "8px",
          marginBottom: "6px",
        }}
      >
        <tbody>
          <tr>
            {/* Left: Logo + Clinic Name */}
            <td style={{ verticalAlign: "middle", width: "60%" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {/* Red cross icon */}
                <div
                  style={{
                    width: "50px",
                    height: "50px",
                    backgroundColor: "#cc0000",
                    borderRadius: "6px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <span style={{ color: "white", fontSize: "28px", fontWeight: "bold", lineHeight: 1 }}>✚</span>
                </div>
                <div>
                  <div style={{ fontSize: "26px", fontWeight: "900", color: "#cc0000", lineHeight: 1.1 }}>
                    મંગલમ્
                  </div>
                  <div style={{ fontSize: "12px", color: "#333", fontWeight: "600" }}>
                    ફૅમીલી ડે-કૅર હૉસ્પિટલ
                  </div>
                </div>
              </div>
            </td>

            {/* Right: Doctor Info */}
            <td style={{ verticalAlign: "top", textAlign: "right", width: "40%" }}>
              <div style={{ fontSize: "15px", fontWeight: "bold", color: "#000" }}>
                ડૉ. વિજય ગિરગ્લાણી
              </div>
              <div style={{ fontSize: "11px", color: "#333" }}>B.A.M.S, C.C.H, C.S.D.</div>
              <div
                style={{
                  backgroundColor: "#cc0000",
                  color: "#fff",
                  fontSize: "11px",
                  fontWeight: "bold",
                  padding: "2px 6px",
                  borderRadius: "3px",
                  marginTop: "3px",
                  display: "inline-block",
                }}
              >
                ફૅમીલી ફિઝિશ્યન & સર્જ્ …
              </div>
              <div
                style={{
                  backgroundColor: "#cc0000",
                  color: "#fff",
                  fontSize: "10px",
                  padding: "2px 6px",
                  borderRadius: "3px",
                  marginTop: "3px",
                  display: "inline-block",
                }}
              >
                સમય: સવારે ૭:૦૦ થી રાત્રે ૧૨:૦૦ સુધી
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── DATE ── */}
      <div style={{ textAlign: "right", marginBottom: "14px", fontSize: "14px" }}>
        <span style={{ fontWeight: "600" }}>Date</span>{" "}
        <span style={{ letterSpacing: "2px", borderBottom: "1px solid #000", paddingBottom: "1px" }}>
          {format(new Date(patient.visitDate), "dd / MM / yyyy")}
        </span>
      </div>

      {/* ── PATIENT INFO ── */}
      <div style={{ lineHeight: "2.2", fontSize: "14px" }}>
        {/* Patient Name */}
        <div>
          <span style={{ fontWeight: "700", minWidth: "150px", display: "inline-block" }}>Patient Name .</span>
          <span
            style={{
              borderBottom: "1px dashed #555",
              display: "inline-block",
              minWidth: "380px",
              paddingLeft: "6px",
            }}
          >
            {patient.name}
          </span>
        </div>

        {/* Mobile */}
        <div>
          <span style={{ fontWeight: "700", minWidth: "150px", display: "inline-block" }}>Mobile Number</span>
          <span
            style={{
              borderBottom: "1px dashed #555",
              display: "inline-block",
              minWidth: "380px",
              paddingLeft: "6px",
            }}
          >
            {patient.mobile}
          </span>
        </div>

        {/* Age / Weight / Address on one line */}
        <div style={{ display: "flex", gap: "10px", alignItems: "baseline" }}>
          <span style={{ fontWeight: "700", whiteSpace: "nowrap" }}>Age</span>
          <span
            style={{
              borderBottom: "1px dashed #555",
              display: "inline-block",
              minWidth: "60px",
              paddingLeft: "4px",
            }}
          >
            {age}
          </span>
          <span style={{ fontWeight: "700", whiteSpace: "nowrap" }}>Weight</span>
          <span
            style={{
              borderBottom: "1px dashed #555",
              display: "inline-block",
              minWidth: "70px",
              paddingLeft: "4px",
            }}
          >
            {patient.weight || ""}
          </span>
          <span style={{ fontWeight: "700", whiteSpace: "nowrap" }}>Address</span>
          <span
            style={{
              borderBottom: "1px dashed #555",
              display: "inline-block",
              flex: 1,
              paddingLeft: "4px",
            }}
          >
            {patient.address || ""}
          </span>
        </div>
      </div>

      {/* ── SPACER ── */}
      <div style={{ height: "18px" }} />

      {/* ── C/o — COMPLAINT ── */}
      <div style={{ marginBottom: "18px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
          <span style={{ fontWeight: "700", fontSize: "15px", whiteSpace: "nowrap", minWidth: "36px" }}>C/o</span>
          <span
            style={{
              flex: 1,
              borderBottom: "1px dashed #555",
              paddingLeft: "4px",
              minHeight: "22px",
              display: "block",
            }}
          >
            {patient.complaint || ""}
          </span>
        </div>
      </div>

      {/* ── Rx — TREATMENT ── */}
      <div style={{ marginBottom: "6px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
          <span style={{ fontWeight: "700", fontSize: "15px", whiteSpace: "nowrap", minWidth: "36px" }}>Rx</span>
          <div style={{ flex: 1 }}>
            <div
              style={{
                borderBottom: "1px dashed #555",
                paddingLeft: "4px",
                minHeight: "22px",
                whiteSpace: "pre-line",
              }}
            >
              {patient.treatment || ""}
            </div>
            {/* extra lines for handwriting space */}
            <div style={{ borderBottom: "1px dashed #555", height: "28px", marginTop: "10px" }} />
            <div style={{ borderBottom: "1px dashed #555", height: "28px", marginTop: "10px" }} />
          </div>
        </div>
      </div>

      <div style={{ height: "18px" }} />

      {/* ── ADVICE ── */}
      <div style={{ marginBottom: "14px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
          <span style={{ fontWeight: "700", fontSize: "15px", whiteSpace: "nowrap", minWidth: "70px" }}>Advice</span>
          <span
            style={{
              flex: 1,
              borderBottom: "1px dashed #555",
              paddingLeft: "4px",
              minHeight: "22px",
              display: "block",
            }}
          >
            {patient.advice || ""}
          </span>
        </div>
      </div>

      {/* ── REPORTS ── */}
      <div style={{ marginBottom: "30px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
          <span style={{ fontWeight: "700", fontSize: "15px", whiteSpace: "nowrap", minWidth: "70px" }}>Reports</span>
          <span
            style={{
              flex: 1,
              borderBottom: "1px dashed #555",
              paddingLeft: "4px",
              minHeight: "22px",
              display: "block",
            }}
          >
            {patient.reports || ""}
          </span>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div
        style={{
          borderTop: "2px solid #cc0000",
          paddingTop: "8px",
          marginTop: "20px",
          backgroundColor: "#cc0000",
          color: "#fff",
          padding: "6px 12px",
          borderRadius: "4px",
          textAlign: "center",
          fontSize: "11px",
        }}
      >
        <div style={{ fontWeight: "700", fontSize: "12px" }}>
          ક્રિષ્ના હૉટલ સામે, પીપળીયા ચાર રસ્તા .... Mo. ૯૬૩૮૧ ૮૧૮૭૫
        </div>
        <div style={{ marginTop: "3px", fontSize: "10px" }}>
          દ્વારા રીજેક્સન દહીની તારીક પર આધાર રાખે છે. &nbsp;&nbsp; Not Valid For Medico - Legal Purpose
        </div>
      </div>
    </div>
  );
}

export function printPatientPrescription(patient: Patient) {
  const el = document.getElementById("print-prescription");
  if (!el) return;
  el.style.display = "block";
  window.print();
  el.style.display = "none";
}
