import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { api } from "../api/client";
import { openProtectedPdf } from "../api/openPdf";
import { Patient } from "../types";
import { PatientVisitsPanel } from "../components/patient/PatientVisitsPanel";

interface PatientEditValues {
  fileNumber: string;
  fullName: string;
  birthDate: string;
  gender: "MALE" | "FEMALE";
  nationality: string;
  phoneNumber: string;
  guardianContact: string;
  assignedDoctorName: string;
  supervisorName: string;
}

export function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PatientEditValues>();

  const { data: patient, isLoading, error } = useQuery({
    queryKey: ["patient", id],
    queryFn: async () => {
      const { data } = await api.get<Patient>(`/patients/${id}`);
      return data;
    },
  });

  useEffect(() => {
    if (!patient) return;
    reset({
      fileNumber: patient.fileNumber,
      fullName: patient.fullName,
      birthDate: patient.birthDate.slice(0, 10),
      gender: patient.gender,
      nationality: patient.nationality ?? "",
      phoneNumber: patient.phoneNumber ?? "",
      guardianContact: patient.guardianContact ?? "",
      assignedDoctorName: patient.assignedDoctorName ?? "",
      supervisorName: patient.supervisorName ?? "",
    });
  }, [patient, reset]);

  async function savePatient(values: PatientEditValues) {
    setSaveError(null);
    try {
      await api.patch(`/patients/${id}`, {
        ...values,
        birthDate: new Date(`${values.birthDate}T00:00:00.000Z`).toISOString(),
      });
      await queryClient.invalidateQueries({ queryKey: ["patient", id] });
      setEditing(false);
    } catch (err: any) {
      setSaveError(err?.response?.data?.error || "Failed to update patient.");
    }
  }

  async function openPatientPdf(kind: "summary" | "id-card") {
    setPdfError(null);
    try {
      await openProtectedPdf(
        `/reports/patients/${id}/${kind}`,
        `patient-${kind}-${patient?.fileNumber ?? id}.pdf`
      );
    } catch (err: any) {
      setPdfError(err?.response?.data?.error || "Could not open the PDF. Please sign in again and retry.");
    }
  }

  if (isLoading) return <div className="text-slate-500 text-sm">Loading...</div>;
  if (error || !patient) return <div className="text-red-600 text-sm">Failed to load patient.</div>;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{patient.fullName}</h1>
          <p className="text-sm text-slate-500">File #{patient.fileNumber}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setSaveError(null);
            if (!editing) reset({
              fileNumber: patient.fileNumber,
              fullName: patient.fullName,
              birthDate: patient.birthDate.slice(0, 10),
              gender: patient.gender,
              nationality: patient.nationality ?? "",
              phoneNumber: patient.phoneNumber ?? "",
              guardianContact: patient.guardianContact ?? "",
              assignedDoctorName: patient.assignedDoctorName ?? "",
              supervisorName: patient.supervisorName ?? "",
            });
            setEditing(!editing);
          }}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white"
        >
          {editing ? "Close editor" : "Edit patient"}
        </button>
      </div>

      {editing && (
        <form onSubmit={handleSubmit(savePatient)} className="mb-6 rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-800">Edit Patient Information</h2>
          {saveError && <div role="alert" className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{saveError}</div>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">File Number
              <input {...register("fileNumber", { required: "File number is required" })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-normal" />
              {errors.fileNumber && <span className="mt-1 block text-xs text-red-600">{errors.fileNumber.message}</span>}
            </label>
            <label className="text-sm font-medium text-slate-700">Full Name
              <input {...register("fullName", { required: "Full name is required", minLength: { value: 2, message: "At least 2 characters" } })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-normal" />
              {errors.fullName && <span className="mt-1 block text-xs text-red-600">{errors.fullName.message}</span>}
            </label>
            <label className="text-sm font-medium text-slate-700">Birth Date
              <input type="date" {...register("birthDate", { required: "Birth date is required" })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-normal" />
              {errors.birthDate && <span className="mt-1 block text-xs text-red-600">{errors.birthDate.message}</span>}
            </label>
            <label className="text-sm font-medium text-slate-700">Gender
              <select {...register("gender", { required: true })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-normal">
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">Nationality
              <input {...register("nationality")} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-normal" />
            </label>
            <label className="text-sm font-medium text-slate-700">Patient Phone
              <input type="tel" {...register("phoneNumber")} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-normal" />
            </label>
            <label className="text-sm font-medium text-slate-700">Assigned Doctor
              <input {...register("assignedDoctorName")} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-normal" />
            </label>
            <label className="text-sm font-medium text-slate-700">Supervisor
              <input {...register("supervisorName")} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-normal" />
            </label>
            <label className="text-sm font-medium text-slate-700">Guardian Contact
              <input type="tel" {...register("guardianContact")} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-normal" />
            </label>
          </div>
          <div className="mt-5 flex gap-2">
            <button type="submit" disabled={isSubmitting} className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60">
              {isSubmitting ? "Saving..." : "Save changes"}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h2 className="font-semibold mb-3 text-sm text-slate-700">Demographics</h2>
          <dl className="text-sm space-y-2">
            <div className="flex justify-between"><dt className="text-slate-500">Gender</dt><dd>{patient.gender === "MALE" ? "Male" : "Female"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Birth Date</dt><dd>{new Date(patient.birthDate).toLocaleDateString()}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Nationality</dt><dd>{patient.nationality || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Phone</dt><dd>{patient.phoneNumber || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Assigned Doctor</dt><dd>{patient.assignedDoctorName || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Supervisor</dt><dd>{patient.supervisorName || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Guardian Contact</dt><dd>{patient.guardianContact || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Entry Date</dt><dd>{new Date(patient.entryDate).toLocaleDateString()}</dd></div>
          </dl>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h2 className="font-semibold mb-3 text-sm text-slate-700">Department Enrollments</h2>
          <ul className="text-sm space-y-1">
            {patient.enrollments.map((e) => (
              <li key={e.id} className="px-2 py-1 bg-slate-50 rounded">{e.department.name}</li>
            ))}
          </ul>
        </div>
      </div>

      <PatientVisitsPanel patient={patient} />

      <div className="mt-6 bg-white border border-slate-200 rounded-lg p-4">
        <h2 className="font-semibold mb-3 text-sm text-slate-700">Clinical Modules</h2>
        <div className="flex gap-3 flex-wrap">
          <Link to={`/patients/${patient.id}/medical-history`} className="bg-slate-600 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2 rounded-md">
            Medical History
          </Link>
          <Link to={`/patients/${patient.id}/examination`} className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-md">
            Clinical Examination
          </Link>
          <Link to={`/patients/${patient.id}/diagnosis`} className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-md">
            Diagnosis
          </Link>
          <Link to={`/patients/${patient.id}/treatment-plan`} className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-md">
            Treatment Plan
          </Link>
          <Link to={`/patients/${patient.id}/files`} className="bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded-md">
            Files & Images
          </Link>
        </div>
      </div>

      <div className="mt-6 bg-white border border-slate-200 rounded-lg p-4">
        <h2 className="font-semibold mb-3 text-sm text-slate-700">Reports</h2>
        {pdfError && <div role="alert" className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{pdfError}</div>}
        <div className="flex gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => void openPatientPdf("summary")}
            className="bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded-md"
          >
            📋 Patient Summary PDF
          </button>
          <button
            type="button"
            onClick={() => void openPatientPdf("id-card")}
            className="bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded-md"
          >
            🪪 ID Card PDF
          </button>
        </div>
      </div>

      <div className="mt-4 bg-white border border-slate-200 rounded-lg p-4 text-sm text-slate-500">
        Audit trail and research module attach here in later phases.
      </div>
    </div>
  );
}
