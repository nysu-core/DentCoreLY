import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { FIELD_LABELS } from "../research/researchFields";

type Status = "PENDING" | "APPROVED" | "DENIED";

interface ResearchRequest {
  id: string;
  title: string;
  description: string;
  status: Status;
  criteria: {
    departmentId?: string;
    dateFrom?: string;
    dateTo?: string;
    fields: string[];
  };
  createdAt: string;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
  requestedBy: { id: string; fullName: string };
  reviewedBy?: { id: string; fullName: string } | null;
  _count: { datasets: number };
}

const STATUS_STYLE: Record<Status, string> = {
  PENDING:  "bg-amber-100 text-amber-700 border-amber-200",
  APPROVED: "bg-green-100 text-green-700 border-green-200",
  DENIED:   "bg-red-100 text-red-600 border-red-200",
};

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: "",         label: "All"      },
  { value: "PENDING",  label: "Pending"  },
  { value: "APPROVED", label: "Approved" },
  { value: "DENIED",   label: "Denied"   },
];

export function ResearchAdminPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedId, setExpandedId]     = useState<string | null>(null);
  const [reviewNotes, setReviewNotes]   = useState("");
  const [reviewing, setReviewing]       = useState(false);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["research-admin", statusFilter],
    queryFn: async () => {
      const params = statusFilter ? { status: statusFilter } : {};
      return (await api.get<ResearchRequest[]>("/research", { params })).data;
    },
  });

  async function review(id: string, decision: "APPROVED" | "DENIED") {
    setReviewing(true);
    try {
      await api.post(`/research/${id}/review`, { status: decision, reviewNotes: reviewNotes.trim() || undefined });
      setExpandedId(null);
      setReviewNotes("");
      qc.invalidateQueries({ queryKey: ["research-admin"] });
    } finally {
      setReviewing(false);
    }
  }

  const pending  = requests.filter((r) => r.status === "PENDING").length;
  const approved = requests.filter((r) => r.status === "APPROVED").length;
  const denied   = requests.filter((r) => r.status === "DENIED").length;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold">Research Request Management</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review researcher data access requests. Approved requests grant access to fully anonymized datasets only.
        </p>
      </div>

      {/* Summary counts */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Pending Review", count: pending,  color: "amber" },
          { label: "Approved",       count: approved, color: "green" },
          { label: "Denied",         count: denied,   color: "red"   },
        ].map(({ label, count, color }) => (
          <div key={label} className={`border-l-4 rounded-lg p-4 bg-${color}-50 border-${color}-400`}>
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p className="text-3xl font-bold text-slate-800 mt-1">{count}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-0">
        {STATUS_FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setStatusFilter(value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              statusFilter === value
                ? "border-brand-500 text-brand-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {label}
            {value === "PENDING" && pending > 0 && (
              <span className="ml-1.5 bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5">
                {pending}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Request list */}
      {isLoading && <p className="text-slate-400 text-sm">Loading…</p>}

      {!isLoading && requests.length === 0 && (
        <div className="text-center py-12 text-slate-400 text-sm">No requests found.</div>
      )}

      <div className="space-y-3">
        {requests.map((req) => (
          <div
            key={req.id}
            className={`bg-white border rounded-xl overflow-hidden transition-shadow hover:shadow-sm ${
              req.status === "PENDING" ? "border-amber-200" : "border-slate-200"
            }`}
          >
            {/* Header row */}
            <div
              className="flex items-start gap-4 p-4 cursor-pointer"
              onClick={() => setExpandedId((prev) => (prev === req.id ? null : req.id))}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-sm">{req.title}</h3>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLE[req.status]}`}>
                    {req.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  By <span className="font-medium">{req.requestedBy.fullName}</span>
                  {" · "}
                  {new Date(req.createdAt).toLocaleDateString()}
                  {req.reviewedAt && ` · Reviewed ${new Date(req.reviewedAt).toLocaleDateString()}`}
                </p>
              </div>
              <span className="text-slate-400 text-sm">{expandedId === req.id ? "▲" : "▼"}</span>
            </div>

            {/* Expanded detail */}
            {expandedId === req.id && (
              <div className="border-t border-slate-100 p-4 space-y-4">
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Research Description</p>
                  <p className="text-sm text-slate-700">{req.description}</p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500 mb-2">Requested Data Fields</p>
                  <div className="flex flex-wrap gap-1.5">
                    {req.criteria.fields.map((f) => (
                      <span key={f} className="text-xs bg-brand-50 text-brand-700 border border-brand-100 px-2 py-0.5 rounded-full">
                        {FIELD_LABELS[f] ?? f}
                      </span>
                    ))}
                  </div>
                </div>

                {(req.criteria.dateFrom || req.criteria.dateTo) && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Date Range</p>
                    <p className="text-sm text-slate-700">
                      {req.criteria.dateFrom ? new Date(req.criteria.dateFrom).toLocaleDateString() : "Any"}
                      {" — "}
                      {req.criteria.dateTo   ? new Date(req.criteria.dateTo).toLocaleDateString()   : "Present"}
                    </p>
                  </div>
                )}

                {req.reviewNotes && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-slate-500 mb-1">Review Notes</p>
                    <p className="text-sm italic text-slate-600">"{req.reviewNotes}"</p>
                    {req.reviewedBy && (
                      <p className="text-xs text-slate-400 mt-1">— {req.reviewedBy.fullName}</p>
                    )}
                  </div>
                )}

                {req.status === "PENDING" && (
                  <div className="border-t border-slate-100 pt-4 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Review Notes (optional)</label>
                      <textarea
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        rows={2}
                        placeholder="Add context for the researcher (e.g. why denied, or any conditions on use)…"
                        className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => review(req.id, "APPROVED")}
                        disabled={reviewing}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md disabled:opacity-60"
                      >
                        ✓ Approve Access
                      </button>
                      <button
                        onClick={() => review(req.id, "DENIED")}
                        disabled={reviewing}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md disabled:opacity-60"
                      >
                        ✕ Deny Request
                      </button>
                    </div>
                    <p className="text-xs text-slate-400">
                      Approval grants access to anonymized data only — no patient names, file numbers, or contact details are ever exposed.
                    </p>
                  </div>
                )}

                {req.status === "APPROVED" && (
                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-xs text-slate-400">{req._count.datasets} dataset export{req._count.datasets !== 1 ? "s" : ""} so far</span>
                    <button
                      onClick={() => window.open(`/api/research/${req.id}/export`, "_blank", "noopener")}
                      className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 text-xs font-medium rounded hover:bg-green-100"
                    >
                      ↓ Download CSV (Admin)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
