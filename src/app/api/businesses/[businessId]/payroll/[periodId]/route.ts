import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, requireBusinessAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";

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
      items: {
        include: { employee: { select: { name: true, position: true, payFrequency: true } } },
        orderBy: { employee: { name: "asc" } },
      },
    },
  });

  if (!period) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(period);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { businessId, periodId } = await params;

  try {
    await requireBusinessAccess(businessId, session.user.id, "ADMIN");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { status } = await req.json();
  if (!["DRAFT", "FINALIZED"].includes(status)) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }

  const updated = await prisma.payrollPeriod.updateMany({
    where: { id: periodId, businessId },
    data: { status },
  });

  if (updated.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { businessId, periodId } = await params;

  try {
    await requireBusinessAccess(businessId, session.user.id, "OWNER");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.payrollPeriod.deleteMany({ where: { id: periodId, businessId } });
  return NextResponse.json({ success: true });
}
