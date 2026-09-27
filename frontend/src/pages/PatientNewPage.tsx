import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { api } from "../api/client";
import { Department } from "../types";

interface FormValues {
  fileNumber: string;
  fullName: string;
  birthDate: string;
  gender: "MALE" | "FEMALE";
  nationality?: string;
  phoneNumber?: string;
  guardianContact?: string;
  assignedDoctorName?: string;
  supervisorName?: string;
  departmentId: string;
}

export function PatientNewPage() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Department[]>("/departments").then((res) => setDepartments(res.data));
  }, []);

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      const { data } = await api.post("/patients", values);
      navigate(`/patients/${data.id}`);
    } catch (err: any) {
      setServerError(err?.response?.data?.error || "Failed to register patient.");
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold mb-6">Register New Patient</h1>

      {serverError && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2 mb-4">{serverError}</div>}

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">File Number</label>
          <input {...register("fileNumber", { required: "File number is required" })} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          {errors.fileNumber && <p className="text-xs text-red-600 mt-1">{errors.fileNumber.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
          <input {...register("fullName", { required: "Full name is required" })} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          {errors.fullName && <p className="text-xs text-red-600 mt-1">{errors.fullName.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Birth Date</label>
            <input type="date" {...register("birthDate", { required: "Birth date is required" })} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
            {errors.birthDate && <p className="text-xs text-red-600 mt-1">{errors.birthDate.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
            <select {...register("gender", { required: true })} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm">
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nationality</label>
            <input {...register("nationality")} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
            <input {...register("phoneNumber")} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Assigned Doctor</label>
            <input {...register("assignedDoctorName")} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Supervisor</label>
            <input {...register("supervisorName")} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Guardian Contact</label>
          <input
            type="tel"
            {...register("guardianContact")}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            placeholder="Guardian phone number"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
          <select {...register("departmentId", { required: "Department is required" })} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm">
            <option value="">Select a department...</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          {errors.departmentId && <p className="text-xs text-red-600 mt-1">{errors.departmentId.message}</p>}
        </div>

        <button type="submit" disabled={isSubmitting} className="bg-brand-500 hover:bg-brand-600 text-white font-medium px-4 py-2 rounded-md disabled:opacity-60">
          {isSubmitting ? "Saving..." : "Register Patient"}
        </button>
      </form>
    </div>
  );
}
