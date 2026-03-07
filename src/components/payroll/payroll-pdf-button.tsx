"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/payroll/calculator";
import type { PayrollResult } from "@/lib/payroll/types";

interface Props {
  result: PayrollResult;
  currency: string;
  startDate: string;
  endDate: string;
  businessName: string;
}

export function PayrollPdfButton({ result, currency, startDate, endDate, businessName }: Props) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      const pageW = doc.internal.pageSize.getWidth();
      const margin = 20;
      const colRight = pageW - margin;
      let y = margin;

      // Encabezado
      doc.setFillColor(37, 99, 235); // blue-600
      doc.rect(0, 0, pageW, 28, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("RECIBO DE SUELDO", margin, 12);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(businessName, margin, 20);
      y = 38;

      // Datos del empleado
      doc.setTextColor(30, 41, 59); // slate-800
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text(result.employeeName, margin, y);
      y += 7;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139); // slate-500
      const freqLabel: Record<string, string> = { WEEKLY: "Semanal", BIWEEKLY: "Quincenal", MONTHLY: "Mensual" };
      doc.text(`Período: ${startDate} al ${endDate}  ·  Frecuencia: ${freqLabel[result.formula.frequency] ?? result.formula.frequency}`, margin, y);
      if (result.cbu) {
        y += 5;
        doc.text(`CBU: ${result.cbu}`, margin, y);
      }
      y += 10;

      // Línea separadora
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y, colRight, y);
      y += 8;

      // Función para fila de concepto
      const row = (label: string, value: string, bold = false, color?: [number, number, number]) => {
        doc.setFont("helvetica", bold ? "bold" : "normal");
        doc.setFontSize(10);
        doc.setTextColor(...(color ?? [30, 41, 59]));
        doc.text(label, margin, y);
        doc.text(value, colRight, y, { align: "right" });
        y += 6.5;
      };

      row("Sueldo base", formatCurrency(result.formula.baseSalary, currency));
      row(
        `Sueldo período (${result.formula.periodDays} de ${result.formula.calendarDays} días)`,
        formatCurrency(result.periodSalary, currency)
      );

      if (result.formula.overtimeBreakdown.length > 0) {
        y += 2;
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(8);
        doc.setFont("helvetica", "italic");
        doc.text("HORAS EXTRAS", margin, y);
        y += 5;

        const typeLabel: Record<string, string> = { EXTRA_50: "HS 50%", EXTRA_100: "HS 100%", HOLIDAY: "Feriado" };
        for (const ob of result.formula.overtimeBreakdown) {
          row(
            `  ${typeLabel[ob.type] ?? ob.type}: ${ob.hours}h × ${formatCurrency(ob.hourlyRate, currency)} × ${ob.rate}`,
            formatCurrency(ob.amount, currency),
            false,
            [161, 98, 7]
          );
        }
      }

      if (result.advances > 0) {
        row(`Anticipos`, `- ${formatCurrency(result.advances, currency)}`, false, [29, 78, 216]);
      }
      if (result.discounts > 0) {
        row(`Descuentos`, `- ${formatCurrency(result.discounts, currency)}`, false, [185, 28, 28]);
      }
      if ((result.formula as unknown as Record<string, number>).absences > 0) {
        const absAmt = (result.formula as unknown as Record<string, number>).absences;
        row(`Inasistencias`, `- ${formatCurrency(absAmt, currency)}`, false, [185, 28, 28]);
      }

      // Total
      y += 2;
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y, colRight, y);
      y += 7;
      doc.setFillColor(240, 253, 244); // green-50
      doc.roundedRect(margin, y - 5, pageW - margin * 2, 12, 2, 2, "F");
      row("TOTAL NETO", formatCurrency(result.totalAmount, currency), true, [21, 128, 61]);

      // Fórmula de valor hora
      y += 8;
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(148, 163, 184);
      doc.text(`Valor hora: ${result.formula.hourlyRateFormula}`, margin, y);

      // Pie de página
      y = doc.internal.pageSize.getHeight() - 15;
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y, colRight, y);
      y += 5;
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`Generado por PayrollManager · ${new Date().toLocaleDateString("es-AR")}`, margin, y);
      doc.text("Firma y aclaración: ____________________________", colRight, y, { align: "right" });

      const filename = `recibo-${result.employeeName.replace(/\s+/g, "_")}-${startDate}.pdf`;
      doc.save(filename);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={loading}>
      {loading ? "Generando..." : "PDF"}
    </Button>
  );
}
