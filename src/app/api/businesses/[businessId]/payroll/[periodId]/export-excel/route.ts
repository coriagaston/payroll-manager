import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, requireBusinessAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { format } from "date-fns";
import * as XLSX from "xlsx";

interface Params { params: Promise<{ businessId: string; periodId: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { businessId, periodId } = await params;

  try {
    await requireBusinessAccess(businessId, session.user.id);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const period = await prisma.payrollPeriod.findFirst({
    where: { id: periodId, businessId },
    include: {
      business: { select: { name: true, currency: true } },
      items: {
        include: {
          employee: { select: { name: true, cuil: true, cbu: true, payFrequency: true } },
        },
        orderBy: { employee: { name: "asc" } },
      },
    },
  });

  if (!period) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const startLabel = format(period.startDate, "dd/MM/yyyy");
  const endLabel = format(period.endDate, "dd/MM/yyyy");

  const defaultRetentions = { base: 0, jubilacion: 0, obraSocial: 0, pami: 0, total: 0 };

  const rows = period.items.map((item) => {
    const formula = item.formula as Record<string, number & { total?: number; jubilacion?: number; obraSocial?: number; pami?: number }>;
    const gross = (formula?.grossAmount as number) ??
      (Number(item.periodSalary) + Number(item.extra50Amount) + Number(item.extra100Amount) + Number(item.holidayAmount));
    const ret = (formula?.retentions as typeof defaultRetentions) ?? defaultRetentions;

    return {
      "Empleado": item.employee.name,
      "CUIL": item.employee.cuil ?? "",
      "CBU": item.employee.cbu ?? "",
      "Frecuencia": { WEEKLY: "Semanal", BIWEEKLY: "Quincenal", MONTHLY: "Mensual" }[item.employee.payFrequency] ?? "",
      "Sueldo base": Number(item.baseSalary),
      "Sueldo período": Number(item.periodSalary),
      "HS 50%": Number(item.extra50Hours),
      "Importe 50%": Number(item.extra50Amount),
      "HS 100%": Number(item.extra100Hours),
      "Importe 100%": Number(item.extra100Amount),
      "HS Feriado": Number(item.holidayHours),
      "Importe Feriado": Number(item.holidayAmount),
      "Bruto": gross,
      "Jubilación (11%)": ret.jubilacion ?? 0,
      "Obra Social (3%)": ret.obraSocial ?? 0,
      "PAMI (3%)": ret.pami ?? 0,
      "Total retenciones": ret.total ?? 0,
      "Anticipos": Number(item.advances),
      "Descuentos": Number(item.discounts),
      "NETO": Number(item.totalAmount),
    };
  });

  // Totals row
  const totals: Record<string, string | number> = { "Empleado": "TOTALES" };
  const numericKeys = [
    "Sueldo base", "Sueldo período", "HS 50%", "Importe 50%", "HS 100%", "Importe 100%",
    "HS Feriado", "Importe Feriado", "Bruto", "Jubilación (11%)", "Obra Social (3%)",
    "PAMI (3%)", "Total retenciones", "Anticipos", "Descuentos", "NETO",
  ];
  for (const key of numericKeys) {
    totals[key] = rows.reduce((s, r) => s + (r[key as keyof typeof r] as number ?? 0), 0);
  }

  const wb = XLSX.utils.book_new();

  // Sheet 1: Liquidación
  const ws = XLSX.utils.json_to_sheet(rows);

  // Style header row (bold) - basic width adjustment
  const cols = Object.keys(rows[0] || {}).map((k) => ({ wch: Math.max(k.length, 12) }));
  ws["!cols"] = cols;

  // Append totals row
  XLSX.utils.sheet_add_json(ws, [totals], { skipHeader: true, origin: -1 });

  XLSX.utils.book_append_sheet(wb, ws, "Liquidación");

  // Sheet 2: Resumen
  const resumenData = [
    { "Concepto": "Empresa", "Valor": period.business.name },
    { "Concepto": "Período", "Valor": `${startLabel} - ${endLabel}` },
    { "Concepto": "Empleados", "Valor": period.items.length },
    { "Concepto": "Masa salarial bruta", "Valor": rows.reduce((s, r) => s + r["Bruto"], 0) },
    { "Concepto": "Total retenciones", "Valor": rows.reduce((s, r) => s + r["Total retenciones"], 0) },
    { "Concepto": "Total anticipos", "Valor": rows.reduce((s, r) => s + r["Anticipos"], 0) },
    { "Concepto": "Masa salarial neta", "Valor": rows.reduce((s, r) => s + r["NETO"], 0) },
  ];
  const wsResumen = XLSX.utils.json_to_sheet(resumenData);
  wsResumen["!cols"] = [{ wch: 25 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const filename = `liquidacion-${startLabel.replace(/\//g, "-")}_${endLabel.replace(/\//g, "-")}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
