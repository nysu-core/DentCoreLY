import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";
import { openProtectedPdf } from "../../api/openPdf";
import { Paginated, Patient, Department, UserSummary } from "../../types";

export function ReportsPage() {
  const [patientSearch, setPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [providers, setProviders] = useState<UserSummary[]>([]);
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().slice(0, 10));
  const [scheduleProvider, setScheduleProvider] = useState("");
  const [reportError, setReportError] = useState<string | null>(null);

  async function openReport(url: string, filename: string) {
    setReportError(null);
    try {
      await openProtectedPdf(url, filename);
    } catch (err: any) {
      setReportError(err?.response?.data?.error || "Could not open the PDF. Please sign in again and retry.");
    }
  }

  useEffect(() => {
    api.get<Department[]>("/departments").then((r) => setDepartments(r.data));
    api.get<{ items: UserSummary[] }>("/users", { params: { pageSize: 100 } })
      .then((r) => setProviders(r.data.items.filter((u) => u.role.name === "Orthodontist")));
  }, []);

  useEffect(() => {
    if (patientSearch.length < 2) { setPatientResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await api.get<Paginated<Patient>>("/patients", {
        params: { search: patientSearch, pageSize: 8 },
      });
      setPatientResults(data.items);
    }, 300);
    return () => clearTimeout(t);
  }, [patientSearch]);

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-bold">Reports & Documents</h1>
        <p className="text-sm text-slate-500 mt-1">Generate PDF reports that open directly in your browser for printing or saving.</p>
        {reportError && <div role="alert" className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{reportError}</div>}
      </div>

      {/* ── Patient reports ── */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3">
          <h2 className="font-semibold text-sm text-slate-700">Patient Reports</h2>
        </div>
        <div className="p-5 space-y-4">
          {/* Patient search */}
          <div className="relative">
            <label className="block text-xs font-medium text-slate-500 mb-1">Search Patient</label>
            <input
              type="text"
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              placeholder="Type name or file number…"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            />
            {patientResults.length > 0 && (
              <ul className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-10 mt-0.5 max-h-48 overflow-y-auto">
                {patientResults.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => { setSelectedPatient(p); setPatientSearch(p.fullName); setPatientResults([]); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-brand-50"
                    >
                      <span className="font-medium">{p.fullName}</span>
                      <span className="text-slate-400 ml-2 text-xs">#{p.fileNumber}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {selectedPatient && (
            <div className="bg-brand-50 border border-brand-100 rounded-lg p-3 text-sm">
              <p className="font-medium text-brand-800">{selectedPatient.fullName}</p>
              <p className="text-xs text-brand-600">File #{selectedPatient.fileNumber}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ReportCard
              icon="📋"
              title="Patient Summary"
              description="Full clinical record — demographics, medical history, examination, diagnosis, and treatment plan."
              disabled={!selectedPatient}
              onGenerate={() => void openReport(`/reports/patients/${selectedPatient!.id}/summary`, `patient-summary-${selectedPatient!.fileNumber}.pdf`)}
            />
            <ReportCard
              icon="🪪"
              title="Patient ID Card"
              description="Compact printable identification card with file number, demographics, and photo placeholder."
              disabled={!selectedPatient}
              onGenerate={() => void openReport(`/reports/patients/${selectedPatient!.id}/id-card`, `patient-id-card-${selectedPatient!.fileNumber}.pdf`)}
            />
          </div>
        </div>
      </section>

      {/* ── Appointment schedule ── */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3">
          <h2 className="font-semibold text-sm text-slate-700">Appointment Schedule</h2>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Provider (optional)</label>
              <select
                value={scheduleProvider}
                onChange={(e) => setScheduleProvider(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">All providers</option>
                {providers.map((u) => (
                  <option key={u.id} value={u.id}>{u.fullName}</option>
                ))}
              </select>
            </div>
          </div>
          <ReportCard
            icon="📅"
            title="Daily Appointment Schedule"
            description="All confirmed and scheduled appointments for the selected date, sorted by time."
            onGenerate={() => {
              const params = new URLSearchParams({ date: scheduleDate });
              if (scheduleProvider) params.set("providerId", scheduleProvider);
              void openReport(`/reports/appointments/schedule?${params}`, `appointment-schedule-${scheduleDate}.pdf`);
            }}
          />
        </div>
      </section>
    </div>
  );
}

// ── Report card UI component ───────────────────────────────────────────────
function ReportCard({
  icon, title, description, onGenerate, disabled,
}: {
  icon: string;
  title: string;
  description: string;
  onGenerate: () => void;
  disabled?: boolean;
}) {
  return (
    <div className={`border rounded-lg p-4 flex flex-col gap-3 ${disabled ? "border-slate-100 opacity-50" : "border-slate-200 hover:border-brand-300 hover:bg-brand-50/30 transition-colors"}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="font-medium text-sm">{title}</p>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>
      </div>
      <button
        onClick={onGenerate}
        disabled={disabled}
        className="mt-auto self-start px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium rounded-md disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Generate PDF →
      </button>
    </div>
  );
}
