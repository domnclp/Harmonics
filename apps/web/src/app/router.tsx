import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { lazy, Suspense } from "react";
import type { ReactNode } from "react";
import { AppLayout } from "../components/layout/AppLayout";
import { useAuth } from "../hooks/useAuth";

const AnalyticsPage = lazy(() => import("../pages/AnalyticsPage").then((module) => ({ default: module.AnalyticsPage })));
const DashboardPage = lazy(() => import("../pages/DashboardPage").then((module) => ({ default: module.DashboardPage })));
const LoginPage = lazy(() => import("../pages/LoginPage").then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import("../pages/RegisterPage").then((module) => ({ default: module.RegisterPage })));
const SchedulePage = lazy(() => import("../pages/SchedulePage").then((module) => ({ default: module.SchedulePage })));
const SettingsPage = lazy(() => import("../pages/SettingsPage").then((module) => ({ default: module.SettingsPage })));
const TemplatesPage = lazy(() => import("../pages/TemplatesPage").then((module) => ({ default: module.TemplatesPage })));

function PageLoader() {
  return <div className="grid min-h-72 place-items-center text-muted-foreground">Loading...</div>;
}

function withSuspense(element: ReactNode) {
  return <Suspense fallback={<PageLoader />}>{element}</Suspense>;
}

function ProtectedRoute() {
  const { session, loading } = useAuth();

  if (loading) {
    return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading workspace...</div>;
  }

  if (!session) return <Navigate to="/login" replace />;

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

function PublicRoute() {
  const { session, loading } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading...</div>;
  if (session) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    element: <PublicRoute />,
    children: [
      { path: "/login", element: withSuspense(<LoginPage />) },
      { path: "/register", element: withSuspense(<RegisterPage />) }
    ]
  },
  {
    element: <ProtectedRoute />,
    children: [
      { path: "/", element: <Navigate to="/dashboard" replace /> },
      { path: "/dashboard", element: withSuspense(<DashboardPage />) },
      { path: "/schedule", element: withSuspense(<SchedulePage />) },
      { path: "/templates", element: withSuspense(<TemplatesPage />) },
      { path: "/analytics", element: withSuspense(<AnalyticsPage />) },
      { path: "/settings", element: withSuspense(<SettingsPage />) }
    ]
  }
]);
