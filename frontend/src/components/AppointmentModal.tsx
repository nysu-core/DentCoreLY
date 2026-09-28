import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { api } from "../api/client";
import { Department, Patient, UserSummary, Appointment } from "../types";

interface FormValues {
  patientId: string;
  departmentId: string;
  providerId: string;
  startTime: string;
  endTime: string;
  reason: string;
  notes: string;
}

interface Props {
  existing?: Appointment;         // if set, we're rescheduling
  patient?: Patient;
  defaultDate?: string;           // YYYY-MM-DD pre-fill
  onClose: () => void;
  onSaved: () => void;
}

export function AppointmentModal({ existing, patient, defaultDate, onClose, onSaved }: Props) {
  const isReschedule = !!existing;
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: {
      patientId: existing?.patientId ?? patient?.id ?? "",
      departmentId: existing?.departmentId ?? patient?.enrollments[0]?.departmentId ?? "",
      providerId: existing?.providerId ?? "",
      startTime: existing?.startTime ? toLocalInput(existing.startTime) : defaultDate ? `${defaultDate}T09:00` : "",
      endTime: existing?.endTime ? toLocalInput(existing.endTime) : defaultDate ? `${defaultDate}T09:30` : "",
      reason: existing?.reason ?? "",
      notes: existing?.notes ?? "",
    },
  });

  const [departments, setDepartments] = useState<Department[]>([]);
  const [providers, setProviders] = useState<UserSummary[]>([]);
  const [patientSearch, setPatientSearch] = useState(existing?.patient.fullName ?? patient?.fullName ?? "");
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(patient ?? null);
  const [serverError, setServerError] = useState<string | null>(null);

  const deptId = watch("departmentId");

  useEffect(() => {
    api.get<Department[]>("/departments").then((r) => setDepartments(r.data));
  }, []);

  useEffect(() => {
    if (!deptId) { setProviders([]); return; }
    api.get<{ items: UserSummary[] }>("/users", { params: { departmentId: deptId, pageSize: 100 } })
      .then((r) => setProviders(r.data.items.filter((u) => u.role.name === "Orthodontist")));
  }, [deptId]);

  useEffect(() => {
    if (patientSearch.length < 2) { setPatientResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await api.get<{ items: Patient[] }>("/patients", { params: { search: patientSearch, pageSize: 8 } });
      setPatientResults(data.items);
    }, 300);
    return () => clearTimeout(t);
  }, [patientSearch]);

  function selectPatient(p: Patient) {
    setSelectedPatient(p);
    setPatientSearch(p.fullName);
    setPatientResults([]);
    setValue("patientId", p.id);
    if (p.enrollments[0]) setValue("departmentId", p.enrollments[0].departmentId);
  }

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      if (isReschedule) {
        await api.patch(`/appointments/${existing!.id}/reschedule`, {
          startTime: new Date(values.startTime).toISOString(),
          endTime: new Date(values.endTime).toISOString(),
          providerId: values.providerId,
          notes: values.notes,
        });
      } else {
        await api.post("/appointments", {
          ...values,
          startTime: new Date(values.startTime).toISOString(),
          endTime: new Date(values.endTime).toISOString(),
          reminderHoursBefore: [24, 2],
        });
      }
      onSaved();
    } catch (e: any) {
      setServerError(e?.response?.data?.error ?? "Failed to save appointment");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="font-semibold">{isReschedule ? "Reschedule Appointment" : "New Appointment"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
          {serverError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{serverError}</div>
          )}

          {/* Patient search */}
          {!isReschedule && !patient && (
            <div className="relative">
              <label className="block text-sm font-medium text-slate-700 mb-1">Patient *</label>
              <input
                type="text"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                placeholder="Search by name or file number…"
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
              />
              <input type="hidden" {...register("patientId", { required: "Patient is required" })} />
              {errors.patientId && <p className="text-xs text-red-600 mt-1">{errors.patientId.message}</p>}
              {patientResults.length > 0 && (
                <ul className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-md z-10 mt-0.5 max-h-40 overflow-y-auto">
                  {patientResults.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => selectPatient(p)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-brand-50"
                      >
                        <span className="font-medium">{p.fullName}</span>
                        <span className="text-slate-400 ml-2 text-xs">#{p.fileNumber}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {selectedPatient && (
                <p className="text-xs text-green-700 mt-1">
                  ✓ {selectedPatient.fullName} — {selectedPatient.enrollments[0]?.department.name}
                </p>
              )}
            </div>
          )}

          {isReschedule && (
            <div className="bg-slate-50 rounded-lg p-3 text-sm">
              <span className="font-medium">{existing!.patient.fullName}</span>
              <span className="text-slate-400 ml-2">#{existing!.patient.fileNumber}</span>
            </div>
          )}

          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Department *</label>
            <select
              {...register("departmentId", { required: true })}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Select department…</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Provider */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Provider (Orthodontist) *</label>
            <select
              {...register("providerId", { required: "Provider is required" })}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Select provider…</option>
              {providers.map((u) => (
                <option key={u.id} value={u.id}>{u.fullName}</option>
              ))}
            </select>
            {errors.providerId && <p className="text-xs text-red-600 mt-1">{errors.providerId.message}</p>}
          </div>

          {/* Time */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Time *</label>
              <input
                type="datetime-local"
                {...register("startTime", { required: true })}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Time *</label>
              <input
                type="datetime-local"
                {...register("endTime", { required: true })}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
            <input
              {...register("reason")}
              placeholder="e.g. Initial consultation"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              {...register("notes")}
              rows={2}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            />
          </div>

          {!isReschedule && (
            <p className="text-xs text-slate-400">
              Reminders will be sent automatically 24 hours and 2 hours before the appointment.
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-medium py-2 rounded-md text-sm disabled:opacity-60"
            >
              {isSubmitting ? "Saving…" : isReschedule ? "Reschedule" : "Book Appointment"}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-md hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
