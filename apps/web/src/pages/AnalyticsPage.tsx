import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BlockCompletionChart } from "../components/analytics/BlockCompletionChart";
import { FailureReasonChart } from "../components/analytics/FailureReasonChart";
import { WeeklyCompletionChart } from "../components/analytics/WeeklyCompletionChart";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { getMonday, toDateKey } from "../lib/date";
import { palette } from "../lib/palette";
import { useAnalytics } from "../hooks/useAnalytics";

export function AnalyticsPage() {
  const weekStart = toDateKey(getMonday());
  const { weekly, templates, failureReasons } = useAnalytics(weekStart);
  const weeklyData = weekly.data;
  const templateData = templates.data;
  const failureData = failureReasons.data;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold">Analytics</h2>
        <p className="text-sm text-muted-foreground">Completion patterns from daily block instances.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric title="Weekly completion" value={`${weeklyData?.overall ?? 0}%`} />
        <Metric title="Most completed" value={templateData?.mostCompleted?.name ?? "No data"} />
        <Metric title="Least completed" value={templateData?.leastCompleted?.name ?? "No data"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <WeeklyCompletionChart data={weeklyData?.daily ?? []} />
        <BlockCompletionChart data={templateData?.templates ?? []} />
        <FailureReasonChart data={failureData?.reasons ?? []} />
        <Card>
          <CardHeader>
            <CardTitle>Habit completion trend</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData?.daily ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="completion" stroke={palette.meltedCandleSticks} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Most skipped habits and tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {failureData?.skippedItems.length ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {failureData.skippedItems.map((item) => (
                <div key={item.title} className="rounded-md border p-3">
                  <div className="font-medium">{item.title}</div>
                  <div className="text-sm text-muted-foreground">{item.count} skips</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No skipped items recorded yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="text-sm text-muted-foreground">{title}</div>
        <div className="mt-1 truncate text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
