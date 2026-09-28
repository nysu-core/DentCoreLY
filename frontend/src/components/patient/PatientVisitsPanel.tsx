import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { Appointment, Patient, PatientVisit } from "../../types";
import { useAuth } from "../../context/AuthContext";
import {
  decryptVisitDraft,
  deleteEncryptedVisitDraft,
  listEncryptedVisitDrafts,
  saveEncryptedVisitDraft,
} from "../../offline/encryptedVisitDrafts";
import { AppointmentModal } from "../AppointmentModal";
import { StatusBadge } from "../StatusBadge";

function localDateTime(value: Date) {
  return new Date(value.getTime() - value.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function PatientVisitsPanel({ patient }: { patient: Patient }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [visitDate, setVisitDate] = useState(() => localDateTime(new Date()));
  const [treatmentPlan, setTreatmentPlan] = useState("");
  const [notes, setNotes] = useState("");
  const [appointmentId, setAppointmentId] = useState("");
  const [offlinePassphrase, setOfflinePassphrase] = useState("");
  const [drafts, setDrafts] = useState<Array<{ id: string; savedAt: string }>>([]);
  const [online, setOnline] = useState(navigator.onLine);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: visits = [], isLoading: visitsLoading } = useQuery({
    queryKey: ["patient-visits", patient.id],
    queryFn: async () => (await api.get<PatientVisit[]>(`/patients/${patient.id}/visits`)).data,
  });

  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ["patient-appointments", patient.id],
    queryFn: async () => (await api.get<Appointment[]>("/appointments", { params: { patientId: patient.id } })).data,
  });

  async function refreshDrafts() {
    if (!user) return;
    try {
      setDrafts(await listEncryptedVisitDrafts(user.id, patient.id));
    } catch {
      setError("This browser could not open its encrypted offline draft store.");
    }
  }

  useEffect(() => {
    void refreshDrafts();
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, [patient.id, user?.id]);

  async function saveVisit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    const payload = {
      visitDate: new Date(visitDate).toISOString(),
      ...(appointmentId ? { appointmentId } : {}),
      treatmentPlan: treatmentPlan.trim(),
      notes: notes.trim(),
    };

    try {
      await api.post(`/patients/${patient.id}/visits`, payload);
      await queryClient.invalidateQueries({ queryKey: ["patient-visits", patient.id] });
      setMessage("Visit note saved.");
      clearForm();
    } catch (requestError) {
      const hasServerResponse = !!(requestError as { response?: unknown })?.response;
      if (hasServerResponse) {
        setError("The visit could not be saved. Check your access and try again.");
      } else if (offlinePassphrase.length >= 12 && user) {
        try {
          await saveEncryptedVisitDraft(user.id, patient.id, payload, offlinePassphrase);
          await refreshDrafts();
          setMessage("Connection unavailable. The visit is encrypted and saved on this device only.");
          clearForm();
        } catch (draftError) {
          setError(draftError instanceof Error ? draftError.message : "Could not encrypt the offline draft.");
        }
      } else {
        setError("Could not reach the server. Enter an offline passphrase of at least 12 characters to save an encrypted draft on this device.");
      }
    } finally {
      setSaving(false);
    }
  }

  function clearForm() {
    setVisitDate(localDateTime(new Date()));
    setTreatmentPlan("");
    setNotes("");
    setAppointmentId("");
  }

  async function syncDrafts() {
    if (!user || !online || drafts.length === 0) return;
    setSyncing(true);
    setMessage(null);
    setError(null);
    try {
      for (const draft of drafts) {
        const payload = await decryptVisitDraft(user.id, patient.id, draft.id, offlinePassphrase);
        await api.post(`/patients/${patient.id}/visits`, { ...payload, clientDraftId: draft.id });
        await deleteEncryptedVisitDraft(draft.id);
      }
      await refreshDrafts();
      await queryClient.invalidateQueries({ queryKey: ["patient-visits", patient.id] });
      setMessage("Encrypted drafts synced and removed from this device.");
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Draft sync stopped. Check your passphrase and connection, then retry.");
      await refreshDrafts();
    } finally {
      setSyncing(false);
    }
  }

  async function appointmentAction(appointment: Appointment, action: string) {
    setError(null);
    try {
      await api.post(`/appointments/${appointment.id}/${action}`);
      await queryClient.invalidateQueries({ queryKey: ["patient-appointments", patient.id] });
      await queryClient.invalidateQueries({ queryKey: ["appointments"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    } catch {
      setError("Could not update the appointment. Check your access and try again.");
    }
  }

  return (
    <section className="mt-6 border-y border-slate-200 py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Visits & Follow-ups</h2>
          <p className="mt-1 text-sm text-slate-500">Visit notes are separate from the patient’s standing treatment plan.</p>
        </div>
        <button type="button" onClick={() => setShowAppointmentModal(true)} className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">
          Schedule next visit
        </button>
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Appointment timeline</h3>
          {appointmentsLoading ? <p className="text-sm text-slate-500">Loading appointments…</p> : appointments.length === 0 ? (
            <p className="border-l-2 border-slate-200 py-2 pl-3 text-sm text-slate-500">No visits scheduled.</p>
          ) : (
            <ul className="divide-y divide-slate-200 border-y border-slate-200">
              {appointments.map((appointment) => (
                <li key={appointment.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">{formatDate(appointment.startTime)}</p>
                    <p className="text-xs text-slate-500">{appointment.reason || "Visit"} · {appointment.provider.fullName}</p>
                    <div className="mt-1"><StatusBadge status={appointment.status} /></div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {appointment.status === "SCHEDULED" && <button type="button" onClick={() => void appointmentAction(appointment, "confirm")} className="text-xs font-medium text-indigo-700 hover:underline">Confirm</button>}
                    {["SCHEDULED", "CONFIRMED", "CHECKED_IN"].includes(appointment.status) && <button type="button" onClick={() => void appointmentAction(appointment, "complete")} className="text-xs font-medium text-green-700 hover:underline">Mark attended</button>}
                    {["SCHEDULED", "CONFIRMED"].includes(appointment.status) && <button type="button" onClick={() => void appointmentAction(appointment, "no-show")} className="text-xs font-medium text-slate-600 hover:underline">No-show</button>}
                    {appointment.status === "NO_SHOW" && <button type="button" onClick={() => setShowAppointmentModal(true)} className="text-xs font-medium text-brand-700 hover:underline">Choose another date</button>}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-slate-500">New appointments queue reminders for 24 hours and 2 hours before the visit.</p>

          <h3 className="mb-2 mt-6 text-sm font-semibold text-slate-700">Visit notes</h3>
          {visitsLoading ? <p className="text-sm text-slate-500">Loading visit notes…</p> : visits.length === 0 ? (
            <p className="border-l-2 border-slate-200 py-2 pl-3 text-sm text-slate-500">No visit notes recorded.</p>
          ) : (
            <ul className="divide-y divide-slate-200 border-y border-slate-200">
              {visits.map((visit: PatientVisit) => (
                <li key={visit.id} className="py-3">
                  <p className="text-sm font-medium text-slate-800">{formatDate(visit.visitDate)}</p>
                  {visit.appointment && <p className="text-xs text-slate-500">{visit.appointment.status} · {visit.appointment.provider.fullName}</p>}
                  {visit.treatmentPlan && <div className="mt-2"><h4 className="text-xs font-semibold uppercase text-slate-500">Treatment this visit</h4><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{visit.treatmentPlan}</p></div>}
                  {visit.notes && <div className="mt-2"><h4 className="text-xs font-semibold uppercase text-slate-500">Notes</h4><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{visit.notes}</p></div>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-slate-200 pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <h3 className="text-sm font-semibold text-slate-700">Add visit note</h3>
          {message && <p role="status" className="mt-2 rounded bg-green-50 p-2 text-sm text-green-800">{message}</p>}
          {error && <p role="alert" className="mt-2 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
          {!online && <p className="mt-2 rounded bg-amber-50 p-2 text-xs text-amber-900">Offline: saves are encrypted on this device until synced.</p>}
          <form onSubmit={saveVisit} className="mt-3 space-y-3">
            <label className="block text-xs font-medium text-slate-600">Visit date and time
              <input required type="datetime-local" value={visitDate} onChange={(event) => setVisitDate(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" />
            </label>
            <label className="block text-xs font-medium text-slate-600">Link appointment (optional)
              <select value={appointmentId} onChange={(event) => setAppointmentId(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal">
                <option value="">No appointment link</option>
                {appointments.map((appointment) => <option key={appointment.id} value={appointment.id}>{formatDate(appointment.startTime)} · {appointment.status}</option>)}
              </select>
            </label>
            <label className="block text-xs font-medium text-slate-600">Treatment plan for this visit
              <textarea rows={3} value={treatmentPlan} onChange={(event) => setTreatmentPlan(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" />
            </label>
            <label className="block text-xs font-medium text-slate-600">Visit notes
              <textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" />
            </label>
            <label className="block text-xs font-medium text-slate-600">Offline passphrase
              <input type="password" autoComplete="new-password" minLength={12} value={offlinePassphrase} onChange={(event) => setOfflinePassphrase(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" />
              <span className="mt-1 block font-normal text-slate-500">Required only when saving offline or syncing drafts. It is never stored or sent.</span>
            </label>
            <button type="submit" disabled={saving} className="w-full rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
              {saving ? "Saving…" : online ? "Save visit note" : "Save encrypted offline draft"}
            </button>
          </form>

          {drafts.length > 0 && (
            <div className="mt-4 border-t border-slate-200 pt-3">
              <p className="text-sm font-medium text-slate-700">{drafts.length} encrypted draft{drafts.length === 1 ? "" : "s"} on this device</p>
              <button type="button" disabled={!online || syncing || offlinePassphrase.length < 12} onClick={() => void syncDrafts()} className="mt-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                {syncing ? "Syncing…" : "Sync drafts"}
              </button>
            </div>
          )}
        </div>
      </div>

      {showAppointmentModal && (
        <AppointmentModal
          patient={patient}
          defaultDate={new Date().toISOString().slice(0, 10)}
          onClose={() => setShowAppointmentModal(false)}
          onSaved={() => {
            setShowAppointmentModal(false);
            void queryClient.invalidateQueries({ queryKey: ["patient-appointments", patient.id] });
            void queryClient.invalidateQueries({ queryKey: ["appointments"] });
          }}
        />
      )}
    </section>
  );
}