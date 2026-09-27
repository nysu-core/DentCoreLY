import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { AppLayout } from "./components/AppLayout";
import { LoginPage }    from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage }   from "./pages/DashboardPage";
import { PatientsListPage }  from "./pages/PatientsListPage";
import { PatientNewPage }    from "./pages/PatientNewPage";
import { PatientDetailPage } from "./pages/PatientDetailPage";
import { ClinicalFormPage }  from "./pages/ClinicalFormPage";
import { PatientFilesPage }  from "./pages/patient/PatientFilesPage";
import { CalendarPage }      from "./pages/appointments/CalendarPage";
import { WaitingListPage }   from "./pages/appointments/WaitingListPage";
import { ReportsPage }       from "./pages/reports/ReportsPage";
import { ResearchPage }      from "./pages/research/ResearchPage";
import { FormBuilderPage }         from "./pages/admin/FormBuilderPage";
import { PendingRegistrationsPage } from "./pages/admin/PendingRegistrationsPage";
import { ResearchAdminPage }       from "./pages/admin/ResearchAdminPage";
import { AuditLogPage }            from "./pages/admin/AuditLogPage";
import { SystemSettingsPage }      from "./pages/admin/SystemSettingsPage";
import { BackupPage }              from "./pages/admin/BackupPage";
import { UsersPage }               from "./pages/admin/UsersPage";
import { DepartmentsPage }         from "./pages/admin/DepartmentsPage";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* ── Public routes ──────────────────────────────────── */}
            <Route path="/login"    element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* ── Authenticated routes ───────────────────────────── */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/"  element={<DashboardPage />} />

                {/* Patients */}
                <Route path="/patients"          element={<PatientsListPage />} />
                <Route path="/patients/new"      element={<PatientNewPage />} />
                <Route path="/patients/:id"      element={<PatientDetailPage />} />
                <Route path="/patients/:id/examination"
                  element={<ClinicalFormPage moduleKey="examination"  title="Clinical Examination" />} />
                <Route path="/patients/:id/medical-history"
                  element={<ClinicalFormPage moduleKey="medical_history" title="Medical History" />} />
                <Route path="/patients/:id/diagnosis"
                  element={<ClinicalFormPage moduleKey="diagnosis"    title="Diagnosis" />} />
                <Route path="/patients/:id/treatment-plan"
                  element={<ClinicalFormPage moduleKey="treatment_plan" title="Treatment Plan" />} />
                <Route path="/patients/:id/files" element={<PatientFilesPage />} />

                {/* Appointments */}
                <Route path="/appointments" element={<CalendarPage />} />
                <Route path="/waiting-list" element={<WaitingListPage />} />

                {/* Reports & Research */}
                <Route path="/reports"  element={<ReportsPage />} />
                <Route path="/research" element={<ResearchPage />} />

                {/* Admin */}
                <Route path="/admin/users"         element={<UsersPage />} />
                <Route path="/admin/departments"   element={<DepartmentsPage />} />
                <Route path="/admin/registrations" element={<PendingRegistrationsPage />} />
                <Route path="/admin/research"      element={<ResearchAdminPage />} />
                <Route path="/admin/form-builder"  element={<FormBuilderPage />} />
                <Route path="/admin/audit"         element={<AuditLogPage />} />
                <Route path="/admin/settings"      element={<SystemSettingsPage />} />
                <Route path="/admin/backup"        element={<BackupPage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
