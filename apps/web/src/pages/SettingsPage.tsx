import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select } from "../components/ui/select";
import { useAuth } from "../hooks/useAuth";

type ThemeMode = "light" | "dark" | "system";

export function SettingsPage() {
  const { user } = useAuth();
  const [theme, setTheme] = useState<ThemeMode>((localStorage.getItem("theme") as ThemeMode) ?? "system");
  const [timeFormat, setTimeFormat] = useState(localStorage.getItem("timeFormat") ?? "12");
  const [scheduleStart, setScheduleStart] = useState(localStorage.getItem("scheduleStart") ?? "06:00");
  const [scheduleEnd, setScheduleEnd] = useState(localStorage.getItem("scheduleEnd") ?? "23:00");

  useEffect(() => {
    localStorage.setItem("theme", theme);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", theme === "dark" || (theme === "system" && prefersDark));
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("timeFormat", timeFormat);
    localStorage.setItem("scheduleStart", scheduleStart);
    localStorage.setItem("scheduleEnd", scheduleEnd);
  }, [timeFormat, scheduleStart, scheduleEnd]);

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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Default schedule window</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="scheduleStart">Start time</Label>
              <Input id="scheduleStart" type="time" value={scheduleStart} onChange={(event) => setScheduleStart(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scheduleEnd">End time</Label>
              <Input id="scheduleEnd" type="time" value={scheduleEnd} onChange={(event) => setScheduleEnd(event.target.value)} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
