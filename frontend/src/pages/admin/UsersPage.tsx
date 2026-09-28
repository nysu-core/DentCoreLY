import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { api } from "../../api/client";
import type { AdminUser, Department, Paginated, RoleSummary } from "../../types";

interface NewUserForm {
  fullName: string;
  email: string;
  password: string;
  roleId: string;
  departmentId: string;
}

export function UsersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [resetValue, setResetValue] = useState("");

  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => (await api.get<RoleSummary[]>("/roles")).data,
  });
  const { data: departments = [] } = useQuery({
    queryKey: ["departments", "all"],
    queryFn: async () =>
      (await api.get<Department[]>("/departments", { params: { includeInactive: "true" } })).data,
  });
  const { data, isLoading } = useQuery({
    queryKey: ["users", page, search],
    queryFn: async () =>
      (
        await api.get<Paginated<AdminUser>>("/users", {
          params: { page, pageSize: 20, search: search || undefined },
        })
      ).data,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewUserForm>({ defaultValues: { fullName: "", email: "", password: "", roleId: "", departmentId: "" } });

  async function onCreate(values: NewUserForm) {
    setError(null);
    try {
      await api.post("/users", {
        ...values,
        departmentId: values.departmentId || undefined,
      });
      reset();
      setShowNew(false);
      qc.invalidateQueries({ queryKey: ["users"] });
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Failed to create user");
    }
  }

  async function updateRole(user: AdminUser, roleId: string) {
    setBusyId(user.id);
    try {
      await api.patch(`/users/${user.id}`, { roleId });
      qc.invalidateQueries({ queryKey: ["users"] });
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function updateDept(user: AdminUser, departmentId: string) {
    setBusyId(user.id);
    try {
      await api.patch(`/users/${user.id}`, { departmentId: departmentId || null });
      qc.invalidateQueries({ queryKey: ["users"] });
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleStatus(user: AdminUser) {
    setBusyId(user.id);
    try {
      if (user.status === "DISABLED") {
        await api.patch(`/users/${user.id}`, { status: "ACTIVE" });
      } else {
        await api.delete(`/users/${user.id}`);
      }
      qc.invalidateQueries({ queryKey: ["users"] });
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function submitReset() {
    if (!resetTarget || resetValue.length < 8) return;
    setBusyId(resetTarget.id);
    try {
      await api.post(`/users/${resetTarget.id}/reset-password`, { newPassword: resetValue });
      setResetTarget(null);
      setResetValue("");
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Reset failed");
    } finally {
      setBusyId(null);
    }
  }

  const items = data?.items ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Users</h1>
          <p className="text-sm text-slate-500 mt-1">
            Register staff accounts and assign roles, departments, and permissions.
          </p>
        </div>
        <button
          onClick={() => setShowNew((v) => !v)}
          className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-md"
        >
          {showNew ? "Cancel" : "+ New User"}
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input
                {...register("fullName", { required: "Required", minLength: 2 })}
                className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
              {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                {...register("email", { required: "Required" })}
                className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Temporary Password</label>
              <input
                type="text"
                {...register("password", { required: "Required", minLength: { value: 8, message: "Min 8 characters" } })}
                className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <select
                {...register("roleId", { required: "Required" })}
                className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                <option value="">Select role…</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              {errors.roleId && <p className="text-xs text-red-500 mt-1">{errors.roleId.message}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Department <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <select
                {...register("departmentId")}
                className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                <option value="">No department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-md disabled:opacity-40"
            >
              {isSubmitting ? "Creating…" : "Create User"}
            </button>
          </div>
        </form>
      )}

      <input
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        placeholder="Search by name or email…"
        className="w-full max-w-sm border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
      />

      <div
        role="region"
        aria-label="Users list"
        tabIndex={0}
        className="overflow-x-auto rounded-xl border border-slate-200 bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500"
      >
        <div className="min-w-[980px]">
        <div className="grid grid-cols-[1.3fr_1fr_170px_170px_100px_190px] gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <span>Name</span>
          <span>Email</span>
          <span>Role</span>
          <span>Department</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>
        {isLoading ? (
          <div className="p-5 text-sm text-slate-400">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-5 text-sm text-slate-400">No users found.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((u) => (
              <div
                key={u.id}
                className="grid grid-cols-[1.3fr_1fr_170px_170px_100px_190px] items-center gap-3 px-5 py-3 text-sm"
              >
                <span className="font-medium truncate">{u.fullName}</span>
                <span className="text-slate-500 truncate">{u.email}</span>
                <select
                  value={u.roleId}
                  disabled={busyId === u.id}
                  onChange={(e) => updateRole(u, e.target.value)}
                  className="border border-slate-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-400"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <select
                  value={u.departmentId ?? ""}
                  disabled={busyId === u.id}
                  onChange={(e) => updateDept(u, e.target.value)}
                  className="border border-slate-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-400"
                >
                  <option value="">—</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full w-fit ${
                    u.status === "ACTIVE"
                      ? "bg-green-100 text-green-700"
                      : u.status === "PENDING"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {u.status}
                </span>
                <div className="text-right space-x-2 whitespace-nowrap">
                  <button
                    onClick={() => setResetTarget(u)}
                    className="text-xs font-medium text-brand-600 hover:text-brand-800"
                  >
                    Reset PW
                  </button>
                  <button
                    onClick={() => toggleStatus(u)}
                    disabled={busyId === u.id}
                    className="text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-40"
                  >
                    {u.status === "DISABLED" ? "Re-enable" : "Disable"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1 border border-slate-300 rounded-md disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-slate-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1 border border-slate-300 rounded-md disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {resetTarget && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="max-h-[90dvh] w-full max-w-sm space-y-4 overflow-y-auto rounded-xl bg-white p-5">
            <h3 className="font-semibold text-sm">Reset password for {resetTarget.fullName}</h3>
            <input
              autoFocus
              type="text"
              value={resetValue}
              onChange={(e) => setResetValue(e.target.value)}
              placeholder="New password (min 8 characters)"
              className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setResetTarget(null);
                  setResetValue("");
                }}
                className="text-sm px-3 py-1.5 text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={submitReset}
                disabled={resetValue.length < 8}
                className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-1.5 rounded-md disabled:opacity-40"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
