import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select } from "../ui/select";
import { usePushNotifications } from "../../hooks/usePushNotifications";
import {
  saveNotificationPrefsToServer,
  useNotificationPrefs,
  type NotificationPrefs
} from "../../hooks/useNotificationPrefs";

const leadMinuteOptions = [5, 10, 15, 30];

const toggles: { key: keyof NotificationPrefs; label: string; hint: string }[] = [
  { key: "headsUpEnabled", label: "Heads-up before a block", hint: "A nudge shortly before a block starts." },
  { key: "blockStartEnabled", label: "When a block starts", hint: "A second nudge at the exact start time." },
  { key: "blockEndEnabled", label: "Unmarked items when a block ends", hint: "A gentle reminder of anything left open." },
  { key: "streakRiskEnabled", label: "Streak at risk", hint: "An evening nudge when a habit streak is still open." },
  { key: "dailyAgendaEnabled", label: "Daily agenda", hint: "A morning summary of the day ahead." },
  { key: "dayWrapUpEnabled", label: "End-of-day wrap-up", hint: "An evening summary of how the day went." }
];

export function NotificationSettingsCard() {
  const { state, busy, error, subscribe, unsubscribe, sendTest } = usePushNotifications();
  const savedPrefs = useNotificationPrefs();
  const [prefs, setPrefs] = useState(savedPrefs);
  const [saving, setSaving] = useState(false);
  const [testMessage, setTestMessage] = useState("");

  // useNotificationPrefs resolves asynchronously; track it until the user edits.
  useEffect(() => {
    setPrefs(savedPrefs);
  }, [savedPrefs]);

  const changed = JSON.stringify(prefs) !== JSON.stringify(savedPrefs);

  const savePrefs = async () => {
    setSaving(true);
    try {
      await saveNotificationPrefsToServer(prefs);
    } finally {
      setSaving(false);
    }
  };

  const runTest = async () => {
    setTestMessage("");
    await sendTest();
    setTestMessage("Test sent — it should appear shortly.");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {state === "loading" && <p className="text-sm text-muted-foreground">Checking notification support...</p>}

        {state === "unsupported" && (
          <p className="text-sm text-muted-foreground">
            This browser does not support push notifications. Try Chrome or Edge on desktop, or Safari on iPhone.
          </p>
        )}

        {state === "ios-needs-install" && (
          <div className="space-y-2 rounded-lg border bg-muted p-4 text-sm">
            <p className="font-semibold">Notifications on iPhone need one extra step</p>
            <p className="text-muted-foreground">iOS only allows notifications from apps added to your Home Screen.</p>
            <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
              <li>Tap the Share button at the bottom of Safari</li>
              <li>Scroll down and tap <span className="font-medium text-foreground">Add to Home Screen</span></li>
              <li>Open Harmonics from your Home Screen and come back here</li>
            </ol>
            <p className="text-xs text-muted-foreground">
              Safari only — Chrome and Firefox on iOS cannot do this. You will need to sign in again inside the
              installed app, and it requires iOS 16.4 or later.
            </p>
          </div>
        )}

        {state === "denied" && (
          <p className="text-sm text-muted-foreground">
            Notifications are blocked for this site. Re-enable them in your browser settings, then reload this page.
          </p>
        )}

        {state === "default" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Get reminders for your blocks, habits, and tasks.</p>
            <Button type="button" size="sm" onClick={() => void subscribe()} disabled={busy}>
              {busy ? "Enabling..." : "Enable notifications"}
            </Button>
          </div>
        )}

        {state === "subscribed" && (
          <div className="space-y-4">
            <div className="space-y-3">
              {toggles.map(({ key, label, hint }) => (
                <label key={key} className="flex items-start gap-3 rounded-md border bg-background px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 accent-primary"
                    checked={Boolean(prefs[key])}
                    onChange={(event) => setPrefs((current) => ({ ...current, [key]: event.target.checked }))}
                    disabled={saving}
                  />
                  <span>
                    <span className="block font-medium">{label}</span>
                    <span className="block text-xs text-muted-foreground">{hint}</span>
                  </span>
                </label>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="headsUpMinutes">Heads-up lead time</Label>
                <Select
                  id="headsUpMinutes"
                  value={String(prefs.headsUpMinutes)}
                  onChange={(event) => setPrefs((current) => ({ ...current, headsUpMinutes: Number(event.target.value) }))}
                  disabled={saving || !prefs.headsUpEnabled}
                >
                  {leadMinuteOptions.map((minutes) => (
                    <option key={minutes} value={minutes}>{minutes} minutes before</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="streakRiskTime">Streak reminder time</Label>
                <Input
                  id="streakRiskTime"
                  type="time"
                  value={prefs.streakRiskTime}
                  onChange={(event) => setPrefs((current) => ({ ...current, streakRiskTime: event.target.value }))}
                  disabled={saving || !prefs.streakRiskEnabled}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dayWrapUpTime">Wrap-up time</Label>
                <Input
                  id="dayWrapUpTime"
                  type="time"
                  value={prefs.dayWrapUpTime}
                  onChange={(event) => setPrefs((current) => ({ ...current, dayWrapUpTime: event.target.value }))}
                  disabled={saving || !prefs.dayWrapUpEnabled}
                />
              </div>
            </div>

            {changed && (
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={() => void savePrefs()} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setPrefs(savedPrefs)} disabled={saving}>
                  Undo
                </Button>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 border-t pt-4">
              <Button type="button" variant="outline" size="sm" onClick={() => void runTest()} disabled={busy}>
                Send test notification
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => void unsubscribe()} disabled={busy}>
                Turn off
              </Button>
            </div>
            {testMessage && <p className="text-sm text-primary">{testMessage}</p>}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
