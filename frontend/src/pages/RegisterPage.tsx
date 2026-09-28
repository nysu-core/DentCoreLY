import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { api } from "../api/client";

interface FormValues {
  fullName:         string;
  email:            string;
  password:         string;
  confirmPassword:  string;
  roleName:         "Orthodontist" | "Assistant" | "Researcher";
  departmentId:     string;
  registrationNote: string;
}

interface Department { id: string; name: string; }

const ROLE_DESCRIPTIONS: Record<string, string> = {
  Orthodontist: "Register and manage patients, perform examinations, create diagnoses and treatment plans.",
  Assistant:    "Register patients, schedule and manage appointments, manage the waiting list.",
  Researcher:   "Submit requests to access anonymized clinical datasets for research purposes.",
};

export function RegisterPage() {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register, handleSubmit, watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: { roleName: "Orthodontist" } });

  const selectedRole = watch("roleName");
  const password     = watch("password");

  useEffect(() => {
    api.get<Department[]>("/departments/public").then((r) => setDepartments(r.data)).catch(() => {});
  }, []);

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      await api.post("/auth/register", {
        fullName:         values.fullName,
        email:            values.email,
        password:         values.password,
        roleName:         values.roleName,
        departmentId:     values.departmentId || undefined,
        registrationNote: values.registrationNote || undefined,
      });
      setSuccess(true);
    } catch (e: any) {
      setServerError(e?.response?.data?.error ?? "Registration failed. Please try again.");
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f2eb] p-4">
        <div className="bg-white shadow-md rounded-xl p-8 w-full max-w-md text-center space-y-4">
          <div className="text-5xl">✅</div>
          <h1 className="text-xl font-bold text-slate-800">Registration Submitted</h1>
          <p className="text-sm text-slate-500">
            Your account request has been sent to the administrator for review.
            You will receive an email once your account is approved.
          </p>
          <p className="text-xs text-slate-400">This typically takes 1–2 business days.</p>
          <Link to="/login" className="inline-block mt-2 text-sm text-brand-600 hover:underline">
            ← Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f2eb] p-4">
      <div className="bg-white shadow-md rounded-xl w-full max-w-lg">
        {/* Header */}
        <div className="bg-[#07080b] rounded-t-xl px-8 py-6 text-white">
          <div className="flex items-center gap-3">
            <div className="flex w-full items-center justify-between gap-4">
              <img src="/WhatsApp_Image_2026-09-27_at_10.02.08-removebg-preview.png" alt="Orthodontics Department - Benghazi" className="h-14 w-24 object-contain" />
              <p className="text-right text-amber-100/70 text-sm">Orthodontics Department - Benghazi<br />Request a new account</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-4">
          {serverError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {serverError}
            </div>
          )}

          {/* Full name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
            <input
              {...register("fullName", { required: "Full name is required", minLength: { value: 2, message: "At least 2 characters" } })}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              placeholder="Dr. Ahmed Al-Mansouri"
            />
            {errors.fullName && <p className="text-xs text-red-600 mt-1">{errors.fullName.message}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address *</label>
            <input
              type="email"
              {...register("email", { required: "Email is required" })}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              placeholder="you@example.com"
            />
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Requested Role *</label>
            <select
              {...register("roleName", { required: true })}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            >
              <option value="Orthodontist">Orthodontist</option>
              <option value="Assistant">Assistant / Receptionist</option>
              <option value="Researcher">Researcher</option>
            </select>
            {selectedRole && (
              <p className="text-xs text-slate-400 mt-1.5">{ROLE_DESCRIPTIONS[selectedRole]}</p>
            )}
          </div>

          {/* Department */}
          {departments.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
              <select
                {...register("departmentId")}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                <option value="">Select a department (optional)</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Password */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
              <input
                type="password"
                {...register("password", {
                  required: "Password is required",
                  minLength: { value: 8, message: "Minimum 8 characters" },
                })}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
              {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password *</label>
              <input
                type="password"
                {...register("confirmPassword", {
                  required: "Please confirm your password",
                  validate: (v) => v === password || "Passwords do not match",
                })}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
              {errors.confirmPassword && (
                <p className="text-xs text-red-600 mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          {/* Registration note */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Reason for Access <span className="text-slate-400 font-normal">(helps the admin review faster)</span>
            </label>
            <textarea
              {...register("registrationNote")}
              rows={2}
              placeholder="e.g. I am an orthodontist at Al-Wahat Dental Clinic and need access to manage patient records."
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-amber-300 hover:bg-amber-200 text-[#171307] font-semibold py-2.5 rounded-md text-sm disabled:opacity-60 transition-colors"
          >
            {isSubmitting ? "Submitting…" : "Submit Registration Request"}
          </button>

          <p className="text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link to="/login" className="text-brand-600 hover:underline font-medium">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
