import { NavLink, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { InstallAppButton } from "./InstallAppButton";
import { subscribeOnlineStatus } from "../pwa";

function OfflineBanner() {
  const [online, setOnline] = useState(true);
  useEffect(() => subscribeOnlineStatus(setOnline), []);
  if (online) return null;
  return (
    <div className="bg-amber-500 text-white text-xs font-medium text-center py-1.5 px-3">
      You're offline — nothing new can be loaded or saved until your connection returns.
    </div>
  );
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const isAdmin      = user?.role === "Administrator";
  const isResearcher = user?.role === "Researcher";
  const isAssistant  = user?.role === "Assistant";
  const isClinical   = user?.role === "Orthodontist" || isAdmin;

  // Pending registration badge — admin only, refreshed every 60 s
  const { data: pendingData } = useQuery({
    queryKey:        ["pending-count"],
    queryFn:         async () => (await api.get<{ count: number }>("/admin/registrations/count")).data,
    enabled:         isAdmin,
    refetchInterval: 60_000,
  });
  const pendingCount = pendingData?.count ?? 0;

  const lc = ({ isActive }: { isActive: boolean }) =>
    `flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive ? "bg-brand-500 text-white" : "text-slate-600 hover:bg-slate-100"
    }`;

  function NavItem({ to, icon, label, badge }: { to: string; icon: string; label: string; badge?: number }) {
    return (
      <NavLink to={to} className={lc}>
        <span className="flex items-center gap-2">{icon} {label}</span>
        {badge !== undefined && badge > 0 && (
          <span className="bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none min-w-[18px] text-center">
            {badge}
          </span>
        )}
      </NavLink>
    );
  }

  function Section({ label }: { label: string }) {
    return (
      <p className="px-3 pt-4 pb-1 text-xs font-semibold text-slate-400 uppercase tracking-wider select-none">
        {label}
      </p>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <OfflineBanner />
      <div className="flex flex-1 min-h-0">
      {/* ── Sidebar ── */}
      <aside className="w-56 border-r border-slate-200 bg-white flex flex-col flex-shrink-0">
        <div className="px-4 py-5 border-b border-slate-100">
          <img src="/WhatsApp_Image_2026-09-27_at_10.02.08-removebg-preview.png" alt="BenUrth logo" className="mb-2 w-40 max-w-full" />
          <p className="text-xs text-slate-400">OrthoBen Clinical Management</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          <Section label="Overview" />
          <NavItem to="/" icon="📊" label="Dashboard" />

          {!isResearcher && (
            <>
              <Section label="Patients" />
              <NavItem to="/patients" icon="👤" label="Patients" />
            </>
          )}

          {(isAdmin || isAssistant || isClinical) && (
            <>
              <Section label="Appointments" />
              <NavItem to="/appointments" icon="📅" label="Calendar" />
              <NavItem to="/waiting-list" icon="⏳" label="Waiting List" />
            </>
          )}

          {isClinical && (
            <>
              <Section label="Clinical" />
              <NavItem to="/reports" icon="📄" label="Reports" />
            </>
          )}

          {(isResearcher || isAdmin) && (
            <>
              <Section label="Research" />
              {isResearcher && <NavItem to="/research"       icon="🔬" label="My Requests" />}
              {isAdmin       && <NavItem to="/admin/research" icon="🔬" label="Research Queue" />}
            </>
          )}

          {isAdmin && (
            <>
              <Section label="Administration" />
              <NavItem to="/admin/users"         icon="🧑‍💼" label="Users" />
              <NavItem to="/admin/departments"   icon="🏥" label="Departments" />
              <NavItem to="/admin/registrations" icon="👋" label="Registrations" badge={pendingCount} />
              <NavItem to="/admin/form-builder"  icon="🔧" label="Form Builder" />
              <NavItem to="/admin/audit"         icon="🗂"  label="Audit Log" />
              <NavItem to="/admin/settings"      icon="⚙️"  label="Settings" />
              <NavItem to="/admin/backup"        icon="💾"  label="Backup" />
            </>
          )}
        </nav>

        {/* User footer */}
        <div className="border-t border-slate-100 px-3 py-3">
          <InstallAppButton />
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {user?.fullName?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{user?.fullName}</p>
              <p className="text-xs text-slate-400 truncate">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full text-left text-xs text-red-500 hover:text-red-700 px-1"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Page content ── */}
      <main className="flex-1 overflow-auto p-6 bg-slate-50">
        <Outlet />
      </main>
      </div>
    </div>
  );
}
