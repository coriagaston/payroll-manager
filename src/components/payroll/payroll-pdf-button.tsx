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
      const mL = 12; // left margin
      const mR = pageW - 12; // right margin
      const contentW = mR - mL;

      // ── Paleta ──────────────────────────────────────────────────────
      const black:     [number, number, number] = [10, 10, 10];
      const darkGray:  [number, number, number] = [50, 50, 50];
      const midGray:   [number, number, number] = [110, 110, 110];
      const lightGray: [number, number, number] = [210, 210, 210];
      const ultraLight:[number, number, number] = [245, 245, 245];
      const navy:      [number, number, number] = [22, 48, 90];
      const navyLight: [number, number, number] = [235, 240, 250];
      const green:     [number, number, number] = [20, 110, 55];
      const greenLight:[number, number, number] = [235, 252, 242];
      const red:       [number, number, number] = [180, 30, 30];

      const freqLabel: Record<string, string> = {
        WEEKLY: "Semanal", BIWEEKLY: "Quincenal", MONTHLY: "Mensual",
      };

      // ════════════════════════════════════════════════════════════════
      // FUNCIÓN auxiliar para dibujar una copia del recibo
      // offsetY = 0 para original, mitad de página para duplicado
      // ════════════════════════════════════════════════════════════════
      const drawRecibo = (offsetY: number, label: "ORIGINAL" | "DUPLICADO") => {
        let y = offsetY + 6;
        const bot = offsetY + pageH / 2 - 4; // límite inferior de esta copia

        // ── Borde exterior ──────────────────────────────────────────
        doc.setDrawColor(...lightGray);
        doc.setLineWidth(0.3);
        doc.rect(mL, offsetY + 2, contentW, pageH / 2 - 6);

        // ── Encabezado: franja azul marino ──────────────────────────
        doc.setFillColor(...navy);
        doc.rect(mL, offsetY + 2, contentW, 14, "F");

        // Título izquierda
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("RECIBO DE HABERES", mL + 4, y + 5);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text("Ley de Contrato de Trabajo N° 20.744 — Art. 140", mL + 4, y + 9.5);

        // Etiqueta ORIGINAL / DUPLICADO (derecha)
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text(label, mR - 4, y + 5, { align: "right" });

        y += 18;

        // ── Fila: EMPLEADOR (izq) | PERÍODO (der) ───────────────────
        const halfW = contentW / 2;

        // Caja empleador
        doc.setFillColor(...navyLight);
        doc.rect(mL, y, halfW - 1, 16, "F");
        doc.setDrawColor(...lightGray);
        doc.rect(mL, y, halfW - 1, 16);

        doc.setTextColor(...midGray);
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "bold");
        doc.text("EMPLEADOR", mL + 2, y + 4);
        doc.setTextColor(...black);
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        doc.text(businessName, mL + 2, y + 9, { maxWidth: halfW - 5 });
        if (businessCuit) {
          doc.setFontSize(7.5);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...darkGray);
          doc.text(`CUIT: ${businessCuit}`, mL + 2, y + 14);
        }

        // Caja período
        doc.setFillColor(...navyLight);
        doc.rect(mL + halfW + 1, y, halfW - 1, 16, "F");
        doc.setDrawColor(...lightGray);
        doc.rect(mL + halfW + 1, y, halfW - 1, 16);

        doc.setTextColor(...midGray);
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "bold");
        doc.text("PERÍODO", mL + halfW + 3, y + 4);
        doc.setTextColor(...black);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(`${startDate}  →  ${endDate}`, mL + halfW + 3, y + 9);
        doc.text(`Frecuencia: ${freqLabel[result.formula.frequency] ?? "—"}`, mL + halfW + 3, y + 14);

        y += 20;

        // ── Fila: EMPLEADO ───────────────────────────────────────────
        doc.setFillColor(...ultraLight);
        doc.rect(mL, y, contentW, 14, "F");
        doc.setDrawColor(...lightGray);
        doc.rect(mL, y, contentW, 14);

        doc.setTextColor(...midGray);
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "bold");
        doc.text("EMPLEADO", mL + 2, y + 4);

        doc.setTextColor(...black);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(result.employeeName, mL + 2, y + 10);

        // CUIL y CBU (derecha)
        const idParts: string[] = [];
        if (result.cuil) idParts.push(`CUIL: ${result.cuil}`);
        if (result.cbu)  idParts.push(`CBU: ${result.cbu}`);
        if (idParts.length > 0) {
          doc.setFontSize(7.5);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...darkGray);
          doc.text(idParts.join("    "), mR - 3, y + 10, { align: "right" });
        }

        y += 18;

        // ── Tabla de conceptos ───────────────────────────────────────
        // Encabezado de tabla
        doc.setFillColor(...navy);
        doc.rect(mL, y, contentW, 6, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        const c1 = mL + 2;
        const c2 = mL + contentW * 0.52;
        const c3 = mL + contentW * 0.72;
        const c4 = mR - 2;
        doc.text("CONCEPTO", c1, y + 4);
        doc.text("HABERES", c3 - 1, y + 4, { align: "right" });
        doc.text("DEDUCCIONES", c4, y + 4, { align: "right" });
        y += 7;

        // Divisor vertical de columnas
        const drawVLines = (rowY: number, rowH: number) => {
          doc.setDrawColor(...lightGray);
          doc.setLineWidth(0.15);
          doc.line(c3 - 12, rowY, c3 - 12, rowY + rowH);
          doc.line(c4 - 22, rowY, c4 - 22, rowY + rowH);
        };

        let shade = false;
        const conceptRow = (
          concepto: string,
          haber: string,
          deduccion: string,
          labelColor: [number, number, number] = darkGray
        ) => {
          const rowH = 5.5;
          if (shade) {
            doc.setFillColor(...ultraLight);
            doc.rect(mL, y, contentW, rowH, "F");
          }
          drawVLines(y, rowH);
          doc.setDrawColor(...lightGray);
          doc.setLineWidth(0.1);
          doc.line(mL, y + rowH, mR, y + rowH);

          doc.setTextColor(...labelColor);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          doc.text(concepto, c1, y + 3.8, { maxWidth: c3 - 14 - c1 });
          if (haber) {
            doc.setTextColor(...darkGray);
            doc.setFont("helvetica", "normal");
            doc.text(haber, c3 - 14, y + 3.8, { align: "right" });
          }
          if (deduccion) {
            doc.setTextColor(...red);
            doc.setFont("helvetica", "normal");
            doc.text(deduccion, c4, y + 3.8, { align: "right" });
          }
          y += rowH;
          shade = !shade;
        };

        // Sueldo básico
        conceptRow(
          `Remuneración básica`,
          formatCurrency(result.formula.baseSalary, currency),
          ""
        );
        conceptRow(
          `Remuneración proporcional al período (${result.formula.periodDays}/${result.formula.calendarDays} días)`,
          formatCurrency(result.periodSalary, currency),
          ""
        );

        // Horas extras
        const typeLabel: Record<string, string> = {
          EXTRA_50: "Horas extras 50%",
          EXTRA_100: "Horas extras 100%",
          HOLIDAY: "Horas en día feriado",
        };
        for (const ob of result.formula.overtimeBreakdown) {
          conceptRow(
            `${typeLabel[ob.type] ?? ob.type}  (${ob.hours}h × ${ob.rate})`,
            formatCurrency(ob.amount, currency),
            ""
          );
        }

        // Conceptos adicionales (haberes)
        for (const ec of result.extraConcepts ?? []) {
          if (ec.type === "EARNING") {
            conceptRow(ec.name, formatCurrency(ec.amount, currency), "");
          }
        }

        // Inasistencias
        if (result.absenceDeduction > 0) {
          conceptRow(
            `Descuento por inasistencias (${result.absences} día/s)`,
            "",
            formatCurrency(result.absenceDeduction, currency)
          );
        }

        // Retenciones legales
        if (result.retentions.total > 0) {
          conceptRow("Jubilación — SIJP (11%)", "", formatCurrency(result.retentions.jubilacion, currency), midGray);
          conceptRow("Obra Social (3%)", "", formatCurrency(result.retentions.obraSocial, currency), midGray);
          conceptRow("INSSJP — PAMI (3%)", "", formatCurrency(result.retentions.pami, currency), midGray);
        }

        // Anticipos / descuentos
        if (result.advances > 0) {
          conceptRow("Anticipo de haberes", "", formatCurrency(result.advances, currency));
        }
        if (result.discounts > 0) {
          conceptRow("Descuentos varios", "", formatCurrency(result.discounts, currency));
        }

        // Conceptos adicionales (deducciones)
        for (const ec of result.extraConcepts ?? []) {
          if (ec.type === "DEDUCTION") {
            conceptRow(ec.name, "", formatCurrency(ec.amount, currency));
          }
        }

        // ── Totales ──────────────────────────────────────────────────
        y += 1;

        // Bruto
        doc.setFillColor(...ultraLight);
        doc.rect(mL, y, contentW, 7, "F");
        doc.setDrawColor(...lightGray);
        doc.rect(mL, y, contentW, 7);
        doc.setTextColor(...darkGray);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text("REMUNERACIÓN BRUTA", c1, y + 4.8);
        doc.text(formatCurrency(result.grossAmount, currency), c3 - 14, y + 4.8, { align: "right" });
        if (result.retentions.total > 0) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(...red);
          doc.text(`− ${formatCurrency(result.retentions.total, currency)}`, c4, y + 4.8, { align: "right" });
        }
        y += 9;

        // Neto — caja destacada
        doc.setFillColor(...greenLight);
        doc.rect(mL, y, contentW, 10, "F");
        doc.setDrawColor(...green);
        doc.setLineWidth(0.5);
        doc.rect(mL, y, contentW, 10);
        doc.setLineWidth(0.2);
        doc.setTextColor(...green);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("TOTAL NETO A COBRAR", c1, y + 6.5);
        doc.setFontSize(12);
        doc.text(formatCurrency(result.totalAmount, currency), mR - 3, y + 6.5, { align: "right" });
        y += 13;

        // ── Firmas ───────────────────────────────────────────────────
        const sigY = bot - 20;
        if (y < sigY) {
          // Línea separadora
          doc.setDrawColor(...lightGray);
          doc.setLineWidth(0.2);
          doc.line(mL, sigY - 2, mR, sigY - 2);

          // Firma empleado
          doc.setDrawColor(...midGray);
          doc.setLineWidth(0.3);
          doc.line(mL + 4, sigY + 12, mL + 65, sigY + 12);
          doc.setTextColor(...midGray);
          doc.setFontSize(7);
          doc.setFont("helvetica", "normal");
          doc.text("Firma y aclaración del empleado", mL + 4, sigY + 16);
          doc.text("DNI:", mL + 4, sigY + 20);

          // Firma empleador
          doc.line(mR - 65, sigY + 12, mR - 4, sigY + 12);
          doc.text("Firma y sello del empleador", mR - 65, sigY + 16);

          // Nota legal
          doc.setFontSize(6);
          doc.setTextColor(...midGray);
          doc.text(
            `Recibí la suma indicada en concepto de haberes del período indicado. Ley 20.744 Art. 140.   Generado: ${new Date().toLocaleDateString("es-AR")}`,
            mL + 4, bot - 2
          );
        }
      };

      // ── Línea divisoria entre original y duplicado ───────────────
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.2);
      doc.line(mL, pageH / 2, mR, pageH / 2);
      doc.setTextColor(...midGray);
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "italic");
      doc.text("✂  Cortar por aquí", pageW / 2, pageH / 2, { align: "center" });

      // Dibujar las dos copias
      drawRecibo(0, "ORIGINAL");
      drawRecibo(pageH / 2, "DUPLICADO");

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
