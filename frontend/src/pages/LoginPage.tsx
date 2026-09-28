import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { InstallAppButton } from "../components/InstallAppButton";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Login failed. Check your credentials.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#07080b] px-4 py-8">
      <section className="w-full max-w-md overflow-hidden border border-amber-200/15 bg-[#111217] shadow-2xl shadow-black/40">
        <div className="px-8 pt-8 pb-5 text-center">
          <img src="/WhatsApp_Image_2026-09-27_at_10.02.08-removebg-preview.png" alt="Orthodontics Department - Benghazi" className="mx-auto mb-5 w-full max-w-[300px]" />
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-100/70">Orthodontics Department - Benghazi</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 pb-5 sm:px-9">
          <h1 className="text-lg font-semibold text-white">Staff sign in</h1>
          {error && <div role="alert" className="text-sm text-red-200 bg-red-950/60 border border-red-800 rounded p-3">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-700 bg-[#090a0e] text-white rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-amber-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-700 bg-[#090a0e] text-white rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-amber-300"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-amber-300 hover:bg-amber-200 text-[#171307] font-semibold py-2.5 rounded-md disabled:opacity-60 transition-colors"
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="space-y-3 border-t border-slate-700/80 px-6 py-5 sm:px-9">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">New staff?</p>
          <Link
            to="/register"
            className="flex w-full items-center justify-between rounded-md border border-amber-200/50 bg-amber-200/10 px-4 py-3 text-sm font-semibold text-amber-100 hover:bg-amber-200/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
          >
            <span>Request access</span><span aria-hidden="true">→</span>
          </Link>
          <InstallAppButton variant="dark" />
        </div>
      </section>
    </div>
  );
}
