import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { EXPORTABLE_FIELDS } from "./researchFields";

const FIELD_LABELS: Record<string, string> = {
  age_group:"Age Group", gender:"Gender", department:"Department",
  conditions:"Medical Conditions", allergies:"Allergies", habits:"Habits",
  facial_profile:"Facial Profile", facial_form:"Facial Form", symmetry:"Symmetry",
  tmj_status:"TMJ Status", oral_hygiene:"Oral Hygiene",
  upper_arch_form:"Upper Arch Form", lower_arch_form:"Lower Arch Form",
  upper_crowding_or_spacing:"Upper Crowding/Spacing", lower_crowding_or_spacing:"Lower Crowding/Spacing",
  molar_relationship:"Molar Relationship", canine_relationship:"Canine Relationship",
  overjet_mm:"Overjet (mm)", overjet_classification:"Overjet Classification",
  overbite_percent:"Overbite (%)", overbite_classification:"Overbite Classification",
  crossbite:"Crossbite", midline_deviation:"Midline Deviation",
  skeletal_classification:"Skeletal Classification", dental_findings:"Dental Findings",
  fixed_appliances:"Fixed Appliances", removable_appliances:"Removable Appliances",
  clear_aligners:"Clear Aligners", orthopedic_appliances:"Orthopedic Appliances",
  surgical_treatment:"Surgical Treatment", interceptive_treatment:"Interceptive Treatment",
};

type RequestStatus = "PENDING"|"APPROVED"|"DENIED";

interface ResearchRequest {
  id:string; title:string; description:string; status:RequestStatus;
  createdAt:string; reviewNotes?:string|null; _count:{ datasets:number };
}

const STATUS_STYLE: Record<RequestStatus, string> = {
  PENDING:  "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  DENIED:   "bg-red-100 text-red-600",
};

export function ResearchPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === "Administrator";

  const [tab, setTab] = useState<"requests"|"new">("requests");
  const [selectedId, setSelectedId] = useState<string|null>(null);
  const [preview, setPreview] = useState<any|null>(null);
  const [stats, setStats]     = useState<any|null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<string[]>(["age_group","gender","skeletal_classification"]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string|null>(null);

  const endpoint = isAdmin ? "/research" : "/research/mine";
  const { data: requests = [] } = useQuery({
    queryKey: ["research-requests", isAdmin],
    queryFn: async () => (await api.get<ResearchRequest[]>(endpoint)).data,
  });

  function toggleField(f: string) {
    setFields(prev => prev.includes(f) ? prev.filter(x=>x!==f) : [...prev, f]);
  }

  async function submit() {
    if (!title.trim() || !description.trim() || fields.length===0) {
      setSubmitError("Title, description, and at least one field are required."); return;
    }
    setSubmitting(true); setSubmitError(null);
    try {
      await api.post("/research", { title, description,
        criteria: { fields, ...(dateFrom ? {dateFrom} : {}), ...(dateTo ? {dateTo} : {}) }
      });
      setTab("requests");
      qc.invalidateQueries({ queryKey: ["research-requests"] });
      setTitle(""); setDescription(""); setFields(["age_group","gender","skeletal_classification"]);
    } catch(e:any) { setSubmitError(e?.response?.data?.error ?? "Submit failed"); }
    finally { setSubmitting(false); }
  }

  async function loadPreview(id: string) {
    setPreviewLoading(true); setPreview(null); setStats(null); setSelectedId(id);
    try {
      const [p, s] = await Promise.all([
        api.get(`/research/${id}/preview`).then(r => r.data),
        api.get(`/research/${id}/stats`).then(r => r.data).catch(()=>null),
      ]);
      setPreview(p); setStats(s);
    } finally { setPreviewLoading(false); }
  }

  function exportCsv(id: string) {
    window.open(`/api/research/${id}/export`, "_blank", "noopener");
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-bold">Research Portal</h1>
        <p className="text-sm text-slate-500 mt-1">
          {isAdmin ? "Review and manage research data requests." : "Submit requests to access anonymized clinical datasets for research purposes."}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {[["requests","My Requests"],["new","Submit New Request"]].map(([key, label]) => (
          !isAdmin || key !== "new" ? (
            <button key={key} onClick={()=>setTab(key as any)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab===key ? "border-brand-500 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
              {label}
            </button>
          ) : null
        ))}
        {!isAdmin && (
          <button onClick={()=>setTab("new")}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab==="new" ? "border-brand-500 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            Submit New Request
          </button>
        )}
      </div>

      {/* Requests list */}
      {tab === "requests" && (
        <div className="space-y-4">
          {requests.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-sm">No research requests yet.</div>
          )}
          {requests.map((req) => (
            <div key={req.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{req.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{new Date(req.createdAt).toLocaleDateString()}</p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLE[req.status]}`}>
                  {req.status}
                </span>
              </div>
              {req.reviewNotes && (
                <p className="text-sm text-slate-600 bg-slate-50 rounded p-2 italic">"{req.reviewNotes}"</p>
              )}
              {req.status === "APPROVED" && (
                <div className="flex gap-2 flex-wrap">
                  <button onClick={()=>loadPreview(req.id)}
                    className="px-3 py-1.5 bg-brand-50 text-brand-700 border border-brand-200 text-xs font-medium rounded hover:bg-brand-100">
                    👁 Preview Data
                  </button>
                  <button onClick={()=>exportCsv(req.id)}
                    className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 text-xs font-medium rounded hover:bg-green-100">
                    ↓ Export CSV
                  </button>
                  <span className="text-xs text-slate-400 self-center">{req._count.datasets} export{req._count.datasets!==1?"s":""}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New request form */}
      {tab === "new" && !isAdmin && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold">New Research Data Request</h2>
          {submitError && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{submitError}</div>}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Research Title *</label>
            <input value={title} onChange={e=>setTitle(e.target.value)}
              placeholder="e.g. Prevalence of Class II malocclusion in Libyan adults"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Research Description & Justification *</label>
            <textarea value={description} onChange={e=>setDescription(e.target.value)} rows={3}
              placeholder="Describe your research objectives and why this data is needed…"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"/>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Patient Entry Date From</label>
              <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Patient Entry Date To</label>
              <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"/>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">Data Fields Requested * ({fields.length} selected)</label>
            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-1.5 max-h-64 overflow-y-auto border border-slate-200 rounded-lg p-3 md:grid-cols-3">
              {EXPORTABLE_FIELDS.map((f) => (
                <label key={f} className="inline-flex items-center gap-2 text-xs cursor-pointer hover:text-brand-700">
                  <input type="checkbox" checked={fields.includes(f)} onChange={()=>toggleField(f)} className="rounded border-slate-300"/>
                  {FIELD_LABELS[f] ?? f}
                </label>
              ))}
            </div>
          </div>
          <button onClick={submit} disabled={submitting}
            className="bg-brand-500 hover:bg-brand-600 text-white font-medium px-4 py-2 rounded-md text-sm disabled:opacity-60">
            {submitting ? "Submitting…" : "Submit Request"}
          </button>
        </div>
      )}

      {/* Preview panel */}
      {selectedId && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold">Dataset Preview</h2>
          {previewLoading && <p className="text-sm text-slate-400">Loading…</p>}

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 md:grid-cols-3">
              <div className="bg-brand-50 border border-brand-100 rounded-lg p-3">
                <p className="text-xs text-slate-500">Total Rows</p>
                <p className="text-2xl font-bold text-brand-700">{stats.totalRows}</p>
              </div>
              {[
                ["Skeletal", stats.skeletalClassification],
                ["Molar Rel.", stats.molarRelationship],
                ["Age Groups", stats.ageGroup],
                ["Gender", stats.gender],
                ["Overbite", stats.overbiteClassification],
              ].map(([label, data]) => data?.length > 0 && (
                <div key={String(label)} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">{String(label)}</p>
                  {(data as any[]).slice(0,3).map((d:any) => (
                    <div key={d.value} className="flex justify-between text-xs">
                      <span className="truncate text-slate-600">{d.value||"—"}</span>
                      <span className="font-medium ml-2">{d.count}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Table preview */}
          {preview && (
            <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-72">
              <table className="w-full min-w-max text-xs">
                <thead className="bg-slate-100 sticky top-0">
                  <tr>{preview.columns.map((c:string)=>(
                    <th key={c} className="px-2 py-1.5 text-left font-medium text-slate-600 whitespace-nowrap">{FIELD_LABELS[c]??c}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {preview.rows.map((row:any, i:number)=>(
                    <tr key={i} className="hover:bg-slate-50">
                      {preview.columns.map((c:string)=>(
                        <td key={c} className="px-2 py-1.5 text-slate-700 whitespace-nowrap max-w-32 truncate">{row[c]||"—"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {preview && <p className="text-xs text-slate-400">Showing first 50 of {preview.totalRows} rows. Export CSV for the full dataset.</p>}
        </div>
      )}
    </div>
  );
}
