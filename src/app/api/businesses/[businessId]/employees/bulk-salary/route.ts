import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, requireBusinessAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({ percent: z.number().positive().max(500) });

interface Params { params: Promise<{ businessId: string }> }

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
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const { percent } = parsed.data;
  const multiplier = 1 + percent / 100;

  const employees = await prisma.employee.findMany({
    where: { businessId, status: "ACTIVE" },
    select: { id: true, baseSalary: true },
  });

  // Actualizar cada uno y crear historial en paralelo
  await Promise.all(
    employees.map(async (emp) => {
      const newSalary = Math.round(Number(emp.baseSalary) * multiplier * 100) / 100;
      await prisma.employee.update({
        where: { id: emp.id },
        data: { baseSalary: newSalary },
      });
      await prisma.employeeSalaryHistory.create({
        data: {
          employeeId: emp.id,
          salary: newSalary,
          validFrom: new Date(),
          note: `Aumento masivo ${percent}%`,
        },
      });
    })
  );

  return NextResponse.json({ updated: employees.length });
}
