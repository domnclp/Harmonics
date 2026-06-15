import { Navigate, Outlet, useRouteError } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { Button } from "../components/ui/button";
import { useAuth } from "../hooks/useAuth";
import { isChunkLoadError } from "./chunkErrors";

export function PageLoader() {
  return <div className="grid min-h-72 place-items-center text-muted-foreground">Loading...</div>;
}

export function RouteError() {
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

export function ProtectedRoute() {
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

export function PublicRoute() {
  const { session, loading } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading...</div>;
  if (session) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
