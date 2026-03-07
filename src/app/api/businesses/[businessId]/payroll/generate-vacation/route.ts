import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, requireBusinessAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  calculateVacationDays,
  calculateVacationPayment,
  toLocalDateStr,
} from "@/lib/payroll/calculator";

interface Params { params: Promise<{ businessId: string }> }

// POST /api/businesses/[businessId]/payroll/generate-vacation
// Body: { employeeId: string, startDate: string (YYYY-MM-DD) }
export async function POST(req: NextRequest, { params }: Params) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { businessId } = await params;

  try {
    await requireBusinessAccess(businessId, session.user.id, "ADMIN");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { employeeId, startDate } = body as { employeeId: string; startDate: string };

  if (!employeeId || !startDate) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, businessId, status: "ACTIVE" },
  });

  if (!employee) {
    return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
  }

  const empStartDate = toLocalDateStr(employee.startDate);
  const vacationDays = calculateVacationDays(empStartDate, startDate);
  const { dailyRate, totalAmount } = calculateVacationPayment(
    Number(employee.baseSalary),
    vacationDays
  );

  // End date = startDate + vacationDays - 1
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(start);
  end.setDate(start.getDate() + vacationDays - 1);

  const period = await prisma.payrollPeriod.create({
    data: {
      businessId,
      startDate: start,
      endDate: end,
      frequency: "MONTHLY",
      type: "VACATION",
      status: "DRAFT",
      items: {
        create: [{
          employeeId: employee.id,
          baseSalary: employee.baseSalary,
          periodSalary: totalAmount,
          hourlyRate: 0,
          extra50Hours: 0,
          extra50Amount: 0,
          extra100Hours: 0,
          extra100Amount: 0,
          holidayHours: 0,
          holidayAmount: 0,
          advances: 0,
          discounts: 0,
          totalAmount,
          formula: {
            type: "VACATION",
            baseSalary: Number(employee.baseSalary),
            vacationDays,
            dailyRate,
            totalAmount,
            employeeStartDate: empStartDate,
          },
        }],
      },
    },
  });

  return NextResponse.json({ id: period.id });
}
