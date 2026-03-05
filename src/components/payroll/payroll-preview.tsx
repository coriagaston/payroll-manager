"use client";

import { formatCurrency } from "@/lib/payroll/calculator";
import type { PayrollResult } from "@/lib/payroll/types";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";

interface Props {
  results: PayrollResult[];
  currency: string;
  startDate: string;
  endDate: string;
}

const freqLabel: Record<string, string> = {
  WEEKLY: "Semanal",
  BIWEEKLY: "Quincenal",
  MONTHLY: "Mensual",
};

const typeLabel: Record<string, string> = {
  EXTRA_50: "HS 50%",
  EXTRA_100: "HS 100%",
  HOLIDAY: "Feriado",
};

export function PayrollPreview({ results, currency, startDate, endDate }: Props) {
  const grandTotal = results.reduce((s, r) => s + r.totalAmount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">
          Previsualización · {startDate} → {endDate}
        </h3>
        <div className="text-right">
          <p className="text-xs text-slate-500">Total a pagar</p>
          <p className="text-xl font-bold text-green-700">
            {formatCurrency(grandTotal, currency)}
          </p>
        </div>
      </div>

      {/* Tabla resumen */}
      <div className="rounded-lg border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead>Frec.</TableHead>
              <TableHead className="text-right">Sueldo período</TableHead>
              <TableHead className="text-right">HS 50%</TableHead>
              <TableHead className="text-right">HS 100%</TableHead>
              <TableHead className="text-right">Feriado</TableHead>
              <TableHead className="text-right">Anticipos</TableHead>
              <TableHead className="text-right">Descuentos</TableHead>
              <TableHead className="text-right font-bold">TOTAL</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((r) => (
              <TableRow key={r.employeeId}>
                <TableCell className="font-medium">{r.employeeName}</TableCell>
                <TableCell>
                  <Badge variant="outline">{freqLabel[r.formula.frequency]}</Badge>
                </TableCell>
                <TableCell className="text-right">{formatCurrency(r.periodSalary, currency)}</TableCell>
                <TableCell className="text-right text-yellow-700">
                  {r.extra50Amount > 0 ? formatCurrency(r.extra50Amount, currency) : "—"}
                </TableCell>
                <TableCell className="text-right text-orange-700">
                  {r.extra100Amount > 0 ? formatCurrency(r.extra100Amount, currency) : "—"}
                </TableCell>
                <TableCell className="text-right text-red-700">
                  {r.holidayAmount > 0 ? formatCurrency(r.holidayAmount, currency) : "—"}
                </TableCell>
                <TableCell className="text-right text-blue-700">
                  {r.advances > 0 ? `- ${formatCurrency(r.advances, currency)}` : "—"}
                </TableCell>
                <TableCell className="text-right text-red-700">
                  {r.discounts > 0 ? `- ${formatCurrency(r.discounts, currency)}` : "—"}
                </TableCell>
                <TableCell className="text-right font-bold">
                  {formatCurrency(r.totalAmount, currency)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Detalle por empleado (expandible) */}
      <h4 className="font-medium text-sm text-slate-700">Detalle de fórmulas por empleado</h4>
      <Accordion type="multiple">
        {results.map((r) => (
          <AccordionItem key={r.employeeId} value={r.employeeId}>
            <AccordionTrigger className="text-sm">
              {r.employeeName} — {formatCurrency(r.totalAmount, currency)}
            </AccordionTrigger>
            <AccordionContent>
              <div className="bg-slate-50 rounded p-3 text-sm space-y-2 font-mono">
                <p>Sueldo base: {formatCurrency(r.formula.baseSalary, currency)}</p>
                <p>Período: {r.formula.periodDays} días de {r.formula.calendarDays}</p>
                <p>Sueldo período: {formatCurrency(r.formula.periodSalary, currency)}</p>
                <p>Valor hora: {r.formula.hourlyRateFormula}</p>
                <hr />
                {r.formula.overtimeBreakdown.map((ob) => (
                  <p key={ob.type}>
                    {typeLabel[ob.type]}: {ob.hours}h × {formatCurrency(ob.hourlyRate, currency)} × {ob.rate} ={" "}
                    <strong>{formatCurrency(ob.amount, currency)}</strong>
                  </p>
                ))}
                {r.formula.overtimeBreakdown.length === 0 && <p>Sin horas extras</p>}
                <hr />
                {r.formula.advances > 0 && <p>Anticipos: - {formatCurrency(r.formula.advances, currency)}</p>}
                {r.formula.discounts > 0 && <p>Descuentos: - {formatCurrency(r.formula.discounts, currency)}</p>}
                <p className="font-bold">
                  TOTAL = {formatCurrency(r.periodSalary, currency)} + {formatCurrency(r.formula.totalOvertimeAmount, currency)}
                  {r.formula.advances > 0 ? ` - ${formatCurrency(r.formula.advances, currency)}` : ""}
                  {r.formula.discounts > 0 ? ` - ${formatCurrency(r.formula.discounts, currency)}` : ""}
                  {" = "}<span className="text-green-700">{formatCurrency(r.totalAmount, currency)}</span>
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
