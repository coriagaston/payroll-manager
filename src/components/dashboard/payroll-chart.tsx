"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useTheme } from "next-themes";
import { formatCurrency } from "@/lib/payroll/calculator";

interface DataPoint {
  label: string;
  total: number;
}

interface Props {
  data: DataPoint[];
  currency: string;
}

export function PayrollChart({ data, currency }: Props) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const gridColor = isDark ? "rgba(255,255,255,0.08)" : "#f1f5f9";
  const tickColor = isDark ? "rgba(255,255,255,0.45)" : "#94a3b8";
  const tooltipBg = isDark ? "#1e2030" : "#ffffff";
  const tooltipBorder = isDark ? "rgba(255,255,255,0.12)" : "#e2e8f0";

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
        Sin liquidaciones aún
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: tickColor }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: tickColor }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatCurrency(v, currency).replace(/\s/g, "")}
          width={90}
        />
        <Tooltip
          formatter={(value) => [formatCurrency(Number(value), currency), "Total"]}
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: `1px solid ${tooltipBorder}`,
            backgroundColor: tooltipBg,
            color: isDark ? "rgba(255,255,255,0.9)" : "#0f172a",
          }}
        />
        <Line
          type="monotone"
          dataKey="total"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ r: 4, fill: "#3b82f6" }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
