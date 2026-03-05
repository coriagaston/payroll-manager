import type { PayrollResult } from "./types";

export interface CsvExportOptions {
  currency?: string;
  includeFormula?: boolean;
}

const fmt = (n: number) => n.toFixed(2).replace(".", ",");

export function generatePayrollCsv(
  results: PayrollResult[],
  periodLabel: string,
  options: CsvExportOptions = {}
): string {
  const { currency = "ARS" } = options;

  const headers = [
    "Empleado",
    "Frecuencia",
    "Sueldo Base",
    `Sueldo Período (${periodLabel})`,
    "Valor Hora",
    "HS Extra 50% (cant)",
    "HS Extra 50% (monto)",
    "HS Extra 100% (cant)",
    "HS Extra 100% (monto)",
    "HS Feriado (cant)",
    "HS Feriado (monto)",
    "Total Extras",
    "Anticipos",
    "Descuentos",
    "TOTAL A COBRAR",
    "Moneda",
  ];

  const rows = results.map((r) => [
    r.employeeName,
    r.formula.frequency,
    fmt(r.baseSalary),
    fmt(r.periodSalary),
    fmt(r.hourlyRate),
    fmt(r.extra50Hours),
    fmt(r.extra50Amount),
    fmt(r.extra100Hours),
    fmt(r.extra100Amount),
    fmt(r.holidayHours),
    fmt(r.holidayAmount),
    fmt(r.extra50Amount + r.extra100Amount + r.holidayAmount),
    fmt(r.advances),
    fmt(r.discounts),
    fmt(r.totalAmount),
    currency,
  ]);

  const escape = (v: string) =>
    v.includes(",") || v.includes('"') || v.includes("\n")
      ? `"${v.replace(/"/g, '""')}"`
      : v;

  const lines = [headers, ...rows].map((row) => row.map(escape).join(","));
  return lines.join("\n");
}

export function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
