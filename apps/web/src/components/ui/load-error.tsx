import { AlertCircle } from "lucide-react";
import { API_URL } from "../../lib/api";

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "Request failed");

export function LoadError({ error, label }: { error: unknown; label: string }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="space-y-1">
          <p className="font-semibold">Could not load {label}.</p>
          <p>{getErrorMessage(error)}</p>
          <p className="text-xs text-destructive/80">API: {API_URL}</p>
        </div>
      </div>
    </div>
  );
}
