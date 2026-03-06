import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, requireBusinessAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calculatePayrollBatch } from "@/lib/payroll/calculator";
import type { EmployeePayrollInput, PayrollPeriod, PayrollConfig } from "@/lib/payroll/types";
import { payrollGenerateSchema } from "@/lib/validations/business";

interface Params { params: Promise<{ businessId: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { businessId } = await params;

  try {
    await requireBusinessAccess(businessId, session.user.id);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const periods = await prisma.payrollPeriod.findMany({
    where: { businessId },
    include: { _count: { select: { items: true } } },
    orderBy: { startDate: "desc" },
  });

  return NextResponse.json(periods);
}

/**
 * POST /api/businesses/[businessId]/payroll
 * Body: { startDate, endDate, frequency, employeeIds? }
 * Genera (o preview sin guardar si preview=true en query) la liquidación
 */
export async function POST(req: NextRequest, { params }: Params) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { businessId } = await params;

  try {
    await requireBusinessAccess(businessId, session.user.id, "ADMIN");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const preview = searchParams.get("preview") === "true";

  const body = await req.json();
  const parsed = payrollGenerateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { startDate, endDate, frequency, employeeIds } = parsed.data;

  // Obtener config y empleados en paralelo
  const [bizConfig, employees] = await Promise.all([
    prisma.businessConfig.findUnique({ where: { businessId } }),
    prisma.employee.findMany({
      where: {
        businessId,
        status: "ACTIVE",
        payFrequency: frequency,
        ...(employeeIds && employeeIds.length > 0 && { id: { in: employeeIds } }),
      },
      include: {
        overtimes: {
          where: {
            date: { gte: new Date(startDate), lte: new Date(endDate) },
          },
        },
        advances: {
          where: {
            date: { gte: new Date(startDate), lte: new Date(endDate) },
          },
        },
      },
    }),
  ]);

  if (!bizConfig) return NextResponse.json({ error: "Config no encontrada" }, { status: 404 });

  if (employees.length === 0) {
    return NextResponse.json({ error: "No hay empleados activos con esa frecuencia de pago" }, { status: 404 });
  }

  const config: PayrollConfig = {
    extraRate50: Number(bizConfig.extraRate50),
    extraRate100: Number(bizConfig.extraRate100),
    extraRateHoliday: Number(bizConfig.extraRateHoliday),
    hourlyFormulaType: bizConfig.hourlyFormulaType,
    monthlyHours: bizConfig.monthlyHours,
    dailyHours: bizConfig.dailyHours,
    workingDaysPerMonth: bizConfig.workingDaysPerMonth,
  };

  const period: PayrollPeriod = { startDate, endDate, frequency };

  const inputs: EmployeePayrollInput[] = employees.map((emp) => ({
    id: emp.id,
    name: emp.name,
    baseSalary: Number(emp.baseSalary),
    payFrequency: emp.payFrequency,
    hourlyRate: emp.hourlyRate ? Number(emp.hourlyRate) : null,
    dailyHours: emp.dailyHours,
    overtimes: emp.overtimes.map((ot) => ({
      date: ot.date.toISOString().split("T")[0],
      hours: Number(ot.hours),
      type: ot.type,
      note: ot.note ?? "",
    })),
    advances: emp.advances.map((adv) => ({
      date: adv.date.toISOString().split("T")[0],
      amount: Number(adv.amount),
      isDiscount: adv.isDiscount,
      note: adv.note ?? "",
    })),
  }));

  const results = calculatePayrollBatch(inputs, period, config);

  // Si es preview, devolver sin guardar
  if (preview) {
    return NextResponse.json({ results, period });
  }

  // Guardar en DB
  const payrollPeriod = await prisma.payrollPeriod.create({
    data: {
      businessId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      frequency,
      status: "DRAFT",
      items: {
        create: results.map((r) => ({
          employeeId: r.employeeId,
          baseSalary: r.baseSalary,
          periodSalary: r.periodSalary,
          hourlyRate: r.hourlyRate,
          extra50Hours: r.extra50Hours,
          extra50Amount: r.extra50Amount,
          extra100Hours: r.extra100Hours,
          extra100Amount: r.extra100Amount,
          holidayHours: r.holidayHours,
          holidayAmount: r.holidayAmount,
          advances: r.advances,
          discounts: r.discounts,
          totalAmount: r.totalAmount,
          formula: r.formula as object,
        })),
      },
    },
    include: { items: { include: { employee: { select: { name: true } } } } },
  });

  return NextResponse.json(payrollPeriod, { status: 201 });
}
