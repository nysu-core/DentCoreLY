import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { api } from "../../api/client";
import type { Department } from "../../types";

interface NewDeptForm {
  name: string;
  code: string;
}

export function DepartmentsPage() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ["departments", "all"],
    queryFn: async () =>
      (await api.get<Department[]>("/departments", { params: { includeInactive: "true" } })).data,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<NewDeptForm>({ defaultValues: { name: "", code: "" } });

  const nameValue = watch("name");

  function autoCode(name: string) {
    const code = name
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, "")
      .trim()
      .split(/\s+/)
      .map((w) => w.slice(0, 4))
      .join("_")
      .slice(0, 20);
    setValue("code", code);
  }

  async function onCreate(values: NewDeptForm) {
    setError(null);
    try {
      await api.post("/departments", values);
      reset();
      setShowNew(false);
      qc.invalidateQueries({ queryKey: ["departments"] });
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Failed to create department");
    }
  }

  async function toggleActive(dept: Department) {
    setBusyId(dept.id);
    try {
      await api.patch(`/departments/${dept.id}`, { isActive: !dept.isActive });
      qc.invalidateQueries({ queryKey: ["departments"] });
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function renameDept(dept: Department, name: string) {
    if (!name || name === dept.name) return;
    setBusyId(dept.id);
    try {
      await api.patch(`/departments/${dept.id}`, { name });
      qc.invalidateQueries({ queryKey: ["departments"] });
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Rename failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Departments</h1>
          <p className="text-sm text-slate-500 mt-1">
            Add new clinical departments (e.g. Oral Surgery, Pediatric Dentistry) without touching
            application code. Each gets its own clinical workspace and configurable forms.
          </p>
        </div>
        <button
          onClick={() => setShowNew((v) => !v)}
          className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-md"
        >
          {showNew ? "Cancel" : "+ New Department"}
        </button>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}

      {showNew && (
        <form
          onSubmit={handleSubmit(onCreate)}
          className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Department Name</label>
              <input
                {...register("name", { required: "Name is required", minLength: 2 })}
                onChange={(e) => {
                  register("name").onChange(e);
                  autoCode(e.target.value);
                }}
                placeholder="e.g. Oral Surgery"
                className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Department Code <span className="text-slate-400 font-normal">(auto-generated, editable)</span>
              </label>
              <input
                {...register("code", {
                  required: "Code is required",
                  pattern: { value: /^[A-Z0-9_]+$/, message: "Uppercase letters, numbers, underscores only" },
                })}
                placeholder="e.g. ORAL_SURG"
                className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
              {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code.message}</p>}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="submit"
              disabled={isSubmitting || !nameValue}
              className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-md disabled:opacity-40"
            >
              {isSubmitting ? "Creating…" : "Create Department"}
            </button>
          </div>
        </form>
      )}

      <div role="region" aria-label="Departments list" tabIndex={0} className="overflow-x-auto rounded-xl border border-slate-200 bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500">
        <div className="min-w-[640px]">
        <div className="grid grid-cols-[1fr_140px_100px_120px] gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <span>Name</span>
          <span>Code</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>
        {isLoading ? (
          <div className="p-5 text-sm text-slate-400">Loading…</div>
        ) : departments.length === 0 ? (
          <div className="p-5 text-sm text-slate-400">No departments yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {departments.map((d) => (
              <div key={d.id} className="grid grid-cols-[1fr_140px_100px_120px] items-center gap-3 px-5 py-3 text-sm">
                <input
                  defaultValue={d.name}
                  onBlur={(e) => renameDept(d, e.target.value)}
                  disabled={busyId === d.id}
                  className="bg-transparent border border-transparent hover:border-slate-200 focus:border-brand-400 rounded px-2 py-1 -mx-2 focus:outline-none"
                />
                <span className="font-mono text-xs text-slate-500">{d.code}</span>
                <span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      d.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {d.isActive ? "Active" : "Inactive"}
                  </span>
                </span>
                <div className="text-right">
                  <button
                    onClick={() => toggleActive(d)}
                    disabled={busyId === d.id}
                    className="text-xs font-medium text-brand-600 hover:text-brand-800 disabled:opacity-40"
                  >
                    {d.isActive ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
