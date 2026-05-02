"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { useTheme } from "next-themes";
import { formatCurrency } from "@/lib/payroll/calculator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface MonthData {
  label: string;
  totalAmount: number;
  periodSalary: number;
  extrasAmount: number;
  employeeCount: number;
  overtimeHours50: number;
  overtimeHours100: number;
  overtimeHoursHoliday: number;
  absenceDays: number;
}

interface Props {
  data: MonthData[];
  currency: string;
}

const fmt = (v: number, currency: string) =>
  formatCurrency(v, currency).replace(/\s/g, "").replace(/,\d+$/, "");

export function AnalyticsCharts({ data, currency }: Props) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const gridColor = isDark ? "rgba(255,255,255,0.08)" : "#f1f5f9";
  const tickColor = isDark ? "rgba(255,255,255,0.45)" : "#94a3b8";
  const tooltipStyle = {
    fontSize: 12,
    borderRadius: 8,
    border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "#e2e8f0"}`,
    backgroundColor: isDark ? "#1e2030" : "#ffffff",
    color: isDark ? "rgba(255,255,255,0.9)" : "#0f172a",
  };

  const hasData = data.some((d) => d.totalAmount > 0);
  const last3 = data.slice(-3).filter((d) => d.totalAmount > 0);
  const last6 = data.slice(-6);

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground bg-card rounded-lg border">
        No hay liquidaciones finalizadas en los últimos 12 meses
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI resumen últimos 3 meses */}
      {last3.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          {last3.map((month, i) => {
            const prev = last3[i - 1];
            const diff = prev && prev.totalAmount > 0
              ? ((month.totalAmount - prev.totalAmount) / prev.totalAmount) * 100
              : null;
            return (
              <Card key={month.label}>
                <CardHeader className="pb-1">
                  <CardTitle className="text-sm font-medium text-muted-foreground capitalize">
                    {month.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <p className="text-xl font-bold">{formatCurrency(month.totalAmount, currency)}</p>
                  <p className="text-xs text-muted-foreground">{month.employeeCount} empleados liquidados</p>
                  <div className="flex items-center gap-2">
                    {diff !== null && (
                      <span className={`text-xs font-medium ${diff >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
                        {diff >= 0 ? "+" : ""}{diff.toFixed(1)}% vs mes ant.
                      </span>
                    )}
                    {month.extrasAmount > 0 && (
                      <span className="text-xs text-amber-600 dark:text-amber-400">
                        {formatCurrency(month.extrasAmount, currency)} en extras
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Masa salarial mensual */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Masa salarial mensual (últimos 12 meses)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: tickColor }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => fmt(v, currency)}
                width={95}
              />
              <Tooltip
                formatter={(value) => [formatCurrency(Number(value), currency), "Total neto"]}
                contentStyle={tooltipStyle}
              />
              <Bar dataKey="totalAmount" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Total neto" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Desglose: salario base vs extras */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Desglose: salario base vs horas extras</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: tickColor }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => fmt(v, currency)}
                width={95}
              />
              <Tooltip
                formatter={(value, name) => [
                  formatCurrency(Number(value), currency),
                  name === "periodSalary" ? "Salario base" : "Horas extras",
                ]}
                contentStyle={tooltipStyle}
              />
              <Legend
                formatter={(value) => value === "periodSalary" ? "Salario base" : "Horas extras"}
                iconType="square"
                iconSize={10}
              />
              <Bar dataKey="periodSalary" stackId="a" fill="#60a5fa" name="periodSalary" />
              <Bar dataKey="extrasAmount" stackId="a" fill="#f59e0b" name="extrasAmount" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Horas extras por tipo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Horas extras por mes</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: tickColor }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: tickColor }} axisLine={false} tickLine={false} width={35} />
                <Tooltip
                  formatter={(value, name) => [
                    `${Number(value).toFixed(1)}h`,
                    name === "overtimeHours50" ? "50%" : name === "overtimeHours100" ? "100%" : "Feriado",
                  ]}
                  contentStyle={tooltipStyle}
                />
                <Legend
                  formatter={(value) =>
                    value === "overtimeHours50" ? "50%" : value === "overtimeHours100" ? "100%" : "Feriado"
                  }
                  iconType="square"
                  iconSize={10}
                />
                <Bar dataKey="overtimeHours50" stackId="b" fill="#10b981" name="overtimeHours50" />
                <Bar dataKey="overtimeHours100" stackId="b" fill="#f59e0b" name="overtimeHours100" />
                <Bar dataKey="overtimeHoursHoliday" stackId="b" fill="#ef4444" name="overtimeHoursHoliday" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Días de ausencia */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Días de ausencia por mes</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: tickColor }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: tickColor }} axisLine={false} tickLine={false} width={35} />
                <Tooltip
                  formatter={(value) => [`${value} días`, "Ausencias"]}
                  contentStyle={tooltipStyle}
                />
                <Bar dataKey="absenceDays" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Ausencias" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabla comparativa */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tabla comparativa — últimos 6 meses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left pb-2 font-medium">Mes</th>
                  <th className="text-right pb-2 font-medium">Total neto</th>
                  <th className="text-right pb-2 font-medium">Sal. base</th>
                  <th className="text-right pb-2 font-medium">Extras</th>
                  <th className="text-right pb-2 font-medium">Empleados</th>
                  <th className="text-right pb-2 font-medium">HS extra</th>
                  <th className="text-right pb-2 font-medium">Ausencias</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[...last6].reverse().map((month) => {
                  const totalOT = month.overtimeHours50 + month.overtimeHours100 + month.overtimeHoursHoliday;
                  const isEmpty = month.totalAmount === 0 && totalOT === 0 && month.absenceDays === 0;
                  if (isEmpty) return null;
                  return (
                    <tr key={month.label}>
                      <td className="py-2 font-medium capitalize">{month.label}</td>
                      <td className="py-2 text-right font-semibold">
                        {month.totalAmount > 0 ? formatCurrency(month.totalAmount, currency) : "—"}
                      </td>
                      <td className="py-2 text-right text-muted-foreground">
                        {month.periodSalary > 0 ? formatCurrency(month.periodSalary, currency) : "—"}
                      </td>
                      <td className="py-2 text-right">
                        {month.extrasAmount > 0 ? (
                          <span className="text-amber-600 dark:text-amber-400">
                            {formatCurrency(month.extrasAmount, currency)}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="py-2 text-right">{month.employeeCount > 0 ? month.employeeCount : "—"}</td>
                      <td className="py-2 text-right">{totalOT > 0 ? `${totalOT.toFixed(1)}h` : "—"}</td>
                      <td className="py-2 text-right">
                        {month.absenceDays > 0 ? (
                          <span className="text-violet-600 dark:text-violet-400">{month.absenceDays}d</span>
                        ) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
