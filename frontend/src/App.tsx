import { Suspense, lazy } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Loader2 } from "lucide-react";

// Lazy load pages
const LoginPage = lazy(() => import("./pages/LoginPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const QuotationPage = lazy(() => import("./pages/QuotationPage"));
const OrderExportPage = lazy(() => import("./pages/OrderExportPage"));
const SalesPage = lazy(() => import("./pages/SalesPage"));
const SampleManagementPage = lazy(() => import("./pages/SampleManagementPage"));
const MasterDataPage = lazy(() => import("./pages/MasterDataPage"));
const UserManagementPage = lazy(() => import("./pages/UserManagementPage"));
const DepartmentSelectionPage = lazy(() => import("./pages/DepartmentSelectionPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AppLayout = lazy(() => import("./components/AppLayout"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="w-10 h-10 animate-spin text-primary" />
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const LoginRoute = () => {
  const { loading } = useAuth();
  if (loading) return <PageLoader />;
  return <LoginPage />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<LoginRoute />} />
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/select-department" element={<DepartmentSelectionPage />} />
                <Route path="/quotation" element={<QuotationPage />} />
                <Route path="/samples" element={<SampleManagementPage />} />
                <Route path="/order-export" element={<OrderExportPage />} />
                <Route path="/sales" element={<SalesPage />} />
                <Route path="/master-data" element={<MasterDataPage />} />
                <Route path="/users" element={<UserManagementPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
