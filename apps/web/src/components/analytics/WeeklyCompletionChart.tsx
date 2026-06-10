import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { palette } from "../../lib/palette";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

export function WeeklyCompletionChart({ data }: { data: { date: string; completion: number }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly completion</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="completion" fill={palette.gardenAfterRain} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
