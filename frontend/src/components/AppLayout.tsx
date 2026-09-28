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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
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

  useEffect(() => {
    if (!mobileOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const lc = ({ isActive }: { isActive: boolean }) =>
    `relative flex items-center justify-between px-3 ${collapsed ? "md:justify-center md:px-2" : ""} py-2 rounded-md text-sm font-medium transition-colors ${
      isActive ? "bg-brand-500 text-white" : "text-slate-600 hover:bg-slate-100"
    }`;

  function NavItem({ to, icon, label, badge }: { to: string; icon: string; label: string; badge?: number }) {
    return (
      <NavLink to={to} onClick={() => setMobileOpen(false)} title={collapsed ? `${label}${badge ? `, ${badge} pending` : ""}` : undefined} className={lc}>
        <span className={`flex min-w-0 items-center gap-2 ${collapsed ? "md:justify-center md:gap-0" : ""}`}>
          <span aria-hidden="true" className="shrink-0">{icon}</span>
          <span className={collapsed ? "md:hidden" : "truncate"}>{label}</span>
        </span>
        {badge !== undefined && badge > 0 && (
          <span className={`bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none min-w-[18px] text-center ${collapsed ? "md:hidden" : ""}`}>
            {badge}
          </span>
        )}
        {collapsed && badge !== undefined && badge > 0 && <span aria-hidden="true" className="absolute right-1 top-1 hidden h-2 w-2 rounded-full bg-amber-500 md:block" />}
      </NavLink>
    );
  }

  function Section({ label }: { label: string }) {
    return (
      <p className={`px-3 pt-4 pb-1 text-xs font-semibold text-slate-400 uppercase tracking-wider select-none ${collapsed ? "md:hidden" : ""}`}>
        {label}
      </p>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <OfflineBanner />
      <div className="flex flex-1 min-h-0">
      {mobileOpen && <button type="button" aria-label="Close navigation" className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 shrink-0 flex-col border-r border-slate-200 bg-white transition-transform duration-200 md:static md:z-auto md:translate-x-0 md:transform-none ${collapsed ? "md:w-16" : "md:w-56"} ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className={`flex min-h-[88px] items-start justify-between border-b border-slate-100 px-4 py-4 ${collapsed ? "md:justify-center md:px-1" : ""}`}>
          <div className={`min-w-0 ${collapsed ? "md:hidden" : ""}`}>
            <img src="/WhatsApp_Image_2026-09-27_at_10.02.08-removebg-preview.png" alt="Orthodontics Department - Faculty of Dentistry - Benghazi" className="mb-2 w-40 max-w-full" />
            <p className="text-xs text-slate-400">Orthodontics Department - Faculty of Dentistry - Benghazi</p>
          </div>
          {collapsed && <img src="/icon-64.png" alt="" className="hidden h-9 w-9 object-contain md:block" />}
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={() => setCollapsed((value) => !value)} className="hidden h-8 w-8 items-center justify-center rounded text-lg text-slate-500 hover:bg-slate-100 md:inline-flex">
              {collapsed ? "›" : "‹"}
            </button>
            <button type="button" aria-label="Close navigation" title="Close navigation" onClick={() => setMobileOpen(false)} className="inline-flex h-8 w-8 items-center justify-center rounded text-lg text-slate-500 hover:bg-slate-100 md:hidden">
              ×
            </button>
          </div>
        </div>

        <nav aria-label="Main navigation" className={`flex-1 space-y-0.5 overflow-y-auto py-2 ${collapsed ? "px-1" : "px-2"}`}>
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
        <div className={`border-t border-slate-100 py-3 ${collapsed ? "px-2 md:px-1" : "px-3"}`}>
          <div className={collapsed ? "md:hidden" : ""}><InstallAppButton /></div>
          <div className={`mb-2 flex items-center gap-2 ${collapsed ? "md:justify-center" : ""}`}>
            <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {user?.fullName?.charAt(0).toUpperCase()}
            </div>
            <div className={`min-w-0 ${collapsed ? "md:hidden" : ""}`}>
              <p className="text-xs font-medium truncate">{user?.fullName}</p>
              <p className="text-xs text-slate-400 truncate">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            aria-label="Sign out"
            className={`w-full text-left text-xs text-red-500 hover:text-red-700 ${collapsed ? "px-0 text-center md:px-1" : "px-1"}`}
          >
            <span className={collapsed ? "md:hidden" : ""}>Sign out</span>
            {collapsed && <span aria-hidden="true" className="hidden md:inline">↪</span>}
          </button>
        </div>
      </aside>

      {/* ── Page content ── */}
      <main className="min-w-0 flex-1 overflow-auto bg-slate-50 p-4 sm:p-6">
        <div className="sticky top-0 z-30 -mx-4 -mt-4 mb-4 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:-mx-6 sm:-mt-6 sm:px-6 md:hidden">
          <button type="button" aria-label="Open navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)} className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 text-xl text-slate-700 hover:bg-slate-50">
            ☰
          </button>
          <span className="min-w-0 truncate text-sm font-semibold text-slate-800">Orthodontics Department - Faculty of Dentistry - Benghazi</span>
        </div>
        <Outlet />
      </main>
      </div>
    </div>
  );
}
