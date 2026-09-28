import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";

interface AuditEntry {
  id: string;
  action: string;
  entityType: string | null;
  entityId:   string | null;
  ipAddress:  string | null;
  metadata:   any;
  createdAt:  string;
  user: { id: string; fullName: string; email: string } | null;
}

interface AuditPage {
  items: AuditEntry[];
  total: number;
  page:  number;
  pageSize: number;
}

const ACTION_COLORS: Record<string, string> = {
  LOGIN:               "bg-blue-100 text-blue-700",
  LOGOUT:              "bg-slate-100 text-slate-600",
  PATIENT_CREATE:      "bg-green-100 text-green-700",
  PATIENT_UPDATE:      "bg-yellow-100 text-yellow-700",
  PATIENT_ARCHIVE:     "bg-red-100 text-red-600",
  PATIENT_RESTORE:     "bg-green-100 text-green-700",
  APPOINTMENT_CREATE:  "bg-indigo-100 text-indigo-700",
  APPOINTMENT_CANCEL:  "bg-red-100 text-red-600",
  FILE_UPLOAD:         "bg-purple-100 text-purple-700",
  FILE_DELETE:         "bg-red-100 text-red-600",
  RESEARCH_APPROVE:    "bg-green-100 text-green-700",
  RESEARCH_DENY:       "bg-red-100 text-red-600",
  RESEARCH_EXPORT:     "bg-orange-100 text-orange-700",
  USER_CREATE:         "bg-teal-100 text-teal-700",
  USER_DISABLE:        "bg-red-100 text-red-600",
  PASSWORD_CHANGE:     "bg-amber-100 text-amber-700",
};

export function AuditLogPage() {
  const [page, setPage]             = useState(1);
  const [actionFilter, setAction]   = useState("");
  const [entityFilter, setEntity]   = useState("");
  const [dateFrom, setDateFrom]     = useState("");
  const [dateTo, setDateTo]         = useState("");
  const [search, setSearch]         = useState("");
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [actions, setActions]       = useState<string[]>([]);
  const [entityTypes, setEntityTypes] = useState<string[]>([]);

  useEffect(() => {
    api.get<{ actions: string[]; entityTypes: string[] }>("/audit/meta").then((r) => {
      setActions(r.data.actions);
      setEntityTypes(r.data.entityTypes);
    });
  }, []);

  const params = {
    page,
    pageSize: 50,
    ...(actionFilter ? { action: actionFilter } : {}),
    ...(entityFilter ? { entityType: entityFilter } : {}),
    ...(dateFrom     ? { dateFrom }               : {}),
    ...(dateTo       ? { dateTo }                 : {}),
    ...(search       ? { search }                 : {}),
  };

  const { data, isLoading } = useQuery({
    queryKey: ["audit", params],
    queryFn: async () => (await api.get<AuditPage>("/audit", { params })).data,
    placeholderData: (prev) => prev,
  });

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1;

  function resetFilters() {
    setAction(""); setEntity(""); setDateFrom(""); setDateTo(""); setSearch(""); setPage(1);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Audit Log</h1>
        <p className="text-sm text-slate-500 mt-1">
          Complete record of all state-changing actions in the system.
          {data && ` ${data.total.toLocaleString()} total entries.`}
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Search Action</label>
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="e.g. PATIENT"
              className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Action Type</label>
            <select value={actionFilter} onChange={(e) => { setAction(e.target.value); setPage(1); }}
              className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm">
              <option value="">All actions</option>
              {actions.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Entity Type</label>
            <select value={entityFilter} onChange={(e) => { setEntity(e.target.value); setPage(1); }}
              className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm">
              <option value="">All entities</option>
              {entityTypes.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Date From</label>
            <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Date To</label>
            <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm"/>
          </div>
        </div>
        <button onClick={resetFilters}
          className="mt-3 text-xs text-slate-500 hover:text-brand-600 hover:underline">
          Reset all filters
        </button>
      </div>

      {/* Table */}
      <div role="region" aria-label="Audit log table" tabIndex={0} className="overflow-x-auto rounded-xl border border-slate-200 bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500">
        {isLoading && (
          <div className="text-center py-8 text-slate-400 text-sm">Loading…</div>
        )}
        {!isLoading && (!data || data.items.length === 0) && (
          <div className="text-center py-12 text-slate-400 text-sm">No audit entries match these filters.</div>
        )}

        {data && data.items.length > 0 && (
          <table className="w-full min-w-[850px] text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 w-36">Timestamp</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 w-44">Action</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">User</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Entity</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 w-28">IP Address</th>
                <th className="px-4 py-2.5 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((entry) => (
                <>
                  <tr
                    key={entry.id}
                    className="border-t border-slate-50 hover:bg-slate-50 cursor-pointer"
                    onClick={() => setExpanded((prev) => (prev === entry.id ? null : entry.id))}
                  >
                    <td className="px-4 py-2.5 text-xs text-slate-400 font-mono whitespace-nowrap">
                      {new Date(entry.createdAt).toLocaleString(undefined, {
                        month: "short", day: "numeric",
                        hour: "2-digit", minute: "2-digit", second: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${ACTION_COLORS[entry.action] ?? "bg-slate-100 text-slate-600"}`}>
                        {entry.action}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {entry.user ? (
                        <div>
                          <p className="text-xs font-medium">{entry.user.fullName}</p>
                          <p className="text-xs text-slate-400">{entry.user.email}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">System</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">
                      {entry.entityType && (
                        <span>
                          <span className="font-medium">{entry.entityType}</span>
                          {entry.entityId && (
                            <span className="text-slate-400 ml-1 font-mono">
                              {entry.entityId.slice(0, 8)}…
                            </span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-400 font-mono">
                      {entry.ipAddress ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-slate-300">
                      {entry.metadata ? (expanded === entry.id ? "▲" : "▼") : ""}
                    </td>
                  </tr>

                  {/* Metadata expansion row */}
                  {expanded === entry.id && entry.metadata && (
                    <tr key={`${entry.id}-meta`} className="bg-slate-50 border-t border-slate-100">
                      <td colSpan={6} className="px-6 pb-3 pt-1">
                        <pre className="text-xs text-slate-600 bg-white border border-slate-200 rounded p-2 overflow-x-auto max-h-40">
                          {JSON.stringify(entry.metadata, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {data && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-slate-500 text-xs">
            Showing {((page - 1) * data.pageSize) + 1}–{Math.min(page * data.pageSize, data.total)} of {data.total.toLocaleString()} entries
          </p>
          <div className="flex gap-1">
            <button onClick={() => setPage(1)} disabled={page === 1}
              className="px-2 py-1 border border-slate-200 rounded text-xs disabled:opacity-40 hover:bg-slate-50">
              «
            </button>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1 border border-slate-200 rounded text-xs disabled:opacity-40 hover:bg-slate-50">
              Prev
            </button>
            <span className="px-3 py-1 bg-brand-50 border border-brand-200 rounded text-xs font-medium text-brand-700">
              {page} / {totalPages}
            </span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1 border border-slate-200 rounded text-xs disabled:opacity-40 hover:bg-slate-50">
              Next
            </button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
              className="px-2 py-1 border border-slate-200 rounded text-xs disabled:opacity-40 hover:bg-slate-50">
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
