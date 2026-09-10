import { StrictMode, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import AppShell from './layouts/AppShell.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';
import OAuthCallbackPage from './pages/auth/OAuthCallbackPage.jsx';
import PromoPage from './pages/PromoPage.jsx';
import VerifyPage from './pages/auth/VerifyPage.jsx';
import ActivatePage from './pages/auth/ActivatePage.jsx';
import ForcePasswordChangePage from './pages/auth/ForcePasswordChangePage.jsx';
import VerifyOtpPage from './pages/auth/VerifyOtpPage.jsx';
import DpaConsentGate from './components/DpaConsentGate.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import EnrollPage from './pages/student/EnrollPage.jsx';
import MyRequestsPage from './pages/student/MyRequestsPage.jsx';
import MyGradesPage from './pages/student/MyGradesPage.jsx';
import FacultySectionsPage from './pages/faculty/FacultySectionsPage.jsx';
import GradeEntryPage from './pages/faculty/GradeEntryPage.jsx';
import RequestsPage from './pages/registrar/RequestsPage.jsx';
import StudentsPage from './pages/registrar/StudentsPage.jsx';
import SectionsPage from './pages/registrar/SectionsPage.jsx';
import AnalyticsPage from './pages/analytics/AnalyticsPage.jsx';
import UsersPage from './pages/admin/UsersPage.jsx';
import TermsPage from './pages/admin/TermsPage.jsx';
import CatalogPage from './pages/admin/CatalogPage.jsx';
import PolicyPage from './pages/admin/PolicyPage.jsx';
import AuditPage from './pages/admin/AuditPage.jsx';
import ClearancePage from './pages/student/ClearancePage.jsx';
import ClearancePrintPage from './pages/student/ClearancePrintPage.jsx';
import EnrollmentFormPrintPage from './pages/student/EnrollmentFormPrintPage.jsx';
import ClearanceReviewPage from './pages/registrar/ClearanceReviewPage.jsx';
import CalendarPage from './pages/CalendarPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import MaintenancePage from './pages/MaintenancePage.jsx';
import OhsDashboard from './pages/ohs/OhsDashboard.jsx';
import MedicalRecords from './pages/ohs/MedicalRecords.jsx';
import DrugTestPage from './pages/ohs/DrugTestPage.jsx';
import MedicalTestPage from './pages/ohs/MedicalTestPage.jsx';
import OscdDashboard from './pages/oscd/OscdDashboard.jsx';
import CounselingSessions from './pages/oscd/CounselingSessions.jsx';
import StudentAssessments from './pages/oscd/StudentAssessments.jsx';
import AtRiskStudents from './pages/oscd/AtRiskStudents.jsx';
import OsaDashboard from './pages/osa/OsaDashboard.jsx';
import StudentOrgs from './pages/osa/StudentOrgs.jsx';
import CommunityServices from './pages/osa/CommunityServices.jsx';
import DisciplinaryRecords from './pages/osa/DisciplinaryRecords.jsx';
import FaasgDashboard from './pages/faasg/FaasgDashboard.jsx';
import FacultyEvaluations from './pages/faasg/FacultyEvaluations.jsx';
import TrainingRecords from './pages/faasg/TrainingRecords.jsx';
import CashierDashboard from './pages/cashiering/CashierDashboard.jsx';
import Payments from './pages/cashiering/Payments.jsx';
import FeeStructures from './pages/cashiering/FeeStructures.jsx';
import AccountingDashboard from './pages/accounting/AccountingDashboard.jsx';
import JournalEntries from './pages/accounting/JournalEntries.jsx';
import GeneralLedger from './pages/accounting/GeneralLedger.jsx';
import './index.css';

function RequireAuth({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100">
        <span className="size-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  if (user.mustChangePassword) return <ForcePasswordChangePage />;
  if (user.dpaConsentRequired) return <DpaConsentGate />;
  return children;
}

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to="/dashboard" replace />;
}

function LoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-100">
      <span className="size-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
    </div>
  );
}

export default function App() {
  const [maintenance, setMaintenance] = useState(null); // null = checking
  const [maintenanceMessage, setMaintenanceMessage] = useState(null);

  const checkMaintenance = useCallback(() => {
    fetch('/api/health', { credentials: 'include' })
      .then((r) => r.json().catch(() => null))
      .then((body) => {
        if (body?.data?.status === 'maintenance') {
          setMaintenanceMessage(body.data.message ?? null);
          setMaintenance(true);
        } else {
          setMaintenance(false);
        }
      })
      .catch(() => setMaintenance(false));
  }, []);

  useEffect(() => {
    checkMaintenance();
    // Re-check periodically so the site comes back automatically when
    // maintenance ends, without requiring a manual refresh.
    const timer = setInterval(checkMaintenance, 30_000);
    return () => clearInterval(timer);
  }, [checkMaintenance]);

  if (maintenance) return <MaintenancePage message={maintenanceMessage} />;
  if (maintenance === null) return <LoadingScreen />;

  return (
    <StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
              <Route path="/verify" element={<VerifyPage />} />
              <Route path="/promo" element={<PromoPage />} />
              <Route path="/activate" element={<ActivatePage />} />
              <Route path="/verify-otp" element={<VerifyOtpPage />} />

              <Route
                path="/"
                element={
                  <RequireAuth>
                    <AppShell />
                  </RequireAuth>
                }
              >
                <Route index element={<HomeRedirect />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="profile" element={<ProfilePage />} />

                <Route path="enroll" element={<RequireAuth roles={['STUDENT']}><EnrollPage /></RequireAuth>} />
                <Route path="requests" element={<RequireAuth roles={['STUDENT']}><MyRequestsPage /></RequireAuth>} />
                <Route path="grades" element={<RequireAuth roles={['STUDENT']}><MyGradesPage /></RequireAuth>} />
                <Route path="clearance" element={<RequireAuth roles={['STUDENT']}><ClearancePage /></RequireAuth>} />
                <Route path="clearance/print" element={<RequireAuth roles={['STUDENT']}><ClearancePrintPage /></RequireAuth>} />
                <Route path="enrollments/:id/form" element={<RequireAuth roles={['STUDENT']}><EnrollmentFormPrintPage /></RequireAuth>} />
                <Route path="clearance-review" element={<RequireAuth roles={['REGISTRAR', 'ADMIN', 'ACCOUNTING', 'ADMISSION', 'OSA', 'OHS', 'CASHIERING', 'OSCD', 'FAASG']}><ClearanceReviewPage /></RequireAuth>} />
                <Route path="calendar" element={<RequireAuth><CalendarPage /></RequireAuth>} />

                <Route path="my-sections" element={<RequireAuth roles={['FACULTY']}><FacultySectionsPage /></RequireAuth>} />
                <Route path="sections/:sectionId/grades" element={<RequireAuth roles={['FACULTY']}><GradeEntryPage /></RequireAuth>} />

                <Route path="ohs" element={<RequireAuth roles={['OHS', 'ADMIN', 'REGISTRAR']}><OhsDashboard /></RequireAuth>} />
                <Route path="ohs/records" element={<RequireAuth roles={['OHS', 'ADMIN', 'REGISTRAR']}><MedicalRecords /></RequireAuth>} />
                <Route path="ohs/drug-test" element={<RequireAuth roles={['OHS', 'ADMIN', 'REGISTRAR']}><DrugTestPage /></RequireAuth>} />
                <Route path="ohs/medical-test" element={<RequireAuth roles={['OHS', 'ADMIN', 'REGISTRAR']}><MedicalTestPage /></RequireAuth>} />

                <Route path="oscd" element={<RequireAuth roles={['OSCD', 'ADMIN', 'REGISTRAR']}><OscdDashboard /></RequireAuth>} />
                <Route path="oscd/sessions" element={<RequireAuth roles={['OSCD', 'ADMIN', 'REGISTRAR']}><CounselingSessions /></RequireAuth>} />
                <Route path="oscd/assessments" element={<RequireAuth roles={['OSCD', 'ADMIN', 'REGISTRAR']}><StudentAssessments /></RequireAuth>} />
                <Route path="oscd/at-risk" element={<RequireAuth roles={['OSCD', 'ADMIN', 'REGISTRAR']}><AtRiskStudents /></RequireAuth>} />

                <Route path="osa" element={<RequireAuth roles={['OSA', 'ADMIN']}><OsaDashboard /></RequireAuth>} />
                <Route path="osa/orgs" element={<RequireAuth roles={['OSA', 'ADMIN']}><StudentOrgs /></RequireAuth>} />
                <Route path="osa/services" element={<RequireAuth roles={['OSA', 'ADMIN']}><CommunityServices /></RequireAuth>} />
                <Route path="osa/disciplinary" element={<RequireAuth roles={['OSA', 'ADMIN']}><DisciplinaryRecords /></RequireAuth>} />

                <Route path="faasg" element={<RequireAuth roles={['FAASG', 'ADMIN']}><FaasgDashboard /></RequireAuth>} />
                <Route path="faasg/evaluations" element={<RequireAuth roles={['FAASG', 'ADMIN']}><FacultyEvaluations /></RequireAuth>} />
                <Route path="faasg/trainings" element={<RequireAuth roles={['FAASG', 'ADMIN']}><TrainingRecords /></RequireAuth>} />

                <Route path="cashiering" element={<RequireAuth roles={['CASHIERING', 'ADMIN']}><CashierDashboard /></RequireAuth>} />
                <Route path="cashiering/payments" element={<RequireAuth roles={['CASHIERING', 'ADMIN']}><Payments /></RequireAuth>} />
                <Route path="cashiering/fees" element={<RequireAuth roles={['CASHIERING', 'ADMIN']}><FeeStructures /></RequireAuth>} />

                <Route path="accounting" element={<RequireAuth roles={['ACCOUNTING', 'ADMIN']}><AccountingDashboard /></RequireAuth>} />
                <Route path="accounting/journals" element={<RequireAuth roles={['ACCOUNTING', 'ADMIN']}><JournalEntries /></RequireAuth>} />
                <Route path="accounting/ledger" element={<RequireAuth roles={['ACCOUNTING', 'ADMIN']}><GeneralLedger /></RequireAuth>} />

                <Route path="review" element={<RequireAuth roles={['REGISTRAR', 'ADMISSION']}><RequestsPage /></RequireAuth>} />
                <Route path="students" element={<RequireAuth roles={['REGISTRAR', 'ADMIN', 'ADMISSION']}><StudentsPage /></RequireAuth>} />
                <Route path="sections" element={<RequireAuth roles={['REGISTRAR', 'ADMIN']}><SectionsPage /></RequireAuth>} />
                <Route path="analytics" element={<RequireAuth roles={['REGISTRAR', 'ADMIN']}><AnalyticsPage /></RequireAuth>} />

                <Route path="users" element={<RequireAuth roles={['ADMIN']}><UsersPage /></RequireAuth>} />
                <Route path="terms" element={<RequireAuth roles={['ADMIN']}><TermsPage /></RequireAuth>} />
                <Route path="catalog" element={<RequireAuth roles={['ADMIN']}><CatalogPage /></RequireAuth>} />
                <Route path="policy" element={<RequireAuth roles={['ADMIN']}><PolicyPage /></RequireAuth>} />
                <Route path="audit" element={<RequireAuth roles={['ADMIN']}><AuditPage /></RequireAuth>} />
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </StrictMode>
  );
}

createRoot(document.getElementById('root')).render(<App />);