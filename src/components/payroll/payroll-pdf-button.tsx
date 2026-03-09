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

      const pageW  = doc.internal.pageSize.getWidth();
      const pageH  = doc.internal.pageSize.getHeight();
      const mL = 12;
      const mR = pageW - 12;
      const cW = mR - mL; // content width

      // Colores (RGB)
      const C = {
        navy:       [22,  48,  90]  as [number,number,number],
        navyLight:  [232, 239, 252] as [number,number,number],
        white:      [255, 255, 255] as [number,number,number],
        black:      [15,  15,  15]  as [number,number,number],
        dark:       [40,  40,  40]  as [number,number,number],
        mid:        [100, 100, 100] as [number,number,number],
        light:      [200, 200, 200] as [number,number,number],
        ultraLight: [246, 246, 246] as [number,number,number],
        green:      [22,  101, 52]  as [number,number,number],
        greenBg:    [236, 253, 245] as [number,number,number],
        greenBorder:[34,  197, 94]  as [number,number,number],
        red:        [185, 28,  28]  as [number,number,number],
        orange:     [180, 83,  9]   as [number,number,number],
      };

      const freqLabel: Record<string, string> = {
        WEEKLY: "Semanal", BIWEEKLY: "Quincenal", MONTHLY: "Mensual",
      };

      // ─── Dibuja una copia del recibo ────────────────────────────────
      const drawCopy = (oy: number, label: "ORIGINAL" | "DUPLICADO") => {
        const half   = pageH / 2;
        const bottom = oy + half - 5;
        let y = oy + 3;

        // Borde exterior
        doc.setDrawColor(...C.light);
        doc.setLineWidth(0.25);
        doc.rect(mL, y, cW, half - 8);

        // ── HEADER azul marino ──────────────────────────────────────
        doc.setFillColor(...C.navy);
        doc.rect(mL, y, cW, 13, "F");
        doc.setTextColor(...C.white);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("RECIBO DE HABERES", mL + 4, y + 8);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.text("Ley de Contrato de Trabajo N 20.744 - Art. 140", mL + 4, y + 11.5);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text(label, mR - 3, y + 8, { align: "right" });
        y += 16;

        // ── EMPLEADOR + PERIODO (dos columnas) ──────────────────────
        const half2 = cW / 2;

        // Caja empleador
        doc.setFillColor(...C.navyLight);
        doc.setDrawColor(...C.light);
        doc.setLineWidth(0.2);
        doc.rect(mL, y, half2 - 1, 18, "FD");
        doc.setTextColor(...C.mid);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6);
        doc.text("EMPLEADOR", mL + 2.5, y + 4);
        doc.setTextColor(...C.black);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        // Truncar nombre si es muy largo
        const bizName = businessName.length > 28 ? businessName.substring(0, 26) + ".." : businessName;
        doc.text(bizName, mL + 2.5, y + 10);
        if (businessCuit) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(...C.dark);
          doc.text("CUIT: " + businessCuit, mL + 2.5, y + 15);
        }

        // Caja periodo
        const px = mL + half2 + 1;
        doc.setFillColor(...C.navyLight);
        doc.rect(px, y, half2 - 1, 18, "FD");
        doc.setTextColor(...C.mid);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6);
        doc.text("PERIODO", px + 2.5, y + 4);
        doc.setTextColor(...C.black);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(startDate + "  al  " + endDate, px + 2.5, y + 10);
        doc.setFontSize(7.5);
        doc.text("Frecuencia: " + (freqLabel[result.formula.frequency] ?? ""), px + 2.5, y + 15);
        y += 21;

        // ── EMPLEADO ───────────────────────────────────────────────
        doc.setFillColor(...C.ultraLight);
        doc.setDrawColor(...C.light);
        doc.rect(mL, y, cW, 16, "FD");

        doc.setTextColor(...C.mid);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6);
        doc.text("EMPLEADO", mL + 2.5, y + 4);

        doc.setTextColor(...C.black);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(result.employeeName, mL + 2.5, y + 10);

        if (result.position) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(...C.mid);
          doc.text(result.position, mL + 2.5, y + 14.5);
        }

        // Identificacion (derecha)
        const idLines: string[] = [];
        if (result.cuil) idLines.push("CUIL: " + result.cuil);
        if (result.dni)  idLines.push("DNI: "  + result.dni);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(...C.dark);
        if (idLines.length > 0) doc.text(idLines[0], mR - 3, y + 9, { align: "right" });
        if (idLines.length > 1) doc.text(idLines[1], mR - 3, y + 13.5, { align: "right" });
        y += 19;

        // ── TABLA CONCEPTOS ─────────────────────────────────────────
        // Columnas: Concepto | Haberes | Deducciones
        const cHaber = mL + cW * 0.60;
        const cDeduc = mR;

        // Header tabla
        doc.setFillColor(...C.navy);
        doc.rect(mL, y, cW, 6, "F");
        doc.setTextColor(...C.white);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.text("CONCEPTO", mL + 2.5, y + 4.2);
        doc.text("HABERES", cHaber - 1, y + 4.2, { align: "right" });
        doc.text("DEDUCCIONES", cDeduc - 1, y + 4.2, { align: "right" });
        y += 7;

        let rowShade = false;
        const row = (
          concepto: string,
          haber: string,
          deduc: string,
          labelColor: [number,number,number] = C.dark
        ) => {
          const rh = 5.5;
          if (rowShade) {
            doc.setFillColor(...C.ultraLight);
            doc.rect(mL, y, cW, rh, "F");
          }
          // Línea divisoria vertical entre haberes y deducciones
          doc.setDrawColor(...C.light);
          doc.setLineWidth(0.1);
          doc.line(cHaber + 8, y, cHaber + 8, y + rh);
          // Línea horizontal inferior
          doc.line(mL, y + rh, mR, y + rh);

          doc.setTextColor(...labelColor);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          doc.text(concepto, mL + 2.5, y + 3.9, { maxWidth: cHaber - 14 });
          if (haber) {
            doc.setTextColor(...C.dark);
            doc.text(haber, cHaber - 1, y + 3.9, { align: "right" });
          }
          if (deduc) {
            doc.setTextColor(...C.red);
            doc.text(deduc, cDeduc - 1, y + 3.9, { align: "right" });
          }
          y += rh;
          rowShade = !rowShade;
        };

        // Conceptos
        row("Remuneracion basica", formatCurrency(result.formula.baseSalary, currency), "");
        row(
          "Remuneracion proporcional (" + result.formula.periodDays + "/" + result.formula.calendarDays + " dias)",
          formatCurrency(result.periodSalary, currency),
          ""
        );

        const otLabel: Record<string, string> = {
          EXTRA_50: "Horas extras 50%",
          EXTRA_100: "Horas extras 100%",
          HOLIDAY: "Horas en feriado",
        };
        for (const ob of result.formula.overtimeBreakdown) {
          const rateStr = Number(ob.rate).toFixed(2).replace(/\.?0+$/, "");
          row(
            (otLabel[ob.type] ?? ob.type) + " (" + ob.hours + "h x " + rateStr + ")",
            formatCurrency(ob.amount, currency),
            ""
          );
        }

        for (const ec of result.extraConcepts ?? []) {
          if (ec.type === "EARNING") row(ec.name, formatCurrency(ec.amount, currency), "");
        }

        if (result.absenceDeduction > 0) {
          row("Descuento inasistencias (" + result.absences + " dia/s)", "", formatCurrency(result.absenceDeduction, currency));
        }

        if (result.retentions.total > 0) {
          row("Jubilacion - SIJP (11%)",     "", formatCurrency(result.retentions.jubilacion, currency), C.mid);
          row("Obra Social (3%)",             "", formatCurrency(result.retentions.obraSocial, currency), C.mid);
          row("INSSJP - PAMI (3%)",           "", formatCurrency(result.retentions.pami, currency),      C.mid);
        }

        if (result.advances  > 0) row("Anticipo de haberes",   "", formatCurrency(result.advances, currency));
        if (result.discounts > 0) row("Descuentos varios",     "", formatCurrency(result.discounts, currency));

        for (const ec of result.extraConcepts ?? []) {
          if (ec.type === "DEDUCTION") row(ec.name, "", formatCurrency(ec.amount, currency));
        }

        // ── BRUTO ──────────────────────────────────────────────────
        y += 1;
        doc.setFillColor(...C.ultraLight);
        doc.setDrawColor(...C.light);
        doc.rect(mL, y, cW, 7, "FD");
        doc.setTextColor(...C.dark);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text("REMUNERACION BRUTA", mL + 2.5, y + 4.8);
        doc.text(formatCurrency(result.grossAmount, currency), cHaber - 1, y + 4.8, { align: "right" });
        if (result.retentions.total > 0) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(...C.red);
          doc.text("- " + formatCurrency(result.retentions.total, currency), cDeduc - 1, y + 4.8, { align: "right" });
        }
        y += 9;

        // ── NETO ───────────────────────────────────────────────────
        doc.setFillColor(...C.greenBg);
        doc.setDrawColor(...C.greenBorder);
        doc.setLineWidth(0.5);
        doc.rect(mL, y, cW, 11, "FD");
        doc.setLineWidth(0.2);
        doc.setTextColor(...C.green);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("TOTAL NETO A COBRAR", mL + 3, y + 7.5);
        doc.setFontSize(13);
        doc.text(formatCurrency(result.totalAmount, currency), mR - 3, y + 7.5, { align: "right" });
        y += 14;

        // ── FORMA DE COBRO ─────────────────────────────────────────
        const formaCobro = result.cbu
          ? "Transferencia bancaria  CBU: " + result.cbu
          : "Efectivo";
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(...C.mid);
        doc.text("Forma de cobro: " + formaCobro, mL + 2.5, y);
        y += 5;

        // ── FIRMAS ─────────────────────────────────────────────────
        const sigY = bottom - 22;
        if (y + 5 < sigY) {
          doc.setDrawColor(...C.light);
          doc.setLineWidth(0.15);
          doc.line(mL, sigY, mR, sigY);

          doc.setDrawColor(...C.mid);
          doc.setLineWidth(0.3);
          // Firma empleado
          doc.line(mL + 4, sigY + 13, mL + 68, sigY + 13);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7);
          doc.setTextColor(...C.mid);
          doc.text("Firma y aclaracion del empleado", mL + 4, sigY + 17);
          doc.text("DNI: ___________________", mL + 4, sigY + 21);
          // Firma empleador
          doc.line(mR - 68, sigY + 13, mR - 4, sigY + 13);
          doc.text("Firma y sello del empleador", mR - 68, sigY + 17);
          // Nota legal
          doc.setFontSize(5.5);
          doc.text(
            "Recibi la suma indicada en concepto de haberes. Ley 20.744 Art. 140.   Emitido: " + new Date().toLocaleDateString("es-AR"),
            mL + 4, bottom - 2
          );
        }
      };

      // ── Linea de corte central ──────────────────────────────────
      doc.setDrawColor(160, 160, 160);
      doc.setLineWidth(0.15);
      const dashY = pageH / 2;
      for (let x = mL; x < mR; x += 5) {
        doc.line(x, dashY, x + 3, dashY);
      }
      doc.setFont("helvetica", "italic");
      doc.setFontSize(6.5);
      doc.setTextColor(160, 160, 160);
      doc.text("Cortar por aqui", pageW / 2, dashY - 1, { align: "center" });

      // Dibujar ambas copias
      drawCopy(0, "ORIGINAL");
      drawCopy(pageH / 2, "DUPLICADO");

      const fname = "recibo-" + result.employeeName.replace(/\s+/g, "_") + "-" + startDate + ".pdf";
      doc.save(fname);
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
