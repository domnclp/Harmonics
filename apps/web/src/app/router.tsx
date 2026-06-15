import { createBrowserRouter, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import type { ComponentType, ReactNode } from "react";
import { chunkReloadKey, isChunkLoadError } from "./chunkErrors";
import { PageLoader, ProtectedRoute, PublicRoute, RouteError } from "./routeComponents";

const loadPage = async <TModule extends Record<string, unknown>, TExport extends keyof TModule>(
  importer: () => Promise<TModule>,
  exportName: TExport
) => {
  try {
    const module = await importer();
    window.sessionStorage.removeItem(chunkReloadKey);
    return { default: module[exportName] as ComponentType };
  } catch (error) {
    if (isChunkLoadError(error) && !window.sessionStorage.getItem(chunkReloadKey)) {
      window.sessionStorage.setItem(chunkReloadKey, "true");
      window.location.reload();
      return new Promise<{ default: ComponentType }>(() => undefined);
    }

    throw error;
  }
};

const AnalyticsPage = lazy(() => loadPage(() => import("../pages/AnalyticsPage"), "AnalyticsPage"));
const DashboardPage = lazy(() => loadPage(() => import("../pages/DashboardPage"), "DashboardPage"));
const LoginPage = lazy(() => loadPage(() => import("../pages/LoginPage"), "LoginPage"));
const RegisterPage = lazy(() => loadPage(() => import("../pages/RegisterPage"), "RegisterPage"));
const SchedulePage = lazy(() => loadPage(() => import("../pages/SchedulePage"), "SchedulePage"));
const SettingsPage = lazy(() => loadPage(() => import("../pages/SettingsPage"), "SettingsPage"));
const TemplatesPage = lazy(() => loadPage(() => import("../pages/TemplatesPage"), "TemplatesPage"));

function withSuspense(element: ReactNode) {
  return <Suspense fallback={<PageLoader />}>{element}</Suspense>;
}

export const router = createBrowserRouter([
  {
    errorElement: <RouteError />,
    element: <PublicRoute />,
    children: [
      { path: "/login", element: withSuspense(<LoginPage />) },
      { path: "/register", element: withSuspense(<RegisterPage />) }
    ]
  },
  {
    errorElement: <RouteError />,
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
