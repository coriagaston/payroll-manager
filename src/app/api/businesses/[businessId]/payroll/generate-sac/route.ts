import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, requireBusinessAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calculateSAC } from "@/lib/payroll/calculator";

interface Params { params: Promise<{ businessId: string }> }

// POST /api/businesses/[businessId]/payroll/generate-sac
// Body: { year: number, semester: 1 | 2 }
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
  const { year, semester } = body as { year: number; semester: 1 | 2 };

  if (!year || (semester !== 1 && semester !== 2)) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  // Date range for the SAC period
  const startDate = semester === 1
    ? new Date(year, 0, 1)   // Jan 1
    : new Date(year, 6, 1);  // Jul 1
  const endDate = semester === 1
    ? new Date(year, 5, 30)  // Jun 30
    : new Date(year, 11, 31); // Dec 31

  const employees = await prisma.employee.findMany({
    where: { businessId, status: "ACTIVE" },
    select: { id: true, baseSalary: true },
  });

  if (employees.length === 0) {
    return NextResponse.json({ error: "No hay empleados activos" }, { status: 400 });
  }

  const period = await prisma.payrollPeriod.create({
    data: {
      businessId,
      startDate,
      endDate,
      frequency: "MONTHLY",
      type: "SAC",
      status: "DRAFT",
      items: {
        create: employees.map((emp) => {
          const sacAmount = calculateSAC(Number(emp.baseSalary));
          return {
            employeeId: emp.id,
            baseSalary: emp.baseSalary,
            periodSalary: sacAmount,
            hourlyRate: 0,
            extra50Hours: 0,
            extra50Amount: 0,
            extra100Hours: 0,
            extra100Amount: 0,
            holidayHours: 0,
            holidayAmount: 0,
            advances: 0,
            discounts: 0,
            totalAmount: sacAmount,
            formula: {
              type: "SAC",
              baseSalary: Number(emp.baseSalary),
              sacAmount,
              semester,
              year,
            },
          };
        }),
      },
    },
  });

  return NextResponse.json({ id: period.id });
}
