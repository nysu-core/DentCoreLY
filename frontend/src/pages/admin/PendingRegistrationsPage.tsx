import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";

type Status = "PENDING" | "ACTIVE" | "DISABLED";

interface PendingUser {
  id:               string;
  fullName:         string;
  email:            string;
  status:           Status;
  registrationNote: string | null;
  statusNote:       string | null;
  createdAt:        string;
  role:             { id: string; name: string };
  department:       { id: string; name: string } | null;
}

const STATUS_STYLE: Record<Status, string> = {
  PENDING:  "bg-amber-100 text-amber-700",
  ACTIVE:   "bg-green-100 text-green-700",
  DISABLED: "bg-red-100 text-red-600",
};

const TABS: { value: string; label: string }[] = [
  { value: "PENDING",  label: "Pending Review" },
  { value: "ACTIVE",   label: "Approved"        },
  { value: "DISABLED", label: "Denied"           },
];

export function PendingRegistrationsPage() {
  const qc = useQueryClient();
  const [tab, setTab]             = useState<string>("PENDING");
  const [expandedId, setExpanded] = useState<string | null>(null);
  const [note, setNote]           = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setError]   = useState<string | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["registrations", tab],
    queryFn:  async () =>
      (await api.get<PendingUser[]>("/admin/registrations", { params: { status: tab } })).data,
  });

  async function decide(userId: string, decision: "APPROVED" | "DENIED") {
    setReviewing(true);
    setError(null);
    try {
      await api.post(`/admin/registrations/${userId}/review`, {
        decision,
        statusNote: note.trim() || undefined,
      });
      setExpanded(null);
      setNote("");
      qc.invalidateQueries({ queryKey: ["registrations"] });
      qc.invalidateQueries({ queryKey: ["pending-count"] });
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Action failed");
    } finally {
      setReviewing(false);
    }
  }

  const pendingCount = tab === "PENDING" ? users.length : undefined;

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">User Registrations</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review self-registration requests. Approved users receive a Gmail notification immediately.
          Denied users also receive an email with the reason.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {TABS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === value
                ? "border-brand-500 text-brand-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {label}
            {value === "PENDING" && pendingCount !== undefined && pendingCount > 0 && (
              <span className="bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-slate-400 text-sm">Loading…</p>}

      {!isLoading && users.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <div className="text-4xl mb-3">
            {tab === "PENDING" ? "🎉" : tab === "ACTIVE" ? "✅" : "❌"}
          </div>
          <p className="text-sm">
            {tab === "PENDING"
              ? "No pending registrations — all caught up!"
              : tab === "ACTIVE"
              ? "No approved registrations yet."
              : "No denied registrations."}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {users.map((user) => (
          <div
            key={user.id}
            className={`bg-white rounded-xl border overflow-hidden transition-shadow hover:shadow-sm ${
              user.status === "PENDING" ? "border-amber-200" : "border-slate-200"
            }`}
          >
            {/* Collapsed row */}
            <div
              className="flex items-center gap-4 p-4 cursor-pointer"
              onClick={() => setExpanded((p) => (p === user.id ? null : user.id))}
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {user.fullName.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{user.fullName}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[user.status]}`}>
                    {user.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {user.email} · {user.role.name}
                  {user.department && ` · ${user.department.name}`}
                  {" · Applied "}{new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>

              <span className="text-slate-300 text-sm">{expandedId === user.id ? "▲" : "▼"}</span>
            </div>

            {/* Expanded */}
            {expandedId === user.id && (
              <div className="border-t border-slate-100 p-4 space-y-4">
                {reviewError && (
                  <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
                    {reviewError}
                  </div>
                )}

                {/* Registration note */}
                {user.registrationNote ? (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Reason for Access</p>
                    <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 italic">
                      "{user.registrationNote}"
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No reason provided.</p>
                )}

                {/* Previous status note */}
                {user.statusNote && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-slate-500 mb-1">Admin Note</p>
                    <p className="text-sm text-slate-600 italic">"{user.statusNote}"</p>
                  </div>
                )}

                {/* Review panel — only for PENDING */}
                {user.status === "PENDING" && (
                  <div className="border-t border-slate-100 pt-4 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Note to applicant{" "}
                        <span className="text-slate-400 font-normal">
                          (sent in the approval/denial email)
                        </span>
                      </label>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={2}
                        placeholder="e.g. Welcome to Orthodontics Department - Faculty of Dentistry - Benghazi, or: We could not verify your affiliation."
                        className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => decide(user.id, "APPROVED")}
                        disabled={reviewing}
                        className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md disabled:opacity-60"
                      >
                        ✓ Approve & Send Email
                      </button>
                      <button
                        onClick={() => decide(user.id, "DENIED")}
                        disabled={reviewing}
                        className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md disabled:opacity-60"
                      >
                        ✕ Deny & Notify
                      </button>
                    </div>

                    <p className="text-xs text-slate-400">
                      📧 A notification email is automatically sent to{" "}
                      <strong>{user.email}</strong> on either action.
                      {!import.meta.env.VITE_EMAIL_CONFIGURED &&
                        " (In local dev, check the backend console for the email content.)"}
                    </p>
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
