import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { WaitingListEntry, Department } from "../../types";

export function WaitingListPage() {
  const qc = useQueryClient();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentId, setDepartmentId] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [patientId, setPatientId] = useState("");
  const [preferredNotes, setPreferredNotes] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Department[]>("/departments").then((r) => {
      setDepartments(r.data);
    });
  }, []);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["waiting-list", departmentId],
    queryFn: async () => {
      const { data } = await api.get<WaitingListEntry[]>("/waiting-list", {
        params: departmentId ? { departmentId } : {},
      });
      return data;
    },
  });

  async function add() {
    if (!patientId || !departmentId) { setError("Select a patient and department"); return; }
    setSaving(true);
    setError(null);
    try {
      await api.post("/waiting-list", { patientId, departmentId, preferredNotes });
      setPatientSearch(""); setPatientId(""); setPreferredNotes(""); setShowAddForm(false);
      qc.invalidateQueries({ queryKey: ["waiting-list"] });
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Failed to add");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Remove ${name} from the waiting list?`)) return;
    await api.delete(`/waiting-list/${id}`);
    qc.invalidateQueries({ queryKey: ["waiting-list"] });
  }

  const [patientResults, setPatientResults] = useState<any[]>([]);
  useEffect(() => {
    if (patientSearch.length < 2) { setPatientResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await api.get("/patients", { params: { search: patientSearch, pageSize: 8 } });
      setPatientResults(data.items);
    }, 300);
    return () => clearTimeout(t);
  }, [patientSearch]);

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Waiting List</h1>
        <button onClick={() => setShowAddForm((v) => !v)} className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-md">
          {showAddForm ? "Cancel" : "+ Add Patient"}
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 mb-6 space-y-3">
          <h2 className="font-medium text-sm">Add to Waiting List</h2>
          {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</div>}

          {/* Patient search */}
          <div className="relative">
            <label className="block text-xs font-medium text-slate-600 mb-1">Patient</label>
            <input
              type="text"
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              placeholder="Search by name or file number…"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            />
            {patientResults.length > 0 && (
              <ul className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-md z-10 mt-0.5 max-h-40 overflow-y-auto">
                {patientResults.map((p: any) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => { setPatientSearch(p.fullName); setPatientId(p.id); setPatientResults([]); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-brand-50"
                    >
                      {p.fullName} <span className="text-slate-400 text-xs">#{p.fileNumber}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Department</label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Select…</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Preferred Times / Notes</label>
            <input
              value={preferredNotes}
              onChange={(e) => setPreferredNotes(e.target.value)}
              placeholder="e.g. Prefers mornings"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            />
          </div>

          <button
            onClick={add}
            disabled={saving}
            className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-md disabled:opacity-60"
          >
            {saving ? "Adding…" : "Add to Waiting List"}
          </button>
        </div>
      )}

      {/* Filter by dept */}
      <div className="flex gap-2 mb-4">
        <select
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          className="border border-slate-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="">All Departments</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      {isLoading && <div className="text-slate-400 text-sm">Loading…</div>}

      <div role="region" aria-label="Waiting list" tabIndex={0} className="overflow-x-auto rounded-lg border border-slate-200 bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500">
        <table className="w-full min-w-[780px] text-sm">
          <thead className="bg-slate-50 text-slate-600 text-left">
            <tr>
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">Patient</th>
              <th className="px-4 py-2">Department</th>
              <th className="px-4 py-2">Notes</th>
              <th className="px-4 py-2">Waiting Since</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, idx) => (
              <tr key={e.id} className="border-t border-slate-100">
                <td className="px-4 py-2 text-slate-400">{idx + 1}</td>
                <td className="px-4 py-2">
                  <div className="font-medium">{e.patient.fullName}</div>
                  <div className="text-xs text-slate-400">#{e.patient.fileNumber}</div>
                </td>
                <td className="px-4 py-2">{e.department.name}</td>
                <td className="px-4 py-2 text-slate-500">{e.preferredNotes || "—"}</td>
                <td className="px-4 py-2 text-slate-500">{new Date(e.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-2">
                  <button onClick={() => remove(e.id, e.patient.fullName)} className="text-xs text-red-600 hover:underline">Remove</button>
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No patients on the waiting list.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
