import { createBrowserRouter, Navigate, Outlet, useRouteError } from "react-router-dom";
import { lazy, Suspense } from "react";
import type { ComponentType, ReactNode } from "react";
import { AppLayout } from "../components/layout/AppLayout";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/ui/button";

const chunkReloadKey = "harmonics:chunk-reload-attempted";

const isChunkLoadError = (error: unknown) =>
  error instanceof Error && /dynamically imported module|importing a module script failed|loading chunk/i.test(error.message);

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

function PageLoader() {
  return <div className="grid min-h-72 place-items-center text-muted-foreground">Loading...</div>;
}

function withSuspense(element: ReactNode) {
  return <Suspense fallback={<PageLoader />}>{element}</Suspense>;
}

function RouteError() {
  const error = useRouteError();
  const message = error instanceof Error ? error.message : "Something went wrong.";
  const isUpdatedAppError = isChunkLoadError(error);

  return (
    <div className="grid min-h-screen place-items-center bg-background p-6 text-foreground">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-soft">
        <h1 className="text-xl font-semibold">{isUpdatedAppError ? "App update needed" : "Something went wrong"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isUpdatedAppError
            ? "The app was updated while this tab was open. Reload to continue with the latest version."
            : message}
        </p>
        <Button className="mt-5" onClick={() => window.location.reload()}>
          Reload
        </Button>
      </div>
    </div>
  );
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
