import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, requireBusinessAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface Params { params: Promise<{ businessId: string; employeeId: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { businessId, employeeId } = await params;

  try {
    await requireBusinessAccess(businessId, session.user.id);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const history = await prisma.employeeSalaryHistory.findMany({
    where: { employeeId, employee: { businessId } },
    orderBy: { validFrom: "desc" },
  });

  return NextResponse.json(history);
}
