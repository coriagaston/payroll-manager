import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, requireBusinessAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const absenceSchema = z.object({
  employeeId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  days: z.number().positive().max(31),
  note: z.string().optional(),
});

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

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const absences = await prisma.absence.findMany({
    where: {
      businessId,
      ...(from && to && { date: { gte: new Date(from), lte: new Date(to) } }),
    },
    include: { employee: { select: { name: true } } },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(absences);
}

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
  const parsed = absenceSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const { employeeId, date, days, note } = parsed.data;

  // Verificar que el empleado pertenece al negocio
  const employee = await prisma.employee.findFirst({ where: { id: employeeId, businessId } });
  if (!employee) return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });

  const absence = await prisma.absence.create({
    data: { employeeId, businessId, date: new Date(date), days, note },
    include: { employee: { select: { name: true } } },
  });

  return NextResponse.json(absence, { status: 201 });
}
