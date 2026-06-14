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

export function SettingsPage() {
  const { user } = useAuth();
  const [theme, setTheme] = useState<ThemeMode>((localStorage.getItem("theme") as ThemeMode) ?? "system");
  const [timeFormat, setTimeFormat] = useState(localStorage.getItem("timeFormat") ?? "12");
  const [savedScheduleWindow, setSavedScheduleWindow] = useState(getStoredScheduleWindow);
  const [scheduleStart, setScheduleStart] = useState(() => getStoredScheduleWindow().startTime);
  const [scheduleEnd, setScheduleEnd] = useState(() => getStoredScheduleWindow().endTime);
  const [weekStartsOn, setWeekStartsOn] = useState<WeekStartsOn>(getStoredWeekStartsOn);
  const scheduleWindowChanged = scheduleStart !== savedScheduleWindow.startTime || scheduleEnd !== savedScheduleWindow.endTime;
  const scheduleWindowValid = toMinutes(scheduleEnd) > toMinutes(scheduleStart);

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
              <Label>Email</Label>
              <Input value={user?.email ?? ""} readOnly />
            </div>
            <div className="space-y-2">
              <Label>User ID</Label>
              <Input value={user?.id ?? ""} readOnly />
            </div>
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
