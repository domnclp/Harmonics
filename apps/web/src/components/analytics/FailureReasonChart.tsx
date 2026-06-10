import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { chartColors } from "../../lib/palette";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

export function FailureReasonChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Failure reasons</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" outerRadius={96} label>
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
