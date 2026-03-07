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
  businessCuit?: string;
}

export function PayrollPdfButton({ result, currency, startDate, endDate, businessName, businessCuit }: Props) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const m = 15; // margin
      const col2 = pageW / 2 + 5;
      const colRight = pageW - m;
      let y = m;

      const dark: [number, number, number] = [15, 23, 42];
      const gray: [number, number, number] = [100, 116, 139];
      const lightGray: [number, number, number] = [226, 232, 240];
      const blue: [number, number, number] = [37, 99, 235];
      const green: [number, number, number] = [21, 128, 61];
      const red: [number, number, number] = [185, 28, 28];
      const orange: [number, number, number] = [194, 65, 12];

      // ── Encabezado azul ────────────────────────────────────────
      doc.setFillColor(...blue);
      doc.rect(0, 0, pageW, 32, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("RECIBO DE SUELDO", m, 11);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("Ley 20.744 — Contrato de Trabajo", m, 17);
      // Datos empleador (derecha)
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(businessName, colRight, 10, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      if (businessCuit) {
        doc.text(`CUIT: ${businessCuit}`, colRight, 16, { align: "right" });
      }
      const freqLabel: Record<string, string> = { WEEKLY: "Semanal", BIWEEKLY: "Quincenal", MONTHLY: "Mensual" };
      doc.text(`Período: ${startDate} — ${endDate}`, colRight, 22, { align: "right" });
      doc.text(`Frecuencia: ${freqLabel[result.formula.frequency] ?? result.formula.frequency}`, colRight, 28, { align: "right" });
      y = 40;

      // ── Datos empleado ─────────────────────────────────────────
      doc.setFillColor(241, 245, 249); // slate-100
      doc.roundedRect(m, y - 4, pageW - m * 2, 22, 2, 2, "F");
      doc.setTextColor(...dark);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(result.employeeName, m + 3, y + 2);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...gray);
      let empInfo = "";
      if (result.cuil) empInfo += `CUIL: ${result.cuil}   `;
      if (result.cbu) empInfo += `CBU: ${result.cbu}`;
      if (empInfo) doc.text(empInfo, m + 3, y + 8);
      doc.text(`Ingreso: ${startDate}`, m + 3, y + 14);
      y += 26;

      // ── Tabla haberes / deducciones ─────────────────────────────
      // Cabecera tabla
      doc.setFillColor(...blue);
      doc.rect(m, y, pageW - m * 2, 7, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("CONCEPTO", m + 2, y + 4.8);
      doc.text("HABERES", col2 + 20, y + 4.8, { align: "right" });
      doc.text("DEDUCCIONES", colRight, y + 4.8, { align: "right" });
      y += 10;

      const tableRow = (
        label: string,
        haber = "",
        deduccion = "",
        labelColor: [number, number, number] = dark,
        shade = false
      ) => {
        if (shade) {
          doc.setFillColor(248, 250, 252);
          doc.rect(m, y - 4, pageW - m * 2, 6.5, "F");
        }
        doc.setTextColor(...labelColor);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.text(label, m + 2, y);
        if (haber) {
          doc.setTextColor(...dark);
          doc.text(haber, col2 + 20, y, { align: "right" });
        }
        if (deduccion) {
          doc.setTextColor(...red);
          doc.text(deduccion, colRight, y, { align: "right" });
        }
        y += 6.5;
      };

      let shade = false;
      tableRow("Remuneración básica", formatCurrency(result.formula.baseSalary, currency), "", dark, shade = !shade);
      tableRow(
        `Remuneración proporcional (${result.formula.periodDays}/${result.formula.calendarDays} días)`,
        formatCurrency(result.periodSalary, currency),
        "",
        dark,
        shade = !shade
      );

      // Horas extras
      const typeLabel: Record<string, string> = { EXTRA_50: "H. extra 50%", EXTRA_100: "H. extra 100%", HOLIDAY: "H. feriado" };
      for (const ob of result.formula.overtimeBreakdown) {
        tableRow(
          `${typeLabel[ob.type] ?? ob.type}: ${ob.hours}h × ${formatCurrency(ob.hourlyRate, currency)} × ${ob.rate}`,
          formatCurrency(ob.amount, currency),
          "",
          orange,
          shade = !shade
        );
      }

      // Conceptos extra (EARNING)
      for (const ec of (result.extraConcepts ?? [])) {
        if (ec.type === "EARNING") {
          tableRow(ec.name, formatCurrency(ec.amount, currency), "", dark, shade = !shade);
        }
      }

      // Inasistencias
      if (result.absenceDeduction > 0) {
        tableRow(
          `Inasistencias (${result.absences} día/s)`,
          "",
          formatCurrency(result.absenceDeduction, currency),
          dark,
          shade = !shade
        );
      }

      // Conceptos extra (DEDUCTION)
      for (const ec of (result.extraConcepts ?? [])) {
        if (ec.type === "DEDUCTION") {
          tableRow(ec.name, "", formatCurrency(ec.amount, currency), dark, shade = !shade);
        }
      }

      // Retenciones legales
      if (result.retentions.total > 0) {
        y += 1;
        doc.setDrawColor(...lightGray);
        doc.line(m, y, colRight, y);
        y += 4;
        doc.setTextColor(...gray);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "italic");
        doc.text("RETENCIONES LEGALES (aportes del trabajador)", m + 2, y);
        y += 5;
        tableRow("Jubilación (SIJP 11%)", "", formatCurrency(result.retentions.jubilacion, currency), gray, shade = !shade);
        tableRow("Obra Social (3%)", "", formatCurrency(result.retentions.obraSocial, currency), gray, shade = !shade);
        tableRow("PAMI (3%)", "", formatCurrency(result.retentions.pami, currency), gray, shade = !shade);
      }

      // Anticipos / descuentos
      if (result.advances > 0) {
        tableRow("Anticipos", "", formatCurrency(result.advances, currency), dark, shade = !shade);
      }
      if (result.discounts > 0) {
        tableRow("Descuentos", "", formatCurrency(result.discounts, currency), dark, shade = !shade);
      }

      // ── Totales ─────────────────────────────────────────────────
      y += 2;
      doc.setDrawColor(...lightGray);
      doc.line(m, y, colRight, y);
      y += 5;

      // Bruto
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...dark);
      doc.text("REMUNERACIÓN BRUTA", m + 2, y);
      doc.text(formatCurrency(result.grossAmount, currency), col2 + 20, y, { align: "right" });
      y += 7;

      // Neto
      doc.setFillColor(240, 253, 244); // green-50
      doc.roundedRect(m, y - 5, pageW - m * 2, 12, 2, 2, "F");
      doc.setFontSize(11);
      doc.setTextColor(...green);
      doc.text("TOTAL NETO A COBRAR", m + 3, y + 2);
      doc.text(formatCurrency(result.totalAmount, currency), colRight - 2, y + 2, { align: "right" });
      y += 16;

      // ── Valor hora ──────────────────────────────────────────────
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(...gray);
      doc.text(`Valor hora: ${result.formula.hourlyRateFormula}`, m, y);
      y += 10;

      // ── Firmas ──────────────────────────────────────────────────
      const signY = pageH - 35;
      doc.setDrawColor(...lightGray);
      doc.line(m, signY, m + 60, signY);
      doc.line(colRight - 60, signY, colRight, signY);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...gray);
      doc.text("Firma del empleado", m, signY + 5);
      doc.text("Firma y sello del empleador", colRight - 60, signY + 5);
      doc.text("Aclaración: ____________________", m, signY + 11);

      // ── Pie ─────────────────────────────────────────────────────
      doc.setDrawColor(...lightGray);
      doc.line(m, pageH - 12, colRight, pageH - 12);
      doc.setFontSize(6.5);
      doc.setTextColor(...gray);
      doc.text(
        `Generado por PayrollManager · ${new Date().toLocaleDateString("es-AR")} · Ley 20.744 Art. 140`,
        m, pageH - 7
      );

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
