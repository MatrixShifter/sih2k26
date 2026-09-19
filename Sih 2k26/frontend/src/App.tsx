import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth, homeForRole } from "./auth";
import { AppShell } from "./components/AppShell";
import { RequireAuth } from "./components/RequireAuth";
import { LoginPage } from "./pages/LoginPage";
import { BidderDashboard } from "./pages/BidderDashboard";
import { OfficerDashboard } from "./pages/OfficerDashboard";
import { BidDetailPage } from "./pages/BidDetailPage";
import { AuditLogPage } from "./pages/AuditLogPage";
import { ComparePage } from "./pages/ComparePage";
import { TendersPage } from "./pages/TendersPage";
import { BiddersPage } from "./pages/BiddersPage";
import { DocumentsPage } from "./pages/DocumentsPage";
import { CompliancePage } from "./pages/CompliancePage";
import { VerificationPage } from "./pages/VerificationPage";
import { AnomaliesPage } from "./pages/AnomaliesPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { DeliveryVerificationPage } from "./pages/DeliveryVerificationPage";
import { OfficerReviewQueuePage } from "./pages/OfficerReviewQueuePage";

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={homeForRole(user.role)} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            {/* Dashboards */}
            <Route
              path="/bidder/dashboard"
              element={
                <RequireAuth role="bidder">
                  <BidderDashboard />
                </RequireAuth>
              }
            />
            <Route path="/bidder" element={<Navigate to="/bidder/dashboard" replace />} />
            <Route
              path="/officer/dashboard"
              element={
                <RequireAuth role="officer">
                  <OfficerDashboard />
                </RequireAuth>
              }
            />
            <Route path="/officer" element={<Navigate to="/officer/dashboard" replace />} />
            <Route path="/dashboard" element={<RootRedirect />} />

            {/* Core SIH Feature Routes (supporting both prefixed and direct paths) */}
            <Route path="/tenders" element={<TendersPage />} />
            <Route path="/officer/tenders" element={<TendersPage />} />

            {/* Bids Review Queue */}
            <Route path="/bids" element={<OfficerReviewQueuePage />} />
            <Route path="/officer/bids" element={<OfficerReviewQueuePage />} />

            <Route path="/bidders" element={<BiddersPage />} />
            <Route path="/officer/bidders" element={<BiddersPage />} />

            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/officer/documents" element={<DocumentsPage />} />

            <Route path="/compliance" element={<CompliancePage />} />
            <Route path="/officer/compliance" element={<CompliancePage />} />

            <Route path="/verification" element={<VerificationPage />} />
            <Route path="/officer/verification" element={<VerificationPage />} />

            <Route path="/anomalies" element={<AnomaliesPage />} />
            <Route path="/officer/anomalies" element={<AnomaliesPage />} />

            <Route path="/deliveries" element={<DeliveryVerificationPage />} />
            <Route path="/officer/deliveries" element={<DeliveryVerificationPage />} />

            {/* Inspections Route */}
            <Route path="/inspections" element={<DeliveryVerificationPage defaultTab="inspections" />} />
            <Route path="/officer/inspections" element={<DeliveryVerificationPage defaultTab="inspections" />} />

            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/officer/reports" element={<ReportsPage />} />

            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/officer/settings" element={<SettingsPage />} />

            {/* Bid Detail Routes (supporting all path conventions) */}
            <Route path="/officer/bid/:id" element={<BidDetailPage />} />
            <Route path="/officer/bids/:id" element={<BidDetailPage />} />
            <Route path="/bids/:id" element={<BidDetailPage />} />
            <Route path="/bid/:id" element={<BidDetailPage />} />

            {/* Comparison Tool */}
            <Route
              path="/officer/compare"
              element={
                <RequireAuth role="officer">
                  <ComparePage />
                </RequireAuth>
              }
            />
            <Route
              path="/compare"
              element={
                <RequireAuth role="officer">
                  <ComparePage />
                </RequireAuth>
              }
            />

            {/* Audit Trail */}
            <Route path="/audit-log" element={<AuditLogPage />} />
            <Route path="/officer/audit-log" element={<AuditLogPage />} />
            <Route path="/audit" element={<AuditLogPage />} />
            <Route path="/officer/audit" element={<AuditLogPage />} />
          </Route>
        </Route>
        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
