import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, requireBusinessAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { employeeSchema } from "@/lib/validations/employee";

interface Params { params: Promise<{ businessId: string; employeeId: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { businessId, employeeId } = await params;

  try {
    await requireBusinessAccess(businessId, session.user.id);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, businessId },
    include: {
      overtimes: { orderBy: { date: "desc" }, take: 50 },
      advances: { orderBy: { date: "desc" }, take: 20 },
    },
  });

  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(employee);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { businessId, employeeId } = await params;

  try {
    await requireBusinessAccess(businessId, session.user.id, "ADMIN");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const data = employeeSchema.parse(body);

  const employee = await prisma.employee.updateMany({
    where: { id: employeeId, businessId },
    data: {
      ...data,
      startDate: new Date(data.startDate),
      hourlyRate: data.hourlyRate ?? null,
    },
  });

  if (employee.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { businessId, employeeId } = await params;

  try {
    await requireBusinessAccess(businessId, session.user.id, "ADMIN");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Soft delete: marcar como inactivo en lugar de borrar
  await prisma.employee.updateMany({
    where: { id: employeeId, businessId },
    data: { status: "INACTIVE" },
  });

  return NextResponse.json({ success: true });
}
