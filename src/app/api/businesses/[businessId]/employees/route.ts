import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, requireBusinessAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { employeeSchema } from "@/lib/validations/employee";

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
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const employees = await prisma.employee.findMany({
    where: {
      businessId,
      ...(status && { status: status as "ACTIVE" | "INACTIVE" }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { position: { contains: search, mode: "insensitive" } },
          { dni: { contains: search } },
        ],
      }),
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(employees);
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
  const data = employeeSchema.parse(body);

  const employee = await prisma.employee.create({
    data: {
      ...data,
      businessId,
      startDate: new Date(data.startDate),
      hourlyRate: data.hourlyRate ?? null,
    },
  });

  return NextResponse.json(employee, { status: 201 });
}
