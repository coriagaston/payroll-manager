"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
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
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-slate-400">
        Sin liquidaciones aún
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatCurrency(v, currency).replace(/\s/g, "")}
          width={90}
        />
        <Tooltip
          formatter={(value) => [formatCurrency(Number(value), currency), "Total"]}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
        />
        <Line
          type="monotone"
          dataKey="total"
          stroke="#2563eb"
          strokeWidth={2}
          dot={{ r: 4, fill: "#2563eb" }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
