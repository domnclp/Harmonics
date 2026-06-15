import { lazy, Suspense, useEffect, useState } from "react";

const SpeedInsights = lazy(() =>
  import("@vercel/speed-insights/react").then((module) => ({ default: module.SpeedInsights }))
);

export function DeferredSpeedInsights() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (["localhost", "127.0.0.1"].includes(window.location.hostname)) return;

    const schedule = window.requestIdleCallback ?? ((callback: IdleRequestCallback) => window.setTimeout(callback, 2500));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const handle = schedule(() => setEnabled(true));

    return () => cancel(handle);
  }, []);

  if (!enabled) return null;

  return (
    <Suspense fallback={null}>
      <SpeedInsights />
    </Suspense>
  );
}
