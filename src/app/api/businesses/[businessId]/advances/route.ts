import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, requireBusinessAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { advanceSchema } from "@/lib/validations/business";

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
  const employeeId = searchParams.get("employeeId");

  const advances = await prisma.advance.findMany({
    where: { businessId, ...(employeeId && { employeeId }) },
    include: { employee: { select: { name: true } } },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(advances);
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
  const data = advanceSchema.parse(body);

  const employee = await prisma.employee.findFirst({
    where: { id: data.employeeId, businessId },
  });
  if (!employee) return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });

  const advance = await prisma.advance.create({
    data: { ...data, businessId, date: new Date(data.date) },
  });

  return NextResponse.json(advance, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { businessId } = await params;

  try {
    await requireBusinessAccess(businessId, session.user.id, "ADMIN");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  await prisma.advance.deleteMany({ where: { id, businessId } });
  return NextResponse.json({ success: true });
}
