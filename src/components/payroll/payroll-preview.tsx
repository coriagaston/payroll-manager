"use client";

import { formatCurrency } from "@/lib/payroll/calculator";
import type { PayrollResult } from "@/lib/payroll/types";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PayrollPdfButton } from "./payroll-pdf-button";

interface Props {
  results: PayrollResult[];
  currency: string;
  startDate: string;
  endDate: string;
  businessName?: string;
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

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success("CBU copiado");
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={handleCopy}>
      {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

export function PayrollPreview({ results, currency, startDate, endDate, businessName = "" }: Props) {
  const grandTotal = results.reduce((s, r) => s + r.totalAmount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-foreground">
          Previsualización · {startDate} → {endDate}
        </h3>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total a pagar</p>
          <p className="text-xl font-bold text-green-600 dark:text-green-400">
            {formatCurrency(grandTotal, currency)}
          </p>
        </div>
      </div>

      {/* Sección de pagos con CBU */}
      <div className="rounded-lg border bg-card">
        <div className="px-4 py-3 border-b bg-muted/50 rounded-t-lg">
          <h4 className="font-medium text-sm text-foreground">Pagos</h4>
          <p className="text-xs text-muted-foreground">Copiá el CBU para realizar cada transferencia</p>
        </div>
        <div className="divide-y">
          {results.map((r) => (
            <div key={r.employeeId} className="flex items-center justify-between px-4 py-3 gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{r.employeeName}</p>
                {r.cbu ? (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-xs font-mono text-muted-foreground">{r.cbu}</span>
                    <CopyButton value={r.cbu} />
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mt-0.5">Sin CBU cargado</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <PayrollPdfButton
                  result={r}
                  currency={currency}
                  startDate={startDate}
                  endDate={endDate}
                  businessName={businessName}
                />
                <div className="text-right">
                  <p className="font-bold text-sm text-green-600 dark:text-green-400">{formatCurrency(r.totalAmount, currency)}</p>
                  <Badge variant="outline" className="text-xs">{freqLabel[r.formula.frequency]}</Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabla resumen */}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead className="hidden sm:table-cell">Frec.</TableHead>
              <TableHead className="text-right hidden md:table-cell">Sueldo período</TableHead>
              <TableHead className="text-right hidden lg:table-cell">HS 50%</TableHead>
              <TableHead className="text-right hidden lg:table-cell">HS 100%</TableHead>
              <TableHead className="text-right hidden lg:table-cell">Feriado</TableHead>
              <TableHead className="text-right hidden md:table-cell">Anticipos</TableHead>
              <TableHead className="text-right hidden md:table-cell">Descuentos</TableHead>
              <TableHead className="text-right hidden md:table-cell">Inasist.</TableHead>
              <TableHead className="text-right font-bold">TOTAL</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((r) => (
              <TableRow key={r.employeeId}>
                <TableCell className="font-medium">{r.employeeName}</TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge variant="outline">{freqLabel[r.formula.frequency]}</Badge>
                </TableCell>
                <TableCell className="text-right hidden md:table-cell">{formatCurrency(r.periodSalary, currency)}</TableCell>
                <TableCell className="text-right hidden lg:table-cell text-yellow-700">
                  {r.extra50Amount > 0 ? formatCurrency(r.extra50Amount, currency) : "—"}
                </TableCell>
                <TableCell className="text-right hidden lg:table-cell text-orange-700">
                  {r.extra100Amount > 0 ? formatCurrency(r.extra100Amount, currency) : "—"}
                </TableCell>
                <TableCell className="text-right hidden lg:table-cell text-red-600 dark:text-red-400">
                  {r.holidayAmount > 0 ? formatCurrency(r.holidayAmount, currency) : "—"}
                </TableCell>
                <TableCell className="text-right hidden md:table-cell text-blue-600 dark:text-blue-400">
                  {r.advances > 0 ? `- ${formatCurrency(r.advances, currency)}` : "—"}
                </TableCell>
                <TableCell className="text-right hidden md:table-cell text-red-600 dark:text-red-400">
                  {r.discounts > 0 ? `- ${formatCurrency(r.discounts, currency)}` : "—"}
                </TableCell>
                <TableCell className="text-right hidden md:table-cell text-red-600 dark:text-red-400">
                  {r.absenceDeduction > 0 ? `- ${formatCurrency(r.absenceDeduction, currency)}` : "—"}
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
      <h4 className="font-medium text-sm text-foreground">Detalle de fórmulas por empleado</h4>
      <Accordion type="multiple">
        {results.map((r) => (
          <AccordionItem key={r.employeeId} value={r.employeeId}>
            <AccordionTrigger className="text-sm">
              {r.employeeName} — {formatCurrency(r.totalAmount, currency)}
            </AccordionTrigger>
            <AccordionContent>
              <div className="bg-muted/50 rounded p-3 text-sm space-y-2 font-mono">
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
                {r.formula.absences > 0 && (
                  <p>Inasistencias: {r.formula.absences} día(s) = - {formatCurrency(r.formula.absenceDeduction, currency)}</p>
                )}
                <p className="font-bold">
                  TOTAL = {formatCurrency(r.periodSalary, currency)} + {formatCurrency(r.formula.totalOvertimeAmount, currency)}
                  {r.formula.advances > 0 ? ` - ${formatCurrency(r.formula.advances, currency)}` : ""}
                  {r.formula.discounts > 0 ? ` - ${formatCurrency(r.formula.discounts, currency)}` : ""}
                  {r.formula.absenceDeduction > 0 ? ` - ${formatCurrency(r.formula.absenceDeduction, currency)}` : ""}
                  {" = "}<span className="text-green-600 dark:text-green-400">{formatCurrency(r.totalAmount, currency)}</span>
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
