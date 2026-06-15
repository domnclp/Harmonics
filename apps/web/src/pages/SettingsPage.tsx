import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select } from "../components/ui/select";
import { useAuth } from "../hooks/useAuth";
import { getStoredScheduleWindow, saveScheduleWindow } from "../hooks/useScheduleWindow";
import { getStoredWeekStartsOn, saveWeekStartsOn } from "../hooks/useWeekStartsOn";
import { toMinutes, type WeekStartsOn } from "../lib/date";

type ThemeMode = "light" | "dark" | "system";

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
  const scheduleWindowChanged = scheduleStart !== savedScheduleWindow.startTime || scheduleEnd !== savedScheduleWindow.endTime;
  const scheduleWindowValid = toMinutes(scheduleEnd) > toMinutes(scheduleStart);
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
    saveWeekStartsOn(weekStartsOn);
  }, [timeFormat, weekStartsOn]);

  const saveDefaultScheduleWindow = () => {
    if (!scheduleWindowValid) return;

    const nextWindow = { startTime: scheduleStart, endTime: scheduleEnd };
    saveScheduleWindow(nextWindow);
    setSavedScheduleWindow(nextWindow);
  };

  const undoDefaultScheduleWindow = () => {
    setScheduleStart(savedScheduleWindow.startTime);
    setScheduleEnd(savedScheduleWindow.endTime);
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
              <Select id="weekStartsOn" value={weekStartsOn} onChange={(event) => setWeekStartsOn(event.target.value as WeekStartsOn)}>
                <option value="monday">Monday</option>
                <option value="sunday">Sunday</option>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Default schedule window</CardTitle>
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
            {!scheduleWindowValid && <p className="text-sm text-destructive">End time must be after start time.</p>}
            {scheduleWindowChanged && (
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={saveDefaultScheduleWindow} disabled={!scheduleWindowValid}>
                  Save
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={undoDefaultScheduleWindow}>
                  Undo
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
