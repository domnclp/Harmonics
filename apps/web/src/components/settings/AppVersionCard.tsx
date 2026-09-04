import { useEffect, useState } from "react";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { API_URL } from "../../lib/api";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

type ApiVersion = { commit: string; startedAt: string };

const formatTimestamp = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown";
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

/**
 * Shows which build is actually running, for both halves of the app.
 *
 * The web and API deploy separately and at different speeds, so a single
 * version number cannot answer "did my push land?" — a matching web commit with
 * a stale API one means Render is still building.
 */
export function AppVersionCard() {
  const [api, setApi] = useState<ApiVersion | null>(null);
  const [apiError, setApiError] = useState(false);
  const [checking, setChecking] = useState(false);

  const loadApiVersion = async () => {
    setChecking(true);
    setApiError(false);
    try {
      // Not apiFetch: /version is unauthenticated and lives outside /api.
      const response = await fetch(`${API_URL}/version`);
      if (!response.ok) throw new Error(String(response.status));
      setApi((await response.json()) as ApiVersion);
    } catch {
      // The free tier sleeps, so a cold start can time out the first request.
      setApiError(true);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    void loadApiVersion();
  }, []);

  const [updateReady, setUpdateReady] = useState(false);

  // The service worker caches the app shell, so a deployed update is not live
  // until the new worker takes over. Surfacing that avoids the confusing case
  // where the deploy succeeded but the page still shows the old build.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;
    navigator.serviceWorker.getRegistration().then((registration) => {
      if (!registration || cancelled) return;
      if (registration.waiting) setUpdateReady(true);
      registration.addEventListener("updatefound", () => {
        const installing = registration.installing;
        installing?.addEventListener("statechange", () => {
          if (installing.state === "installed" && navigator.serviceWorker.controller) setUpdateReady(true);
        });
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const checkForUpdate = async () => {
    setChecking(true);
    try {
      const registration = await navigator.serviceWorker?.getRegistration();
      await registration?.update();
    } catch {
      // Non-fatal: the version numbers below are still useful on their own.
    }
    await loadApiVersion();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>App version</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="space-y-2 text-sm">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">Web</dt>
            <dd className="text-right">
              <span className="font-mono">{__APP_COMMIT__}</span>
              <span className="ml-2 text-xs text-muted-foreground">built {formatTimestamp(__APP_BUILT_AT__)}</span>
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">API</dt>
            <dd className="text-right">
              {apiError ? (
                <span className="text-xs text-muted-foreground">unreachable — it may be waking up</span>
              ) : api ? (
                <>
                  <span className="font-mono">{api.commit}</span>
                  <span className="ml-2 text-xs text-muted-foreground">up since {formatTimestamp(api.startedAt)}</span>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">checking...</span>
              )}
            </dd>
          </div>
        </dl>

        {updateReady ? (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-primary/40 bg-accent p-3">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
            <p className="flex-1 text-sm">A newer version is ready.</p>
            <Button type="button" size="sm" onClick={() => window.location.reload()}>
              Reload
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void checkForUpdate()} disabled={checking}>
              <RefreshCw className="h-4 w-4" />
              {checking ? "Checking..." : "Check for updates"}
            </Button>
            <p className="text-xs text-muted-foreground">
              The web and API deploy separately, so their versions can differ for a few minutes.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
