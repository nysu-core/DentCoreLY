import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { Appointment } from "../../types";
import { AppointmentModal } from "../../components/AppointmentModal";
import { StatusBadge } from "../../components/StatusBadge";

function weekStart(d: Date) {
  const dt = new Date(d);
  dt.setDate(dt.getDate() - dt.getDay());
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function addDays(d: Date, n: number) {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + n);
  return dt;
}

function fmt(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED:  "bg-blue-100 border-blue-300 text-blue-800",
  CONFIRMED:  "bg-indigo-100 border-indigo-300 text-indigo-800",
  CHECKED_IN: "bg-amber-100 border-amber-300 text-amber-800",
  COMPLETED:  "bg-green-100 border-green-300 text-green-800",
  CANCELLED:  "bg-red-50 border-red-200 text-red-500 line-through opacity-60",
  NO_SHOW:    "bg-slate-100 border-slate-200 text-slate-400 opacity-60",
};

export function CalendarPage() {
  const qc = useQueryClient();
  const [week, setWeek] = useState(() => weekStart(new Date()));
  const [showModal, setShowModal] = useState(false);
  const [rescheduleAppt, setRescheduleAppt] = useState<Appointment | null>(null);
  const [clickedDate, setClickedDate] = useState<string | undefined>(undefined);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);

  const weekEnd = addDays(week, 7);

  const { data: appointments = [] } = useQuery({
    queryKey: ["appointments", isoDate(week)],
    queryFn: async () => {
      const { data } = await api.get<Appointment[]>("/appointments", {
        params: { startTime: week.toISOString(), endTime: weekEnd.toISOString() },
      });
      return data;
    },
  });

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["appointments"] });
    setShowModal(false);
    setRescheduleAppt(null);
    setSelectedAppt(null);
  }, [qc]);

  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));

  function apptsByDay(day: Date) {
    const key = isoDate(day);
    return appointments.filter((a) => a.startTime.startsWith(key));
  }

  async function changeStatus(id: string, action: string) {
    await api.post(`/appointments/${id}/${action}`);
    refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Appointment Calendar</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => setWeek((w) => addDays(w, -7))} className="px-3 py-1.5 border border-slate-200 rounded-md text-sm hover:bg-slate-50">← Prev</button>
          <span className="text-sm font-medium">{fmt(week)} – {fmt(addDays(week, 6))}</span>
          <button onClick={() => setWeek((w) => addDays(w, 7))} className="px-3 py-1.5 border border-slate-200 rounded-md text-sm hover:bg-slate-50">Next →</button>
          <button onClick={() => { setClickedDate(isoDate(new Date())); setShowModal(true); }} className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-1.5 rounded-md">
            + Book
          </button>
        </div>
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const dayAppts = apptsByDay(day);
          const isToday = isoDate(day) === isoDate(new Date());
          return (
            <div key={isoDate(day)} className="min-h-48">
              <div
                className={`text-xs font-semibold text-center py-1 rounded-t-md mb-1 ${isToday ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-600"}`}
              >
                {fmt(day)}
              </div>
              <div className="space-y-1">
                {dayAppts.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedAppt(a)}
                    className={`w-full text-left border rounded px-1.5 py-1 text-xs leading-tight ${STATUS_COLORS[a.status] ?? ""}`}
                  >
                    <div className="font-medium truncate">{a.patient.fullName}</div>
                    <div className="text-xs opacity-80">{fmtTime(a.startTime)}–{fmtTime(a.endTime)}</div>
                    <div className="text-xs opacity-70 truncate">{a.provider.fullName}</div>
                  </button>
                ))}
                <button
                  onClick={() => { setClickedDate(isoDate(day)); setShowModal(true); }}
                  className="w-full text-center text-xs text-slate-300 hover:text-brand-500 py-1 border border-dashed border-slate-200 hover:border-brand-300 rounded"
                >
                  + Add
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Appointment detail drawer */}
      {selectedAppt && (
        <div className="fixed inset-y-0 right-0 w-80 bg-white border-l border-slate-200 shadow-xl z-40 overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="font-semibold text-sm">Appointment</h2>
            <button onClick={() => setSelectedAppt(null)} className="text-slate-400 hover:text-slate-700">✕</button>
          </div>
          <div className="p-4 space-y-3 text-sm">
            <div>
              <p className="font-semibold text-base">{selectedAppt.patient.fullName}</p>
              <p className="text-slate-500 text-xs">#{selectedAppt.patient.fileNumber}</p>
            </div>
            <StatusBadge status={selectedAppt.status} />
            <dl className="space-y-1.5 text-sm">
              <div><dt className="text-xs text-slate-400">Department</dt><dd>{selectedAppt.department.name}</dd></div>
              <div><dt className="text-xs text-slate-400">Provider</dt><dd>{selectedAppt.provider.fullName}</dd></div>
              <div><dt className="text-xs text-slate-400">Start</dt><dd>{new Date(selectedAppt.startTime).toLocaleString()}</dd></div>
              <div><dt className="text-xs text-slate-400">End</dt><dd>{new Date(selectedAppt.endTime).toLocaleString()}</dd></div>
              {selectedAppt.reason && <div><dt className="text-xs text-slate-400">Reason</dt><dd>{selectedAppt.reason}</dd></div>}
              {selectedAppt.notes && <div><dt className="text-xs text-slate-400">Notes</dt><dd>{selectedAppt.notes}</dd></div>}
            </dl>

            <div className="border-t pt-3 space-y-2">
              {selectedAppt.status === "SCHEDULED" && (
                <button onClick={() => changeStatus(selectedAppt.id, "confirm")} className="w-full py-1.5 text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 rounded">Confirm</button>
              )}
              {["SCHEDULED","CONFIRMED"].includes(selectedAppt.status) && (
                <button onClick={() => changeStatus(selectedAppt.id, "check-in")} className="w-full py-1.5 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded">Check In</button>
              )}
              {selectedAppt.status === "CHECKED_IN" && (
                <button onClick={() => changeStatus(selectedAppt.id, "complete")} className="w-full py-1.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded">Mark Complete</button>
              )}
              {["SCHEDULED","CONFIRMED"].includes(selectedAppt.status) && (
                <>
                  <button onClick={() => { setRescheduleAppt(selectedAppt); setSelectedAppt(null); }} className="w-full py-1.5 text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200 rounded">Reschedule</button>
                  <button onClick={() => changeStatus(selectedAppt.id, "no-show")} className="w-full py-1.5 text-xs font-medium bg-slate-50 text-slate-500 border border-slate-200 rounded">Mark No-Show</button>
                  <button onClick={() => changeStatus(selectedAppt.id, "cancel")} className="w-full py-1.5 text-xs font-medium bg-red-50 text-red-600 border border-red-200 rounded">Cancel</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {(showModal || rescheduleAppt) && (
        <AppointmentModal
          existing={rescheduleAppt ?? undefined}
          defaultDate={clickedDate}
          onClose={() => { setShowModal(false); setRescheduleAppt(null); }}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
