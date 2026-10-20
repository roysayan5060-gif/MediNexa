import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoadingSpinner } from './components/common/LoadingSpinner';

// Pages
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { DoctorDashboard } from './pages/doctor/DoctorDashboard';
import { DoctorPatients } from './pages/doctor/DoctorPatients';
import { PatientDetail } from './pages/doctor/PatientDetail';
import { DoctorAppointments } from './pages/doctor/DoctorAppointments';
import { PrescriptionBuilder } from './pages/doctor/PrescriptionBuilder';
import { DoctorWhatsAppRx } from './pages/doctor/DoctorWhatsAppRx';

import { PatientPortal } from './pages/patient/PatientPortal';
import { DoctorDirectory } from './pages/patient/DoctorDirectory';
import { MyAppointments } from './pages/patient/MyAppointments';
import { MyPrescriptions } from './pages/patient/MyPrescriptions';
import { MyMedicalRecords } from './pages/patient/MyMedicalRecords';
import { MyPayments } from './pages/patient/MyPayments';

import { ClinicDashboard } from './pages/clinic/ClinicDashboard';
import { PlatformDashboard } from './pages/admin/PlatformDashboard';

// Public & Market-Ready Pages
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { LandingPage } from './pages/public/LandingPage';
import { PrivacyPolicy } from './pages/public/PrivacyPolicy';
import { TermsOfService } from './pages/public/TermsOfService';
import { RefundPolicy } from './pages/public/RefundPolicy';
import { NotFound } from './pages/public/NotFound';

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({
  children,
  allowedRoles,
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <LoadingSpinner message="Checking secure authentication credentials..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redirect to user's permitted home
    if (user.role === 'doctor') return <Navigate to="/doctor/dashboard" replace />;
    if (user.role === 'patient') return <Navigate to="/patient/portal" replace />;
    if (user.role === 'clinic_admin') return <Navigate to="/clinic/dashboard" replace />;
    if (user.role === 'platform_admin') return <Navigate to="/admin/dashboard" replace />;
  }

  return <>{children}</>;
};

// Root index: Landing page for public visitors, role home for authenticated users
const RootHomeOrDashboard: React.FC = () => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner message="Connecting to Doctor X Healthcare Network..." />;
  }

  if (isAuthenticated && user) {
    if (user.role === 'doctor') return <Navigate to="/doctor/dashboard" replace />;
    if (user.role === 'patient') return <Navigate to="/patient/portal" replace />;
    if (user.role === 'clinic_admin') return <Navigate to="/clinic/dashboard" replace />;
    if (user.role === 'platform_admin') return <Navigate to="/admin/dashboard" replace />;
  }

  return <LandingPage />;
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <NotificationProvider>
            <Routes>
              {/* Public Root Route: Landing Page or Dashboard */}
              <Route path="/" element={<RootHomeOrDashboard />} />

              {/* Public Legal & Regulatory Compliance Pages */}
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/refunds" element={<RefundPolicy />} />

              {/* Public Auth Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected App Layout */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                {/* Doctor Routes */}
              <Route
                path="doctor/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['doctor', 'clinic_admin', 'platform_admin']}>
                    <DoctorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="doctor/earnings"
                element={
                  <ProtectedRoute allowedRoles={['doctor', 'clinic_admin', 'platform_admin']}>
                    <DoctorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="doctor/patients"
                element={
                  <ProtectedRoute allowedRoles={['doctor', 'clinic_admin', 'platform_admin']}>
                    <DoctorPatients />
                  </ProtectedRoute>
                }
              />
              <Route
                path="doctor/patients/:id"
                element={
                  <ProtectedRoute allowedRoles={['doctor', 'clinic_admin', 'platform_admin', 'patient']}>
                    <PatientDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="doctor/appointments"
                element={
                  <ProtectedRoute allowedRoles={['doctor', 'clinic_admin', 'platform_admin']}>
                    <DoctorAppointments />
                  </ProtectedRoute>
                }
              />
              <Route
                path="doctor/prescriptions/new"
                element={
                  <ProtectedRoute allowedRoles={['doctor', 'clinic_admin', 'platform_admin']}>
                    <PrescriptionBuilder />
                  </ProtectedRoute>
                }
              />
              <Route
                path="doctor/whatsapp-prescriptions"
                element={
                  <ProtectedRoute allowedRoles={['doctor', 'clinic_admin', 'platform_admin']}>
                    <DoctorWhatsAppRx />
                  </ProtectedRoute>
                }
              />

              {/* Patient Routes */}
              <Route
                path="patient/portal"
                element={
                  <ProtectedRoute allowedRoles={['patient']}>
                    <PatientPortal />
                  </ProtectedRoute>
                }
              />
              <Route path="patient/doctors" element={<DoctorDirectory />} />
              <Route
                path="patient/appointments"
                element={
                  <ProtectedRoute allowedRoles={['patient']}>
                    <MyAppointments />
                  </ProtectedRoute>
                }
              />
              <Route
                path="patient/prescriptions"
                element={
                  <ProtectedRoute allowedRoles={['patient', 'doctor']}>
                    <MyPrescriptions />
                  </ProtectedRoute>
                }
              />
              <Route
                path="patient/payments"
                element={
                  <ProtectedRoute allowedRoles={['patient']}>
                    <MyPayments />
                  </ProtectedRoute>
                }
              />
              <Route
                path="patient/records"
                element={
                  <ProtectedRoute allowedRoles={['patient']}>
                    <MyMedicalRecords />
                  </ProtectedRoute>
                }
              />

              {/* Clinic Admin Routes */}
              <Route
                path="clinic/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['clinic_admin', 'platform_admin']}>
                    <ClinicDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="clinic/doctors"
                element={
                  <ProtectedRoute allowedRoles={['clinic_admin', 'platform_admin']}>
                    <ClinicDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="clinic/invoices"
                element={
                  <ProtectedRoute allowedRoles={['clinic_admin', 'platform_admin']}>
                    <ClinicDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="clinic/settlements"
                element={
                  <ProtectedRoute allowedRoles={['clinic_admin', 'platform_admin']}>
                    <ClinicDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="clinic/wallet"
                element={
                  <ProtectedRoute allowedRoles={['clinic_admin', 'platform_admin']}>
                    <ClinicDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="clinic/refunds"
                element={
                  <ProtectedRoute allowedRoles={['clinic_admin', 'platform_admin']}>
                    <ClinicDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Platform Admin Routes */}
              <Route
                path="admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['platform_admin']}>
                    <PlatformDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/users"
                element={
                  <ProtectedRoute allowedRoles={['platform_admin']}>
                    <PlatformDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/audit-logs"
                element={
                  <ProtectedRoute allowedRoles={['platform_admin']}>
                    <PlatformDashboard />
                  </ProtectedRoute>
                }
              />
            </Route>

              {/* Market-Ready 404 Route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </NotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
