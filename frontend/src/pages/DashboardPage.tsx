import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { AppointmentStatus } from "../types";
import { StatusBadge } from "../components/StatusBadge";

// ── types ─────────────────────────────────────────────────────────────────
interface DashboardData {
  summary: {
    totalPatients: number;
    archivedPatients: number;
    newPatientsThisMonth: number;
    todayAppointments: number;
    pendingAppointments: number;
    completedThisMonth: number;
    waitingListCount: number;
    pendingReminders: number;
  };
  charts: {
    appointmentTrend: { month: string; count: number }[];
    patientTrend:     { month: string; count: number }[];
    statusBreakdown:  { status: string; count: number }[];
    departmentBreakdown: { department: string; count: number }[];
  };
  recent: {
    patients: { id: string; fileNumber: string; fullName: string; gender: string; createdAt: string }[];
    upcomingAppointments: {
      id: string; startTime: string; endTime: string; status: AppointmentStatus;
      reason?: string | null;
      patient: { id: string; fullName: string; fileNumber: string };
      provider: { fullName: string };
      department: { name: string };
    }[];
  };
}

// ── colour palettes ────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  SCHEDULED:  "#3a5fcd",
  CONFIRMED:  "#6366f1",
  CHECKED_IN: "#f59e0b",
  COMPLETED:  "#22c55e",
  CANCELLED:  "#ef4444",
  NO_SHOW:    "#94a3b8",
};
const DEPT_COLORS = ["#3a5fcd","#06b6d4","#8b5cf6","#f59e0b","#10b981","#f43f5e"];

// ── stat card ──────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, color = "brand", href,
}: { label: string; value: number | string; sub?: string; color?: string; href?: string }) {
  const colorMap: Record<string, string> = {
    brand:  "border-brand-400 bg-brand-50",
    green:  "border-green-400 bg-green-50",
    amber:  "border-amber-400 bg-amber-50",
    slate:  "border-slate-300 bg-slate-50",
    indigo: "border-indigo-400 bg-indigo-50",
  };
  const inner = (
    <div className={`border-l-4 rounded-lg p-4 ${colorMap[color] ?? colorMap.brand}`}>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold text-slate-800 mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
  return href ? <Link to={href}>{inner}</Link> : inner;
}

// ── main ───────────────────────────────────────────────────────────────────
export function DashboardPage() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => (await api.get<DashboardData>("/dashboard")).data,
    refetchInterval: 60_000,
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        Loading dashboard…
      </div>
    );
  }

  const { summary, charts, recent } = data;

  function fmtTime(iso: string) {
    return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  function fmtMonth(key: string) {
    const [y, m] = key.split("-");
    return new Date(Number(y), Number(m) - 1).toLocaleDateString(undefined, { month: "short", year: "2-digit" });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Dashboard</h1>
        <p className="text-sm text-slate-500">Welcome back, {user?.fullName}</p>
      </div>

      {/* ── stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Active Patients" value={summary.totalPatients}
          sub={`+${summary.newPatientsThisMonth} this month`} href="/patients" color="brand" />
        <StatCard label="Today's Appointments" value={summary.todayAppointments}
          sub="scheduled for today" href="/appointments" color="indigo" />
        <StatCard label="Pending Appointments" value={summary.pendingAppointments}
          sub="awaiting confirmation" color="amber" />
        <StatCard label="Completed This Month" value={summary.completedThisMonth}
          sub="finished sessions" color="green" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Waiting List" value={summary.waitingListCount}
          sub="patients waiting" href="/waiting-list" color="slate" />
        <StatCard label="Pending Reminders" value={summary.pendingReminders}
          sub="SMS / Email queued" color="slate" />
        <StatCard label="Archived Patients" value={summary.archivedPatients}
          sub="inactive records" color="slate" />
        <StatCard label="Departments" value={charts.departmentBreakdown.length}
          sub="active specialties" color="slate" />
      </div>

      {/* ── charts row ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Appointment trend */}
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl p-4">
          <h2 className="font-semibold text-sm mb-4">Appointments — Last 6 Months</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={charts.appointmentTrend.map(d => ({ ...d, month: fmtMonth(d.month) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" name="Appointments" fill="#3a5fcd" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status donut */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h2 className="font-semibold text-sm mb-4">Appointment Status Breakdown</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={charts.statusBreakdown}
                dataKey="count"
                nameKey="status"
                cx="50%" cy="50%"
                innerRadius={55} outerRadius={85}
                paddingAngle={2}
              >
                {charts.statusBreakdown.map((entry, i) => (
                  <Cell key={i} fill={STATUS_COLORS[entry.status] ?? "#94a3b8"} />
                ))}
              </Pie>
              <Tooltip formatter={(v, name) => [v, String(name).replace("_", " ")]} />
              <Legend
                formatter={(v) => String(v).replace("_", " ")}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Patient trend */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h2 className="font-semibold text-sm mb-4">New Patient Registrations — Last 6 Months</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={charts.patientTrend.map(d => ({ ...d, month: fmtMonth(d.month) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" name="New Patients"
                stroke="#3a5fcd" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Department breakdown */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h2 className="font-semibold text-sm mb-4">Patients by Department</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={charts.departmentBreakdown} dataKey="count" nameKey="department"
                cx="50%" cy="50%" outerRadius={80} paddingAngle={2}>
                {charts.departmentBreakdown.map((_, i) => (
                  <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── tables row ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Upcoming appointments */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h2 className="font-semibold text-sm">Upcoming Appointments</h2>
            <Link to="/appointments" className="text-xs text-brand-600 hover:underline">View calendar →</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {recent.upcomingAppointments.length === 0 && (
              <p className="px-4 py-6 text-sm text-slate-400 text-center">No upcoming appointments.</p>
            )}
            {recent.upcomingAppointments.map((a) => (
              <div key={a.id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-shrink-0 text-center w-12">
                  <p className="text-xs text-slate-400">{fmtDate(a.startTime)}</p>
                  <p className="text-sm font-semibold text-brand-700">{fmtTime(a.startTime)}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <Link to={`/patients/${a.patient.id}`}
                    className="text-sm font-medium hover:underline truncate block">
                    {a.patient.fullName}
                  </Link>
                  <p className="text-xs text-slate-400 truncate">
                    {a.department.name} · {a.provider.fullName}
                  </p>
                </div>
                <StatusBadge status={a.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Recent patients */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h2 className="font-semibold text-sm">Recently Registered Patients</h2>
            <Link to="/patients" className="text-xs text-brand-600 hover:underline">All patients →</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {recent.patients.length === 0 && (
              <p className="px-4 py-6 text-sm text-slate-400 text-center">No patients registered yet.</p>
            )}
            {recent.patients.map((p) => (
              <div key={p.id} className="px-4 py-3 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${p.gender === "MALE" ? "bg-blue-400" : "bg-pink-400"}`}>
                  {p.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <Link to={`/patients/${p.id}`}
                    className="text-sm font-medium hover:underline truncate block">
                    {p.fullName}
                  </Link>
                  <p className="text-xs text-slate-400">#{p.fileNumber}</p>
                </div>
                <span className="text-xs text-slate-400">{fmtDate(p.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
