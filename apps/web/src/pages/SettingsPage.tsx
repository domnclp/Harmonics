import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select } from "../components/ui/select";
import { NotificationSettingsCard } from "../components/settings/NotificationSettingsCard";
import { useAuth } from "../hooks/useAuth";
import { getStoredScheduleWindow, saveScheduleWindowToServer } from "../hooks/useScheduleWindow";
import { getStoredWeekStartsOn, saveWeekStartsOnToServer } from "../hooks/useWeekStartsOn";
import { getStoredActiveDays, saveActiveDaysToServer } from "../hooks/useActiveDays";
import { detectTimezone, useTimezone, saveTimezoneToServer } from "../hooks/useTimezone";
import { getDayOptions, type WeekStartsOn } from "../lib/date";

type ThemeMode = "light" | "dark" | "system";

// Intl.supportedValuesOf is widely available at runtime but is not in this
// project's TS lib target, so it is narrowed here rather than widening lib.
type IntlWithSupportedValues = typeof Intl & {
  supportedValuesOf?: (key: "timeZone") => string[];
};

const getTimezoneOptions = (): string[] => {
  try {
    const supported = (Intl as IntlWithSupportedValues).supportedValuesOf?.("timeZone");
    if (supported?.length) return supported;
  } catch {
    // fall through to the detected zone
  }

  return Array.from(new Set([detectTimezone(), "UTC"]));
};

const timezoneOptions = getTimezoneOptions();

const getMetadataValue = (metadata: Record<string, unknown> | undefined, keys: string[]) => {
  for (const key of keys) {
    const value = metadata?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return "";
};

export function SettingsPage() {
  const { user, updateProfile } = useAuth();
  const name = getMetadataValue(user?.user_metadata, ["name", "full_name"]);
  const username =
    getMetadataValue(user?.user_metadata, ["username", "user_name", "preferred_username"]) ||
    user?.email?.split("@")[0] ||
    "";
  const [profileName, setProfileName] = useState(name);
  const [profileUsername, setProfileUsername] = useState(username);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>((localStorage.getItem("theme") as ThemeMode) ?? "system");
  const [timeFormat, setTimeFormat] = useState(localStorage.getItem("timeFormat") ?? "12");
  const [savedScheduleWindow, setSavedScheduleWindow] = useState(getStoredScheduleWindow);
  const [scheduleStart, setScheduleStart] = useState(() => getStoredScheduleWindow().startTime);
  const [scheduleEnd, setScheduleEnd] = useState(() => getStoredScheduleWindow().endTime);
  const [weekStartsOn, setWeekStartsOn] = useState<WeekStartsOn>(getStoredWeekStartsOn);
  const [savedActiveDays, setSavedActiveDays] = useState(getStoredActiveDays);
  const [activeDays, setActiveDays] = useState(getStoredActiveDays);
  const savedTimezone = useTimezone();
  const [timezone, setTimezone] = useState(savedTimezone);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [weekSaving, setWeekSaving] = useState(false);
  const [activeDaysSaving, setActiveDaysSaving] = useState(false);
  const [timezoneSaving, setTimezoneSaving] = useState(false);
  const timezoneChanged = timezone !== savedTimezone;
  const activeDaysChanged = JSON.stringify([...activeDays].sort()) !== JSON.stringify([...savedActiveDays].sort());
  const activeDaysValid = activeDays.length > 0;
  const scheduleWindowChanged = scheduleStart !== savedScheduleWindow.startTime || scheduleEnd !== savedScheduleWindow.endTime;
  const scheduleWindowValid = Boolean(scheduleStart && scheduleEnd);
  const profileChanged = profileName.trim() !== name || profileUsername.trim() !== username;
  const profileValid = Boolean(profileName.trim()) && Boolean(profileUsername.trim());

  useEffect(() => {
    setProfileName(name);
    setProfileUsername(username);
    setProfileMessage("");
    setProfileError("");
  }, [name, username]);

  useEffect(() => {
    localStorage.setItem("theme", theme);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", theme === "dark" || (theme === "system" && prefersDark));
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("timeFormat", timeFormat);
  }, [timeFormat]);

  // useTimezone resolves asynchronously (localStorage first, then server), so
  // keep the draft in step until the user edits it.
  useEffect(() => {
    setTimezone(savedTimezone);
  }, [savedTimezone]);

  useEffect(() => {
    setWeekSaving(true);
    saveWeekStartsOnToServer(weekStartsOn).finally(() => setWeekSaving(false));
  }, [weekStartsOn]);

  const saveDefaultScheduleWindow = async () => {
    if (!scheduleWindowValid) return;

    setScheduleSaving(true);
    try {
      const nextWindow = await saveScheduleWindowToServer({ startTime: scheduleStart, endTime: scheduleEnd });
      setSavedScheduleWindow(nextWindow);
    } finally {
      setScheduleSaving(false);
    }
  };

  const undoDefaultScheduleWindow = () => {
    setScheduleStart(savedScheduleWindow.startTime);
    setScheduleEnd(savedScheduleWindow.endTime);
  };

  const toggleActiveDay = (dayOfWeek: number) => {
    setActiveDays((days) =>
      days.includes(dayOfWeek) ? days.filter((day) => day !== dayOfWeek) : [...days, dayOfWeek].sort((a, b) => a - b)
    );
  };

  const saveActiveDays = async () => {
    if (!activeDaysValid) return;

    setActiveDaysSaving(true);
    try {
      const saved = await saveActiveDaysToServer(activeDays);
      setSavedActiveDays(saved);
      setActiveDays(saved);
    } finally {
      setActiveDaysSaving(false);
    }
  };

  const undoActiveDays = () => {
    setActiveDays(savedActiveDays);
  };

  const saveTimezone = async () => {
    setTimezoneSaving(true);
    try {
      await saveTimezoneToServer(timezone);
    } finally {
      setTimezoneSaving(false);
    }
  };

  const undoTimezone = () => {
    setTimezone(savedTimezone);
  };

  const saveProfile = async () => {
    if (!profileValid) return;

    setProfileSaving(true);
    setProfileMessage("");
    setProfileError("");

    try {
      await updateProfile({
        name: profileName.trim(),
        username: profileUsername.trim()
      });
      setProfileMessage("Profile updated.");
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Could not update profile.");
    } finally {
      setProfileSaving(false);
    }
  };

  const undoProfile = () => {
    setProfileName(name);
    setProfileUsername(username);
    setProfileMessage("");
    setProfileError("");
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold">Settings</h2>
        <p className="text-sm text-muted-foreground">Profile, display, and schedule defaults.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profileName">Name</Label>
              <Input id="profileName" value={profileName} onChange={(event) => setProfileName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profileUsername">Username</Label>
              <Input id="profileUsername" value={profileUsername} onChange={(event) => setProfileUsername(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profileEmail">Email</Label>
              <Input id="profileEmail" value={user?.email ?? ""} readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profileUserId">User ID</Label>
              <Input id="profileUserId" value={user?.id ?? ""} disabled aria-disabled="true" />
            </div>
            {!profileValid && <p className="text-sm text-destructive">Name and username are required.</p>}
            {profileError && <p className="text-sm text-destructive">{profileError}</p>}
            {profileMessage && <p className="text-sm text-primary">{profileMessage}</p>}
            {profileChanged && (
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={() => void saveProfile()} disabled={!profileValid || profileSaving}>
                  {profileSaving ? "Saving..." : "Save"}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={undoProfile} disabled={profileSaving}>
                  Undo
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <Select id="theme" value={theme} onChange={(event) => setTheme(event.target.value as ThemeMode)}>
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeFormat">Time format</Label>
              <Select id="timeFormat" value={timeFormat} onChange={(event) => setTimeFormat(event.target.value)}>
                <option value="12">12-hour</option>
                <option value="24">24-hour</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="weekStartsOn">Week starts on</Label>
              <Select id="weekStartsOn" value={weekStartsOn} onChange={(event) => setWeekStartsOn(event.target.value as WeekStartsOn)} disabled={weekSaving}>
                <option value="monday">Monday</option>
                <option value="sunday">Sunday</option>
              </Select>
            </div>
            {weekSaving && <p className="text-xs text-muted-foreground">Saving...</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active schedule window</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="scheduleStart">Start time</Label>
                <Input id="scheduleStart" type="time" step="1800" value={scheduleStart} onChange={(event) => setScheduleStart(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduleEnd">End time</Label>
                <Input id="scheduleEnd" type="time" step="1800" value={scheduleEnd} onChange={(event) => setScheduleEnd(event.target.value)} />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              The hours you are realistically awake and able to follow a routine. New blocks must start and end inside this
              window. End times earlier than the start are treated as the next day.
            </p>
            {scheduleWindowChanged && (
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={() => void saveDefaultScheduleWindow()} disabled={!scheduleWindowValid || scheduleSaving}>
                  {scheduleSaving ? "Saving..." : "Save"}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={undoDefaultScheduleWindow} disabled={scheduleSaving}>
                  Undo
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active days</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose which days are part of your schedule. Days you turn off are hidden from the weekly schedule and dashboard.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {getDayOptions(weekStartsOn).map(({ label, dayOfWeek }) => (
                <label key={label} className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={activeDays.includes(dayOfWeek)}
                    onChange={() => toggleActiveDay(dayOfWeek)}
                    disabled={activeDaysSaving}
                  />
                  {label}
                </label>
              ))}
            </div>
            {!activeDaysValid && <p className="text-sm text-destructive">Choose at least one day.</p>}
            {activeDaysChanged && (
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={() => void saveActiveDays()} disabled={!activeDaysValid || activeDaysSaving}>
                  {activeDaysSaving ? "Saving..." : "Save"}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={undoActiveDays} disabled={activeDaysSaving}>
                  Undo
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Time zone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Used to send reminders at the right local time. Detected automatically the first time you sign in.
            </p>
            <div className="space-y-2">
              <Label htmlFor="timezone">Time zone</Label>
              <Select id="timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)} disabled={timezoneSaving}>
                {timezoneOptions.map((zone) => (
                  <option key={zone} value={zone}>{zone}</option>
                ))}
              </Select>
            </div>
            {timezoneChanged && (
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={() => void saveTimezone()} disabled={timezoneSaving}>
                  {timezoneSaving ? "Saving..." : "Save"}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={undoTimezone} disabled={timezoneSaving}>
                  Undo
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <NotificationSettingsCard />
      </div>
    </div>
  );
}
