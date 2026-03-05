import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, requireBusinessAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generatePayrollCsv } from "@/lib/payroll/csv-export";
import type { PayrollResult } from "@/lib/payroll/types";
import { format } from "date-fns";

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
      business: { select: { currency: true } },
      items: {
        include: { employee: { select: { name: true, payFrequency: true } } },
        orderBy: { employee: { name: "asc" } },
      },
    },
  });

  if (!period) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const startLabel = format(period.startDate, "dd/MM/yyyy");
  const endLabel = format(period.endDate, "dd/MM/yyyy");
  const periodLabel = `${startLabel} - ${endLabel}`;

  const results: PayrollResult[] = period.items.map((item) => ({
    employeeId: item.employeeId,
    employeeName: item.employee.name,
    baseSalary: Number(item.baseSalary),
    periodSalary: Number(item.periodSalary),
    hourlyRate: Number(item.hourlyRate),
    extra50Hours: Number(item.extra50Hours),
    extra50Amount: Number(item.extra50Amount),
    extra100Hours: Number(item.extra100Hours),
    extra100Amount: Number(item.extra100Amount),
    holidayHours: Number(item.holidayHours),
    holidayAmount: Number(item.holidayAmount),
    advances: Number(item.advances),
    discounts: Number(item.discounts),
    totalAmount: Number(item.totalAmount),
    formula: item.formula as PayrollResult["formula"],
  }));

  const csv = generatePayrollCsv(results, periodLabel, {
    currency: period.business.currency,
  });

  const filename = `liquidacion-${startLabel.replace(/\//g, "-")}_${endLabel.replace(/\//g, "-")}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
